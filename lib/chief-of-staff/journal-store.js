import { get, put } from "@vercel/blob";

// Shared read/write path for the PHI Log (trading journal), used by
// api/journal.js (the dashboard's own GET/POST/PATCH/DELETE),
// active-positions.js (SPIRA's exit-signal tracking), and
// lib/schwab/schwab-sync.js (importing real trades from Schwab) — one
// source of truth for what "open" means and how entries get persisted.

const JOURNAL_PATH = "journal/entries.json";
const CLOSEABLE_DECISIONS = ["BUY", "SELL"];

export async function readJournalEntries() {
  try {
    const result = await get(JOURNAL_PATH, {
      access: "private",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      useCache: false,
    });
    if (!result || result.statusCode !== 200) return [];
    const text = await new Response(result.stream).text();
    const entries = JSON.parse(text);
    // Entries logged before exit-tracking existed won't have these fields —
    // backfill so callers never have to special-case old rows.
    return entries.map((e) => ({
      status: e.status ?? (CLOSEABLE_DECISIONS.includes(e.decision) && e.price ? "open" : "n/a"),
      exitPrice: e.exitPrice ?? null,
      exitDate: e.exitDate ?? null,
      pnlDollar: e.pnlDollar ?? null,
      pnlPercent: e.pnlPercent ?? null,
      holdingDays: e.holdingDays ?? null,
      outcome: e.outcome ?? null,
      ...e,
    }));
  } catch {
    return [];
  }
}

export async function writeEntries(entries) {
  await put(JOURNAL_PATH, JSON.stringify(entries), {
    access: "private",
    token: process.env.BLOB_READ_WRITE_TOKEN,
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}
