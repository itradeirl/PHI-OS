/**
 * Thin wrapper around the real @anthropic-ai/claude-agent-sdk `query()` function.
 * Drains the streamed message generator and returns the final result text.
 */

import { query } from "@anthropic-ai/claude-agent-sdk";

export async function runAgent({ prompt, systemPrompt, mcpServers, allowedTools, model }) {
  let result = "";

  for await (const message of query({
    prompt,
    options: {
      // These are unattended background runs — there is never a human
      // present to approve a permission prompt, so the SDK's default
      // interactive permission mode would silently stall or deny tool
      // calls. Each agent's `allowedTools` list is the real safety
      // boundary (a tight, read-only allowlist per agent), not this.
      permissionMode: "bypassPermissions",
      allowDangerouslySkipPermissions: true,
      ...(systemPrompt ? { systemPrompt } : {}),
      ...(mcpServers ? { mcpServers } : {}),
      ...(allowedTools ? { allowedTools } : {}),
      ...(model ? { model } : {}),
    },
  })) {
    if (message.type === "result") {
      result = message.subtype === "success" ? message.result : `ERROR (${message.subtype})`;
      // Logged (not returned — keeps the return type a plain string for
      // existing callers) so real per-call cost is visible in Vercel's
      // function logs instead of only ever being estimated.
      console.log(
        `[cost] total_cost_usd=${message.total_cost_usd} duration_ms=${message.duration_ms} ` +
        `usage=${JSON.stringify(message.usage)}`
      );
    }
  }

  return result;
}
