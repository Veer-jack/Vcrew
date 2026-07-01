import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import { Btn } from "../components/ui";
import { vapi } from "../vapi/client";

export default function MissionBrief() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [mission, setMission] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [agreed, setAgreed] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await vapi.get(`/v/missions/${id}/brief`);
        setMission(data.mission);
        setTasks(data.tasks || []);
      } catch {
        // mock fallback
        setMission({
          name: "Subscription App — Beta Test",
          brand: "Kettle & Co",
          description: "We're validating our subscription app before launch. You'll test the core shopping flow, checkout, and account management.",
          brief_url: "https://testflight.apple.com/join/example",
          brief_credentials: "test@example.com / TestPass123",
          ptype: "ptest",
        });
        setTasks([
          { id: 1, title: "Sign up & onboarding", severity: "crit", min_time_seconds: 180 },
          { id: 2, title: "Core product discovery", severity: "crit", min_time_seconds: 240 },
          { id: 3, title: "First purchase / conversion", severity: "imp", min_time_seconds: 180 },
          { id: 4, title: "Overall feedback", severity: "imp", min_time_seconds: 120 },
        ]);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <div className="page rise"><div className="muted">Loading brief…</div></div>;

  const totalMins = Math.ceil(tasks.reduce((a, t) => a + (t.min_time_seconds || 120), 0) / 60);
  const SEV = { crit: { l: "Critical", bg: "var(--danger-weak)", color: "var(--danger)" }, imp: { l: "Important", bg: "var(--warning-weak)", color: "var(--warning)" }, nice: { l: "Nice to have", bg: "var(--success-weak)", color: "var(--success)" } };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "24px 16px" }}>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        {/* Nav */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 28 }}>
          {step > 0 && (
            <button className="btn btn-quiet" style={{ marginLeft: -8, padding: "7px 10px" }} onClick={() => setStep(0)}>
              <Icon name="arrowLeft" size={15} /> Back
            </button>
          )}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 22, height: 22, borderRadius: 6, background: "var(--accent)", display: "grid", placeItems: "center" }}>
              <Icon name="check" size={12} style={{ color: "#fff" }} />
            </span>
            <span style={{ fontWeight: 700, fontSize: 13.5, letterSpacing: "-.01em" }}>ValidationCrew</span>
          </div>
        </div>

        {/* Step tracker */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 32 }}>
          {["Your access", "Mission overview"].map((l, i) => [
            i > 0 && <div key={`b${i}`} style={{ flex: 1, height: 2, background: i <= step ? "var(--accent)" : "var(--border)", margin: "0 8px", transition: "background .3s" }} />,
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 13,
                background: i < step ? "var(--accent)" : i === step ? "var(--accent)" : "var(--panel)",
                border: `2px solid ${i <= step ? "var(--accent)" : "var(--border)"}`,
                color: i <= step ? "#fff" : "var(--text-faint)",
              }}>
                {i < step ? <Icon name="check" size={14} style={{ color: "#fff" }} /> : i + 1}
              </div>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: i === step ? "var(--text)" : "var(--text-faint)" }}>{l}</span>
            </div>
          ])}
        </div>

        {step === 0 ? (
          <div className="rise">
            <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 6px" }}>Mission accepted — here's your access</h2>
            <p style={{ color: "var(--text-muted)", margin: "0 0 24px", fontSize: 15 }}>Keep all product details confidential. Do not share access credentials or product information.</p>

            {/* App link */}
            {mission?.brief_url && (
              <div className="card" style={{ padding: 20, marginBottom: 14 }}>
                <div className="eyebrow" style={{ marginBottom: 12 }}>App / product link</div>
                <a href={mission.brief_url} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "var(--accent-weak)", borderRadius: "var(--radius-sm)", border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)", textDecoration: "none" }}>
                  <Icon name="link" size={18} style={{ color: "var(--accent)", flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "var(--accent)" }}>Open product</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{mission.brief_url}</div>
                  </div>
                  <Icon name="externalLink" size={14} style={{ color: "var(--accent)", flexShrink: 0 }} />
                </a>
              </div>
            )}

            {/* Test credentials */}
            {mission?.brief_credentials && (
              <div className="card" style={{ padding: 20, marginBottom: 14 }}>
                <div className="eyebrow" style={{ marginBottom: 12 }}>Test credentials</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "var(--panel-inset)", borderRadius: "var(--radius-sm)", fontFamily: "var(--mono)", fontSize: 13 }}>
                  <span style={{ flex: 1, filter: revealed ? "none" : "blur(5px)", userSelect: revealed ? "text" : "none", transition: "filter .2s" }}>
                    {mission.brief_credentials}
                  </span>
                  <button className="btn btn-quiet" style={{ fontSize: 12, flexShrink: 0 }} onClick={() => setRevealed(r => !r)}>
                    <Icon name={revealed ? "eyeOff" : "eye"} size={14} /> {revealed ? "Hide" : "Reveal"}
                  </button>
                </div>
              </div>
            )}

            {/* NDA checkbox */}
            <div className="card" style={{ padding: 20, marginBottom: 24 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer" }} onClick={() => setAgreed(a => !a)}>
                <div style={{
                  width: 22, height: 22, borderRadius: 7, flexShrink: 0, display: "grid", placeItems: "center", marginTop: 1,
                  background: agreed ? "var(--accent)" : "var(--panel)", border: `1.5px solid ${agreed ? "var(--accent)" : "var(--border-strong)"}`,
                  transition: "all .15s",
                }}>
                  {agreed && <Icon name="check" size={13} style={{ color: "#fff" }} />}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Confidentiality agreement</div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>I agree to keep this product, its features, and all access details confidential. I will not share screenshots, links, or information about this product with anyone outside of ValidationCrew.</div>
                </div>
              </div>
            </div>

            <Btn variant="primary" block disabled={!agreed} onClick={() => setStep(1)} style={{ justifyContent: "center" }}>
              I'm ready → <Icon name="arrowRight" size={16} />
            </Btn>
          </div>
        ) : (
          <div className="rise">
            <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 6px" }}>Mission overview</h2>
            <p style={{ color: "var(--text-muted)", margin: "0 0 24px", fontSize: 15 }}>Read through the brief before starting. You can return to this page any time.</p>

            {/* Mission card */}
            <div className="card" style={{ padding: 20, marginBottom: 14 }}>
              <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--accent)", display: "grid", placeItems: "center", flexShrink: 0, fontWeight: 800, fontSize: 18, color: "#fff" }}>
                  {(mission?.brand || "V")[0]}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 3 }}>{mission?.name}</div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{mission?.brand}</div>
                </div>
              </div>
              {mission?.description && (
                <p style={{ margin: "16px 0 0", fontSize: 14, lineHeight: 1.6, color: "var(--text-muted)" }}>{mission.description}</p>
              )}
            </div>

            {/* Task list */}
            <div className="card" style={{ padding: 20, marginBottom: 14 }}>
              <div className="eyebrow" style={{ marginBottom: 14 }}>Tasks overview — {tasks.length} tasks</div>
              {tasks.map((t, i) => {
                const sev = SEV[t.severity] || SEV.imp;
                return (
                  <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderTop: i ? "1px solid var(--border)" : "none" }}>
                    <span style={{ width: 24, height: 24, borderRadius: "50%", display: "grid", placeItems: "center", fontFamily: "var(--mono)", fontSize: 11, fontWeight: 600, background: "var(--panel-inset)", color: "var(--text-faint)", flexShrink: 0 }}>{i + 1}</span>
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{t.title}</span>
                    <span style={{ fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 20, background: sev.bg, color: sev.color }}>{sev.l}</span>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--text-faint)" }}>{Math.ceil(t.min_time_seconds / 60)}m</span>
                  </div>
                );
              })}
            </div>

            {/* Time estimate */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "var(--panel-2)", border: "1px solid var(--border)", borderRadius: "var(--radius)", marginBottom: 24 }}>
              <Icon name="clock" size={16} style={{ color: "var(--text-faint)", flexShrink: 0 }} />
              <span style={{ fontSize: 13.5, color: "var(--text-muted)" }}>Estimated time: <b style={{ color: "var(--text)" }}>~{totalMins} minutes</b> across {tasks.length} tasks</span>
            </div>

            <Btn variant="primary" block onClick={() => navigate(`/validator/missions/${id}/workspace`)} style={{ justifyContent: "center" }}>
              Open workspace → <Icon name="arrowRight" size={16} />
            </Btn>
          </div>
        )}
      </div>
    </div>
  );
}
