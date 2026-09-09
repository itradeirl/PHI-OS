/**
 * PHI OS — MCP SERVER CONNECTIONS (cloud version)
 * ================================
 * MCP servers connect the agents to live data sources, spawned as stdio
 * subprocesses from inside a Vercel serverless function. Two fixes vs. the
 * local version, both proven necessary this session:
 *   - command: process.execPath (the exact node binary Vercel provides)
 *     instead of the string "node" (a PATH lookup, unreliable in Vercel's
 *     runtime).
 *   - args resolved via path.join(process.cwd(), ...) instead of a relative
 *     "./mcp-wrappers/..." path, since import.meta.url breaks under Vercel's
 *     silent ESM→CommonJS transpile.
 *
 * openrouterMCP/newsMCP are intentionally not ported: OMEGA's allowedTools
 * is [] (empty), so no tool can ever invoke openrouter — it was wired but
 * structurally unreachable in the original pipeline. newsMCP never had a
 * wrapper implementation; SAGE uses WebSearch + Finnhub instead.
 */

import path from "path";
import { PHI_CONFIG } from "./phi-config.js";

const wrapperPath = (name) => path.join(process.cwd(), "lib", "mcp-wrappers", `${name}.js`);

// ─── FINNHUB MCP SERVER ───────────────────────────────────────────────────────
// Implementation: lib/mcp-wrappers/finnhub-mcp.js

export const finnhubMCP = {
  type: "stdio",
  command: process.execPath,
  args: [wrapperPath("finnhub-mcp")],
  env: { FINNHUB_API_KEY: PHI_CONFIG.apis.finnhub },
  // Tools exposed:
  // - finnhub_quote(ticker)         → current price, change%, 52w high/low
  // - finnhub_fundamentals(ticker)  → P/E, revenue, EPS, market cap
  // - finnhub_news(ticker, days)    → company news feed
};

// ─── TIINGO MCP SERVER ─────────────────────────────────────────────────────────
// Historical daily OHLC price data for Fibonacci swing-high/low analysis.
// Implementation: lib/mcp-wrappers/tiingo-mcp.js

export const tiingoMCP = {
  type: "stdio",
  command: process.execPath,
  args: [wrapperPath("tiingo-mcp")],
  env: { TIINGO_API_KEY: PHI_CONFIG.apis.tiingo },
  // Tools exposed:
  // - tiingo_candles(ticker, days) → daily OHLC history, swing high/low, Fib zones
};
