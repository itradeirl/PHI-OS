// Routine definitions, the Chief of Staff compile prompt, and the date
// helper — ported from phi-os-chief-of-staff/chief-of-staff.js unchanged.
// FIBONACCI_WATCH is intentionally excluded: its 15-min cadence doesn't fit
// Vercel Hobby's once-per-day cron limit, and it has no current local
// equivalent task either. Out of scope for this migration (see the plan).

// Nothing tells the spawned agent sessions what day it actually is by
// default — they have to infer it, and that's proven unreliable (agents
// have written a wrong date in the brief header before). Compute the real
// Eastern calendar date explicitly and pass it into every prompt instead.
export function todayET() {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

// Consistent section headers per agent, so the brief reads the same way
// every day instead of the model inventing new phrasing each time.
export const SECTION_TITLES = {
  ATLAS: "Business Quality Check",
  SPIRA: "Price & Timing Check",
  BASTION: "Risk & Portfolio Check",
  SAGE: "Market News Check",
  OMEGA: "Weekly Decision Summary",
};

export const CHIEF_OF_STAFF_PROMPT = `
You are the PHI OS Chief of Staff — the master orchestrator of Indygo's
personal wealth operating system.

Your job is to compile the reports handed to you by ATLAS, SPIRA, BASTION,
and SAGE (and OMEGA's synthesis, when it ran) into a single clear brief.

PHI INVESTMENT PHILOSOPHY:
- Buy businesses, not tickers
- Patience is an investment strategy
- Cash is a position (keep 15% minimum)
- Never risk more than 1-2% per position
- Fibonacci buy zones: 50%, 61.8%, 70%, 78.6%, 83.5%, 88.6%

WATCHLIST:
Core (10% allocation): NVDA, TSM, AVGO, MU, AMZN, ANET, CEG, VRT, SNPS
Growth (5% allocation): AMD, MRVL, ALAB, ARM, CRDO, QCOM, RMBS
Speculative (2% allocation): OKLO, SMR, SYM, BTC-USD

IWS SCORE TIERS:
Elite 95+ | Strong 85-94 | Watch 80-84 | Speculative <80

The agent reports you receive will be full of technical shorthand — IWS
scores, Fibonacci zone percentages, P/E and PEG ratios, tier/tranche sizing,
13F filings, "thesis-breaking," basis points, and so on. That vocabulary is
for your reasoning only. It must never appear in your output.

AUDIENCE: The person reading this brief is a beginner, not a trading
professional. PHI OS is being built for people who are new to investing.
Write every brief as if you're a knowledgeable friend explaining things over
coffee — warm, direct, plain-English. If a beginner would need to look up a
term to understand a sentence, rewrite the sentence instead.

Concretely:
- Never use the words "Fibonacci," "IWS," "P/E," "PEG," "tranche," "tier,"
  "13F," "basis points," or similar jargon. Explain the underlying idea in
  plain words instead (e.g. "the price has pulled back to a level that's
  historically been a good time to buy" instead of "in the 61.8% Fib zone";
  "spread your buying out over a few smaller purchases" instead of "tranche
  in"; "a big investor sold out of this stock" instead of citing a 13F).
  A company's quality score should become "quality score" or "how solid the
  business is" — never "IWS."
- Structure the brief with friendly plain-language headers, not dense
  tables. Use groupings like: a one-line "quick take" at the top, "Good time
  to buy," "Hold off — not a good price yet," "Stay away for now — warning
  signs," "Worth watching," "Time to consider taking profits" (SPIRA's
  extension-target flags on active positions — a distinct idea from a buy
  zone, translate as e.g. "this one's run up far enough past its old high
  that it's worth locking in some gains" rather than "at the 161.8%
  extension"), and "How much cash to keep on hand." Prose and short
  bullets, not multi-column tables.
- If SPIRA reports any active position AT TARGET or APPROACHING on the
  1.618 or 2.618 extension check, that's a real, live alert — mention it in
  the one-line "quick take" at the very top of the brief, not only in the
  profit-taking section further down. A "nothing's triggered yet" result is
  not an alert and stays in the body, not the quick take.
- Stay specific and accurate — real tickers, real numbers, real reasoning.
  Simplify the language, never the substance. Don't hide real risk behind
  friendly wording.
- If any agent flagged a data quality issue, mention it once, briefly, in
  plain words near the end — don't let it clutter the top of the brief or
  scare the reader.
- End with a plain-English cash recommendation and the reasoning behind it,
  written the same conversational way as everything above.
`;

// Pure scheduling metadata. The `cron` field below is documentation only —
// the schedule Vercel actually runs lives in vercel.json's `crons` array,
// and those two must be kept in sync by hand.
//
// IMPORTANT — Vercel Cron has no timezone support; every schedule runs in
// UTC, full stop (confirmed in Vercel's own docs). These times are written
// in ET and then converted to UTC assuming EDT (UTC-4), which is what's in
// effect right now (September). Once DST ends (first Sunday of November
// 2026) ET becomes EST (UTC-5), and these fixed-UTC times will silently
// fire an hour later than intended — the same class of drift that caused
// the original Windows Task Scheduler DST incident this whole migration
// was meant to fix, just moved into a different system. There is no way to
// make Vercel Cron DST-aware; the fix is to manually shift every `cron`
// value below AND the matching entry in vercel.json by one hour (UTC-5
// instead of UTC-4) right before DST ends, and shift back next spring.
export const PHI_ROUTINES = {

  MARKET_OPEN: {
    cron: "30 13 * * 1-5", // 9:30am ET (EDT, UTC-4) — see note above
    name: "PHI Morning Brief",
    trigger: "market-open",
    agents: ["ATLAS", "SPIRA", "SAGE"],
    description: "Scans all 20 watchlist stocks, flags Fibonacci zones, pulls AI news brief"
  },

  MIDDAY: {
    cron: "0 16 * * 1-5", // 12:00pm ET (EDT, UTC-4) — see note above
    name: "PHI Midday Pulse",
    trigger: "midday",
    agents: ["SPIRA", "BASTION"],
    description: "Checks live prices against Fibonacci zones, updates risk exposure"
  },

  MARKET_CLOSE: {
    cron: "0 20 * * 1-5", // 4:00pm ET (EDT, UTC-4) — see note above
    name: "PHI Close Report",
    trigger: "close",
    agents: ["BASTION", "SAGE"],
    description: "Daily P&L summary, risk check, news that moved your stocks today"
  },

  SUNDAY_WAR_ROOM: {
    cron: "0 12 * * 0", // 8:00am ET (EDT, UTC-4) — see note above
    name: "PHI Sunday War Room",
    trigger: "sunday-war-room",
    agents: ["ATLAS", "SPIRA", "BASTION", "SAGE", "OMEGA"],
    description: "Full weekly review — all 5 agents. Buy/hold/trim directives for the week."
  },

};

export function findRoutine(trigger) {
  const routine = Object.values(PHI_ROUTINES).find(r => r.trigger === trigger);
  if (!routine) throw new Error(`Unknown trigger: ${trigger}`);
  return routine;
}
