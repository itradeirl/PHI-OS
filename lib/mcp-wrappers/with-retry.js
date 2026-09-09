// Shared retry helper for MCP tool handlers. Transient network blips (a
// dropped connection, a momentary timeout) shouldn't take down an entire
// agent run — retry a couple of times with a short backoff before giving up.
export async function withRetry(fn, { attempts = 3, delayMs = 800, label = "call" } = {}) {
  let lastError;

  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i < attempts - 1) {
        console.error(`${label} failed (attempt ${i + 1}/${attempts}): ${err.message} — retrying...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs * (i + 1)));
      }
    }
  }

  throw new Error(`${label} failed after ${attempts} attempts: ${lastError.message}`);
}
