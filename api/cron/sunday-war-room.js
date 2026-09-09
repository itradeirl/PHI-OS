import { waitUntil } from "@vercel/functions";
import { runAgentsPhase } from "../../lib/chief-of-staff/run-routine.js";
import { continueTo, isAuthorized, jsonResponse } from "../../lib/chief-of-staff/continue-chain.js";

// The heaviest routine — 4 agents plus OMEGA's synthesis step. This is the
// one that measured a real FUNCTION_INVOCATION_TIMEOUT at ~300s when run as
// a single invocation, which is why every routine now runs as a chain of
// phases (see run-routine.js and continue-chain.js) instead of one long call.
export default {
  async fetch(request) {
    if (!isAuthorized(request)) return jsonResponse({ ok: false }, 401);

    const baseUrl = new URL(request.url).origin;
    waitUntil(
      runAgentsPhase("sunday-war-room")
        .then(({ reports, nextPhase }) => {
          const nextPath = nextPhase === "omega" ? "/api/internal/run-omega" : "/api/internal/compile";
          return continueTo(baseUrl, nextPath, { trigger: "sunday-war-room", reports });
        })
        .catch((err) => console.error("sunday-war-room agents phase failed:", err))
    );
    return jsonResponse({ ok: true, phase: "agents", status: "dispatched" });
  },
};
