import { runCompilePhase } from "../../lib/chief-of-staff/run-routine.js";
import { checkInternalAuth } from "../../lib/chief-of-staff/continue-chain.js";

// Terminal phase — a separate invocation from whatever phase triggered it,
// so it gets its own fresh maxDuration budget for the compile call and the
// Blob upload, decoupled from the agents (and, for Sunday War Room, OMEGA)
// phase(s) before it.
export default async function handler(req, res) {
  if (!checkInternalAuth(req, res)) return;

  try {
    const { trigger, reports } = req.body;
    const result = await runCompilePhase(trigger, reports);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}
