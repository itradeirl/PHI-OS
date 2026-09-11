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

          // Extension levels — profit-taking targets once price breaks above
          // the swing high, not entry zones. Single-leg projection (swingHigh
          // + range * ratio) since that's what the existing swing-high/low
          // detection supports; a true 3-point ABC extension would need a
          // distinct pullback point this data doesn't currently identify.
          const extensions = {
            ext1272: high + range * 0.272,
            ext1618: high + range * 0.618,
            ext2000: high + range * 1.0,
            ext2618: high + range * 1.618,
          };

          const aboveSwingHigh = current > high;
          let nearestExt = null;
          let extensionStatus = "N/A — price below swing high";
          if (aboveSwingHigh) {
            const extZones = [
              { level: "127.2%", price: extensions.ext1272 },
              { level: "161.8%", price: extensions.ext1618 },
              { level: "200%", price: extensions.ext2000 },
              { level: "261.8%", price: extensions.ext2618 },
            ];
            nearestExt = extZones.reduce((prev, curr) =>
              Math.abs(curr.price - current) < Math.abs(prev.price - current) ? curr : prev
            );
            const extDistancePct = (((current - nearestExt.price) / nearestExt.price) * 100).toFixed(2);
            const inExtZone = Math.abs(parseFloat(extDistancePct)) < 2.0;
            extensionStatus = inExtZone
              ? "AT EXTENSION TARGET"
              : parseFloat(extDistancePct) < 0
              ? "APPROACHING EXTENSION TARGET"
              : "BEYOND ALL EXTENSION TARGETS";
            nearestExt = { ...nearestExt, distancePct: extDistancePct + "%" };
          }

          // Explicit, dedicated checks against 161.8% and 261.8% specifically
          // — the two levels PHI OS actually alerts on for open positions.
          // Kept separate from "nearest of all 4 extension levels" above,
          // since the nearest one could be 127.2% or 200% and silently bury
          // whether 1.618/2.618 themselves are close, which is the whole
          // point of a dedicated alert.
          const checkLevel = (levelPrice) => {
            if (!aboveSwingHigh) return { status: "NOT YET — price below swing high", distancePct: null, price: levelPrice.toFixed(2) };
            const distPct = (((current - levelPrice) / levelPrice) * 100).toFixed(2);
            const status =
              Math.abs(parseFloat(distPct)) < 2.0
                ? "AT TARGET"
                : parseFloat(distPct) < 0 && Math.abs(parseFloat(distPct)) < 3.0
                ? "APPROACHING"
                : parseFloat(distPct) >= 0
                ? "ALREADY PAST TARGET"
                : "NOT YET";
            return { status, distancePct: distPct + "%", price: levelPrice.toFixed(2) };
          };

          const level1618 = checkLevel(extensions.ext1618);
          const level2618 = checkLevel(extensions.ext2618);

          return {
            ticker,
            ...fibs,
            nearestZone: nearest.level,
            nearestZonePrice: nearest.price.toFixed(2),
            distanceFromZone: distancePct + "%",
            status: inZone ? "IN ZONE" : parseFloat(distancePct) < 5 ? "APPROACHING" : "ABOVE ZONES",
            ...extensions,
            aboveSwingHigh,
            nearestExtensionZone: nearestExt?.level ?? null,
            nearestExtensionPrice: nearestExt ? nearestExt.price.toFixed(2) : null,
            distanceFromExtension: nearestExt?.distancePct ?? null,
            extensionStatus,
            level1618Status: level1618.status,
            level1618Price: level1618.price,
            level1618Distance: level1618.distancePct,
            level2618Status: level2618.status,
            level2618Price: level2618.price,
            level2618Distance: level2618.distancePct,
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
