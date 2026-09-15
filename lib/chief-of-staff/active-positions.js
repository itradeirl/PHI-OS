import { readJournalEntries } from "./journal-store.js";
import { PHI_CONFIG } from "./phi-config.js";
import { tryFetchAccountSummary } from "../schwab/schwab-sync.js";

// What SPIRA actually checks for extension-based exit signals. Three
// sources, in priority order: live Schwab positions (ground truth — what's
// actually held right now, when connected), open journal BUY entries not
// already covered by Schwab (manual tracking, e.g. a position held
// elsewhere), and the static phi-config.js portfolio as a last-resort
// fallback for anything neither of the above covers (keeps the app
// functional before Schwab is ever connected). When a ticker appears in
// more than one source, the higher-priority one wins.
export async function getActivePositions() {
  const schwabSummary = await tryFetchAccountSummary();
  const schwabPositions = (schwabSummary?.positions || []).map((p) => ({
    ticker: p.ticker,
    entryPrice: p.avgPrice,
    entryDate: null,
    source: "schwab-live",
  }));
  const schwabTickers = new Set(schwabPositions.map((p) => p.ticker));

  const entries = await readJournalEntries();
  const journalPositions = entries
    .filter((e) => e.status === "open" && e.decision === "BUY" && e.price && !schwabTickers.has(e.ticker))
    .map((e) => ({
      ticker: e.ticker,
      entryPrice: Number(e.price),
      entryDate: e.date,
      source: "journal",
    }));

  const coveredTickers = new Set([...schwabTickers, ...journalPositions.map((p) => p.ticker)]);

  const staticPositions = PHI_CONFIG.portfolio.positions
    .filter((p) => !coveredTickers.has(p.ticker))
    .map((p) => ({
      ticker: p.ticker,
      entryPrice: p.avgCost,
      entryDate: null,
      source: "portfolio-config",
    }));

  return [...schwabPositions, ...journalPositions, ...staticPositions];
}
