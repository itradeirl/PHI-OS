import { readJournalEntries, writeEntries } from "../chief-of-staff/journal-store.js";
import { getValidAccessToken, getStoredAccountHash, saveAccountHash } from "./schwab-auth.js";

const API_BASE = "https://api.schwabapi.com/trader/v1";

async function fetchAccountHash(accessToken) {
  const cached = await getStoredAccountHash();
  if (cached) return cached;

  const res = await fetch(`${API_BASE}/accounts/accountNumbers`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Schwab accountNumbers failed: HTTP ${res.status}`);
  const accounts = await res.json();
  if (!Array.isArray(accounts) || accounts.length === 0) {
    throw new Error("No Schwab accounts returned for this login.");
  }
  // Single-account assumption — Indygo has one brokerage account linked.
  const hash = accounts[0].hashValue;
  await saveAccountHash(hash);
  return hash;
}

async function fetchTransactions(accessToken, accountHash, days) {
  const endDate = new Date();
  const startDate = new Date(Date.now() - days * 86400000);
  const params = new URLSearchParams({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    types: "TRADE",
  });
  const res = await fetch(`${API_BASE}/accounts/${accountHash}/transactions?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Schwab transactions failed: HTTP ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

// v1 scope: equity BUY/SELL trades only — no dividends, transfers, fees,
// or options assignments. transferItems' instrument.assetType/amount
// distinguish direction since Schwab doesn't give a flat "side" field.
function mapTransactionToEntry(txn) {
  const item = (txn.transferItems || []).find((t) => t.instrument?.assetType === "EQUITY");
  if (!item) return null;

  const quantity = Number(item.amount);
  if (!quantity) return null;

  return {
    ticker: item.instrument.symbol,
    decision: quantity > 0 ? "BUY" : "SELL",
    price: item.price != null ? String(item.price) : "",
    fibLevel: "",
    iws: "",
    thesis: "",
    date: new Date(txn.tradeDate || txn.time).toLocaleDateString(),
    id: Date.now() + Math.floor(Math.random() * 1000),
    status: item.price ? "open" : "n/a",
    exitPrice: null,
    exitDate: null,
    pnlDollar: null,
    pnlPercent: null,
    holdingDays: null,
    outcome: null,
    source: "schwab",
    schwabTxnId: txn.activityId ?? txn.transactionId ?? txn.id,
  };
}

// Real-time balance + current holdings, straight from Schwab — the ground
// truth for "what do I actually hold right now," as opposed to
// runSchwabSync()'s transaction-history reconstruction (which only sees
// activity within its lookback window). Not cached in Blob: balances
// change constantly, so there's nothing worth persisting between calls.
export async function fetchAccountSummary() {
  const accessToken = await getValidAccessToken();
  const accountHash = await fetchAccountHash(accessToken);

  const res = await fetch(`${API_BASE}/accounts/${accountHash}?fields=positions`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Schwab account summary failed: HTTP ${res.status}`);
  const data = await res.json();
  const account = data.securitiesAccount;
  const balances = account?.currentBalances || {};

  const totalValue = Number(balances.liquidationValue ?? 0);
  const cash = Number(balances.cashBalance ?? balances.cashAvailableForTrading ?? 0);
  const cashPercent = totalValue ? (cash / totalValue) * 100 : 0;

  // Same equity-only scope as runSchwabSync()'s transaction mapping —
  // options contracts (OCC-style symbols like "QCOM  270115C00165000")
  // aren't equity tickers: they'd garble the Portfolio table and break
  // SPIRA's exit-check (which pulls Fibonacci candle data by ticker
  // symbol). totalValue/cash reflect the WHOLE account including options;
  // only the returned positions list is filtered down to equities.
  const positions = (account?.positions || [])
    .filter((p) => p.instrument?.assetType === "EQUITY")
    .map((p) => {
      const quantity = Number(p.longQuantity ?? p.shortQuantity ?? 0);
      return {
        ticker: p.instrument?.symbol,
        quantity,
        avgPrice: Number(p.averagePrice ?? 0),
        marketValue: Number(p.marketValue ?? 0),
        dayPL: Number(p.currentDayProfitLoss ?? 0),
        dayPLPercent: Number(p.currentDayProfitLossPercentage ?? 0),
      };
    })
    .filter((p) => p.ticker && p.quantity !== 0);

  return { totalValue, cash, cashPercent, positions };
}

// Best-effort variant for AI-agent prompt context (active-positions.js) —
// never throws, so a Schwab hiccup can't break routine generation. Returns
// null (not []) when unavailable, so callers can fall back to other
// sources instead of mistaking "couldn't check" for "genuinely flat."
export async function tryFetchAccountSummary() {
  try {
    return await fetchAccountSummary();
  } catch {
    return null;
  }
}

export async function runSchwabSync(days = 7) {
  const accessToken = await getValidAccessToken();
  const accountHash = await fetchAccountHash(accessToken);
  const transactions = await fetchTransactions(accessToken, accountHash, days);

  const mapped = transactions.map(mapTransactionToEntry).filter(Boolean);

  const existing = await readJournalEntries();
  const knownTxnIds = new Set(existing.filter((e) => e.schwabTxnId).map((e) => String(e.schwabTxnId)));
  const newEntries = mapped.filter((e) => !knownTxnIds.has(String(e.schwabTxnId)));

  if (newEntries.length > 0) {
    await writeEntries([...newEntries, ...existing]);
  }

  return { imported: newEntries.length, total: existing.length + newEntries.length };
}
