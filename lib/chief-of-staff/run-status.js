import { get, put } from "@vercel/blob";

// Tracks the status of each routine's most recent run in Blob storage
// (runs/${trigger}-status.json), so a failure is visible instead of only
// inferable from a missing brief — the whole point of this migration is to
// stop failing silently. Also used by api/brief.js's on-demand fallback to
// avoid starting a duplicate generation while one is already in flight.

const statusPath = (trigger) => `runs/${trigger}-status.json`;

export async function writeRunStatus(trigger, status, error = null) {
  const existing = await readRunStatus(trigger);
  const now = new Date().toISOString();
  const body = {
    status,
    startedAt: status === "running" ? now : existing?.startedAt ?? now,
    finishedAt: status === "running" ? null : now,
    error,
  };

  await put(statusPath(trigger), JSON.stringify(body), {
    access: "private",
    token: process.env.BLOB_READ_WRITE_TOKEN,
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });

  return body;
}

export async function readRunStatus(trigger) {
  try {
    const result = await get(statusPath(trigger), {
      access: "private",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      useCache: false,
    });
    if (!result || result.statusCode !== 200) return null;
    const text = await new Response(result.stream).text();
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// A "running" marker older than this is treated as an abandoned/crashed run
// rather than a real in-flight one, so a hard crash that skips the catch
// block's "failed" write can't leave the system permanently believing a
// generation is in progress and never retry.
const STALE_RUNNING_MS = 10 * 60 * 1000;

export function isRunInFlight(status) {
  if (!status || status.status !== "running" || !status.startedAt) return false;
  return Date.now() - new Date(status.startedAt).getTime() < STALE_RUNNING_MS;
}
