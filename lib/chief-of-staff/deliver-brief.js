import { put } from "@vercel/blob";

// Uploads the finished brief to Vercel Blob storage, where api/brief.js
// reads it from. No local disk write — there's no persistent local disk in
// a serverless function, unlike the local pipeline's ./briefs/ folder.
export async function deliverBrief(brief, routineName) {
  // Use the real Eastern calendar date, not toISOString()'s UTC date — UTC
  // is 4-5 hours ahead of Eastern, so any evening run would otherwise get
  // stamped with tomorrow's date.
  const timestamp = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
  const baseName = `${timestamp}-${routineName.replace(/\s/g, "-")}.txt`;

  const blob = await put(`briefs/${baseName}`, brief, {
    access: "private",
    token: process.env.BLOB_READ_WRITE_TOKEN,
    addRandomSuffix: false,
    allowOverwrite: true,
  });

  return { filename: `briefs/${baseName}`, url: blob.url };
}
