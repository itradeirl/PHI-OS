import { get, put } from "@vercel/blob";

// Stores the PHI Log (decision journal) as one JSON file in the same Vercel
// Blob store already used for briefs — GET reads the current list, POST
// appends a new entry. This replaces the old React-state-only version,
// which lost every entry on a page refresh since nothing was ever saved.

const JOURNAL_PATH = "journal/entries.json";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.setHeader("Pragma", "no-cache");

  try {
    if (req.method === "GET") {
      const entries = await readEntries();
      res.status(200).json({ entries });
      return;
    }

    if (req.method === "POST") {
      const incoming = req.body;
      if (!incoming || !incoming.ticker || !incoming.thesis) {
        res.status(400).json({ error: "A ticker and a thesis are both required." });
        return;
      }

      const entries = await readEntries();
      const entry = {
        ticker: incoming.ticker,
        decision: incoming.decision || "BUY",
        price: incoming.price || "",
        fibLevel: incoming.fibLevel || "",
        iws: incoming.iws || "",
        thesis: incoming.thesis,
        date: new Date().toLocaleDateString(),
        id: Date.now(),
      };
      entries.unshift(entry);

      await put(JOURNAL_PATH, JSON.stringify(entries), {
        access: "private",
        token: process.env.BLOB_READ_WRITE_TOKEN,
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "application/json",
      });

      res.status(200).json({ entries });
      return;
    }

    res.status(405).json({ error: "Use GET or POST" });
  } catch (err) {
    res.status(500).json({ error: "Journal storage error: " + err.message });
  }
}

async function readEntries() {
  try {
    const result = await get(JOURNAL_PATH, {
      access: "private",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      useCache: false,
    });
    if (!result || result.statusCode !== 200) return [];
    const text = await new Response(result.stream).text();
    return JSON.parse(text);
  } catch {
    return [];
  }
}
