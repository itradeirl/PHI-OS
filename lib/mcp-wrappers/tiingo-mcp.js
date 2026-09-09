/**
 * Tiingo MCP Wrapper.
 * Ported from phi-os-chief-of-staff/mcp-wrappers/tiingo-mcp.js — lives here
 * because PHI-OS is a separate Vercel project/repo and can't import across
 * them. Spawned as a stdio subprocess by lib/chief-of-staff/mcp-servers.js;
 * gets bundled via vercel.json's includeFiles for each function that runs it.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { withRetry } from "./with-retry.js";

const TIINGO_KEY = process.env.TIINGO_API_KEY;
const STOCK_BASE = "https://api.tiingo.com/tiingo/daily";
const CRYPTO_BASE = "https://api.tiingo.com/tiingo/crypto/prices";

if (!TIINGO_KEY) {
  console.error("TIINGO_API_KEY is not set");
  process.exit(1);
}

async function fetchDailyPrices(ticker, startDate, endDate) {
  const isCrypto = ticker === "BTC-USD" || ticker === "BTC/USD";

  if (isCrypto) {
    const r = await fetch(
      `${CRYPTO_BASE}?tickers=btcusd&startDate=${startDate}&endDate=${endDate}&resampleFreq=1day&token=${TIINGO_KEY}`
    );
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
    const priceData = data?.[0]?.priceData;
    if (!Array.isArray(priceData) || priceData.length === 0) {
      throw new Error("No crypto price history in response");
    }
    return priceData.map((d) => ({ high: d.high, low: d.low, close: d.close }));
  }

  const r = await fetch(
    `${STOCK_BASE}/${ticker}/prices?startDate=${startDate}&endDate=${endDate}&token=${TIINGO_KEY}`
  );
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const data = await r.json();
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("No price history in response");
  }
  return data.map((d) => ({ high: d.adjHigh, low: d.adjLow, close: d.adjClose }));
}

const TOOLS = {
  tiingo_candles: {
    description: "Get daily OHLC price history for Fibonacci swing-high/low analysis",
    inputSchema: {
      type: "object",
      properties: {
        ticker: { type: "string" },
        days: { type: "number", default: 365, description: "Number of days back" },
      },
      required: ["ticker"],
    },
    handler: async ({ ticker, days = 365 }) =>
      withRetry(
        async () => {
          const endDate = new Date().toISOString().split("T")[0];
          const startDate = new Date(Date.now() - days * 86400000).toISOString().split("T")[0];

          const prices = await fetchDailyPrices(ticker, startDate, endDate);

          const high = Math.max(...prices.map((d) => d.high));
          const low = Math.min(...prices.map((d) => d.low));
          const current = prices[prices.length - 1].close;
          const range = high - low;

          const fibs = {
            swingHigh: high,
            swingLow: low,
            current,
            fib50: high - range * 0.5,
            fib618: high - range * 0.618,
            fib70: high - range * 0.7,
            fib786: high - range * 0.786,
            fib835: high - range * 0.835,
            fib886: high - range * 0.886,
          };

          const zones = [
            { level: "50%", price: fibs.fib50 },
            { level: "61.8%", price: fibs.fib618 },
            { level: "70%", price: fibs.fib70 },
            { level: "78.6%", price: fibs.fib786 },
            { level: "83.5%", price: fibs.fib835 },
            { level: "88.6%", price: fibs.fib886 },
          ];

          const nearest = zones.reduce((prev, curr) =>
            Math.abs(curr.price - current) < Math.abs(prev.price - current) ? curr : prev
          );

          const distancePct = (((current - nearest.price) / nearest.price) * 100).toFixed(2);
          const inZone = Math.abs(parseFloat(distancePct)) < 2.0;

          return {
            ticker,
            ...fibs,
            nearestZone: nearest.level,
            nearestZonePrice: nearest.price.toFixed(2),
            distanceFromZone: distancePct + "%",
            status: inZone ? "IN ZONE" : parseFloat(distancePct) < 5 ? "APPROACHING" : "ABOVE ZONES",
          };
        },
        { label: `tiingo_candles(${ticker})` }
      ),
  },
};

const server = new Server(
  { name: "tiingo", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: Object.entries(TOOLS).map(([name, t]) => ({
    name,
    description: t.description,
    inputSchema: t.inputSchema,
  })),
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const tool = TOOLS[request.params.name];
  if (!tool) throw new Error(`Unknown tool: ${request.params.name}`);
  try {
    const result = await tool.handler(request.params.arguments ?? {});
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (err) {
    return {
      content: [{ type: "text", text: JSON.stringify({ error: err.message }, null, 2) }],
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("Tiingo MCP server running");
