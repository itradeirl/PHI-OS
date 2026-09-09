import { waitUntil } from "@vercel/functions";
import { runOmegaPhase } from "../../lib/chief-of-staff/run-routine.js";
import { continueTo, isAuthorized, jsonResponse } from "../../lib/chief-of-staff/continue-chain.js";

// A separate invocation from the agents phase that triggered it. Responds
// immediately and does OMEGA's work (then hands off to compile) inside
// waitUntil() — same "respond instantly, work in the background" shape as
// every other hop, so this invocation gets its own fresh budget for OMEGA's
// call instead of the caller's fetch blocking on it. Only reached for
// routines that include OMEGA (currently just Sunday War Room).
export default {
  async fetch(request) {
    if (!isAuthorized(request)) return jsonResponse({ ok: false }, 401);

    const { trigger, reports } = await request.json();
    const baseUrl = new URL(request.url).origin;
    waitUntil(
      runOmegaPhase(trigger, reports)
        .then((updatedReports) => continueTo(baseUrl, "/api/internal/compile", { trigger, reports: updatedReports }))
        .catch((err) => console.error(`run-omega(${trigger}) failed:`, err))
    );
    return jsonResponse({ ok: true, phase: "omega", status: "dispatched" });
  },
};
