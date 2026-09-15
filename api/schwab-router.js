import crypto from "node:crypto";
import { checkInternalAuth } from "../lib/chief-of-staff/continue-chain.js";
import { requireAuth } from "../lib/auth.js";
import {
  buildAuthorizeUrl,
  writeOAuthState,
  consumeOAuthState,
  exchangeCodeForTokens,
  getConnectionStatus,
  disconnect,
} from "../lib/schwab/schwab-auth.js";
import { runSchwabSync, fetchAccountSummary } from "../lib/schwab/schwab-sync.js";

// Single function handling every Schwab endpoint, dispatched by ?action= —
// Vercel Hobby caps a deployment at 12 Serverless Functions, and this
// project was already at 10 before Schwab sync; 6 separate files would
// have pushed it to 16. vercel.json rewrites /api/schwab/* (and the cron
// path) here with the appropriate ?action=, so the external URLs — the
// ones that matter, like the Schwab-registered exact-match callback
// (https://phi-os.vercel.app/api/schwab/callback) — are unchanged.
export default async function handler(req, res) {
  const { action } = req.query;

  // cron-sync is server-to-server (CRON_SECRET, checked in its own case
  // below) — no browser session cookie will ever be present there. Every
  // other action is browser-facing and needs the site login.
  if (action !== "cron-sync" && !requireAuth(req, res)) return;

  switch (action) {
    case "authorize": {
      const state = crypto.randomBytes(24).toString("hex");
      await writeOAuthState(state);
      res.writeHead(302, { Location: buildAuthorizeUrl(state) });
      res.end();
      return;
    }

    case "callback": {
      const { code, state, error } = req.query;
      if (error || !code || !state) {
        res.writeHead(302, { Location: "/?schwab=error" });
        res.end();
        return;
      }
      const validState = await consumeOAuthState(state);
      if (!validState) {
        res.writeHead(302, { Location: "/?schwab=error" });
        res.end();
        return;
      }
      try {
        await exchangeCodeForTokens(code);
        res.writeHead(302, { Location: "/?schwab=connected" });
        res.end();
      } catch (err) {
        console.error("Schwab token exchange failed:", err);
        res.writeHead(302, { Location: "/?schwab=error" });
        res.end();
      }
      return;
    }

    case "status": {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
      res.status(200).json(await getConnectionStatus());
      return;
    }

    case "account": {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
      try {
        const summary = await fetchAccountSummary();
        res.status(200).json(summary);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
      return;
    }

    case "sync": {
      if (req.method !== "POST") {
        res.status(405).json({ error: "Use POST" });
        return;
      }
      try {
        const result = await runSchwabSync();
        res.status(200).json(result);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
      return;
    }

    case "disconnect": {
      if (req.method !== "POST") {
        res.status(405).json({ error: "Use POST" });
        return;
      }
      await disconnect();
      res.status(200).json({ ok: true });
      return;
    }

    case "cron-sync": {
      // Isolated from the brief-generation cron chain — its own action, so
      // a Schwab failure (e.g. the 7-day refresh-token expiry) never
      // affects brief generation.
      if (!checkInternalAuth(req, res)) return;
      try {
        const result = await runSchwabSync();
        res.status(200).json({ ok: true, ...result });
      } catch (err) {
        console.error("schwab cron-sync failed:", err.message);
        res.status(200).json({ ok: false, error: err.message });
      }
      return;
    }

    default:
      res.status(404).json({ error: "Unknown Schwab action" });
  }
}
