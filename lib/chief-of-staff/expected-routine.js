// Figures out which routine's brief should exist right now, in Eastern
// time, so api/brief.js can tell "missing/stale" from "nothing new due yet".
// Deliberately simple: only checks whether *today's* ET date has a brief at
// all, not whether it's the single most-recent routine of the day (e.g. a
// market-open brief sitting there at 2pm isn't treated as stale just
// because midday hasn't run yet) — the failure this migration exists to
// fix is a fully missing brief, not a slightly-behind one, and a coarser
// check means fewer unnecessary regenerations (each one costs real API
// spend).
export function inferExpectedTrigger(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(now);

  const weekday = parts.find((p) => p.type === "weekday").value;
  const hour = parseInt(parts.find((p) => p.type === "hour").value, 10);
  const minute = parseInt(parts.find((p) => p.type === "minute").value, 10);
  const minutesSinceMidnight = (hour * 60 + minute) % 1440;

  if (weekday === "Sun") {
    return minutesSinceMidnight >= 8 * 60 ? "sunday-war-room" : null;
  }
  if (weekday === "Sat") return null;

  if (minutesSinceMidnight < 9 * 60 + 30) return null; // before market open — nothing new due yet
  if (minutesSinceMidnight < 12 * 60) return "market-open";
  if (minutesSinceMidnight < 16 * 60) return "midday";
  return "close";
}

export function todayETDateStamp(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(now);
}
