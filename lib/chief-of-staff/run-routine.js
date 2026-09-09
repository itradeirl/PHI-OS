import { findRoutine } from "./routines.js";
import { spawnWorkerAgent } from "./spawn-worker-agent.js";
import { compileBrief } from "./compile-brief.js";
import { deliverBrief } from "./deliver-brief.js";
import { writeRunStatus } from "./run-status.js";

// A full routine run is split across up to 3 phases, each its own Vercel
// Function invocation with its own fresh 300s budget (see continue-chain.js)
// — measured this session: a 4-agent + OMEGA + compile run in one
// invocation hit Vercel's hard 300s cap and was killed mid-run, and even
// the lighter 2-3 agent routines were only ~35-45s under it. Splitting
// removes the risk instead of hoping the margin holds.
//
//   Phase 1 (runAgentsPhase): the parallel agents only.
//   Phase 2 (runOmegaPhase):  OMEGA, only for routines that include it.
//   Phase 3 (runCompilePhase): compile + deliver — the terminal phase.

export async function runAgentsPhase(trigger) {
  const routine = findRoutine(trigger);
  await writeRunStatus(trigger, "running");

  try {
    const parallelAgents = routine.agents.filter((name) => name !== "OMEGA");
    const results = await Promise.all(
      parallelAgents.map((agentName) => spawnWorkerAgent(agentName, trigger))
    );

    const reports = {};
    parallelAgents.forEach((name, i) => { reports[name] = results[i]; });

    return { routine, reports, nextPhase: routine.agents.includes("OMEGA") ? "omega" : "compile" };
  } catch (err) {
    await writeRunStatus(trigger, "failed", err.message);
    throw err;
  }
}

export async function runOmegaPhase(trigger, reports) {
  try {
    const omegaResult = await spawnWorkerAgent("OMEGA", trigger, reports);
    return { ...reports, OMEGA: omegaResult };
  } catch (err) {
    await writeRunStatus(trigger, "failed", err.message);
    throw err;
  }
}

export async function runCompilePhase(trigger, reports) {
  const routine = findRoutine(trigger);
  try {
    const finalBrief = await compileBrief(trigger, routine, reports);
    const delivered = await deliverBrief(finalBrief, routine.name);
    await writeRunStatus(trigger, "success");
    return { ok: true, ...delivered };
  } catch (err) {
    await writeRunStatus(trigger, "failed", err.message);
    throw err;
  }
}
