import { useState, useEffect } from "react";

// Wraps <App /> in main.jsx — nothing inside App.jsx renders until the
// site password is verified. All existing fetch() calls inside App need no
// changes: the session cookie is HttpOnly and same-origin, sent
// automatically by the browser on every request once set here.
export default function Gate({ children }) {
  const [status, setStatus] = useState("checking"); // checking | authed | locked
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/login")
      .then((r) => r.json())
      .then((d) => setStatus(d.authenticated ? "authed" : "locked"))
      .catch(() => setStatus("locked"));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setStatus("authed");
      } else {
        setError("Incorrect password.");
        setPassword("");
      }
    } catch {
      setError("Something went wrong — try again.");
    }
    setSubmitting(false);
  };

  if (status === "checking") {
    return <div style={{ minHeight: "100vh", background: "#0a0e1a" }} />;
  }

  if (status === "locked") {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0e1a", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif" }}>
        <form onSubmit={submit} style={{ width: 280, textAlign: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", border: "2px solid #C9A84C", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: "#C9A84C", margin: "0 auto 16px", background: "#0a0e1a" }}>Φ</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: "#C9A84C", letterSpacing: 2, marginBottom: 4 }}>PHI OS</div>
          <div style={{ fontSize: 11, color: "#475569", marginBottom: 20 }}>Enter password to continue</div>
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: "100%", boxSizing: "border-box", background: "#0f1623", border: "1px solid #1e293b", borderRadius: 6, padding: "10px 12px", color: "#e2e8f0", fontSize: 13, marginBottom: 10, outline: "none" }}
          />
          <button
            type="submit"
            disabled={submitting || !password}
            style={{ width: "100%", background: "#C9A84C", border: "none", borderRadius: 6, padding: "10px 12px", color: "#0a0e1a", fontSize: 12, fontWeight: 700, cursor: submitting || !password ? "default" : "pointer", opacity: submitting || !password ? 0.6 : 1 }}
          >
            {submitting ? "Checking…" : "Enter"}
          </button>
          {error && <div style={{ fontSize: 11, color: "#f87171", marginTop: 10 }}>{error}</div>}
        </form>
      </div>
    );
  }

  return children;
}
