import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import { Btn, inr } from "../components/ui";
import { vapi } from "../vapi/client";
import { useTranslation } from "../i18n/index.jsx";

export default function DailyCheckin() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [mission, setMission] = useState(null);
  const [currentCalendarDay, setCurrentCalendarDay] = useState(1);
  const [currentDay, setCurrentDay] = useState(1);
  const [completedDays, setCompletedDays] = useState(0);
  const [skippedDays, setSkippedDays] = useState(0);
  const [remainingExtraDays, setRemainingExtraDays] = useState(2);
  const [lockedOut, setLockedOut] = useState(false);
  const [canSubmitToday, setCanSubmitToday] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [proofFilename, setProofFilename] = useState(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [answers, setAnswers] = useState({ used: null, what: "", frustration: null, frustrationDetail: "", comeback: null });

  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await vapi.get(`/missions/${id}/checkin-status`);
        setMission(data.mission);
        setCurrentCalendarDay(data.currentCalendarDay || 1);
        setCurrentDay(data.currentDay || 1);
        setCompletedDays(data.completedDays || 0);
        setSkippedDays(data.skippedDays || 0);
        setRemainingExtraDays(data.remainingExtraDays ?? 2);
        setLockedOut(data.lockedOut || false);
        setCanSubmitToday(data.canSubmitToday || false);
        setIsFinished(data.isFinished || false);
        
        if (data.isFinished) {
          navigate(`/validator/missions/${id}/workspace`, { replace: true });
        }
      } catch (err) {
        console.error("Check-in status error:", err, "Detail:", err.detail);
        setErrorMsg((err.message || t("missions.failedToLoadCheckinStatus", null, "Failed to load check-in status")) + (err.detail ? ` (${err.detail})` : ""));
      } finally {
        setLoading(false);
      }
    })();
  }, [id, navigate]);

  if (loading) return <div className="page rise"><div className="muted">{t("missions.loadingCheckin", null, "Loading check-in…")}</div></div>;
  if (errorMsg) return <div className="page rise"><div style={{ color: "var(--danger)", padding: 24, textAlign: "center", fontWeight: 700 }}>{t("missions.error", null, "Error:")} {errorMsg}</div></div>;

  const totalDays = mission?.total_days || 7;
  const rewardTotal = mission?.reward_total || 0;
  
  // Total nodes in timeline = totalDays + 2 extra days = 9
  const totalNodes = totalDays + 2;

  const canSubmit = answers.used && answers.what.trim().length > 10 && answers.comeback && !!proofFilename;

  const submit = async () => {
    setSubmitting(true);
    try {
      await vapi.post(`/missions/${id}/checkin`, { answers, screenshot_path: proofFilename });
    } catch (e) {
      alert(e.message || t("missions.failedToSubmit", null, "Failed to submit"));
    } finally {
      setSubmitting(false);
      setSubmitted(true);
    }
  };

  if (submitted) return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "var(--bg)" }}>
      <div className="rise" style={{ maxWidth: 480, textAlign: "center" }}>
        <div style={{ width: 80, height: 80, borderRadius: 24, background: "var(--success-weak)", display: "grid", placeItems: "center", margin: "0 auto 22px" }}>
          <Icon name="check" size={40} style={{ color: "var(--success)" }} />
        </div>
        <h2 style={{ margin: "0 0 10px", fontSize: 24, fontWeight: 800 }}>{t("missions.daySubmitted", { currentDay }, `Day ${currentDay} submitted!`)}</h2>
        {currentDay >= totalDays ? (
          <>
            <p style={{ color: "var(--text-muted)", margin: "0 0 8px", fontSize: 15 }}>{t("missions.allDaysDone", { totalDays }, `That's all ${totalDays} days — time for your final review.`)}</p>
            <p style={{ color: "var(--success)", fontWeight: 700, margin: "0 0 26px" }}>{t("missions.completeFinalReview", null, "Complete the final review to get paid.")}</p>
            <Btn variant="primary" onClick={() => navigate(`/validator/missions/${id}/workspace`)}>{t("actions.continueToFinalReview", null, "Continue to final review")}</Btn>
          </>
        ) : (
          <>
            <p style={{ color: "var(--text-muted)", margin: "0 0 8px", fontSize: 15 }}>{t("missions.comeBackTomorrow", { nextDay: currentDay + 1 }, `Come back tomorrow for Day ${currentDay + 1}.`)}</p>
            <Btn variant="ghost" onClick={() => navigate("/validator/missions")}>{t("actions.backToMyMissions", null, "Back to My Missions")}</Btn>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      {/* Top App Bar */}
      <div style={{ height: 64, background: "#fff", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button className="btn btn-quiet" style={{ padding: 8 }} onClick={() => navigate("/validator/missions")}><Icon name="arrowLeft" size={18} /></button>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--panel-2)", display: "grid", placeItems: "center" }}>
              <Icon name="moon" size={16} style={{ color: "var(--accent)" }} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.2 }}>{mission?.name}</div>
              <div style={{ fontSize: 12, color: "var(--text-faint)", fontFamily: "var(--mono)" }}>{t("missions.longitudinal", null, "Longitudinal")} · {mission?.brand}</div>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", border: "1px solid var(--border)", borderRadius: "var(--radius)", fontSize: 14, fontWeight: 700 }}>
          <Icon name="gift" size={16} style={{ color: "var(--success)" }} /> {inr(rewardTotal)} {t("missions.onCompletion", null, "on completion")}
        </div>
      </div>

      <div style={{ flex: 1, padding: "32px 24px", maxWidth: 1200, margin: "0 auto", width: "100%", display: "flex", gap: 32, alignItems: "flex-start" }}>
        
        {/* Left Main Column */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 24, minWidth: 0 }}>
          
          {/* Timeline Card */}
          <div className="card rise" style={{ padding: 32, background: "#fff" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 40 }}>
              <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--accent-weak)", display: "grid", placeItems: "center" }}>
                  <Icon name="calendar" size={24} style={{ color: "var(--accent)" }} />
                </div>
                <div>
                  <h2 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 800 }}>{t("missions.dailyCheckinStreak", null, "Daily Check-in Streak")}</h2>
                  <p style={{ margin: 0, fontSize: 14, color: "var(--text-muted)" }}>{t("missions.completeAllDays", { totalDays }, `Complete all ${totalDays} days to earn your full reward`)}</p>
                </div>
              </div>
              <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>{t("missions.progress", null, "Progress")}</div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}><span style={{ color: "var(--success)" }}>{completedDays}</span> {t("missions.ofDaysCompleted", { totalDays }, `of ${totalDays} days completed`)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>{t("missions.totalReward", null, "Total Reward")}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "var(--success)" }}>{inr(rewardTotal)}</div>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div style={{ position: "relative", marginBottom: 40, overflowX: "auto", paddingBottom: 16 }}>
              <div style={{ display: "flex", minWidth: 700, alignItems: "center", justifyContent: "space-between", position: "relative" }}>
                {/* Background dashed line */}
                <div style={{ position: "absolute", left: 24, right: 24, top: 48, height: 2, background: "repeating-linear-gradient(to right, var(--border) 0, var(--border) 6px, transparent 6px, transparent 12px)", zIndex: 0 }} />
                
                {Array.from({ length: totalNodes }).map((_, i) => {
                  const nodeIndex = i + 1;
                  const isExtra = nodeIndex > totalDays;
                  const label = isExtra ? t("missions.extraDayN", { n: nodeIndex - totalDays }, `Extra Day ${nodeIndex - totalDays}`) : t("missions.dayN", { n: nodeIndex }, `Day ${nodeIndex}`);
                  
                  // Determine state based on sequence
                  // Timeline visual maps chronologically to events
                  // Event 1..completedDays = Completed
                  // Next event = Today
                  // Then Skipped (if any)
                  // Then Upcoming
                  
                  let state = "upcoming";
                  if (nodeIndex <= completedDays) {
                    state = "completed";
                  } else if (nodeIndex === completedDays + 1 && canSubmitToday) {
                    state = "today";
                  } else if (nodeIndex <= currentCalendarDay - (canSubmitToday ? 0 : 1)) {
                    state = "skipped";
                  } else if (isExtra) {
                    state = "extra";
                  }

                  let bg = "#fff";
                  let border = "var(--border)";
                  let color = "var(--text-muted)";
                  let icon = <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--border)" }} />;
                  let textLabel = t("status.upcoming", null, "Upcoming");

                  if (state === "completed") {
                    bg = "var(--success)"; border = "var(--success)"; color = "var(--success)";
                    icon = <Icon name="check" size={16} style={{ color: "#fff" }} />;
                    textLabel = t("status.completed", null, "Completed");
                  } else if (state === "skipped") {
                    bg = "var(--danger)"; border = "var(--danger)"; color = "var(--danger)";
                    icon = <Icon name="x" size={16} style={{ color: "#fff" }} />;
                    textLabel = t("status.skipped", null, "Skipped");
                  } else if (state === "today") {
                    bg = "var(--accent)"; border = "var(--accent)"; color = "var(--accent)";
                    icon = <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#fff" }} />;
                    textLabel = t("status.today", null, "Today");
                  } else if (state === "extra") {
                    border = "var(--accent-weak)"; color = "var(--accent)";
                    icon = <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid var(--accent-weak)" }} />;
                    textLabel = t("status.extraDay", null, "Extra Day");
                  }

                  return (
                    <div key={nodeIndex} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, zIndex: 1, position: "relative" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{label}</div>
                      
                      {/* Line connector to previous node (dynamically colored) */}
                      {nodeIndex > 1 && (
                        <div style={{ position: "absolute", left: "-50%", right: "50%", top: 48, height: 2, zIndex: -1, background: state === "completed" ? "var(--success)" : state === "skipped" ? "var(--danger)" : state === "today" ? "var(--accent)" : "transparent" }} />
                      )}

                      <div style={{ width: 44, height: 44, borderRadius: state === "today" ? 12 : "50%", background: bg, border: `2px solid ${border}`, display: "grid", placeItems: "center" }}>
                        {icon}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 600, color }}>{textLabel}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 24, borderTop: "1px solid var(--border)" }}>
              <div style={{ display: "flex", gap: 20, fontSize: 13, fontWeight: 500, color: "var(--text-muted)" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 16, height: 16, borderRadius: "50%", background: "var(--success)" }} /> {t("status.completed", null, "Completed")}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 16, height: 16, borderRadius: 4, background: "var(--accent)" }} /> {t("status.today", null, "Today")}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 16, height: 16, borderRadius: "50%", background: "var(--danger)" }} /> {t("status.skipped", null, "Skipped")}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid var(--border)" }} /> {t("status.upcoming", null, "Upcoming")}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid var(--accent-weak)" }} /> {t("status.extraDay", null, "Extra Day")}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-muted)" }}>
                <Icon name="info" size={14} /> {t("missions.skipDayNotice", null, "Skip a day and your streak extends by 1 extra day (up to 2).")}
              </div>
            </div>
          </div>

          {lockedOut ? (
            <div className="card rise" style={{ padding: 40, textAlign: "center", background: "#fff" }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--danger-weak)", display: "grid", placeItems: "center", margin: "0 auto 16px" }}>
                <Icon name="x" size={32} style={{ color: "var(--danger)" }} />
              </div>
              <h3 style={{ margin: "0 0 12px", fontSize: 24, fontWeight: 800 }}>{t("missions.missionFailed", null, "Mission Failed")}</h3>
              <p style={{ margin: "0 auto 24px", maxWidth: 400, color: "var(--text-muted)" }}>{t("missions.missionLockedOut", null, "You exceeded the maximum number of extra days. This mission is now locked and cannot be completed.")}</p>
              <Btn variant="ghost" onClick={() => navigate("/validator/missions")}>{t("actions.backToMyMissions", null, "Back to My Missions")}</Btn>
            </div>
          ) : !canSubmitToday ? (
            <div className="card rise" style={{ padding: 40, textAlign: "center", background: "#fff" }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--success-weak)", display: "grid", placeItems: "center", margin: "0 auto 16px" }}>
                <Icon name="check" size={32} style={{ color: "var(--success)" }} />
              </div>
              <h3 style={{ margin: "0 0 12px", fontSize: 24, fontWeight: 800 }}>{t("missions.allCaughtUp", null, "You're all caught up!")}</h3>
              <p style={{ margin: "0 auto 24px", maxWidth: 400, color: "var(--text-muted)" }}>{t("missions.alreadySubmittedCheckin", null, "You've already submitted your check-in for today. Come back tomorrow for the next one.")}</p>
            </div>
          ) : (
            <div className="card rise" style={{ padding: 32, background: "#fff" }}>
              {/* Form elements remain unchanged in logic, updated styles to match mockup */}
              <div style={{ marginBottom: 32 }}>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>{t("missions.didYouUseItToday", null, "Did you use it today?")}</div>
                <div style={{ display: "flex", gap: 16 }}>
                  {[t("missions.yesActively", null, "Yes, actively"), t("missions.triedBriefly", null, "Tried briefly"), t("missions.no", null, "No")].map(v => (
                    <button key={v} onClick={() => setAnswers(a => ({ ...a, used: v }))} style={{
                      flex: 1, padding: "14px", borderRadius: "var(--radius)", fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "all .15s",
                      border: `1.5px solid ${answers.used === v ? "var(--accent)" : "var(--border)"}`,
                      background: answers.used === v ? "var(--accent-weak)" : "#fff",
                      color: answers.used === v ? "var(--accent)" : "var(--text)",
                    }}>{v}</button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 32 }}>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>{t("missions.whatDidYouDo", null, "What did you do in the app today?")}</div>
                <textarea className="fin" placeholder={t("missions.whatDidYouDoPlaceholder", null, "e.g. Browsed the catalogue, added 2 items to cart, tried checkout…")} rows={4} value={answers.what} onChange={e => setAnswers(a => ({ ...a, what: e.target.value }))} style={{ fontSize: 14, padding: 16, background: "var(--panel)" }} />
                <div style={{ textAlign: "right", fontSize: 12, color: "var(--text-faint)", marginTop: 8 }}>{answers.what.length}/500</div>
              </div>

              <div style={{ marginBottom: 32 }}>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>{t("missions.anyFrustrations", null, "Any frustrations today?")}</div>
                <div style={{ display: "flex", gap: 16, marginBottom: answers.frustration === "yes" ? 16 : 0 }}>
                  {["yes", "no"].map(v => (
                    <button key={v} onClick={() => setAnswers(a => ({ ...a, frustration: a.frustration === v ? null : v }))} style={{
                      flex: 1, padding: 14, borderRadius: "var(--radius)", fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "all .15s",
                      border: `1.5px solid ${answers.frustration === v ? "var(--accent)" : "var(--border)"}`,
                      background: answers.frustration === v ? "var(--accent-weak)" : "#fff",
                      color: answers.frustration === v ? "var(--accent)" : "var(--text)",
                    }}>{v === "yes" ? t("actions.yes", null, "Yes") : t("actions.no", null, "No")}</button>
                  ))}
                </div>
                {answers.frustration === "yes" && (
                  <textarea className="fin" placeholder={t("missions.whatWasFrustrating", null, "What was frustrating? Be specific…")} rows={3} value={answers.frustrationDetail} onChange={e => setAnswers(a => ({ ...a, frustrationDetail: e.target.value }))} style={{ fontSize: 14, padding: 16, background: "var(--panel)" }} />
                )}
              </div>

              <div style={{ marginBottom: 32 }}>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>{t("missions.openAgainTomorrow", null, "Would you open it again tomorrow?")}</div>
                <div style={{ display: "flex", gap: 16 }}>
                  {[t("missions.definitely", null, "Definitely"), t("missions.maybe", null, "Maybe"), t("missions.no", null, "No")].map(v => (
                    <button key={v} onClick={() => setAnswers(a => ({ ...a, comeback: v }))} style={{
                      flex: 1, padding: 14, borderRadius: "var(--radius)", fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "all .15s",
                      border: `1.5px solid ${answers.comeback === v ? "var(--accent)" : "var(--border)"}`,
                      background: answers.comeback === v ? "var(--accent-weak)" : "#fff",
                      color: answers.comeback === v ? "var(--accent)" : "var(--text)",
                    }}>{v}</button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 40 }}>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>{t("missions.todaysScreenshot", null, "Today's screenshot")} <span style={{ color: "var(--danger)", marginLeft: 4 }}>*</span></div>
                {proofFilename ? (
                  <div style={{ border: "2px solid var(--success)", borderRadius: "var(--radius)", padding: "24px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", background: "var(--success-weak)" }}>
                    <Icon name="check" size={28} style={{ color: "var(--success)", marginBottom: 8 }} />
                    <div style={{ fontWeight: 700, color: "var(--success)" }}>{t("missions.screenshotUploaded", null, "Screenshot uploaded")}</div>
                    <button className="btn btn-quiet" style={{ marginTop: 8, fontSize: 13 }} onClick={() => setProofFilename(null)}>{t("actions.remove", null, "Remove")}</button>
                  </div>
                ) : (
                  <label style={{ border: "2px dashed var(--border)", borderRadius: "var(--radius)", padding: "40px 24px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", cursor: uploadingProof ? "not-allowed" : "pointer", background: "var(--panel)", opacity: uploadingProof ? 0.7 : 1 }}>
                    <input type="file" accept="image/png, image/jpeg, image/webp" style={{ display: "none" }} disabled={uploadingProof} onChange={async (e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      setUploadingProof(true);
                      try {
                        const res = await vapi.uploadCheckinProof(id, file);
                        setProofFilename(res.file.filename);
                      } catch (err) {
                        alert(err.message || t("missions.failedUploadProof", null, "Failed to upload proof"));
                      } finally {
                        setUploadingProof(false);
                      }
                    }} />
                    <Icon name="upload" size={28} style={{ color: "var(--text-faint)", marginBottom: 16 }} />
                    <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{uploadingProof ? t("actions.uploading", null, "Uploading…") : t("missions.dropScreenshot", null, "Click or drop screenshot here")}</div>
                    <p style={{ margin: 0, fontSize: 14, color: "var(--text-faint)" }}>{t("missions.imageFormatReq", null, "PNG or JPG · max 10MB")}</p>
                  </label>
                )}
              </div>

              <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
                <Btn variant="primary" icon="send" disabled={!canSubmit || submitting} onClick={submit} style={{ padding: "16px 32px", fontSize: 16, fontWeight: 700, background: "var(--accent)" }}>
                  {submitting ? t("actions.submitting", null, "Submitting…") : t("actions.submitCheckin", null, "Submit Check-in")}
                </Btn>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--text-muted)" }}>
                  <Icon name="calendar" size={16} /> {t("missions.checkinResetTime", null, "Daily check-in resets at 12:00 AM")}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div style={{ width: 340, display: "flex", flexDirection: "column", gap: 24 }}>
          
          <div className="card rise" style={{ padding: 24, background: "#fff" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{t("missions.howExtraDaysWork", null, "How Extra Days Work")}</h3>
              <Icon name="info" size={16} style={{ color: "var(--text-muted)" }} />
            </div>
            <p style={{ fontSize: 14, color: "var(--text)", marginBottom: 8 }}>{t("missions.youHaveExtraDays", null, "You have")} <span style={{ fontWeight: 700 }}>2 {t("missions.extraDays", null, "extra days")}</span>.</p>
            <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 24, lineHeight: 1.5 }}>{t("missions.skipDayRule", null, "If you skip a day, 1 extra day is added to the end of your streak.")}</p>
            
            {/* Visual Diagram */}
            <div style={{ padding: 16, background: "var(--panel)", borderRadius: "var(--radius)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: "var(--success)" }} />
                <div style={{ flex: 1, height: 2, background: "var(--border)" }} />
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: "var(--accent)" }} />
                <div style={{ flex: 1, height: 2, background: "var(--border)" }} />
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: "var(--border)" }} />
                <Icon name="arrowRight" size={12} style={{ color: "var(--text-faint)", marginLeft: 16 }} />
                <div style={{ width: 12, height: 12, borderRadius: "50%", border: "2px solid var(--accent-weak)" }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: "var(--success)" }} />
                <div style={{ flex: 1, height: 2, background: "var(--border)" }} />
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: "var(--danger)" }} />
                <div style={{ flex: 1, height: 2, background: "var(--border)" }} />
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: "var(--accent)" }} />
                <Icon name="arrowRight" size={12} style={{ color: "var(--text-faint)", marginLeft: 16 }} />
                <div style={{ width: 12, height: 12, borderRadius: "50%", border: "2px solid var(--accent)", background: "var(--accent-weak)" }} />
              </div>
              <div style={{ textAlign: "right", fontSize: 11, fontWeight: 700, color: "var(--accent)" }}>{t("missions.plusOneDayAdded", null, "+1 day added")}</div>
            </div>
          </div>

          <div className="card rise" style={{ padding: 24, background: "#fff" }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 24px" }}>{t("missions.yourSummary", null, "Your Summary")}</h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 32 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 14 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--text)" }}>
                  <Icon name="checkCircle" size={18} style={{ color: "var(--success)" }} /> {t("status.completed", null, "Completed")}
                </span>
                <span style={{ fontWeight: 700, color: "var(--success)" }}>{completedDays} {completedDays === 1 ? t("missions.day", null, "day") : t("missions.days", null, "days")}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 14 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--text)" }}>
                  <Icon name="xCircle" size={18} style={{ color: "var(--danger)" }} /> {t("status.skipped", null, "Skipped")}
                </span>
                <span style={{ fontWeight: 700, color: "var(--danger)" }}>{skippedDays} {skippedDays === 1 ? t("missions.day", null, "day") : t("missions.days", null, "days")}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 14 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--text)" }}>
                  <Icon name="playCircle" size={18} style={{ color: "var(--accent)" }} /> {t("missions.current", null, "Current")}
                </span>
                <span style={{ fontWeight: 700, color: "var(--accent)" }}>{t("missions.dayTitle", null, "Day")} {currentDay}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 14 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--text-muted)" }}>
                  <Icon name="clock" size={18} /> {t("status.upcoming", null, "Upcoming")}
                </span>
                <span style={{ fontWeight: 700 }}>{Math.max(0, totalDays - currentDay + (canSubmitToday ? 1 : 0))} {t("missions.days", null, "days")}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 14 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--text-muted)" }}>
                  <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid var(--accent-weak)", marginLeft: 2 }} /> {t("missions.extraDaysLeft", null, "Extra Days Left")}
                </span>
                <span style={{ fontWeight: 700, color: remainingExtraDays === 0 ? "var(--danger)" : "var(--accent)" }}>{Math.max(0, remainingExtraDays)} {Math.max(0, remainingExtraDays) === 1 ? t("missions.day", null, "day") : t("missions.days", null, "days")}</span>
              </div>
              
              {remainingExtraDays === 0 && !lockedOut && (
                <div style={{ background: "var(--danger-weak)", padding: 12, borderRadius: "var(--radius)", fontSize: 13, color: "var(--danger)", display: "flex", alignItems: "flex-start", gap: 8, marginTop: 4 }}>
                  <Icon name="alertCircle" size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div><strong>{t("actions.warning", null, "Warning")}:</strong> {t("missions.zeroExtraDaysWarning", null, "You have 0 extra days left. Skipping another day will result in mission failure.")}</div>
                </div>
              )}
            </div>

            <div style={{ background: "var(--accent-weak)", border: "1px solid var(--accent)", borderRadius: "var(--radius)", padding: 16, display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--accent)", color: "#fff", display: "grid", placeItems: "center" }}>
                <Icon name="target" size={16} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "var(--accent)", marginBottom: 2 }}>{t("missions.goal", null, "Goal")}</div>
                <div style={{ fontSize: 12, color: "var(--text)" }}>{t("missions.completeAllDaysGoal", { totalDays }, `Complete all ${totalDays} required days to earn the full reward.`)}</div>
              </div>
            </div>
          </div>

          <div className="rise" style={{ background: "var(--accent)", color: "#fff", borderRadius: "var(--radius)", padding: "24px 32px", display: "flex", alignItems: "center", gap: 20, boxShadow: "0 8px 24px rgba(var(--accent-rgb), 0.2)" }}>
            <div style={{ width: 48, height: 48, background: "rgba(255,255,255,0.2)", borderRadius: 12, display: "grid", placeItems: "center" }}>
              <Icon name="gift" size={24} style={{ color: "#fff" }} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, opacity: 0.9 }}>{t("missions.totalReward", null, "Total Reward")}</div>
              <div style={{ fontSize: 28, fontWeight: 800 }}>{inr(rewardTotal)}</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
