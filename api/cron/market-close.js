import { waitUntil } from "@vercel/functions";
import { runAgentsPhase } from "../../lib/chief-of-staff/run-routine.js";
import { continueTo, isAuthorized, jsonResponse } from "../../lib/chief-of-staff/continue-chain.js";

export default {
  async fetch(request) {
    if (!isAuthorized(request)) return jsonResponse({ ok: false }, 401);

    const baseUrl = new URL(request.url).origin;
    waitUntil(
      runAgentsPhase("close")
        .then(({ reports, nextPhase }) => {
          const nextPath = nextPhase === "omega" ? "/api/internal/run-omega" : "/api/internal/compile";
          return continueTo(baseUrl, nextPath, { trigger: "close", reports });
        })
        .catch((err) => console.error("close agents phase failed:", err))
    );
    return jsonResponse({ ok: true, phase: "agents", status: "dispatched" });
  },
};
