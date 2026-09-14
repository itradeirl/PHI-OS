import { put } from "@vercel/blob";
import { readJournalEntries } from "../lib/chief-of-staff/journal-store.js";

// Stores the PHI Log (trading journal) as one JSON file in the same Vercel
// Blob store already used for briefs — GET reads the current list, POST
// appends a new entry, PATCH closes an existing one with an exit price and
// computes P&L, DELETE removes an entry outright. Every entry starts "open";
// only BUY/SELL entries (actual positions, not WATCH/WAIT notes) are ever
// closeable. Entries persist indefinitely until explicitly deleted — there
// is no auto-expiry. The read path is shared with
// lib/chief-of-staff/active-positions.js, which feeds open entries to SPIRA
// for extension-level exit tracking.

const JOURNAL_PATH = "journal/entries.json";
const CLOSEABLE_DECISIONS = ["BUY", "SELL"];

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.setHeader("Pragma", "no-cache");

  try {
    if (req.method === "GET") {
      const entries = await readJournalEntries();
      res.status(200).json({ entries });
      return;
    }

    if (req.method === "POST") {
      const incoming = req.body;
      if (!incoming || !incoming.ticker || !incoming.thesis) {
        res.status(400).json({ error: "A ticker and a thesis are both required." });
        return;
      }

      const entries = await readJournalEntries();
      const decision = incoming.decision || "BUY";
      const entry = {
        ticker: incoming.ticker,
        decision,
        price: incoming.price || "",
        fibLevel: incoming.fibLevel || "",
        iws: incoming.iws || "",
        thesis: incoming.thesis,
        date: new Date().toLocaleDateString(),
        id: Date.now(),
        status: CLOSEABLE_DECISIONS.includes(decision) && incoming.price ? "open" : "n/a",
        exitPrice: null,
        exitDate: null,
        pnlDollar: null,
        pnlPercent: null,
        holdingDays: null,
        outcome: null,
      };
      entries.unshift(entry);

      await writeEntries(entries);
      res.status(200).json({ entries });
      return;
    }

    if (req.method === "PATCH") {
      const { id, exitPrice } = req.body || {};
      if (!id || !exitPrice || isNaN(Number(exitPrice))) {
        res.status(400).json({ error: "An entry id and a numeric exit price are required." });
        return;
      }

      const entries = await readJournalEntries();
      const entry = entries.find((e) => e.id === id);
      if (!entry) {
        res.status(404).json({ error: "Journal entry not found." });
        return;
      }
      if (!CLOSEABLE_DECISIONS.includes(entry.decision) || !entry.price) {
        res.status(400).json({ error: "Only BUY/SELL entries with an entry price can be closed." });
        return;
      }

      const entryPrice = Number(entry.price);
      const exit = Number(exitPrice);
      const isShort = entry.decision === "SELL";
      const pnlDollar = isShort ? entryPrice - exit : exit - entryPrice;
      const pnlPercent = (pnlDollar / entryPrice) * 100;

      entry.status = "closed";
      entry.exitPrice = exit;
      entry.exitDate = new Date().toLocaleDateString();
      entry.pnlDollar = Math.round(pnlDollar * 100) / 100;
      entry.pnlPercent = Math.round(pnlPercent * 100) / 100;
      entry.holdingDays = Math.max(0, Math.round((new Date(entry.exitDate) - new Date(entry.date)) / 86400000));
      entry.outcome = pnlDollar > 0 ? "win" : pnlDollar < 0 ? "loss" : "breakeven";

      await writeEntries(entries);
      res.status(200).json({ entries });
      return;
    }

    if (req.method === "DELETE") {
      const { id } = req.body || {};
      if (!id) {
        res.status(400).json({ error: "An entry id is required." });
        return;
      }

      const entries = await readJournalEntries();
      const remaining = entries.filter((e) => e.id !== id);
      if (remaining.length === entries.length) {
        res.status(404).json({ error: "Journal entry not found." });
        return;
      }

      await writeEntries(remaining);
      res.status(200).json({ entries: remaining });
      return;
    }

    res.status(405).json({ error: "Use GET, POST, PATCH, or DELETE" });
  } catch (err) {
    res.status(500).json({ error: "Journal storage error: " + err.message });
  }
}

async function writeEntries(entries) {
  await put(JOURNAL_PATH, JSON.stringify(entries), {
    access: "private",
    token: process.env.BLOB_READ_WRITE_TOKEN,
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}
