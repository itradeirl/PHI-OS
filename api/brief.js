import { list, get } from "@vercel/blob";

// Reads the most recent brief uploaded by phi-os-chief-of-staff/chief-of-staff.js
// (the real ATLAS/SPIRA/BASTION/SAGE/OMEGA agent pipeline) from Vercel Blob
// storage and serves it to the dashboard. The store is private, so reads go
// through get() with the read-write token rather than a public URL fetch.
// Works both locally (via `vercel dev`) and on the live deployment, since
// Blob storage is reachable from both — unlike the local-disk version this
// replaced.

export default async function handler(req, res) {
  try {
    const { blobs } = await list({ prefix: "briefs/" });

    if (blobs.length === 0) {
      res.status(404).json({
        error: "No briefs yet. The scheduled agents haven't run, or haven't finished.",
      });
      return;
    }

    const latest = blobs.sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    )[0];

    const result = await get(latest.pathname, {
      access: "private",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    if (!result || result.statusCode !== 200) {
      res.status(404).json({ error: "Latest brief could not be read from storage." });
      return;
    }

    const text = await new Response(result.stream).text();

    res.status(200).json({
      filename: latest.pathname,
      generatedAt: latest.uploadedAt,
      text,
    });
  } catch (err) {
    res.status(500).json({ error: "Could not read briefs from Blob storage: " + err.message });
  }
}
