import { AGENT_CONFIGS } from "./agent-configs.js";
import { runAgent } from "./run-agent.js";
import { PHI_CONFIG } from "./phi-config.js";
import { todayET } from "./routines.js";

// Runs one agent (or OMEGA, with the other agents' real reports passed in).
// Ported from chief-of-staff.js's spawnWorkerAgent, unchanged in substance.
export async function spawnWorkerAgent(agentName, trigger, reports) {
  const agentConfig = AGENT_CONFIGS[agentName];
  if (!agentConfig) throw new Error(`Unknown agent: ${agentName}`);

  const rawPrompt = agentName === "OMEGA"
    ? agentConfig.getPrompt(trigger, PHI_CONFIG, reports)
    : agentConfig.getPrompt(trigger, PHI_CONFIG);

  return runAgent({
    systemPrompt: agentConfig.systemPrompt,
    mcpServers: agentConfig.mcpServers,
    allowedTools: agentConfig.allowedTools,
    prompt: `Today's date: ${todayET()}\n\n${rawPrompt}`,
  });
}
