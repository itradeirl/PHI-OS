import { list, get } from "@vercel/blob";
import { waitUntil } from "@vercel/functions";
import { runAgentsPhase } from "../lib/chief-of-staff/run-routine.js";
import { continueTo } from "../lib/chief-of-staff/continue-chain.js";
import { readRunStatus, isRunInFlight } from "../lib/chief-of-staff/run-status.js";
import { inferExpectedTrigger, todayETDateStamp } from "../lib/chief-of-staff/expected-routine.js";

// Reads the most recent brief from Vercel Blob storage. If none exists yet
// for today's expected routine (the on-demand fallback), triggers real
// generation in the background via waitUntil() and tells the client to
// poll — this is what makes a missed/failed cron run self-heal instead of
// sitting stale until someone happens to notice, which is the actual
// reliability backstop this migration exists to provide.
//
// Fetch-style handler (not the classic (req,res) style used by the other
// simple endpoints in this project) — required for waitUntil() to actually
// extend execution past the response; confirmed by testing that it's
// silently a no-op with the classic style.

const CACHE_HEADERS = {
  "content-type": "application/json",
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: CACHE_HEADERS });
}

export default {
  async fetch(request) {
    try {
      const { blobs } = await list({ prefix: "briefs/" });

      const latest = blobs.length
        ? blobs.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())[0]
        : null;

      const latestDateStamp = latest?.pathname.match(/^briefs\/(\d{4}-\d{2}-\d{2})-/)?.[1] ?? null;
      const expected = inferExpectedTrigger();
      const isStale = expected && latestDateStamp !== todayETDateStamp();

      if (isStale) {
        const status = await readRunStatus(expected);
        if (!isRunInFlight(status)) {
          // Same phased chain the cron entries use (see run-routine.js /
          // continue-chain.js) — a single invocation isn't reliably fast
          // enough to fit any routine's full agent+compile work.
          const baseUrl = new URL(request.url).origin;
          waitUntil(
            runAgentsPhase(expected)
              .then(({ reports, nextPhase }) => {
                const nextPath = nextPhase === "omega" ? "/api/internal/run-omega" : "/api/internal/compile";
                return continueTo(baseUrl, nextPath, { trigger: expected, reports });
              })
              .catch((err) => {
                console.error(`On-demand runAgentsPhase(${expected}) failed:`, err);
              })
          );
        }
        return json({ status: "generating", filename: null }, 202);
      }

      if (!latest) {
        return json({
          error: "No briefs yet. The scheduled agents haven't run, or haven't finished.",
        }, 404);
      }

      const result = await get(latest.pathname, {
        access: "private",
        token: process.env.BLOB_READ_WRITE_TOKEN,
        useCache: false, // force a fresh read from origin, not Blob's own CDN cache
      });

      if (!result || result.statusCode !== 200) {
        return json({ error: "Latest brief could not be read from storage." }, 404);
      }

      const text = await new Response(result.stream).text();

      return json({
        filename: latest.pathname,
        generatedAt: latest.uploadedAt,
        text,
      });
    } catch (err) {
      return json({ error: "Could not read briefs from Blob storage: " + err.message }, 500);
    }
  },
};
