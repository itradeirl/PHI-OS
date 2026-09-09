import { waitUntil } from "@vercel/functions";
import { runAgentsPhase } from "../../lib/chief-of-staff/run-routine.js";
import { continueTo, isAuthorized, jsonResponse } from "../../lib/chief-of-staff/continue-chain.js";

// Vercel sends `Authorization: Bearer $CRON_SECRET` on genuine cron-triggered
// requests when CRON_SECRET is set — this is what stops the endpoint being
// publicly triggerable and racking up real Anthropic API spend.
//
// Responds immediately and does the real work (the agents phase, then
// handing off to the next phase) inside waitUntil(). This matters: awaiting
// the real work before responding would tie up this invocation's own 300s
// budget on work that's about to get its own fresh budget anyway, and
// awaiting the *handoff* itself (a fetch to the next phase) would block on
// that phase's full completion, not just its dispatch — re-creating one
// long shared-budget chain. Every hop in this chain follows this same
// "respond instantly, do the work in the background" shape.
export default {
  async fetch(request) {
    if (!isAuthorized(request)) return jsonResponse({ ok: false }, 401);

    const baseUrl = new URL(request.url).origin;
    waitUntil(
      runAgentsPhase("market-open")
        .then(({ reports, nextPhase }) => {
          const nextPath = nextPhase === "omega" ? "/api/internal/run-omega" : "/api/internal/compile";
          return continueTo(baseUrl, nextPath, { trigger: "market-open", reports });
        })
        .catch((err) => console.error("market-open agents phase failed:", err))
    );
    return jsonResponse({ ok: true, phase: "agents", status: "dispatched" });
  },
};
