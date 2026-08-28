// Proxies Finnhub quote requests server-side so FINNHUB_KEY never reaches
// the browser. Set FINNHUB_KEY as an environment variable on this Vercel
// project (and in .env.local for local dev) — never hardcode it here.

const BASE = "https://finnhub.io/api/v1";

export default async function handler(req, res) {
  // Live prices must never be served stale from a cache — same fix as api/brief.js.
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.setHeader("Pragma", "no-cache");

  const FINNHUB_KEY = process.env.FINNHUB_KEY;
  if (!FINNHUB_KEY) {
    res.status(500).json({ error: "FINNHUB_KEY is not set on the server." });
    return;
  }

  const tickersParam = req.query.tickers;
  if (!tickersParam) {
    res.status(400).json({ error: "Missing 'tickers' query parameter (comma-separated)." });
    return;
  }

  const tickers = tickersParam.split(",").map((t) => t.trim()).filter(Boolean);

  try {
    const results = await Promise.allSettled(
      tickers.map(async (ticker) => {
        const symbol = ticker === "BTC/USD" || ticker === "BTC-USD" ? "BINANCE:BTCUSDT" : ticker;
        const r = await fetch(`${BASE}/quote?symbol=${symbol}&token=${FINNHUB_KEY}`);
        const q = await r.json();
        return { ticker, q };
      })
    );

    const map = {};
    for (const result of results) {
      if (result.status === "fulfilled") {
        const { ticker, q } = result.value;
        if (q && q.c && q.c !== 0) {
          map[ticker] = q;
        }
      }
    }

    res.status(200).json(map);
  } catch (err) {
    res.status(500).json({ error: "Finnhub proxy error: " + err.message });
  }
}
