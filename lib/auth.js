import crypto from "node:crypto";

// Site-wide login gate. Hand-rolled rather than a library — no cookie/JWT/
// session package exists in package.json today, and HMAC-signing a cookie
// is a handful of lines via Node's built-in crypto, not worth a dependency
// for a single-user app.

const SECRET = process.env.SESSION_SECRET;
const COOKIE_NAME = "phi_session";
const MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

function sign(value) {
  const hmac = crypto.createHmac("sha256", SECRET).update(value).digest("hex");
  return `${value}.${hmac}`;
}

function verify(signed) {
  if (!signed || !SECRET) return null;
  const idx = signed.lastIndexOf(".");
  if (idx === -1) return null;
  const value = signed.slice(0, idx);
  const providedHmac = signed.slice(idx + 1);
  const expectedHmac = crypto.createHmac("sha256", SECRET).update(value).digest("hex");
  const a = Buffer.from(providedHmac);
  const b = Buffer.from(expectedHmac);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return value;
}

function parseCookies(header) {
  const out = {};
  (header || "").split(";").forEach((pair) => {
    const idx = pair.indexOf("=");
    if (idx === -1) return;
    out[pair.slice(0, idx).trim()] = decodeURIComponent(pair.slice(idx + 1).trim());
  });
  return out;
}

export function buildSessionCookie() {
  const token = sign(`ok:${Date.now()}`);
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${MAX_AGE_SECONDS}`;
}

export function buildLogoutCookie() {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

export function isValidSession(cookieHeader) {
  const token = parseCookies(cookieHeader)[COOKIE_NAME];
  const value = verify(token);
  return value != null && value.startsWith("ok:");
}

// Classic (req,res) handlers — checks and writes the 401 itself so callers
// can just do `if (!requireAuth(req, res)) return;`.
export function requireAuth(req, res) {
  if (isValidSession(req.headers.cookie)) return true;
  res.status(401).json({ error: "Not authenticated" });
  return false;
}

// Fetch-style handlers (api/brief.js) — caller builds the Response itself,
// same convention as continue-chain.js's isAuthorized()/jsonResponse().
export function isAuthenticatedFetch(request) {
  return isValidSession(request.headers.get("cookie"));
}
