import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "./Icon";
import { VStars } from "../vcomponents/vui";
import { vapi } from "../vapi/client";
import { useTranslation } from "../i18n/index.jsx";
import useBodyScrollLock from "../hooks/useBodyScrollLock";

// Read-only mirror of the builder's own submission review drawer
// (pages/MissionDetail.jsx's SlideOver) -- same header stats + expandable
// Task N cards, same shared breakdown shape (see backend/responseBreakdown.js),
// just without the Approve/Reject/Revise actions, since this is a validator
// looking back at their own past submission, not reviewing someone else's.
// Opens in place instead of "View results" navigating to a whole separate
// page (MissionResults.jsx, which stays in use elsewhere for the
// just-completed celebration screen).
export default function VSubmissionDrawer({ taskId, missionName, onClose }) {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [expandedTasks, setExpandedTasks] = useState(new Set([0]));
  useBodyScrollLock();

  useEffect(() => {
    let cancelled = false;
    vapi.get(`/missions/${taskId}/submission`)
      .then(d => { if (!cancelled) setData(d); })
      .catch(err => { if (!cancelled) setError(err.message || t("missions.loadingResultsFailed", null, "Couldn't load this submission.")); });
    return () => { cancelled = true; };
  }, [taskId, t]);

  const toggleTask = (i) => setExpandedTasks(prev => { const next = new Set(prev); next.has(i) ? next.delete(i) : next.add(i); return next; });

  const sub = data?.submission;
  const mission = data?.mission;
  // score is written as rating*20 (a 1-5 star rating on a 20-100 scale) --
  // see routes/missions.js's approve handler -- only once a builder's
  // actually approved the submission; null/0 on anything still pending.
  const rating = sub?.score ? Math.max(1, Math.min(5, Math.round(sub.score / 20))) : null;

  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex" }}>
      <div style={{ flex: 1, background: "rgba(8,10,18,.34)", backdropFilter: "blur(2px)" }} onClick={onClose} />
      <div style={{ width: 660, background: "var(--bg)", borderLeft: "1px solid var(--border)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>

          <div style={{ position: "sticky", top: 0, zIndex: 2, background: "var(--bg)" }}>
            {/* Who this mission is actually with -- the builder/company
                reviewing it -- comes first, same identity-row look the
                builder's own drawer uses for a validator (avatar + name +
                role line), before the mission's own details below it. */}
            <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: mission?.builderColor || "var(--accent)", color: "#fff", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>{mission?.company?.[0]?.toUpperCase() || "?"}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{mission?.company}</div>
                <div style={{ fontSize: 12, color: "var(--text-faint)" }}>{t("roles.builder", null, "Builder")}</div>
              </div>
              <button className="btn btn-ghost" style={{ padding: 8 }} onClick={onClose}><Icon name="x" size={16} /></button>
            </div>

            <div style={{ padding: "14px 24px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{missionName || mission?.name}</div>
              <div style={{ fontSize: 12, color: "var(--text-faint)" }}>{t("missionDetail.yourSubmission", null, "Your submission")}</div>
            </div>

            {sub && (
              <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)", display: "flex", gap: 12, overflowX: "auto" }}>
                <div style={{ flex: 1, minWidth: 90, padding: 12, border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--panel)", display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase" }}><Icon name="calendar" size={12} style={{ color: "var(--accent)" }} /> {t("metrics.submitted", null, "Submitted")}</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{sub.date}</div>
                </div>
                {sub.mins != null && (
                  <div style={{ flex: 1, minWidth: 90, padding: 12, border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--panel)", display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase" }}><Icon name="clock" size={12} style={{ color: "var(--accent)" }} /> {t("metrics.timeTaken", null, "Time Taken")}</div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{sub.mins} min</div>
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 90, padding: 12, border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--panel)", display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase" }}><Icon name="checkCircle" size={12} style={{ color: "var(--accent)" }} /> {t("metrics.tasks", null, "Tasks")}</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{sub.tasks}</div>
                </div>
                {sub.revisionRequestedAt && (
                  <div style={{ flex: 1, minWidth: 100, padding: 12, border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--panel)", display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase" }}><Icon name="edit" size={12} style={{ color: "var(--accent)" }} /> {t("metrics.revisionRequested", null, "Revision Requested")}</div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{sub.revisionRequestedAt}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ padding: "16px 24px", flex: 1 }}>
            {error ? (
              <div className="err-banner">{error}</div>
            ) : !data ? (
              <div className="muted">{t("actions.loading", null, "Loading…")}</div>
            ) : (
              <>
                {/* Only once the builder's actually rated it -- a still-
                    pending or rejected-without-a-score submission has
                    nothing to show here. Same star scale and layout the
                    old post-approval results screen used. */}
                {rating && (
                  <div className="card" style={{ padding: 16, marginBottom: 20, border: "1px solid var(--border)" }}>
                    <div className="eyebrow" style={{ marginBottom: 8 }}>{t("missions.yourRating", null, "Your Rating")}</div>
                    <VStars value={rating} size={20} />
                    {sub.reason && (
                      <p style={{ margin: "12px 0 0", fontSize: 13.5, lineHeight: 1.5, color: "var(--text-muted)" }}>"{sub.reason}"</p>
                    )}
                  </div>
                )}
                <div className="eyebrow" style={{ marginBottom: 14 }}>{t("review.taskResponses", null, "Task responses")}</div>
                {(sub.breakdown || []).map((b, i) => (
                  <div key={i} className="card rise" style={{ marginBottom: 12, overflow: "hidden", border: "1px solid var(--border)" }}>
                    <div onClick={() => toggleTask(i)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", cursor: "pointer", userSelect: "none", background: "var(--panel)" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "2px 8px", borderRadius: 12, background: "var(--accent-weak)", color: "var(--accent)", fontSize: 11, fontWeight: 700 }}>{t("missions.taskNTitle", { n: i + 1 }, `Task ${i + 1}`)}</span>
                      <span style={{ fontWeight: 700, fontSize: 14, flex: 1 }}>{b.t}</span>
                      <Icon name={expandedTasks.has(i) ? "chevronUp" : "chevronDown"} size={16} style={{ color: "var(--text-muted)" }} />
                    </div>
                    {expandedTasks.has(i) && (
                      <div style={{ padding: "0 16px 16px", borderTop: "1px solid var(--border)" }}>
                        {b.ans && !b.details?.length && <p style={{ margin: "16px 0 0", fontSize: 13, color: "var(--text)", lineHeight: 1.5 }}>{b.ans}</p>}
                        {b.details && b.details.length > 0 && (
                          <div style={{ display: "flex", flexDirection: "column", gap: 1, marginTop: 16, background: "var(--border)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", overflow: "hidden" }}>
                            {b.details.map((dt, didx) => (
                              <div key={didx} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", background: "var(--panel)" }}>
                                <div style={{ padding: "12px 14px", display: "flex", gap: 10, borderRight: "1px solid var(--border)" }}>
                                  <Icon name="info" size={14} style={{ color: "var(--accent)", flexShrink: 0, marginTop: 2 }} />
                                  <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-muted)", lineHeight: 1.4 }}>{dt.label}</div>
                                </div>
                                <div style={{ padding: "12px 14px", fontSize: 13, color: "var(--text)", lineHeight: 1.5, background: "var(--bg)", wordBreak: "break-word", display: "flex", alignItems: "center", gap: 8 }}>
                                  {dt.isRating && !isNaN(parseInt(dt.value, 10))
                                    ? <><VStars value={parseInt(dt.value, 10)} size={14} /><span className="faint">{dt.value}/5</span></>
                                    : dt.value}
                                </div>
                              </div>
                            ))}
                            {b.attachments && b.attachments.length > 0 && (
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", background: "var(--panel)" }}>
                                <div style={{ padding: "12px 14px", display: "flex", gap: 10, borderRight: "1px solid var(--border)" }}>
                                  <Icon name="image" size={14} style={{ color: "var(--accent)", flexShrink: 0, marginTop: 2 }} />
                                  <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-muted)", lineHeight: 1.4 }}>{t("review.proofLabel", null, "Proof (Screenshot / Video)")}</div>
                                </div>
                                <div style={{ padding: "12px 14px", background: "var(--bg)", display: "flex", gap: 8, flexWrap: "wrap" }}>
                                  {b.attachments.map((src, idx) => {
                                    const isVideo = src.match(/\.(mp4|webm|mov)$/i);
                                    return (
                                      <div key={idx} style={{ position: "relative", width: 140, height: 80, borderRadius: 6, overflow: "hidden", border: "1px solid var(--border)", background: "#000" }}>
                                        {isVideo ? (
                                          <>
                                            <video src={src + "#t=0.1"} preload="metadata" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                                            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", color: "rgba(255,255,255,0.9)", pointerEvents: "none" }}>
                                              <Icon name="playCircle" size={28} />
                                            </div>
                                          </>
                                        ) : (
                                          <img src={src} alt="Proof" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                                        )}
                                        <a href={src} target="_blank" rel="noopener noreferrer" style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 600, textDecoration: "none", gap: 4, opacity: 0, transition: "opacity .2s" }} onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                                          <Icon name="externalLink" size={12} /> {t("actions.view", null, "View")}
                                        </a>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
