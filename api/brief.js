import fs from "fs";
import path from "path";

// Reads the most recent brief saved by phi-os-chief-of-staff/chief-of-staff.js
// (the real ATLAS/SPIRA/BASTION/SAGE/OMEGA agent pipeline) and serves it to
// the dashboard. Only works when both projects live on the same machine,
// side by side — see README note about deploying this to the cloud later.

export default function handler(req, res) {
  try {
    const briefsDir = path.join(process.cwd(), "..", "phi-os-chief-of-staff", "briefs");

    if (!fs.existsSync(briefsDir)) {
      res.status(404).json({
        error: "No briefs folder found. Has chief-of-staff.js run at least once?",
      });
      return;
    }

    const files = fs
      .readdirSync(briefsDir)
      .filter((f) => f.endsWith(".txt"))
      .map((f) => {
        const full = path.join(briefsDir, f);
        return { name: f, time: fs.statSync(full).mtime.getTime() };
      })
      .sort((a, b) => b.time - a.time);

    if (files.length === 0) {
      res.status(404).json({
        error: "No briefs yet. The scheduled agents haven't run, or haven't finished.",
      });
      return;
    }

    const latest = files[0];
    const text = fs.readFileSync(path.join(briefsDir, latest.name), "utf8");

    res.status(200).json({
      filename: latest.name,
      generatedAt: new Date(latest.time).toISOString(),
      text,
    });
  } catch (err) {
    res.status(500).json({ error: "Could not read the briefs folder: " + err.message });
  }
}
