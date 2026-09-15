import { isValidSession, buildSessionCookie, buildLogoutCookie } from "../lib/auth.js";

// Establishes auth — deliberately NOT gated by requireAuth() itself.
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");

  if (req.method === "GET") {
    res.status(200).json({ authenticated: isValidSession(req.headers.cookie) });
    return;
  }

  if (req.method === "POST") {
    const { password } = req.body || {};
    if (!process.env.SITE_PASSWORD || password !== process.env.SITE_PASSWORD) {
      res.status(401).json({ error: "Incorrect password" });
      return;
    }
    res.setHeader("Set-Cookie", buildSessionCookie());
    res.status(200).json({ authenticated: true });
    return;
  }

  if (req.method === "DELETE") {
    res.setHeader("Set-Cookie", buildLogoutCookie());
    res.status(200).json({ authenticated: false });
    return;
  }

  res.status(405).json({ error: "Use GET, POST, or DELETE" });
}
