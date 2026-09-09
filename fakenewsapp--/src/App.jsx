import { useState, useRef, useEffect } from "react";



const EXAMPLE_ARTICLES = [
  {
    label: "Suspicious headline",
    text: "SHOCKING: Scientists CONFIRM that drinking coffee every morning CURES cancer — big pharma doesn't want you to know this secret they've been hiding for decades!!",
  },
  {
    label: "Credible news",
    text: "The Federal Reserve raised interest rates by 25 basis points on Wednesday, citing persistent inflation concerns. Fed Chair Jerome Powell stated in a press conference that policymakers remain committed to returning inflation to the 2% target.",
  },
  {
    label: "Ambiguous claim",
    text: "A new study from researchers suggests that social media use is linked to increased anxiety in teenagers. The findings, based on a survey of 1,200 students, were published in a peer-reviewed journal last month.",
  },
];

const scoreColor = (score) => {
  if (score >= 70) return "#22c55e";
  if (score >= 40) return "#f59e0b";
  return "#ef4444";
};

const verdictConfig = {
  REAL: { bg: "#052e16", text: "#bbf7d0", border: "#166534", icon: "✓", label: "VERIFIED REAL" },
  FAKE: { bg: "#450a0a", text: "#fecaca", border: "#991b1b", icon: "✗", label: "LIKELY FAKE" },
  UNCERTAIN: { bg: "#1c1917", text: "#fef3c7", border: "#92400e", icon: "?", label: "UNCERTAIN" },
};

const signalColors = {
  red: { bg: "#450a0a", text: "#fca5a5", dot: "#ef4444" },
  yellow: { bg: "#1c1403", text: "#fde68a", dot: "#f59e0b" },
  green: { bg: "#052e16", text: "#86efac", dot: "#22c55e" },
};

function RadarChart({ breakdown }) {
  const keys = Object.keys(breakdown);
  const labels = { language: "Language", sourcing: "Sourcing", logic: "Logic", factual: "Factual", structure: "Structure" };
  const cx = 110, cy = 110, r = 80;
  const n = keys.length;

  const angleFor = (i) => (i * 2 * Math.PI) / n - Math.PI / 2;

  const gridLevels = [20, 40, 60, 80, 100];
  const gridPolygons = gridLevels.map((lvl) => {
    const pts = keys.map((_, i) => {
      const a = angleFor(i);
      const rr = (r * lvl) / 100;
      return `${cx + rr * Math.cos(a)},${cy + rr * Math.sin(a)}`;
    });
    return pts.join(" ");
  });

  const dataPoints = keys.map((k, i) => {
    const a = angleFor(i);
    const rr = (r * breakdown[k]) / 100;
    return `${cx + rr * Math.cos(a)},${cy + rr * Math.sin(a)}`;
  });

  const labelPts = keys.map((_, i) => {
    const a = angleFor(i);
    return { x: cx + (r + 22) * Math.cos(a), y: cy + (r + 22) * Math.sin(a), label: labels[keys[i]], val: breakdown[keys[i]] };
  });

  return (
    <svg width="220" height="220" style={{ display: "block", margin: "0 auto" }}>
      {gridPolygons.map((pts, i) => (
        <polygon key={i} points={pts} fill="none" stroke="#374151" strokeWidth="0.5" />
      ))}
      {keys.map((_, i) => {
        const a = angleFor(i);
        return <line key={i} x1={cx} y1={cy} x2={cx + r * Math.cos(a)} y2={cy + r * Math.sin(a)} stroke="#374151" strokeWidth="0.5" />;
      })}
      <polygon points={dataPoints.join(" ")} fill="rgba(59,130,246,0.2)" stroke="#3b82f6" strokeWidth="1.5" />
      {dataPoints.map((pt, i) => {
        const [x, y] = pt.split(",").map(Number);
        return <circle key={i} cx={x} cy={y} r="3" fill="#3b82f6" />;
      })}
      {labelPts.map((lp, i) => (
        <g key={i}>
          <text x={lp.x} y={lp.y - 4} textAnchor="middle" fontSize="8" fill="#9ca3af" fontFamily="monospace">{lp.label}</text>
          <text x={lp.x} y={lp.y + 7} textAnchor="middle" fontSize="9" fill={scoreColor(lp.val)} fontFamily="monospace" fontWeight="600">{lp.val}</text>
        </g>
      ))}
    </svg>
  );
}

function ConfidenceBar({ value, verdict }) {
  const colors = { REAL: "#22c55e", FAKE: "#ef4444", UNCERTAIN: "#f59e0b" };
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 10, color: "#6b7280", letterSpacing: "0.1em", fontFamily: "monospace" }}>CONFIDENCE</span>
        <span style={{ fontSize: 12, color: colors[verdict] || "#fff", fontFamily: "monospace", fontWeight: 700 }}>{value}%</span>
      </div>
      <div style={{ height: 4, background: "#1f2937", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${value}%`, background: colors[verdict] || "#3b82f6", borderRadius: 2, transition: "width 1s ease" }} />
      </div>
    </div>
  );
}

function HistoryItem({ item, onReload }) {
  const v = verdictConfig[item.result?.verdict] || {};
  return (
    <div
      onClick={() => onReload(item)}
      style={{ padding: "10px 12px", borderBottom: "1px solid #1f2937", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, transition: "background 0.15s" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "#111827")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <span style={{ fontSize: 14, color: v.text, background: v.bg, border: `1px solid ${v.border}`, borderRadius: 4, padding: "1px 6px", fontFamily: "monospace", fontWeight: 700, flexShrink: 0 }}>{item.result?.verdict?.[0]}</span>
      <span style={{ fontSize: 11, color: "#9ca3af", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.text.slice(0, 55)}…</span>
    </div>
  );
}

export default function App() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useState("input");
  const textareaRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem("fnc_history");
    if (saved) {
      try { setHistory(JSON.parse(saved)); } catch {}
    }
  }, []);

  const saveHistory = (newHistory) => {
    setHistory(newHistory);
    localStorage.setItem("fnc_history", JSON.stringify(newHistory.slice(0, 20)));
  };

 const analyze = async (inputText) => {

  const t = (inputText || text).trim();

  if (!t) return;

  setLoading(true);
  setResult(null);
  setError("");
  setActiveTab("result");

  try {

    const response = await fetch(
      " https://fake-news-detector-fullstack.onrender.com/analyze",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: t,
        }),
      }
    );

    const data = await response.json();

    console.log("BACKEND RESPONSE:", data);

    // IMPORTANT
    // frontend expects direct JSON object
    setResult(data);

    const newHistory = [
      {
        text: t,
        result: data,
        ts: Date.now(),
      },
      ...history,
    ].slice(0, 20);

    saveHistory(newHistory);

  } catch (e) {

    console.error(e);

    setError(
      e.message || "Analysis failed"
    );

    setActiveTab("input");
  }

  setLoading(false);
};

  const reset = () => {
    setText("");
    setResult(null);
    setError("");
    setActiveTab("input");
  };

  const loadExample = (ex) => {
    setText(ex.text);
    setActiveTab("input");
    textareaRef.current?.focus();
  };

  const reloadHistory = (item) => {
    setText(item.text);
    setResult(item.result);
    setActiveTab("result");
  };

  const vcfg = result ? verdictConfig[result.verdict] || {} : {};

  return (
    <div style={{ minHeight: "100vh", background: "#030712", color: "#f9fafb", fontFamily: "'JetBrains Mono', 'Fira Code', monospace", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <header style={{ borderBottom: "1px solid #1f2937", padding: "0 24px", display: "flex", alignItems: "center", gap: 16, height: 56 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, background: "#1d4ed8", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700 }}>N</div>
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.15em", color: "#f3f4f6" }}>NEWSVERIFY</span>
          <span style={{ fontSize: 10, color: "#4b5563", letterSpacing: "0.1em" }}>// AI CLASSIFIER</span>
        </div>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 10, color: "#374151", letterSpacing: "0.08em" }}>POWERED BY GROQ</span>
      </header>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Sidebar */}
        <aside style={{ width: 220, borderRight: "1px solid #1f2937", display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <div style={{ padding: "12px 14px", borderBottom: "1px solid #111827" }}>
            <div style={{ fontSize: 9, color: "#4b5563", letterSpacing: "0.12em", marginBottom: 8 }}>QUICK EXAMPLES</div>
            {EXAMPLE_ARTICLES.map((ex, i) => (
              <button key={i} onClick={() => loadExample(ex)} style={{ display: "block", width: "100%", textAlign: "left", background: "transparent", border: "1px solid #1f2937", borderRadius: 4, padding: "6px 8px", marginBottom: 4, cursor: "pointer", color: "#9ca3af", fontSize: 10, lineHeight: 1.4 }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#374151"; e.currentTarget.style.color = "#d1d5db"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#1f2937"; e.currentTarget.style.color = "#9ca3af"; }}>
                {ex.label}
              </button>
            ))}
          </div>

          <div style={{ padding: "12px 14px", flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 9, color: "#4b5563", letterSpacing: "0.12em", marginBottom: 6, display: "flex", justifyContent: "space-between" }}>
              <span>HISTORY</span>
              {history.length > 0 && <span style={{ cursor: "pointer", color: "#374151" }} onClick={() => saveHistory([])}>CLEAR</span>}
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {history.length === 0 ? (
                <div style={{ fontSize: 10, color: "#374151", marginTop: 8 }}>No analyses yet.</div>
              ) : (
                history.map((item, i) => <HistoryItem key={i} item={item} onReload={reloadHistory} />)
              )}
            </div>
          </div>
        </aside>

        {/* Main */}
        <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Tabs */}
          <div style={{ borderBottom: "1px solid #1f2937", display: "flex" }}>
            {["input", "result"].map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                style={{ padding: "12px 20px", background: "transparent", border: "none", borderBottom: activeTab === tab ? "2px solid #3b82f6" : "2px solid transparent", color: activeTab === tab ? "#f9fafb" : "#6b7280", fontSize: 11, letterSpacing: "0.1em", cursor: "pointer", transition: "all 0.15s" }}>
                {tab.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Input Tab */}
          {activeTab === "input" && (
            <div style={{ flex: 1, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ fontSize: 10, color: "#4b5563", letterSpacing: "0.1em" }}>PASTE ARTICLE, HEADLINE, OR CLAIM BELOW</div>
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={"Enter any news headline, article excerpt, or claim to analyze...\n\nExamples:\n• A full article from a news site\n• A viral social media post\n• A suspicious WhatsApp message\n• A breaking news headline"}
                style={{ flex: 1, background: "#0f172a", border: "1px solid #1f2937", borderRadius: 8, color: "#d1d5db", fontSize: 12, padding: 16, resize: "none", outline: "none", lineHeight: 1.7, fontFamily: "inherit" }}
                onFocus={(e) => (e.target.style.borderColor = "#374151")}
                onBlur={(e) => (e.target.style.borderColor = "#1f2937")}
              />
              {error && <div style={{ fontSize: 11, color: "#f87171", background: "#450a0a", border: "1px solid #991b1b", borderRadius: 6, padding: "8px 12px" }}>{error}</div>}
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <button onClick={() => analyze()} disabled={loading || !text.trim()}
                  style={{ background: text.trim() && !loading ? "#1d4ed8" : "#1e3a5f", color: text.trim() && !loading ? "#eff6ff" : "#4b5563", border: "none", borderRadius: 6, padding: "10px 24px", fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", cursor: text.trim() && !loading ? "pointer" : "not-allowed", transition: "background 0.2s" }}>
                  {loading ? "ANALYZING..." : "ANALYZE →"}
                </button>
                {text && <button onClick={reset} style={{ background: "transparent", border: "1px solid #1f2937", borderRadius: 6, padding: "10px 16px", fontSize: 11, color: "#6b7280", cursor: "pointer" }}>CLEAR</button>}
                <span style={{ fontSize: 10, color: "#374151", marginLeft: "auto" }}>{text.length} chars</span>
              </div>
            </div>
          )}

          {/* Result Tab */}
          {activeTab === "result" && (
            <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
              {loading && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh", gap: 16 }}>
                  <div style={{ width: 40, height: 40, border: "2px solid #1f2937", borderTop: "2px solid #3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                  <div style={{ fontSize: 11, color: "#4b5563", letterSpacing: "0.12em" }}>RUNNING ANALYSIS...</div>
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
              )}

              {!loading && !result && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh", gap: 12 }}>
                  <div style={{ fontSize: 32 }}>📰</div>
                  <div style={{ fontSize: 11, color: "#374151", letterSpacing: "0.1em" }}>NO ANALYSIS YET</div>
                  <button onClick={() => setActiveTab("input")} style={{ background: "transparent", border: "1px solid #374151", borderRadius: 6, padding: "8px 16px", fontSize: 11, color: "#6b7280", cursor: "pointer", marginTop: 8 }}>← GO TO INPUT</button>
                </div>
              )}

              {!loading && result && (
                <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 720 }}>
                  {/* Verdict Banner */}
                  <div style={{ background: vcfg.bg, border: `1px solid ${vcfg.border}`, borderRadius: 10, padding: "20px 24px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ width: 48, height: 48, borderRadius: "50%", border: `2px solid ${vcfg.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: vcfg.text, fontWeight: 700 }}>{vcfg.icon}</div>
                      <div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: vcfg.text, letterSpacing: "0.1em" }}>{vcfg.label}</div>
                        <div style={{ fontSize: 12, color: vcfg.text, opacity: 0.75, marginTop: 2 }}>{result.summary}</div>
                      </div>
                    </div>
                    <ConfidenceBar value={result.confidence} verdict={result.verdict} />
                  </div>

                  {/* Two-col layout */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    {/* Signals */}
                    <div style={{ background: "#0f172a", border: "1px solid #1f2937", borderRadius: 8, padding: 16 }}>
                      <div style={{ fontSize: 9, color: "#4b5563", letterSpacing: "0.12em", marginBottom: 12 }}>SIGNALS DETECTED</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {result.signals?.map((sig, i) => {
                          const sc = signalColors[sig.type] || signalColors.yellow;
                          return (
                            <div key={i} style={{ background: sc.bg, border: `1px solid ${sc.dot}22`, borderRadius: 6, padding: "8px 10px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                                <div style={{ width: 6, height: 6, borderRadius: "50%", background: sc.dot, flexShrink: 0 }} />
                                <span style={{ fontSize: 10, fontWeight: 700, color: sc.text, letterSpacing: "0.06em" }}>{sig.label}</span>
                              </div>
                              <div style={{ fontSize: 10, color: sc.text, opacity: 0.8, lineHeight: 1.5, paddingLeft: 12 }}>{sig.detail}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Radar */}
                    <div style={{ background: "#0f172a", border: "1px solid #1f2937", borderRadius: 8, padding: 16 }}>
                      <div style={{ fontSize: 9, color: "#4b5563", letterSpacing: "0.12em", marginBottom: 8 }}>CREDIBILITY BREAKDOWN</div>
                      <RadarChart breakdown={result.breakdown} />
                    </div>
                  </div>

                  {/* Score bars */}
                  <div style={{ background: "#0f172a", border: "1px solid #1f2937", borderRadius: 8, padding: 16 }}>
                    <div style={{ fontSize: 9, color: "#4b5563", letterSpacing: "0.12em", marginBottom: 12 }}>DIMENSION SCORES</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {Object.entries(result.breakdown || {}).map(([key, val]) => (
                        <div key={key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ width: 70, fontSize: 9, color: "#6b7280", letterSpacing: "0.06em", textTransform: "uppercase", textAlign: "right" }}>{key}</div>
                          <div style={{ flex: 1, height: 3, background: "#1f2937", borderRadius: 2 }}>
                            <div style={{ height: "100%", width: `${val}%`, background: scoreColor(val), borderRadius: 2, transition: "width 0.8s ease" }} />
                          </div>
                          <div style={{ width: 28, fontSize: 10, color: scoreColor(val), fontWeight: 700, textAlign: "right" }}>{val}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recommendation */}
                  <div style={{ background: "#0c1a35", border: "1px solid #1e3a5f", borderRadius: 8, padding: "12px 16px", display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 14, flexShrink: 0 }}>💡</span>
                    <div>
                      <div style={{ fontSize: 9, color: "#3b82f6", letterSpacing: "0.12em", marginBottom: 4 }}>RECOMMENDATION</div>
                      <div style={{ fontSize: 11, color: "#bfdbfe", lineHeight: 1.6 }}>{result.recommendation}</div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={() => setActiveTab("input")} style={{ background: "transparent", border: "1px solid #374151", borderRadius: 6, padding: "8px 16px", fontSize: 11, color: "#6b7280", cursor: "pointer" }}>← ANALYZE ANOTHER</button>
                    <button onClick={reset} style={{ background: "transparent", border: "1px solid #374151", borderRadius: 6, padding: "8px 16px", fontSize: 11, color: "#6b7280", cursor: "pointer" }}>RESET</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
