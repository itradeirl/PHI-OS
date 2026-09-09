// Hands off to the next phase of a routine as a genuinely separate Vercel
// Function invocation (not a background continuation of the current one),
// so it gets its own fresh maxDuration budget instead of sharing whatever
// is left of the caller's. waitUntil() is what makes the dispatch itself
// reliable — a bare unawaited fetch can be torn down before the request is
// even sent once the response is returned.
//
// waitUntil() only actually extends execution for functions using the Web
// Fetch API handler convention (`export default { fetch(request) {...} }`),
// not the classic Node `(req, res)` handler every other endpoint in this
// project uses — confirmed by testing (silently a no-op with the classic
// style, no error, the chain just never continued). So every function that
// calls waitUntil() uses the fetch-style convention; the ones that don't
// need to hand off further (like the terminal compile phase) stay classic,
// matching the rest of the project.

export function continueTo(baseUrl, path, body) {
  return fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.CRON_SECRET}`,
    },
    body: JSON.stringify(body),
  })
    .then(async (res) => {
      console.log(`continueTo(${path}) responded ${res.status}`);
      if (!res.ok) console.log(`continueTo(${path}) body:`, (await res.text()).slice(0, 500));
      return res;
    })
    .catch((err) => {
      console.error(`continueTo(${path}) failed:`, err.message);
    });
}

// For classic (req, res)-style handlers (currently just api/internal/compile.js).
export function checkInternalAuth(req, res) {
  if (!process.env.CRON_SECRET || req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    res.status(401).json({ ok: false });
    return false;
  }
  return true;
}

// For fetch-style handlers (everything that calls waitUntil).
export function isAuthorized(request) {
  return Boolean(process.env.CRON_SECRET) &&
    request.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
}

export function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
