import { readJournalEntries } from "./journal-store.js";
import { PHI_CONFIG } from "./phi-config.js";

// What SPIRA actually checks for extension-based exit signals. Journal
// entries are the priority source — a real logged trade — merged with the
// static phi-config.js portfolio so pre-existing holdings that haven't been
// re-logged into the journal don't silently drop out of tracking. When a
// ticker appears in both, the journal entry wins (it's the real, current
// entry price; the static config is a starting baseline).
export async function getActivePositions() {
  const entries = await readJournalEntries();
  const journalPositions = entries
    .filter((e) => e.status === "open" && e.decision === "BUY" && e.price)
    .map((e) => ({
      ticker: e.ticker,
      entryPrice: Number(e.price),
      entryDate: e.date,
      source: "journal",
    }));

  const journalTickers = new Set(journalPositions.map((p) => p.ticker));

  const staticPositions = PHI_CONFIG.portfolio.positions
    .filter((p) => !journalTickers.has(p.ticker))
    .map((p) => ({
      ticker: p.ticker,
      entryPrice: p.avgCost,
      entryDate: null,
      source: "portfolio-config",
    }));

  return [...journalPositions, ...staticPositions];
}
