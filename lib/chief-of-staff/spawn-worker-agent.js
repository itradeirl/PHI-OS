import { AGENT_CONFIGS } from "./agent-configs.js";
import { runAgent } from "./run-agent.js";
import { PHI_CONFIG } from "./phi-config.js";
import { todayET } from "./routines.js";
import { getActivePositions } from "./active-positions.js";

// Runs one agent (or OMEGA, with the other agents' real reports passed in).
// Ported from chief-of-staff.js's spawnWorkerAgent. SPIRA additionally gets
// the real active-positions list (journal entries, prioritized, merged with
// the static portfolio config) so its extension-level exit checks track
// what Indygo actually holds, not just the hardcoded starting list.
export async function spawnWorkerAgent(agentName, trigger, reports) {
  const agentConfig = AGENT_CONFIGS[agentName];
  if (!agentConfig) throw new Error(`Unknown agent: ${agentName}`);

  let rawPrompt;
  if (agentName === "OMEGA") {
    rawPrompt = agentConfig.getPrompt(trigger, PHI_CONFIG, reports);
  } else if (agentName === "SPIRA") {
    const activePositions = await getActivePositions();
    rawPrompt = agentConfig.getPrompt(trigger, PHI_CONFIG, activePositions);
  } else {
    rawPrompt = agentConfig.getPrompt(trigger, PHI_CONFIG);
  }

  return runAgent({
    systemPrompt: agentConfig.systemPrompt,
    mcpServers: agentConfig.mcpServers,
    allowedTools: agentConfig.allowedTools,
    prompt: `Today's date: ${todayET()}\n\n${rawPrompt}`,
  });
}
