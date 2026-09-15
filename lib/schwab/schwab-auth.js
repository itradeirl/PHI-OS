import { get, put, del } from "@vercel/blob";

// Schwab OAuth token lifecycle — mirrors the Blob-JSON-with-staleness idiom
// already used by lib/chief-of-staff/run-status.js. A refresh token is
// mutable, rotating runtime state (Schwab issues a new one on every
// refresh), so it belongs here, not as a static env var — unlike
// SCHWAB_CLIENT_ID/SCHWAB_CLIENT_SECRET, which are fixed app credentials.

const TOKENS_PATH = "auth/schwab-tokens.json";
const STATE_PATH = "auth/schwab-oauth-state.json";
const TOKEN_URL = "https://api.schwabapi.com/v1/oauth/token";
const AUTHORIZE_URL = "https://api.schwabapi.com/v1/oauth/authorize";

const CLIENT_ID = process.env.SCHWAB_CLIENT_ID;
const CLIENT_SECRET = process.env.SCHWAB_CLIENT_SECRET;
const REDIRECT_URI = "https://phi-os.vercel.app/api/schwab/callback";

function basicAuthHeader() {
  return "Basic " + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
}

async function readTokens() {
  try {
    const result = await get(TOKENS_PATH, {
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

async function writeTokens(tokens) {
  await put(TOKENS_PATH, JSON.stringify(tokens), {
    access: "private",
    token: process.env.BLOB_READ_WRITE_TOKEN,
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
  return tokens;
}

function tokensFromResponse(body, previous) {
  const now = Date.now();
  return {
    accessToken: body.access_token,
    accessTokenExpiresAt: now + (body.expires_in ?? 1800) * 1000,
    // Schwab rotates the refresh token on every use but only extends its
    // 7-day life from the moment of the ORIGINAL authorization — treat a
    // missing refresh_token in a refresh response as "still the old one".
    refreshToken: body.refresh_token ?? previous?.refreshToken,
    refreshTokenExpiresAt: previous?.refreshTokenExpiresAt ?? now + 7 * 24 * 60 * 60 * 1000,
    connectedAt: previous?.connectedAt ?? new Date().toISOString(),
    accountHash: previous?.accountHash ?? null,
    disconnected: false,
  };
}

export async function writeOAuthState(state) {
  await put(STATE_PATH, JSON.stringify({ state, createdAt: Date.now() }), {
    access: "private",
    token: process.env.BLOB_READ_WRITE_TOKEN,
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

export async function consumeOAuthState(state) {
  try {
    const result = await get(STATE_PATH, {
      access: "private",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      useCache: false,
    });
    if (!result || result.statusCode !== 200) return false;
    const text = await new Response(result.stream).text();
    const stored = JSON.parse(text);
    await del(STATE_PATH, { token: process.env.BLOB_READ_WRITE_TOKEN }).catch(() => {});
    // 10-minute window — plenty for a user to complete Schwab's login screen.
    const fresh = Date.now() - stored.createdAt < 10 * 60 * 1000;
    return fresh && stored.state === state;
  } catch {
    return false;
  }
}

export function buildAuthorizeUrl(state) {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    state,
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

export async function exchangeCodeForTokens(code) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
    }),
  });
  if (!res.ok) throw new Error(`Schwab token exchange failed: HTTP ${res.status} — ${await res.text()}`);
  const body = await res.json();
  return writeTokens(tokensFromResponse(body, null));
}

async function refreshTokens(previous) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: previous.refreshToken,
    }),
  });
  if (!res.ok) {
    // Refresh token itself is dead (7-day expiry, or revoked) — mark
    // disconnected so the UI can prompt for reconnection instead of
    // silently failing every sync attempt from here on.
    await writeTokens({ ...previous, disconnected: true });
    throw new Error(`Schwab refresh failed: HTTP ${res.status} — reconnection required`);
  }
  const body = await res.json();
  return writeTokens(tokensFromResponse(body, previous));
}

// Returns a live access token, refreshing transparently if needed. Throws
// if there's no connection at all, or if the refresh token has expired.
export async function getValidAccessToken() {
  const tokens = await readTokens();
  if (!tokens || tokens.disconnected) {
    throw new Error("Schwab is not connected — reconnect in Settings.");
  }
  if (Date.now() >= tokens.refreshTokenExpiresAt) {
    await writeTokens({ ...tokens, disconnected: true });
    throw new Error("Schwab connection expired (7-day refresh window) — reconnect in Settings.");
  }
  // 60s buffer so a request in flight doesn't cross the expiry boundary.
  if (Date.now() >= tokens.accessTokenExpiresAt - 60 * 1000) {
    const refreshed = await refreshTokens(tokens);
    return refreshed.accessToken;
  }
  return tokens.accessToken;
}

export async function saveAccountHash(accountHash) {
  const tokens = await readTokens();
  if (!tokens) return;
  await writeTokens({ ...tokens, accountHash });
}

export async function getStoredAccountHash() {
  const tokens = await readTokens();
  return tokens?.accountHash ?? null;
}

export async function getConnectionStatus() {
  const tokens = await readTokens();
  if (!tokens) return { connected: false, needsReconnect: false };
  const needsReconnect = tokens.disconnected || Date.now() >= tokens.refreshTokenExpiresAt;
  return {
    connected: !needsReconnect,
    needsReconnect,
    connectedAt: tokens.connectedAt,
    refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
  };
}

export async function disconnect() {
  await del(TOKENS_PATH, { token: process.env.BLOB_READ_WRITE_TOKEN }).catch(() => {});
}
