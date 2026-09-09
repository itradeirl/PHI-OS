/**
 * PHI OS — MASTER CONFIGURATION
 * ================================
 * Central config for all agents. Update this file to change:
 * - Watchlist tickers
 * - Portfolio positions and cash
 * - Risk parameters
 * - API keys
 */

export const PHI_CONFIG = {

  // ─── WATCHLIST ──────────────────────────────────────────────────────────────
  watchlist: {
    core: ["NVDA", "TSM", "AVGO", "MU", "AMZN", "ANET", "CEG", "VRT", "SNPS"],
    growth: ["AMD", "MRVL", "ALAB", "ARM", "CRDO", "QCOM", "RMBS"],
    speculative: ["OKLO", "SMR", "SYM", "BTC-USD"],

    // Stocks that need a fresh IWS research score this week
    // Update manually or let ATLAS auto-detect based on last-scored date
    needsResearch: ["CRDO", "ALAB", "RMBS"]
  },

  // ─── PORTFOLIO ──────────────────────────────────────────────────────────────
  // Update these manually until Schwab API integration is live
  portfolio: {
    totalValue: 248362,          // Total portfolio value in USD
    cash: 37247,                 // Available cash
    cashPercent: 15.0,           // Cash as % of total

    positions: [
      // { ticker, shares, avgCost, tier }
      { ticker: "NVDA", shares: 50,  avgCost: 124.50, tier: "CORE"        },
      { ticker: "TSM",  shares: 80,  avgCost: 168.20, tier: "CORE"        },
      { ticker: "AVGO", shares: 20,  avgCost: 178.40, tier: "CORE"        },
      { ticker: "AMD",  shares: 60,  avgCost: 142.80, tier: "GROWTH"      },
      { ticker: "CRDO", shares: 120, avgCost: 38.60,  tier: "GROWTH"      },
    ]
  },

  // ─── PHI RISK RULES ─────────────────────────────────────────────────────────
  risk: {
    maxRiskPerTrade: 0.02,        // 2% max risk per trade
    minCashPercent: 0.15,         // 15% minimum cash always
    allocationLimits: {
      CORE:        0.10,          // Core stocks: max 10% of portfolio
      GROWTH:      0.05,          // Growth stocks: max 5%
      SPECULATIVE: 0.02           // Speculative: max 2%
    },
    maxSectorConcentration: 0.40  // No single sector > 40%
  },

  // ─── FIBONACCI SETTINGS ─────────────────────────────────────────────────────
  fibonacci: {
    levels: [0.500, 0.618, 0.700, 0.786, 0.835, 0.886],
    inZoneThreshold: 0.02,        // Within 2% = IN ZONE
    approachingThreshold: 0.05    // Within 5% = APPROACHING
  },

  // ─── IWS SCORING ────────────────────────────────────────────────────────────
  iws: {
    tiers: {
      elite:       { min: 95, max: 100, label: "Elite"       },
      strong:      { min: 85, max: 94,  label: "Strong"      },
      watch:       { min: 80, max: 84,  label: "Watch"       },
      speculative: { min: 0,  max: 79,  label: "Speculative" }
    },
    categories: {
      moat:            20,   // Competitive advantage durability
      leadership:      10,   // CEO quality, capital allocation
      financialHealth: 15,   // Balance sheet, debt, FCF
      revenueGrowth:   15,   // YoY growth rate
      profitability:   10,   // Margins, ROE
      aiExposure:      10,   // AI/next-decade positioning
      institutional:    5,   // Smart money ownership
      valuation:       15,   // P/E, P/S vs growth
    }
  },

  // ─── API KEYS ────────────────────────────────────────────────────────────────
  // Sourced from Vercel environment variables — no dotenv needed in the cloud.
  apis: {
    finnhub:     process.env.FINNHUB_KEY,
    tiingo:      process.env.TIINGO_KEY,
  },

  // ─── PHI 10 PRINCIPLES (for agent context) ──────────────────────────────────
  principles: [
    "01 Buy businesses, not tickers",
    "02 Patience is an investment strategy",
    "03 Cash is a position",
    "04 The market rewards discipline",
    "05 Protect capital first",
    "06 Never confuse a great company with a great price",
    "07 Own tomorrow before everyone else sees it",
    "08 Quality first, price second, timing third",
    "09 Every decision must move the family closer to freedom",
    "10 Clarity over complexity. Discipline over emotion. Systems over speculation"
  ]
};
