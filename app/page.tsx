"use client";

import { useState } from "react";
import { SCRAPE_TARGETS, TARGET_KEYWORDS } from "@/config/targets";
import { JobMatch } from "@/types";

// Auto-read the cron secret from the public env var injected at build time.
// In Vercel: set NEXT_PUBLIC_CRON_SECRET = same value as CRON_SECRET in Project Settings.
const AUTO_CRON_SECRET = process.env.NEXT_PUBLIC_CRON_SECRET || "";

export default function Dashboard() {
  const [isRunning, setIsRunning] = useState(false);
  // Pre-fill from env var so the button works on production without manual input
  const [cronToken, setCronToken] = useState(AUTO_CRON_SECRET);
  const [scanResult, setScanResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"targets" | "keywords" | "results">("targets");
  const isAutoFilled = !!AUTO_CRON_SECRET;

  const handleRunManualScan = async () => {
    setIsRunning(true);
    setScanResult(null);
    try {
      const headers: Record<string, string> = {};
      if (cronToken) {
        headers["Authorization"] = `Bearer ${cronToken}`;
      }

      const res = await fetch("/api/cron/check-jobs", {
        method: "POST",
        headers,
      });

      const data = await res.json();
      setScanResult(data);
      setActiveTab("results");
    } catch (err: any) {
      setScanResult({
        success: false,
        error: err?.message || "Failed to trigger scan",
      });
      setActiveTab("results");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 20px" }}>
      {/* Header Banner */}
      <div
        className="glass-panel"
        style={{
          padding: "32px",
          marginBottom: "28px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "20px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <span style={{ fontSize: "28px" }}>🦅</span>
              <h1 style={{ fontSize: "28px", fontWeight: "800", letterSpacing: "-0.03em" }}>
                Uttarakhand Job Sentinel
              </h1>
              <span
                style={{
                  background: "rgba(16, 185, 129, 0.2)",
                  color: "#10b981",
                  border: "1px solid rgba(16, 185, 129, 0.4)",
                  padding: "3px 10px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: "700",
                }}
              >
                DAILY CRON ACTIVE
              </span>
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "15px", maxWidth: "700px" }}>
              Production-ready serverless vigilance engine scanning 8 state co-operative portals, High Court, and UKPSC daily at <b>10:00 AM IST (04:30 AM UTC)</b> with instantaneous rich Telegram alerts.
            </p>
          </div>

          <div
            style={{
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid var(--border-color)",
              padding: "16px 20px",
              borderRadius: "12px",
              minWidth: "260px",
            }}
          >
            <div style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: "700", letterSpacing: "0.05em", marginBottom: "4px" }}>
              Cron Cadence
            </div>
            <div style={{ fontSize: "18px", fontWeight: "700", color: "#38bdf8" }}>
              Every Day at 10:00 AM IST
            </div>
            <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
              Vercel Cron: <code>30 4 * * *</code> (04:30 UTC)
            </div>
          </div>
        </div>

        {/* Trigger Bar */}
        <div
          style={{
            marginTop: "28px",
            paddingTop: "24px",
            borderTop: "1px solid var(--border-color)",
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "14px",
          }}
        >
          <div style={{ flex: "1", minWidth: "260px" }}>
            {isAutoFilled ? (
              // Production: secret is pre-configured, show a locked indicator
              <div
                style={{
                  width: "100%",
                  background: "rgba(16, 185, 129, 0.08)",
                  border: "1px solid rgba(16, 185, 129, 0.35)",
                  padding: "11px 16px",
                  borderRadius: "8px",
                  color: "#10b981",
                  fontSize: "14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span>🔐</span>
                <span style={{ fontWeight: "600" }}>CRON_SECRET auto-configured from environment</span>
              </div>
            ) : (
              // Local dev: show password input for manual entry
              <input
                type="password"
                placeholder="Enter CRON_SECRET (required on production)"
                value={cronToken}
                onChange={(e) => setCronToken(e.target.value)}
                style={{
                  width: "100%",
                  background: "rgba(0, 0, 0, 0.35)",
                  border: "1px solid var(--border-color)",
                  padding: "11px 16px",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: "14px",
                  outline: "none",
                }}
              />
            )}
          </div>

          <button
            onClick={handleRunManualScan}
            disabled={isRunning}
            style={{
              background: isRunning
                ? "#4b5563"
                : "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)",
              color: "#fff",
              border: "none",
              padding: "12px 26px",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "700",
              cursor: isRunning ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 4px 14px rgba(6, 182, 212, 0.3)",
              transition: "transform 0.15s ease",
            }}
          >
            {isRunning ? (
              <>
                <span className="spinner" style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⏳</span>
                Scanning All 8 Portals...
              </>
            ) : (
              <>
                <span>⚡</span> Run Immediate Sweep & Test Telegram
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <button
          onClick={() => setActiveTab("targets")}
          style={{
            background: activeTab === "targets" ? "rgba(6, 182, 212, 0.18)" : "transparent",
            color: activeTab === "targets" ? "#38bdf8" : "var(--text-muted)",
            border: activeTab === "targets" ? "1px solid rgba(6, 182, 212, 0.4)" : "1px solid transparent",
            padding: "8px 18px",
            borderRadius: "8px",
            fontWeight: "600",
            fontSize: "14px",
            cursor: "pointer",
          }}
        >
          Target Portals ({SCRAPE_TARGETS.length})
        </button>

        <button
          onClick={() => setActiveTab("keywords")}
          style={{
            background: activeTab === "keywords" ? "rgba(6, 182, 212, 0.18)" : "transparent",
            color: activeTab === "keywords" ? "#38bdf8" : "var(--text-muted)",
            border: activeTab === "keywords" ? "1px solid rgba(6, 182, 212, 0.4)" : "1px solid transparent",
            padding: "8px 18px",
            borderRadius: "8px",
            fontWeight: "600",
            fontSize: "14px",
            cursor: "pointer",
          }}
        >
          Role Keywords ({TARGET_KEYWORDS.length})
        </button>

        <button
          onClick={() => setActiveTab("results")}
          style={{
            background: activeTab === "results" ? "rgba(6, 182, 212, 0.18)" : "transparent",
            color: activeTab === "results" ? "#38bdf8" : "var(--text-muted)",
            border: activeTab === "results" ? "1px solid rgba(6, 182, 212, 0.4)" : "1px solid transparent",
            padding: "8px 18px",
            borderRadius: "8px",
            fontWeight: "600",
            fontSize: "14px",
            cursor: "pointer",
          }}
        >
          Scan Output {scanResult ? `(${scanResult.matches?.length ?? 0} matches)` : ""}
        </button>
      </div>

      {/* Tab 1: Targets */}
      {activeTab === "targets" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "16px" }}>
          {SCRAPE_TARGETS.map((target, idx) => (
            <div key={target.id} className="glass-panel" style={{ padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "12px", fontWeight: "700", color: "#38bdf8" }}>
                  TARGET #{idx + 1}
                </span>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: "700",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    background: "rgba(255, 255, 255, 0.08)",
                    textTransform: "uppercase",
                  }}
                >
                  {target.category}
                </span>
              </div>
              <h3 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "6px" }}>
                {target.name}
              </h3>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "12px" }}>
                {target.description}
              </p>
              <a
                href={target.url}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: "12px", wordBreak: "break-all" }}
              >
                ↗ {target.url}
              </a>
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: Keywords */}
      {activeTab === "keywords" && (
        <div className="glass-panel" style={{ padding: "24px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "16px" }}>
            Vigilance Keyword Matrix (Filtered for BTech CS, PO & High Court ARO tracks)
          </h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            {TARGET_KEYWORDS.map((k) => (
              <div
                key={k.keyword}
                style={{
                  background:
                    k.category === "BANK_TECH"
                      ? "rgba(6, 182, 212, 0.15)"
                      : k.category === "HIGH_COURT"
                      ? "rgba(168, 85, 247, 0.15)"
                      : "rgba(59, 130, 246, 0.15)",
                  border: `1px solid ${
                    k.category === "BANK_TECH"
                      ? "rgba(6, 182, 212, 0.35)"
                      : k.category === "HIGH_COURT"
                      ? "rgba(168, 85, 247, 0.35)"
                      : "rgba(59, 130, 246, 0.35)"
                  }`,
                  padding: "6px 14px",
                  borderRadius: "20px",
                  fontSize: "13px",
                  fontWeight: "600",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span>{k.keyword}</span>
                {k.exactWordBoundary && (
                  <span style={{ fontSize: "10px", opacity: 0.7, background: "rgba(0,0,0,0.3)", padding: "1px 5px", borderRadius: "4px" }}>
                    exact \b
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Scan Results */}
      {activeTab === "results" && (
        <div className="glass-panel" style={{ padding: "24px" }}>
          {!scanResult ? (
            <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
              No scan has been run in this session yet. Click the <b>"Run Immediate Sweep"</b> button above to execute a real-time crawl.
            </div>
          ) : scanResult.error ? (
            <div style={{ background: "rgba(244, 63, 94, 0.15)", border: "1px solid rgba(244, 63, 94, 0.4)", padding: "20px", borderRadius: "8px" }}>
              <h3 style={{ color: "#f43f5e", fontSize: "16px", fontWeight: "700", marginBottom: "6px" }}>Scan Failed</h3>
              <p style={{ color: "#fecdd3", fontSize: "14px" }}>{scanResult.error}</p>
            </div>
          ) : (
            <div>
              {/* Summary Stats */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px", marginBottom: "24px" }}>
                <div style={{ background: "rgba(255,255,255,0.03)", padding: "14px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Execution Time</div>
                  <div style={{ fontSize: "18px", fontWeight: "700", color: "#38bdf8" }}>{scanResult.durationMs} ms</div>
                </div>
                <div style={{ background: "rgba(255,255,255,0.03)", padding: "14px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Portals Scanned</div>
                  <div style={{ fontSize: "18px", fontWeight: "700", color: "#10b981" }}>
                    {scanResult.summary.successfulTargets} / {scanResult.summary.totalTargets}
                  </div>
                </div>
                <div style={{ background: "rgba(255,255,255,0.03)", padding: "14px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Discovered Matches</div>
                  <div style={{ fontSize: "18px", fontWeight: "700", color: "#f59e0b" }}>
                    {scanResult.summary.totalMatches}
                  </div>
                </div>
                <div style={{ background: "rgba(255,255,255,0.03)", padding: "14px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Telegram Dispatch</div>
                  <div style={{ fontSize: "18px", fontWeight: "700", color: scanResult.telegram?.sent ? "#10b981" : "#9ca3af" }}>
                    {scanResult.telegram?.sent ? "✅ Sent" : scanResult.telegram?.error ? "❌ Config Missing" : "Heartbeat Off"}
                  </div>
                </div>
              </div>

              {/* Matches List */}
              <h3 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "14px" }}>
                Identified Recruitment Matches ({scanResult.matches?.length || 0})
              </h3>

              {scanResult.matches?.length === 0 ? (
                <div style={{ padding: "20px", background: "rgba(255,255,255,0.02)", borderRadius: "8px", color: "var(--text-muted)", fontSize: "14px" }}>
                  No active recruitment notices currently match the configured keywords. The daily 10:00 AM IST cron will continuously monitor for updates.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {scanResult.matches.map((m: JobMatch, i: number) => (
                    <div
                      key={i}
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid var(--border-color)",
                        padding: "16px",
                        borderRadius: "8px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <span style={{ fontSize: "12px", fontWeight: "700", color: "#38bdf8" }}>
                          {m.targetName}
                        </span>
                        <span
                          style={{
                            fontSize: "11px",
                            padding: "2px 8px",
                            borderRadius: "4px",
                            background: m.sourceType === "PDF" ? "rgba(244, 63, 94, 0.2)" : "rgba(6, 182, 212, 0.2)",
                            color: m.sourceType === "PDF" ? "#f43f5e" : "#06b6d4",
                            fontWeight: "700",
                          }}
                        >
                          {m.sourceType}
                        </span>
                      </div>
                      <div style={{ fontSize: "15px", fontWeight: "600", marginBottom: "4px" }}>
                        Role: <code>{m.matchedKeyword}</code>
                      </div>
                      <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "8px" }}>
                        {m.contextText}
                      </p>
                      {m.fileName && (
                        <div style={{ fontSize: "12px", color: "#9ca3af", marginBottom: "8px" }}>
                          File: <code>{m.fileName}</code>
                        </div>
                      )}
                      <a
                        href={m.linkUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: "13px", fontWeight: "600" }}
                      >
                        ↗ Open Source Link / Download PDF
                      </a>
                    </div>
                  ))}
                </div>
              )}

              {/* Portal Health Breakdown */}
              <h3 style={{ fontSize: "16px", fontWeight: "700", marginTop: "28px", marginBottom: "14px" }}>
                Target Portal Health & Latency
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "10px" }}>
                {scanResult.portalStatuses?.map((p: any) => (
                  <div
                    key={p.id}
                    style={{
                      background: "rgba(0,0,0,0.35)",
                      border: "1px solid var(--border-color)",
                      padding: "16px",
                      borderRadius: "8px",
                      fontSize: "13px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: "8px",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", marginBottom: "6px" }}>
                        <span style={{ fontWeight: "700", fontSize: "14px", color: "#f3f4f6" }}>{p.name}</span>
                        <span style={{ color: p.status === "SUCCESS" ? "#10b981" : "#f43f5e", fontWeight: "700", fontSize: "11px", background: p.status === "SUCCESS" ? "rgba(16, 185, 129, 0.15)" : "rgba(244, 63, 94, 0.15)", padding: "2px 8px", borderRadius: "4px" }}>
                          {p.status}
                        </span>
                      </div>
                      <div style={{ color: "var(--text-muted)", fontSize: "12px", marginBottom: "8px" }}>
                        ⚡ Latency: <b>{p.durationMs}ms</b> | 🎯 Matches: <b>{p.matchesFound}</b>
                      </div>
                    </div>
                    {p.error && (
                      <div style={{ color: "#f43f5e", fontSize: "11px", marginBottom: "6px" }}>
                        Error: {p.error}
                      </div>
                    )}
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#38bdf8",
                        wordBreak: "break-all",
                        marginTop: "auto",
                        paddingTop: "6px",
                        borderTop: "1px solid rgba(255, 255, 255, 0.05)",
                      }}
                    >
                      ↗ Open Portal ({p.url})
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
