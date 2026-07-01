import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import { Btn } from "../components/ui";
import { vapi } from "../vapi/client";

export default function DailyCheckin() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [mission, setMission] = useState(null);
  const [checkins, setCheckins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const [lockHours, setLockHours] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [proofUploaded, setProofUploaded] = useState(false);
  const [answers, setAnswers] = useState({ used: null, what: "", frustration: null, frustrationDetail: "", comeback: null });

  useEffect(() => {
    (async () => {
      try {
        const data = await vapi.get(`/v/missions/${id}/checkin-status`);
        setMission(data.mission);
        setCheckins(data.checkins || []);
        setLocked(data.locked || false);
        setLockHours(data.hoursUntilNext || 0);
      } catch {
        // mock
        setMission({ name: "Reusable Cup — 7-Day Product Trial", brand: "Kettle & Co", total_days: 7, reward_per_day: 150 });
        setCheckins([true, true, true, false, false, false, false]);
        setLocked(false);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <div className="page rise"><div className="muted">Loading check-in…</div></div>;

  const completedDays = checkins.filter(Boolean).length;
  const currentDay = completedDays + 1;
  const totalDays = mission?.total_days || 7;
  const streak = completedDays;
  const rewardPerDay = mission?.reward_per_day || 150;

  const canSubmit = answers.used && answers.what.trim().length > 10 && answers.comeback && proofUploaded;

  const submit = async () => {
    setSubmitting(true);
    try {
      await vapi.post(`/v/missions/${id}/checkin`, { day: currentDay, answers, proofUploaded });
      setSubmitted(true);
    } catch {
      setSubmitted(true); // optimistic
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "var(--bg)" }}>
      <div className="rise" style={{ maxWidth: 480, textAlign: "center" }}>
        <div style={{ width: 80, height: 80, borderRadius: 24, background: "var(--success-weak)", display: "grid", placeItems: "center", margin: "0 auto 22px" }}>
          <Icon name="check" size={40} style={{ color: "var(--success)" }} />
        </div>
        <h2 style={{ margin: "0 0 10px", fontSize: 24, fontWeight: 800 }}>Day {currentDay} submitted!</h2>
        <p style={{ color: "var(--text-muted)", margin: "0 0 8px", fontSize: 15 }}>Come back tomorrow for Day {currentDay + 1}.</p>
        <p style={{ color: "var(--success)", fontWeight: 700, margin: "0 0 26px" }}>₹{rewardPerDay} will be credited after review.</p>
        <Btn variant="ghost" onClick={() => navigate("/validator/missions")}>Back to My Missions</Btn>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "24px 16px" }}>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        {/* Mission info */}
        <div style={{ width: "100%", maxWidth: 600, marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 13, color: "var(--text-faint)" }}>{mission?.name}</div>
            <div style={{ fontSize: 12, color: "var(--text-faint)", fontFamily: "var(--mono)" }}>Longitudinal · {mission?.brand}</div>
          </div>
          <span style={{ fontFamily: "var(--mono)", fontSize: 12, padding: "4px 10px", borderRadius: 20, background: "var(--panel-inset)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
            ₹{rewardPerDay} / check-in
          </span>
        </div>

        {locked ? (
          /* Locked state */
          <div className="card rise" style={{ padding: 32, textAlign: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: 18, background: "var(--panel-inset)", display: "grid", placeItems: "center", margin: "0 auto 18px" }}>
              <Icon name="lock" size={28} style={{ color: "var(--text-faint)" }} />
            </div>
            <h3 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 800 }}>Check-in locked</h3>
            <p style={{ color: "var(--text-muted)", margin: "0 0 18px" }}>You already submitted today's check-in. Come back in:</p>
            <div style={{ fontFamily: "var(--mono)", fontSize: 32, fontWeight: 800, color: "var(--accent)", marginBottom: 18 }}>
              {Math.floor(lockHours)}h {Math.round((lockHours % 1) * 60)}m
            </div>
            <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 24 }}>
              {Array.from({ length: totalDays }).map((_, i) => (
                <div key={i} style={{ width: 28, height: 28, borderRadius: "50%", display: "grid", placeItems: "center", background: checkins[i] ? "var(--success)" : i === completedDays ? "var(--accent-weak)" : "var(--panel-inset)", border: `2px solid ${checkins[i] ? "var(--success)" : i === completedDays ? "var(--accent)" : "var(--border)"}` }}>
                  {checkins[i] ? <Icon name="check" size={12} style={{ color: "#fff" }} /> : <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-faint)" }}>{i + 1}</span>}
                </div>
              ))}
            </div>
            <Btn variant="ghost" onClick={() => navigate("/validator/missions")}>Back to missions</Btn>
          </div>
        ) : (
          /* Active check-in */
          <div className="rise">
            {/* Header */}
            <div className="card" style={{ padding: 20, marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.02em" }}>Day {currentDay} of {totalDays}</div>
                  {streak >= 2 && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                      <span style={{ fontSize: 16 }}>🔥</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--warning)" }}>{streak} day streak!</span>
                    </div>
                  )}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 13, color: "var(--text-faint)", marginBottom: 4 }}>Today's reward</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "var(--success)" }}>₹{rewardPerDay}</div>
                </div>
              </div>
              {/* Calendar dots */}
              <div style={{ display: "flex", gap: 6 }}>
                {Array.from({ length: totalDays }).map((_, i) => (
                  <div key={i} style={{ flex: 1, height: 6, borderRadius: 20, background: checkins[i] ? "var(--success)" : i === completedDays ? "var(--accent)" : "var(--panel-inset)", transition: "background .3s" }} />
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: "var(--text-faint)" }}>
                <span>Day 1</span><span>Day {totalDays}</span>
              </div>
            </div>

            {/* Questions */}
            <div className="card" style={{ padding: 20, marginBottom: 14 }}>
              {/* Q1 */}
              <div style={{ marginBottom: 22 }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Did you use it today?</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {["Yes, actively", "Tried briefly", "No"].map(v => (
                    <button key={v} onClick={() => setAnswers(a => ({ ...a, used: v }))} style={{
                      flex: 1, padding: "10px 8px", borderRadius: "var(--radius-sm)", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all .13s",
                      border: `1.5px solid ${answers.used === v ? "var(--accent)" : "var(--border)"}`,
                      background: answers.used === v ? "var(--accent-weak)" : "var(--panel)",
                      color: answers.used === v ? "var(--accent)" : "var(--text-muted)",
                    }}>{v}</button>
                  ))}
                </div>
              </div>

              {/* Q2 */}
              <div style={{ marginBottom: 22 }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>What did you do in the app today?</div>
                <textarea className="fin" placeholder="e.g. Browsed the catalogue, added 2 items to cart, tried checkout…" rows={3} value={answers.what} onChange={e => setAnswers(a => ({ ...a, what: e.target.value }))} />
              </div>

              {/* Q3 */}
              <div style={{ marginBottom: 22 }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Any frustrations today?</div>
                <div style={{ display: "flex", gap: 10, marginBottom: answers.frustration === "yes" ? 12 : 0 }}>
                  {["yes", "no"].map(v => (
                    <button key={v} onClick={() => setAnswers(a => ({ ...a, frustration: a.frustration === v ? null : v }))} style={{
                      flex: 1, padding: 10, borderRadius: "var(--radius-sm)", fontSize: 14, fontWeight: 700, cursor: "pointer", transition: "all .13s",
                      border: `1.5px solid ${answers.frustration === v ? (v === "yes" ? "var(--danger)" : "var(--success)") : "var(--border)"}`,
                      background: answers.frustration === v ? (v === "yes" ? "var(--danger-weak)" : "var(--success-weak)") : "var(--panel)",
                      color: answers.frustration === v ? (v === "yes" ? "var(--danger)" : "var(--success)") : "var(--text-muted)",
                    }}>{v === "yes" ? "Yes" : "No"}</button>
                  ))}
                </div>
                {answers.frustration === "yes" && (
                  <textarea className="fin" placeholder="What was frustrating? Be specific…" rows={2} value={answers.frustrationDetail} onChange={e => setAnswers(a => ({ ...a, frustrationDetail: e.target.value }))} />
                )}
              </div>

              {/* Q4 */}
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Would you open it again tomorrow?</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {["Definitely", "Maybe", "No"].map(v => (
                    <button key={v} onClick={() => setAnswers(a => ({ ...a, comeback: v }))} style={{
                      flex: 1, padding: "10px 8px", borderRadius: "var(--radius-sm)", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all .13s",
                      border: `1.5px solid ${answers.comeback === v ? "var(--accent)" : "var(--border)"}`,
                      background: answers.comeback === v ? "var(--accent-weak)" : "var(--panel)",
                      color: answers.comeback === v ? "var(--accent)" : "var(--text-muted)",
                    }}>{v}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* Screenshot upload */}
            <div className="card" style={{ padding: 20, marginBottom: 24 }}>
              <div className="eyebrow" style={{ marginBottom: 12 }}>Today's screenshot <span style={{ color: "var(--danger)", marginLeft: 4 }}>required</span></div>
              {proofUploaded ? (
                <div style={{ border: "2px solid var(--success)", borderRadius: "var(--radius)", padding: "24px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", background: "var(--success-weak)" }}>
                  <Icon name="check" size={28} style={{ color: "var(--success)", marginBottom: 8 }} />
                  <div style={{ fontWeight: 700, color: "var(--success)" }}>Screenshot uploaded</div>
                  <button className="btn btn-quiet" style={{ marginTop: 8, fontSize: 12 }} onClick={() => setProofUploaded(false)}>Remove</button>
                </div>
              ) : (
                <div onClick={() => setProofUploaded(true)} style={{ border: "2px dashed var(--border)", borderRadius: "var(--radius)", padding: "28px 24px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", cursor: "pointer", background: "var(--panel-2)" }}>
                  <Icon name="upload" size={24} style={{ color: "var(--text-faint)", marginBottom: 10 }} />
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Drop screenshot here</div>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--text-faint)" }}>PNG or JPG · max 10MB</p>
                </div>
              )}
            </div>

            <Btn variant="primary" block disabled={!canSubmit || submitting} onClick={submit} style={{ justifyContent: "center", fontSize: 15 }}>
              {submitting ? "Submitting…" : `Submit Day ${currentDay} check-in`}
            </Btn>
            {!canSubmit && (
              <p style={{ textAlign: "center", fontSize: 12, color: "var(--text-faint)", marginTop: 10 }}>
                Answer all questions and upload a screenshot to continue
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
