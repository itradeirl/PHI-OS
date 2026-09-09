/**
 * Finnhub MCP Wrapper.
 * Ported from phi-os-chief-of-staff/mcp-wrappers/finnhub-mcp.js. Spawned as
 * a stdio subprocess by lib/chief-of-staff/mcp-servers.js.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { withRetry } from "./with-retry.js";

const FINNHUB_KEY = process.env.FINNHUB_API_KEY;
const BASE = "https://finnhub.io/api/v1";

if (!FINNHUB_KEY) {
  console.error("FINNHUB_API_KEY is not set");
  process.exit(1);
}

const TOOLS = {
  finnhub_quote: {
    description: "Get live stock quote from Finnhub",
    inputSchema: {
      type: "object",
      properties: { ticker: { type: "string", description: "Stock ticker e.g. NVDA" } },
      required: ["ticker"],
    },
    handler: async ({ ticker }) =>
      withRetry(
        async () => {
          const r = await fetch(`${BASE}/quote?symbol=${ticker}&token=${FINNHUB_KEY}`);
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          const data = await r.json();
          if (data.c === undefined || data.c === null) {
            throw new Error("No price data in response");
          }
          return {
            ticker,
            price: data.c,
            change: data.d,
            changePercent: data.dp,
            high52w: data.h,
            low52w: data.l,
            previousClose: data.pc,
          };
        },
        { label: `finnhub_quote(${ticker})` }
      ),
  },

  finnhub_fundamentals: {
    description: "Get company fundamental metrics",
    inputSchema: {
      type: "object",
      properties: { ticker: { type: "string" } },
      required: ["ticker"],
    },
    handler: async ({ ticker }) =>
      withRetry(
        async () => {
          const r = await fetch(`${BASE}/stock/metric?symbol=${ticker}&metric=all&token=${FINNHUB_KEY}`);
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          const data = await r.json();
          if (!data.metric || typeof data.metric !== "object") {
            throw new Error("No metric data in response");
          }
          const m = data.metric;
          return {
            ticker,
            peRatio: m["peNormalizedAnnual"],
            eps: m["epsNormalizedAnnual"],
            revenueGrowthYoY: m["revenueGrowth3Y"],
            grossMargin: m["grossMarginTTM"],
            returnOnEquity: m["roeTTM"],
            debtToEquity: m["totalDebt/totalEquityAnnual"],
            marketCap: m["marketCapitalization"],
          };
        },
        { label: `finnhub_fundamentals(${ticker})` }
      ),
  },

  finnhub_news: {
    description: "Get recent company news",
    inputSchema: {
      type: "object",
      properties: { ticker: { type: "string" }, days: { type: "number", default: 7 } },
      required: ["ticker"],
    },
    handler: async ({ ticker, days = 7 }) =>
      withRetry(
        async () => {
          const to = new Date().toISOString().split("T")[0];
          const from = new Date(Date.now() - days * 86400000).toISOString().split("T")[0];
          const r = await fetch(`${BASE}/company-news?symbol=${ticker}&from=${from}&to=${to}&token=${FINNHUB_KEY}`);
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          const news = await r.json();
          if (!Array.isArray(news)) throw new Error("Unexpected news response shape");
          return news.slice(0, 10).map((n) => ({
            headline: n.headline,
            summary: n.summary?.slice(0, 200),
            source: n.source,
            date: new Date(n.datetime * 1000).toLocaleDateString(),
          }));
        },
        { label: `finnhub_news(${ticker})` }
      ),
  },
};

const server = new Server(
  { name: "finnhub", version: "1.0.0" },
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
    // After retries are exhausted, surface a clear error to the agent
    // instead of crashing the whole run — it can reason about a labeled
    // failure ("this data source was down") far better than a stack trace.
    return {
      content: [{ type: "text", text: JSON.stringify({ error: err.message }, null, 2) }],
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("Finnhub MCP server running");
