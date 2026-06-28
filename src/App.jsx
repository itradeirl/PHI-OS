import { useState, useEffect, useCallback } from "react";

const TWELVE_KEY = "bf279a0df6144d37aa525b6629486e1a";

const PHI_PRINCIPLES = [
  "Buy businesses, not tickers.",
  "Patience is an investment strategy.",
  "Cash is a position.",
  "The market rewards discipline.",
  "Protect capital first.",
  "Never confuse a great company with a great price.",
  "Own tomorrow before everyone else sees it.",
  "Quality first, price second, timing third.",
  "Every decision must move the family closer to freedom.",
  "Clarity over complexity. Discipline over emotion. Systems over speculation.",
];

const BASE_WATCHLIST = [
  { ticker: "NVDA", company: "NVIDIA Corp.", tier: "Core", theme: "AI Compute", sector: "Semiconductors", iws: 98, buyReadiness: 93, decision: "WATCH", swingHigh: 153.13, swingLow: 86.03, position: 0.1 },
  { ticker: "TSM", company: "TSMC", tier: "Core", theme: "Foundry", sector: "Semiconductor Mfg", iws: 97, buyReadiness: 91, decision: "WATCH", swingHigh: 226.40, swingLow: 127.40, position: 0.1 },
  { ticker: "AVGO", company: "Broadcom Inc.", tier: "Core", theme: "AI Networking", sector: "Semiconductors", iws: 96, buyReadiness: 90, decision: "WATCH", swingHigh: 251.88, swingLow: 119.76, position: 0.1 },
  { ticker: "MU", company: "Micron Technology", tier: "Core", theme: "Memory", sector: "Semiconductors", iws: 96, buyReadiness: 88, decision: "WATCH", swingHigh: 157.54, swingLow: 78.54, position: 0.1 },
  { ticker: "AMZN", company: "Amazon.com Inc.", tier: "Core", theme: "Cloud AI", sector: "Cloud/Consumer", iws: 94, buyReadiness: 87, decision: "WATCH", swingHigh: 242.52, swingLow: 151.61, position: 0.1 },
  { ticker: "ANET", company: "Arista Networks", tier: "Core", theme: "AI Networking", sector: "Networking", iws: 94, buyReadiness: 85, decision: "WATCH", swingHigh: 129.87, swingLow: 72.45, position: 0.1 },
  { ticker: "CEG", company: "Constellation Energy", tier: "Core", theme: "Nuclear Power", sector: "Energy", iws: 93, buyReadiness: 84, decision: "WATCH", swingHigh: 381.48, swingLow: 159.30, position: 0.1 },
  { ticker: "VRT", company: "Vertiv Holdings", tier: "Core", theme: "Data Center Infra", sector: "Infrastructure", iws: 92, buyReadiness: 83, decision: "WATCH", swingHigh: 148.97, swingLow: 54.46, position: 0.1 },
  { ticker: "AMD", company: "Advanced Micro Dev.", tier: "Growth", theme: "AI Compute", sector: "Semiconductors", iws: 91, buyReadiness: 82, decision: "WATCH", swingHigh: 227.30, swingLow: 116.37, position: 0.05 },
  { ticker: "SNPS", company: "Synopsys Inc.", tier: "Core", theme: "Chip Design SW", sector: "Software", iws: 91, buyReadiness: 80, decision: "WATCH", swingHigh: 624.98, swingLow: 394.60, position: 0.1 },
  { ticker: "MRVL", company: "Marvell Technology", tier: "Growth", theme: "AI Networking", sector: "Semiconductors", iws: 90, buyReadiness: 79, decision: "WATCH", swingHigh: 119.39, swingLow: 45.10, position: 0.05 },
  { ticker: "ALAB", company: "Astera Labs", tier: "Growth", theme: "AI Connectivity", sector: "Semiconductors", iws: 89, buyReadiness: 77, decision: "WATCH", swingHigh: 139.88, swingLow: 24.87, position: 0.05 },
  { ticker: "ARM", company: "Arm Holdings", tier: "Growth", theme: "Semiconductor IP", sector: "Semiconductor IP", iws: 89, buyReadiness: 76, decision: "WATCH", swingHigh: 188.75, swingLow: 105.20, position: 0.05 },
  { ticker: "CRDO", company: "Credo Technology", tier: "Growth", theme: "AI Connectivity", sector: "Semiconductors", iws: 88, buyReadiness: 74, decision: "WATCH", swingHigh: 78.98, swingLow: 12.52, position: 0.05 },
  { ticker: "QCOM", company: "Qualcomm Inc.", tier: "Growth", theme: "Edge AI", sector: "Semiconductors", iws: 88, buyReadiness: 73, decision: "WATCH", swingHigh: 230.63, swingLow: 139.57, position: 0.05 },
  { ticker: "RMBS", company: "Rambus Inc.", tier: "Growth", theme: "Memory Interface", sector: "Semiconductor IP", iws: 86, buyReadiness: 70, decision: "WATCH", swingHigh: 90.00, swingLow: 40.70, position: 0.05 },
  { ticker: "OKLO", company: "Oklo Inc.", tier: "Speculative", theme: "Advanced Nuclear", sector: "Energy", iws: 80, buyReadiness: 62, decision: "WATCH", swingHigh: 58.92, swingLow: 6.14, position: 0.02 },
  { ticker: "SMR", company: "NuScale Power", tier: "Speculative", theme: "SMR Nuclear", sector: "Energy", iws: 76, buyReadiness: 45, decision: "WAIT", swingHigh: 32.41, swingLow: 7.80, position: 0.02 },
  { ticker: "SYM", company: "Symbotic Inc.", tier: "Speculative", theme: "Automation/Robotics", sector: "Robotics", iws: 82, buyReadiness: 65, decision: "WATCH", swingHigh: 54.50, swingLow: 14.89, position: 0.02 },
];

const IWS_SCORES = [
  { ticker: "NVDA", moat: 20, leadership: 10, financial: 15, growth: 15, industry: 10, institutional: 10, valuation: 8, technical: 10 },
  { ticker: "TSM", moat: 20, leadership: 10, financial: 15, growth: 14, industry: 10, institutional: 10, valuation: 9, technical: 9 },
  { ticker: "AVGO", moat: 19, leadership: 10, financial: 15, growth: 14, industry: 10, institutional: 10, valuation: 9, technical: 9 },
  { ticker: "MU", moat: 18, leadership: 9, financial: 14, growth: 15, industry: 10, institutional: 10, valuation: 10, technical: 10 },
  { ticker: "AMZN", moat: 19, leadership: 9, financial: 15, growth: 14, industry: 10, institutional: 9, valuation: 9, technical: 9 },
  { ticker: "ANET", moat: 18, leadership: 9, financial: 15, growth: 14, industry: 10, institutional: 9, valuation: 10, technical: 9 },
  { ticker: "CEG", moat: 18, leadership: 9, financial: 15, growth: 13, industry: 10, institutional: 9, valuation: 10, technical: 9 },
  { ticker: "VRT", moat: 17, leadership: 9, financial: 14, growth: 14, industry: 10, institutional: 9, valuation: 10, technical: 9 },
  { ticker: "AMD", moat: 17, leadership: 9, financial: 14, growth: 14, industry: 10, institutional: 9, valuation: 9, technical: 9 },
  { ticker: "SNPS", moat: 18, leadership: 9, financial: 14, growth: 13, industry: 10, institutional: 9, valuation: 9, technical: 9 },
  { ticker: "MRVL", moat: 16, leadership: 9, financial: 13, growth: 14, industry: 10, institutional: 9, valuation: 10, technical: 9 },
  { ticker: "ALAB", moat: 16, leadership: 8, financial: 12, growth: 15, industry: 10, institutional: 9, valuation: 10, technical: 9 },
  { ticker: "ARM", moat: 18, leadership: 9, financial: 13, growth: 13, industry: 10, institutional: 9, valuation: 8, technical: 9 },
  { ticker: "CRDO", moat: 15, leadership: 8, financial: 12, growth: 15, industry: 10, institutional: 9, valuation: 10, technical: 9 },
  { ticker: "QCOM", moat: 17, leadership: 9, financial: 14, growth: 13, industry: 9, institutional: 9, valuation: 9, technical: 8 },
  { ticker: "RMBS", moat: 16, leadership: 8, financial: 13, growth: 12, industry: 9, institutional: 9, valuation: 10, technical: 9 },
  { ticker: "OKLO", moat: 16, leadership: 8, financial: 8, growth: 14, industry: 10, institutional: 8, valuation: 8, technical: 8 },
  { ticker: "SMR", moat: 15, leadership: 7, financial: 8, growth: 12, industry: 9, institutional: 7, valuation: 9, technical: 9 },
  { ticker: "SYM", moat: 15, leadership: 8, financial: 10, growth: 13, industry: 9, institutional: 8, valuation: 9, technical: 10 },
];

function calcFib(swingHigh, swingLow) {
  const range = swingHigh - swingLow;
  return {
    f50: swingHigh - range * 0.5,
    f618: swingHigh - range * 0.618,
    f70: swingHigh - range * 0.7,
    f786: swingHigh - range * 0.786,
    f835: swingHigh - range * 0.835,
    f886: swingHigh - range * 0.886,
  };
}

function getNearestFib(price, fibs) {
  let nearest = null, minDist = Infinity, nearestKey = "";
  for (const [k, v] of Object.entries(fibs)) {
    const d = Math.abs(price - v);
    if (d < minDist) { minDist = d; nearest = v; nearestKey = k; }
  }
  const dist = ((price - nearest) / nearest) * 100;
  return { dist, label: nearestKey.replace("f", "") + "%" };
}

function getDecisionColor(d) {
  return d === "BUY" ? "#4ade80" : d === "WATCH" ? "#C9A84C" : d === "WAIT" ? "#94a3b8" : "#f87171";
}
function getTierColor(t) {
  return t === "Core" ? "#4ade80" : t === "Growth" ? "#C9A84C" : "#f87171";
}
function getRatingColor(r) {
  return r === "Elite" ? "#C9A84C" : r === "Strong" ? "#4ade80" : r === "Watch" ? "#60a5fa" : "#94a3b8";
}
function getRating(score) {
  return score >= 95 ? "Elite" : score >= 85 ? "Strong" : score >= 80 ? "Watch" : "Speculative";
}

const NAV = [
  { id: "dashboard", label: "DASHBOARD", icon: "⊞" },
  { id: "watchlist", label: "WATCHLIST", icon: "◉" },
  { id: "fib", label: "FIB ENGINE", icon: "◈" },
  { id: "iws", label: "IWS SCORING", icon: "◎" },
  { id: "portfolio", label: "PORTFOLIO", icon: "◫" },
  { id: "journal", label: "PHI LOG", icon: "◧" },
  { id: "constitution", label: "CONSTITUTION", icon: "◆" },
  { id: "settings", label: "SETTINGS", icon: "⚙" },
];

function Sparkline({ data }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const w = 80, h = 28;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(" ");
  const positive = data[data.length - 1] >= data[0];
  return (
    <svg width={w} height={h}>
      <polyline points={pts} fill="none" stroke={positive ? "#4ade80" : "#f87171"} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function DonutChart({ portfolioValue }) {
  const segments = [
    { label: "Stocks", pct: 68.2, color: "#1e40af" },
    { label: "Options", pct: 12.1, color: "#C9A84C" },
    { label: "Cash", pct: 15.0, color: "#334155" },
    { label: "Real Estate", pct: 3.1, color: "#4ade80" },
    { label: "Crypto", pct: 1.6, color: "#a78bfa" },
  ];
  let cum = 0;
  const cx = 60, cy = 60, r = 50, inner = 32;
  const paths = segments.map(seg => {
    const s = (cum / 100) * 2 * Math.PI - Math.PI / 2;
    cum += seg.pct;
    const e = (cum / 100) * 2 * Math.PI - Math.PI / 2;
    const lg = seg.pct > 50 ? 1 : 0;
    return { ...seg, d: `M${cx + r * Math.cos(s)},${cy + r * Math.sin(s)} A${r},${r} 0 ${lg},1 ${cx + r * Math.cos(e)},${cy + r * Math.sin(e)} L${cx + inner * Math.cos(e)},${cy + inner * Math.sin(e)} A${inner},${inner} 0 ${lg},0 ${cx + inner * Math.cos(s)},${cy + inner * Math.sin(s)} Z` };
  });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <svg width="120" height="120" viewBox="0 0 120 120">
        {paths.map((p, i) => <path key={i} d={p.d} fill={p.color} />)}
        <text x="60" y="56" textAnchor="middle" fill="#C9A84C" fontSize="8" fontWeight="700">${portfolioValue ? (portfolioValue / 1000).toFixed(0) + "K" : "—"}</text>
        <text x="60" y="68" textAnchor="middle" fill="#64748b" fontSize="7">Total Value</text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {segments.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />
            <span style={{ fontSize: 11, color: "#94a3b8" }}>{s.label}</span>
            <span style={{ fontSize: 11, color: "#e2e8f0", marginLeft: "auto", paddingLeft: 12 }}>{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PerfChart() {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const phi = [0, 4, 7, 10, 14, 18.62];
  const sp = [0, 2, 3, 5, 7, 9.4];
  const w = 320, h = 90, pl = 28, pb = 18, pt = 8, pr = 8;
  const iw = w - pl - pr, ih = h - pt - pb;
  const minV = -5, maxV = 25;
  const xs = i => pl + (i / (months.length - 1)) * iw;
  const ys = v => pt + ih - ((v - minV) / (maxV - minV)) * ih;
  const path = d => d.map((v, i) => `${i === 0 ? "M" : "L"}${xs(i)},${ys(v)}`).join(" ");
  return (
    <svg width={w} height={h} style={{ overflow: "visible" }}>
      {[0, 10, 20].map(v => (
        <g key={v}>
          <line x1={pl} x2={pl + iw} y1={ys(v)} y2={ys(v)} stroke="#1e293b" strokeWidth="1" />
          <text x={pl - 4} y={ys(v) + 4} textAnchor="end" fill="#475569" fontSize="8">{v}%</text>
        </g>
      ))}
      <path d={path(phi)} fill="none" stroke="#C9A84C" strokeWidth="2" strokeLinejoin="round" />
      <path d={path(sp)} fill="none" stroke="#475569" strokeWidth="1.5" strokeDasharray="4,2" strokeLinejoin="round" />
      {months.map((m, i) => <text key={m} x={xs(i)} y={h - 2} textAnchor="middle" fill="#475569" fontSize="8">{m}</text>)}
    </svg>
  );
}

function IWSBar({ score }) {
  const color = score >= 90 ? "#C9A84C" : score >= 80 ? "#4ade80" : "#60a5fa";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 80, height: 4, background: "#1e293b", borderRadius: 2 }}>
        <div style={{ width: `${score}%`, height: "100%", background: color, borderRadius: 2 }} />
      </div>
      <span style={{ fontSize: 11, color, fontWeight: 700 }}>{score}</span>
    </div>
  );
}

export default function PHIOS() {
  const [nav, setNav] = useState("dashboard");
  const [watchFilter, setWatchFilter] = useState("ALL");
  const [liveData, setLiveData] = useState({});
  const [sparklines, setSparklines] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [fibInputs, setFibInputs] = useState({});
  const [currentTime, setCurrentTime] = useState(new Date());
  const [principleIdx] = useState(Math.floor(Math.random() * PHI_PRINCIPLES.length));
  const [journalEntries, setJournalEntries] = useState([]);
  const [journalForm, setJournalForm] = useState({ ticker: "", decision: "BUY", price: "", fibLevel: "", iws: "", thesis: "" });

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const fetchLiveData = useCallback(async () => {
    setLoading(true);
    try {
      const tickers = BASE_WATCHLIST.map(s => s.ticker).join(",");
      // Twelve Data batch quote endpoint
      const res = await fetch(`https://api.twelvedata.com/quote?symbol=${tickers}&apikey=${TWELVE_KEY}`);
      const data = await res.json();
      const map = {};
      // Twelve Data returns object keyed by ticker when multiple symbols
      for (const ticker of BASE_WATCHLIST.map(s => s.ticker)) {
        const q = data[ticker];
        if (q && !q.code) {
          map[ticker] = {
            price: parseFloat(q.close),
            daily: parseFloat(q.percent_change),
            change: parseFloat(q.change),
            high52: parseFloat(q.fifty_two_week?.high),
            low52: parseFloat(q.fifty_two_week?.low),
            marketCap: null,
            pe: null,
            volume: parseFloat(q.volume),
            open: parseFloat(q.open),
            dayHigh: parseFloat(q.high),
            dayLow: parseFloat(q.low),
            prevClose: parseFloat(q.previous_close),
          };
        }
      }
      setLiveData(map);
      setLastUpdated(new Date());
    } catch (e) {
      console.error("Twelve Data fetch error:", e);
    }

    // Fetch sparklines for top 8 using time_series
    try {
      const topTickers = BASE_WATCHLIST.slice(0, 8).map(s => s.ticker);
      const sparks = {};
      await Promise.all(topTickers.map(async ticker => {
        try {
          const r = await fetch(`https://api.twelvedata.com/time_series?symbol=${ticker}&interval=1day&outputsize=20&apikey=${TWELVE_KEY}`);
          const d = await r.json();
          if (d.values) {
            sparks[ticker] = d.values.reverse().map(v => parseFloat(v.close));
          }
        } catch {}
      }));
      setSparklines(sparks);
    } catch {}

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLiveData();
    const interval = setInterval(fetchLiveData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchLiveData]);

  const watchlist = BASE_WATCHLIST.map(s => ({
    ...s,
    price: liveData[s.ticker]?.price ?? null,
    daily: liveData[s.ticker]?.daily ?? null,
    high52: liveData[s.ticker]?.high52 ?? null,
    low52: liveData[s.ticker]?.low52 ?? null,
    marketCap: liveData[s.ticker]?.marketCap ?? null,
    pe: liveData[s.ticker]?.pe ?? null,
    volume: liveData[s.ticker]?.volume ?? null,
  }));

  const filtered = watchlist.filter(s => {
    if (watchFilter === "ALL") return true;
    if (watchFilter === "CORE") return s.tier === "Core";
    if (watchFilter === "GROWTH") return s.tier === "Growth";
    if (watchFilter === "SPEC") return s.tier === "Speculative";
    return true;
  });

  const avgIWS = Math.round(BASE_WATCHLIST.reduce((a, b) => a + b.iws, 0) / BASE_WATCHLIST.length);

  const fibZoneStocks = watchlist.filter(s => {
    if (!s.price) return false;
    const fibs = calcFib(s.swingHigh, s.swingLow);
    const { dist } = getNearestFib(s.price, fibs);
    return Math.abs(dist) <= 5;
  });

  const hour = currentTime.getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
  const timeStr = currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const dateStr = currentTime.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });

  const fmt = (n, dec = 2) => n != null ? n.toFixed(dec) : "—";
  const fmtCurrency = n => n != null ? `$${n.toFixed(2)}` : "—";
  const fmtBig = n => {
    if (n == null) return "—";
    if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
    if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
    return `$${(n / 1e6).toFixed(0)}M`;
  };

  const S = {
    app: { display: "flex", height: "100vh", background: "#0a0e1a", color: "#e2e8f0", fontFamily: "'Inter', -apple-system, sans-serif", overflow: "hidden" },
    sidebar: { width: 196, minWidth: 196, background: "#0d1117", borderRight: "1px solid #1e293b", display: "flex", flexDirection: "column" },
    main: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
    topBar: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderBottom: "1px solid #1e293b", background: "#0d1117" },
    content: { flex: 1, overflow: "auto", padding: 16 },
    card: { background: "#0d1117", border: "1px solid #1e293b", borderRadius: 10, padding: 14 },
    cardTitle: { fontSize: 10, fontWeight: 700, color: "#475569", letterSpacing: 1.5, marginBottom: 10, textTransform: "uppercase" },
    statLabel: { fontSize: 9, color: "#475569", letterSpacing: 1, textTransform: "uppercase", marginBottom: 3 },
    statVal: { fontSize: 22, fontWeight: 800, color: "#e2e8f0", letterSpacing: -0.5 },
    navItem: (a) => ({ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", cursor: "pointer", fontSize: 11, fontWeight: a ? 700 : 500, color: a ? "#C9A84C" : "#64748b", background: a ? "#1a1f2e" : "transparent", borderLeft: `2px solid ${a ? "#C9A84C" : "transparent"}`, letterSpacing: 0.5 }),
    badge: (color) => ({ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: color + "22", color, letterSpacing: 0.5, display: "inline-block" }),
    table: { width: "100%", borderCollapse: "collapse" },
    th: { fontSize: 9, color: "#475569", fontWeight: 700, letterSpacing: 1, textAlign: "left", padding: "7px 10px", borderBottom: "1px solid #1e293b", textTransform: "uppercase", whiteSpace: "nowrap" },
    td: { fontSize: 12, color: "#e2e8f0", padding: "9px 10px", borderBottom: "1px solid #0f1623" },
    filterBtn: (a) => ({ fontSize: 10, fontWeight: a ? 700 : 500, padding: "4px 11px", borderRadius: 5, border: "1px solid", borderColor: a ? "#C9A84C" : "#1e293b", background: a ? "#C9A84C22" : "transparent", color: a ? "#C9A84C" : "#64748b", cursor: "pointer" }),
    input: { background: "#0a0e1a", border: "1px solid #1e293b", borderRadius: 6, padding: "5px 8px", color: "#e2e8f0", fontSize: 12, outline: "none" },
    liveIndicator: { display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: loading ? "#C9A84C" : "#4ade80" },
  };

  const addJournalEntry = () => {
    if (!journalForm.ticker || !journalForm.thesis) return;
    setJournalEntries(prev => [{
      ...journalForm,
      date: new Date().toLocaleDateString(),
      id: Date.now(),
    }, ...prev]);
    setJournalForm({ ticker: "", decision: "BUY", price: "", fibLevel: "", iws: "", thesis: "" });
  };

  return (
    <div style={S.app}>
      {/* SIDEBAR */}
      <div style={S.sidebar}>
        <div style={{ padding: "16px 14px 12px", borderBottom: "1px solid #1e293b" }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: "#C9A84C", letterSpacing: 2 }}>PHI OS</div>
          <div style={{ fontSize: 9, color: "#475569", letterSpacing: 1 }}>PHI CORE v4.0</div>
          <div style={{ width: 44, height: 44, borderRadius: "50%", border: "2px solid #C9A84C", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "#C9A84C", margin: "10px auto", background: "#0a0e1a" }}>Φ</div>
          <div style={{ fontSize: 9, color: "#475569", textAlign: "center", lineHeight: 1.6 }}>Clarity over complexity.<br />Discipline over emotion.<br />Systems over speculation.</div>
        </div>

        <div style={{ flex: 1, paddingTop: 6 }}>
          {NAV.map(item => (
            <div key={item.id} style={S.navItem(nav === item.id)} onClick={() => setNav(item.id)}>
              <span style={{ fontSize: 13 }}>{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>

        <div style={{ margin: "0 10px 10px", background: "#0f1623", borderRadius: 8, padding: 10, border: "1px solid #1e293b" }}>
          <div style={{ fontSize: 9, color: "#475569", letterSpacing: 1, marginBottom: 6 }}>MARKET STATUS</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#C9A84C", marginBottom: 6 }}>Moderate Risk</div>
          {[["VIX", "16.23"], ["Trend", "BULLISH"], ["Breadth", "POSITIVE"]].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
              <span style={{ fontSize: 9, color: "#475569" }}>{k}</span>
              <span style={{ fontSize: 9, color: k === "VIX" ? "#e2e8f0" : "#4ade80", fontWeight: 600 }}>{v}</span>
            </div>
          ))}
        </div>

        <div style={{ padding: "8px 14px 12px", borderTop: "1px solid #1e293b" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#e2e8f0" }}>Indygo Tiffany</div>
          <div style={{ fontSize: 9, color: "#C9A84C" }}>Chief Vision Officer</div>
        </div>
      </div>

      {/* MAIN */}
      <div style={S.main}>
        {/* TOPBAR */}
        <div style={S.topBar}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0" }}>☀ {greeting}, Indygo</div>
            <div style={{ fontSize: 10, color: "#C9A84C", letterSpacing: 1 }}>Focus. Execute. Win.</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={S.liveIndicator}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: loading ? "#C9A84C" : "#4ade80", boxShadow: `0 0 6px ${loading ? "#C9A84C" : "#4ade80"}` }} />
              {loading ? "Updating..." : `Live · ${lastUpdated ? lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}`}
            </div>
            <span style={{ fontSize: 11, color: "#475569" }}>{dateStr} · {timeStr}</span>
            <button onClick={fetchLiveData} style={{ background: "#C9A84C22", border: "1px solid #C9A84C44", borderRadius: 6, padding: "4px 12px", fontSize: 10, color: "#C9A84C", cursor: "pointer" }}>↻ Refresh</button>
          </div>
        </div>

        <div style={S.content}>

          {/* ═══ DASHBOARD ═══ */}
          {nav === "dashboard" && (
            <div>
              {/* STAT CARDS */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 14 }}>
                {[
                  { label: "Portfolio Value", val: "$248,362", sub: "+1.35% Today", subColor: "#4ade80" },
                  { label: "Cash Available", val: "$37,247", sub: "15.0% of Portfolio", subColor: "#64748b" },
                  { label: "Monthly Passive", val: "$4,650", sub: "Goal: $20,000", subColor: "#64748b" },
                  { label: "Portfolio Health", val: `${avgIWS}/100`, sub: avgIWS >= 90 ? "Excellent" : "Very Strong", subColor: "#4ade80" },
                  { label: "Near Fib Zones", val: fibZoneStocks.length.toString(), sub: "Within 5% of entry", subColor: "#C9A84C" },
                ].map((s, i) => (
                  <div key={i} style={S.card}>
                    <div style={S.statLabel}>{s.label}</div>
                    <div style={S.statVal}>{s.val}</div>
                    <div style={{ fontSize: 11, color: s.subColor, marginTop: 3 }}>{s.sub}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 12, marginBottom: 12 }}>
                {/* Performance */}
                <div style={S.card}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={S.cardTitle}>Portfolio Performance</div>
                    <div style={{ display: "flex", gap: 4 }}>
                      {["1D","1W","1M","3M","YTD","1Y"].map(t => (
                        <span key={t} style={{ fontSize: 9, color: t === "YTD" ? "#C9A84C" : "#475569", padding: "2px 5px", borderRadius: 3, background: t === "YTD" ? "#C9A84C22" : "transparent", cursor: "pointer" }}>{t}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: "#4ade80", letterSpacing: -1 }}>+18.62%</div>
                  <div style={{ fontSize: 10, color: "#475569", marginBottom: 10 }}>Year to Date</div>
                  <PerfChart />
                  <div style={{ display: "flex", gap: 14, marginTop: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}><div style={{ width: 16, height: 2, background: "#C9A84C" }} /><span style={{ fontSize: 9, color: "#475569" }}>PHI Portfolio</span></div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}><div style={{ width: 16, height: 2, background: "#475569", borderStyle: "dashed" }} /><span style={{ fontSize: 9, color: "#475569" }}>S&P 500</span></div>
                  </div>
                </div>
                {/* Allocation */}
                <div style={S.card}>
                  <div style={S.cardTitle}>Portfolio Allocation</div>
                  <DonutChart portfolioValue={248362} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 12, marginBottom: 12 }}>
                {/* Live Watchlist Summary */}
                <div style={S.card}>
                  <div style={S.cardTitle}>Live Watchlist · Top Holdings</div>
                  <table style={S.table}>
                    <thead>
                      <tr>{["Ticker","Company","Price","Daily %","IWS","Signal"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {watchlist.slice(0, 7).map(s => (
                        <tr key={s.ticker}>
                          <td style={{ ...S.td, color: "#C9A84C", fontWeight: 800 }}>{s.ticker}</td>
                          <td style={{ ...S.td, color: "#94a3b8", fontSize: 11 }}>{s.company.split(" ").slice(0, 2).join(" ")}</td>
                          <td style={{ ...S.td, fontWeight: 600 }}>{s.price != null ? `$${s.price.toFixed(2)}` : <span style={{ color: "#334155" }}>Loading…</span>}</td>
                          <td style={{ ...S.td, color: s.daily != null ? (s.daily >= 0 ? "#4ade80" : "#f87171") : "#475569", fontWeight: 600 }}>
                            {s.daily != null ? `${s.daily >= 0 ? "+" : ""}${s.daily.toFixed(2)}%` : "—"}
                          </td>
                          <td style={S.td}><IWSBar score={s.iws} /></td>
                          <td style={S.td}><span style={S.badge(getDecisionColor(s.decision))}>{s.decision}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* AI Morning Brief */}
                <div style={S.card}>
                  <div style={S.cardTitle}>AI Morning Brief</div>
                  {[
                    { icon: "◎", label: "Market Outlook", text: "Tech and AI infrastructure leading. Monitor Fibonacci zones for accumulation entries." },
                    { icon: "◈", label: "Key Levels", text: "SPY Resistance: 535 · Support: 510. QQQ Resistance: 460 · Support: 430." },
                    { icon: "◉", label: "Focus List", text: `${fibZoneStocks.length > 0 ? fibZoneStocks.map(s => s.ticker).join(", ") : "No stocks"} near Fib zones today.` },
                    { icon: "⚠", label: "Risk Alert", text: "Keep position sizes disciplined. Protect capital first. Opportunities always come back." },
                  ].map((item, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                      <span style={{ fontSize: 13, color: "#C9A84C", marginTop: 1 }}>{item.icon}</span>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#C9A84C", marginBottom: 2 }}>{item.label}</div>
                        <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.5 }}>{item.text}</div>
                      </div>
                    </div>
                  ))}
                  <div style={{ marginTop: 8, padding: "8px 10px", background: "#0a0e1a", borderRadius: 6, border: "1px solid #C9A84C22" }}>
                    <div style={{ fontSize: 11, color: "#C9A84C", fontStyle: "italic", lineHeight: 1.6 }}>"{PHI_PRINCIPLES[principleIdx]}"</div>
                  </div>
                </div>
              </div>

              {/* Fib Zone Alerts */}
              {fibZoneStocks.length > 0 && (
                <div style={{ ...S.card, border: "1px solid #C9A84C44", background: "#0f1020" }}>
                  <div style={{ ...S.cardTitle, color: "#C9A84C" }}>⚡ Fibonacci Zone Alerts — {fibZoneStocks.length} Stock{fibZoneStocks.length > 1 ? "s" : ""} Within Entry Range</div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {fibZoneStocks.map(s => {
                      const fibs = calcFib(s.swingHigh, s.swingLow);
                      const { dist, label } = getNearestFib(s.price, fibs);
                      return (
                        <div key={s.ticker} style={{ background: "#1a1f2e", borderRadius: 8, padding: "10px 14px", border: "1px solid #C9A84C33" }}>
                          <div style={{ fontSize: 14, fontWeight: 800, color: "#C9A84C" }}>{s.ticker}</div>
                          <div style={{ fontSize: 10, color: "#64748b" }}>{s.company}</div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0", marginTop: 4 }}>${s.price?.toFixed(2)}</div>
                          <div style={{ fontSize: 10, color: dist < 0 ? "#4ade80" : "#f87171" }}>{dist.toFixed(2)}% from {label}</div>
                          <div style={{ marginTop: 4 }}><span style={S.badge("#4ade80")}>IWS {s.iws}</span></div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ WATCHLIST ═══ */}
          {nav === "watchlist" && (
            <div>
              <div style={{ display: "flex", gap: 8, marginBottom: 14, alignItems: "center" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", flex: 1 }}>
                  Live Watchlist · {watchlist.length} Companies
                  {lastUpdated && <span style={{ fontSize: 10, color: "#475569", fontWeight: 400, marginLeft: 10 }}>Updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
                </div>
                {["ALL","CORE","GROWTH","SPEC"].map(f => (
                  <button key={f} style={S.filterBtn(watchFilter === f)} onClick={() => setWatchFilter(f)}>{f}</button>
                ))}
              </div>
              <div style={S.card}>
                <table style={S.table}>
                  <thead>
                    <tr>{["Ticker","Company","Tier","Price","Daily %","52W High","52W Low","Mkt Cap","P/E","IWS","Readiness","Signal"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {filtered.map(s => (
                      <tr key={s.ticker}>
                        <td style={{ ...S.td, color: "#C9A84C", fontWeight: 800 }}>{s.ticker}</td>
                        <td style={{ ...S.td, color: "#94a3b8", fontSize: 11 }}>{s.company}</td>
                        <td style={S.td}><span style={S.badge(getTierColor(s.tier))}>{s.tier}</span></td>
                        <td style={{ ...S.td, fontWeight: 700 }}>{s.price != null ? `$${s.price.toFixed(2)}` : <span style={{ color: "#334155" }}>—</span>}</td>
                        <td style={{ ...S.td, color: s.daily != null ? (s.daily >= 0 ? "#4ade80" : "#f87171") : "#475569", fontWeight: 600 }}>
                          {s.daily != null ? `${s.daily >= 0 ? "+" : ""}${s.daily.toFixed(2)}%` : "—"}
                        </td>
                        <td style={{ ...S.td, color: "#64748b" }}>{s.high52 != null ? `$${s.high52.toFixed(2)}` : "—"}</td>
                        <td style={{ ...S.td, color: "#64748b" }}>{s.low52 != null ? `$${s.low52.toFixed(2)}` : "—"}</td>
                        <td style={{ ...S.td, color: "#64748b", fontSize: 11 }}>{fmtBig(s.marketCap)}</td>
                        <td style={{ ...S.td, color: "#64748b" }}>{s.pe != null ? s.pe.toFixed(1) : "—"}</td>
                        <td style={S.td}><IWSBar score={s.iws} /></td>
                        <td style={{ ...S.td, color: s.buyReadiness >= 80 ? "#4ade80" : "#C9A84C", fontWeight: 600 }}>{s.buyReadiness}%</td>
                        <td style={S.td}><span style={S.badge(getDecisionColor(s.decision))}>{s.decision}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ═══ FIB ENGINE ═══ */}
          {nav === "fib" && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", marginBottom: 14 }}>Φ Fibonacci Engine · Live Prices</div>
              <div style={{ ...S.card, marginBottom: 12, background: "#0a0e1a", border: "1px solid #C9A84C33" }}>
                <div style={{ fontSize: 10, color: "#C9A84C", letterSpacing: 1, marginBottom: 4 }}>HOW TO USE</div>
                <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.6 }}>Swing High and Low are pre-filled from your PHI OS v4 data. Adjust any value — PHI recalculates all Fib levels instantly and signals when a stock enters your buy zone.</div>
              </div>
              <div style={S.card}>
                <table style={S.table}>
                  <thead>
                    <tr>{["Ticker","Live Price","Swing High","Swing Low","50%","61.8%","70%","78.6%","83.5%","88.6%","Nearest","Distance","Signal"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {watchlist.map(s => {
                      const high = fibInputs[s.ticker]?.high ?? s.swingHigh;
                      const low = fibInputs[s.ticker]?.low ?? s.swingLow;
                      const fibs = calcFib(high, low);
                      const price = s.price;
                      const { dist, label } = price ? getNearestFib(price, fibs) : { dist: null, label: "—" };
                      const inZone = dist != null && Math.abs(dist) <= 3;
                      const approaching = dist != null && Math.abs(dist) <= 5 && !inZone;
                      const sigColor = inZone ? "#4ade80" : approaching ? "#C9A84C" : "#475569";
                      const signal = inZone ? "✓ IN ZONE" : approaching ? "APPROACHING" : "ABOVE ZONE";
                      return (
                        <tr key={s.ticker} style={{ background: inZone ? "#4ade8008" : "transparent" }}>
                          <td style={{ ...S.td, color: "#C9A84C", fontWeight: 800 }}>{s.ticker}</td>
                          <td style={{ ...S.td, fontWeight: 700, color: inZone ? "#4ade80" : "#e2e8f0" }}>{price != null ? `$${price.toFixed(2)}` : "—"}</td>
                          <td style={S.td}>
                            <input style={{ ...S.input, width: 72 }} type="number" value={fibInputs[s.ticker]?.high ?? s.swingHigh}
                              onChange={e => setFibInputs(p => ({ ...p, [s.ticker]: { ...p[s.ticker], high: parseFloat(e.target.value) || 0 } }))} />
                          </td>
                          <td style={S.td}>
                            <input style={{ ...S.input, width: 72 }} type="number" value={fibInputs[s.ticker]?.low ?? s.swingLow}
                              onChange={e => setFibInputs(p => ({ ...p, [s.ticker]: { ...p[s.ticker], low: parseFloat(e.target.value) || 0 } }))} />
                          </td>
                          {[fibs.f50, fibs.f618, fibs.f70, fibs.f786, fibs.f835, fibs.f886].map((f, i) => {
                            const close = price && Math.abs(price - f) / f < 0.02;
                            return <td key={i} style={{ ...S.td, color: close ? "#C9A84C" : "#334155", fontWeight: close ? 700 : 400, fontSize: 11 }}>${f.toFixed(1)}</td>;
                          })}
                          <td style={{ ...S.td, color: "#C9A84C", fontSize: 11 }}>{label}</td>
                          <td style={{ ...S.td, color: dist != null ? (dist < 0 ? "#4ade80" : "#f87171") : "#475569", fontWeight: 600 }}>{dist != null ? `${dist.toFixed(2)}%` : "—"}</td>
                          <td style={S.td}><span style={S.badge(sigColor)}>{signal}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ═══ IWS SCORING ═══ */}
          {nav === "iws" && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", marginBottom: 14 }}>IWS Quality Scorecard</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 14 }}>
                {[
                  { label: "Avg IWS Score", val: avgIWS, color: "#C9A84C" },
                  { label: "Elite (95+)", val: BASE_WATCHLIST.filter(s => s.iws >= 95).length, color: "#C9A84C" },
                  { label: "Strong (85–94)", val: BASE_WATCHLIST.filter(s => s.iws >= 85 && s.iws < 95).length, color: "#4ade80" },
                  { label: "Watch / Spec", val: BASE_WATCHLIST.filter(s => s.iws < 85).length, color: "#60a5fa" },
                ].map((s, i) => (
                  <div key={i} style={S.card}>
                    <div style={S.statLabel}>{s.label}</div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{s.val}</div>
                  </div>
                ))}
              </div>
              <div style={S.card}>
                <table style={S.table}>
                  <thead>
                    <tr>{["Ticker","Company","Moat /20","Lead /10","Fin /15","Growth /15","Ind /10","Inst /10","Val /10","Tech /10","Total","Rating"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {BASE_WATCHLIST.map(s => {
                      const iws = IWS_SCORES.find(i => i.ticker === s.ticker);
                      const rating = getRating(s.iws);
                      return (
                        <tr key={s.ticker}>
                          <td style={{ ...S.td, color: "#C9A84C", fontWeight: 800 }}>{s.ticker}</td>
                          <td style={{ ...S.td, color: "#94a3b8", fontSize: 11 }}>{s.company}</td>
                          {iws ? [iws.moat, iws.leadership, iws.financial, iws.growth, iws.industry, iws.institutional, iws.valuation, iws.technical].map((v, i) => (
                            <td key={i} style={{ ...S.td, color: "#64748b", textAlign: "center" }}>{v}</td>
                          )) : Array(8).fill(null).map((_, i) => <td key={i} style={{ ...S.td, color: "#334155", textAlign: "center" }}>—</td>)}
                          <td style={{ ...S.td, fontWeight: 800, color: "#C9A84C", textAlign: "center" }}>{s.iws}</td>
                          <td style={S.td}><span style={S.badge(getRatingColor(rating))}>{rating}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ═══ PORTFOLIO ═══ */}
          {nav === "portfolio" && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", marginBottom: 14 }}>PHI Portfolio Tracker</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 14 }}>
                {[
                  { label: "Portfolio Value", val: "$248,362", sub: "Add positions to track live", subColor: "#C9A84C" },
                  { label: "Cash Position", val: "$37,247", sub: "15.0% — Ready to deploy", subColor: "#4ade80" },
                  { label: "2036 Goal Progress", val: "49.7%", sub: "Toward $500,000", subColor: "#60a5fa" },
                ].map((s, i) => (
                  <div key={i} style={S.card}>
                    <div style={S.statLabel}>{s.label}</div>
                    <div style={S.statVal}>{s.val}</div>
                    <div style={{ fontSize: 11, color: s.subColor, marginTop: 3 }}>{s.sub}</div>
                  </div>
                ))}
              </div>
              <div style={S.card}>
                <div style={{ textAlign: "center", padding: "28px 0 20px" }}>
                  <div style={{ fontSize: 28, color: "#C9A84C44", marginBottom: 8 }}>Φ</div>
                  <div style={{ color: "#C9A84C", fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Ready for your Schwab positions</div>
                  <div style={{ fontSize: 11, color: "#475569" }}>Add your holdings below to track live performance, allocation, and progress toward your 2036 goals.</div>
                </div>
                <table style={S.table}>
                  <thead>
                    <tr>{["Ticker","Company","Shares","Avg Cost","Current Price","Market Value","Gain/Loss $","Gain/Loss %","Target %","Notes"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    <tr>{Array(10).fill(null).map((_, i) => <td key={i} style={{ ...S.td, color: "#1e293b", textAlign: "center" }}>—</td>)}</tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ═══ PHI LOG ═══ */}
          {nav === "journal" && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", marginBottom: 14 }}>PHI Decision Journal</div>
              <div style={{ ...S.card, marginBottom: 14 }}>
                <div style={S.cardTitle}>Log a Decision</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
                  {[
                    { key: "ticker", placeholder: "Ticker", width: 80 },
                    { key: "price", placeholder: "Price", width: 80, type: "number" },
                    { key: "fibLevel", placeholder: "Fib Level", width: 90 },
                    { key: "iws", placeholder: "IWS Score", width: 90, type: "number" },
                  ].map(f => (
                    <input key={f.key} placeholder={f.placeholder} type={f.type || "text"}
                      style={{ ...S.input, width: f.width }}
                      value={journalForm[f.key]}
                      onChange={e => setJournalForm(p => ({ ...p, [f.key]: e.target.value }))} />
                  ))}
                  <select value={journalForm.decision} onChange={e => setJournalForm(p => ({ ...p, decision: e.target.value }))}
                    style={{ ...S.input, width: 90 }}>
                    {["BUY","WATCH","WAIT","SELL"].map(d => <option key={d}>{d}</option>)}
                  </select>
                  <input placeholder="Investment thesis / reasoning..." style={{ ...S.input, flex: 1, minWidth: 200 }}
                    value={journalForm.thesis} onChange={e => setJournalForm(p => ({ ...p, thesis: e.target.value }))} />
                  <button onClick={addJournalEntry}
                    style={{ background: "#C9A84C", border: "none", borderRadius: 6, padding: "6px 16px", color: "#0a0e1a", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                    + LOG ENTRY
                  </button>
                </div>
              </div>
              <div style={S.card}>
                {journalEntries.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 0", color: "#334155" }}>
                    <div style={{ fontSize: 24, marginBottom: 8 }}>◧</div>
                    <div style={{ fontSize: 12 }}>No entries yet. Every great investor documents their decisions.</div>
                    <div style={{ fontSize: 11, color: "#1e293b", marginTop: 4 }}>Years from now, you'll know exactly why every decision was made.</div>
                  </div>
                ) : (
                  <table style={S.table}>
                    <thead>
                      <tr>{["Date","Ticker","Decision","Price","Fib Level","IWS","Thesis"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {journalEntries.map(e => (
                        <tr key={e.id}>
                          <td style={{ ...S.td, color: "#475569", fontSize: 11 }}>{e.date}</td>
                          <td style={{ ...S.td, color: "#C9A84C", fontWeight: 800 }}>{e.ticker}</td>
                          <td style={S.td}><span style={S.badge(getDecisionColor(e.decision))}>{e.decision}</span></td>
                          <td style={{ ...S.td }}>{e.price ? `$${e.price}` : "—"}</td>
                          <td style={{ ...S.td, color: "#64748b" }}>{e.fibLevel || "—"}</td>
                          <td style={{ ...S.td, color: "#C9A84C", fontWeight: 600 }}>{e.iws || "—"}</td>
                          <td style={{ ...S.td, color: "#94a3b8", fontSize: 11 }}>{e.thesis}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* ═══ CONSTITUTION ═══ */}
          {nav === "constitution" && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", marginBottom: 14 }}>PHI OS Constitution</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <div style={{ ...S.card, marginBottom: 12 }}>
                    <div style={S.cardTitle}>Mission</div>
                    <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.8, fontStyle: "italic" }}>"PHI OS is the foundation that helps you identify what truly matters, eliminate the noise, build knowledge with confidence, and create lasting wealth through disciplined systems."</div>
                  </div>
                  <div style={S.card}>
                    <div style={S.cardTitle}>2036 Vision</div>
                    {[
                      { icon: "◈", label: "Portfolio Goal", val: "$500,000" },
                      { icon: "◎", label: "Monthly Passive Income", val: "$20,000/mo" },
                      { icon: "◉", label: "Businesses", val: "10 on Autopilot" },
                      { icon: "◆", label: "Family", val: "Daughter & grandsons business-ready" },
                      { icon: "◫", label: "Lifestyle", val: "Living outside America" },
                      { icon: "◧", label: "Real Estate", val: "Commercial + Residential" },
                    ].map((g, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < 5 ? "1px solid #1e293b" : "none" }}>
                        <span style={{ color: "#C9A84C" }}>{g.icon}</span>
                        <span style={{ fontSize: 11, color: "#64748b", flex: 1 }}>{g.label}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>{g.val}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={S.card}>
                  <div style={S.cardTitle}>PHI Principles</div>
                  {PHI_PRINCIPLES.map((p, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, padding: "9px 0", borderBottom: i < PHI_PRINCIPLES.length - 1 ? "1px solid #1e293b" : "none" }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: "#C9A84C", minWidth: 22 }}>0{i + 1}</span>
                      <span style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.5 }}>{p}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══ SETTINGS ═══ */}
          {nav === "settings" && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", marginBottom: 14 }}>Settings</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div style={S.card}>
                  <div style={S.cardTitle}>Goals</div>
                  {[["Portfolio Goal","$500,000"],["Monthly Passive Income","$20,000"],["Time Horizon","2036"]].map(([l, v]) => (
                    <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid #1e293b" }}>
                      <span style={{ fontSize: 12, color: "#64748b" }}>{l}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#C9A84C" }}>{v}</span>
                    </div>
                  ))}
                </div>
                <div style={S.card}>
                  <div style={S.cardTitle}>Position Sizing</div>
                  {[["Core Position","10%"],["Growth Position","5%"],["Speculative Position","2%"],["Alert Distance","3%"]].map(([l, v]) => (
                    <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid #1e293b" }}>
                      <span style={{ fontSize: 12, color: "#64748b" }}>{l}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#4ade80" }}>{v}</span>
                    </div>
                  ))}
                </div>
                <div style={{ ...S.card, gridColumn: "span 2" }}>
                  <div style={S.cardTitle}>Data Connection</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 6px #4ade80" }} />
                    <span style={{ fontSize: 12, color: "#4ade80", fontWeight: 600 }}>Twelve Data API — Connected</span>
                    <span style={{ fontSize: 11, color: "#475569", marginLeft: "auto" }}>Live prices · 19 stocks · Refreshes every 5 min</span>
                  </div>
                </div>
                <div style={{ ...S.card, gridColumn: "span 2" }}>
                  <div style={S.cardTitle}>System Info</div>
                  <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
                    {[["Founder","Indygo Tiffany"],["Title","Chief Vision Officer"],["System","PHI OS"],["Version","4.0 Master Build"],["Data","FMP API — Live"]].map(([l, v]) => (
                      <div key={l}>
                        <div style={{ fontSize: 9, color: "#475569", letterSpacing: 1, marginBottom: 3 }}>{l.toUpperCase()}</div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}


This chat ha
