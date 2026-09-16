import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "./Icon";
import { Avatar, Btn } from "./ui";
import { api } from "../api/client";
import { trFilterLabel } from "../data/audienceFilterLabels";
import { levelName, badgeLabel, badgeDesc } from "../vi18n";
import useBodyScrollLock from "../hooks/useBodyScrollLock";

function StatTile({ label, value, accent }) {
  return (
    <div style={{ flex: 1, minWidth: 96, padding: "11px 12px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--panel)", display: "flex", flexDirection: "column", gap: 5 }}>
      <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em", color: "var(--text-faint)" }}>{label}</span>
      <span className="mono" style={{ fontSize: 17, fontWeight: 700, color: accent }}>{value}</span>
    </div>
  );
}

// Right-side drawer for "View Profile" — same shell (portal, dimmed/blurred
// backdrop, sticky header, scrollable body) as the Missions -> Responses
// submission drawer, so builders get one consistent overlay pattern instead
// of a second, differently-shaped one. Shared between the Audience Explorer
// (passes a full audience-list row, match% included) and the mission
// Participants Kanban (passes a participant row, which has no match% of its
// own — that stat tile just doesn't render rather than showing "undefined%").
// Match/Trust/Profile completion come from the row already on hand; level,
// badges and mission history need a real fetch since they're computed
// server-side from the validator's full history.
export function ValidatorProfileDrawer({ validator, onClose, onInvite, onAccept, onReject, reviewing, stageCaption, t }) {
  const [detail, setDetail] = useState(null);
  // Starts closed, flips open a frame after mount so the transform/opacity
  // transitions below actually animate instead of snapping straight to
  // their end state (which is what a same-frame transform would do).
  const [open, setOpen] = useState(false);
  useBodyScrollLock();

  useEffect(() => {
    let cancelled = false;
    api.validatorProfile(validator.id).then(d => { if (!cancelled) setDetail(d); }).catch(() => {});
    return () => { cancelled = true; };
  }, [validator.id]);

  useEffect(() => {
    const id = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex" }}>
      <div style={{ flex: 1, background: "rgba(8,10,18,.34)", backdropFilter: "blur(2px)", opacity: open ? 1 : 0, transition: "opacity .15s ease" }} onClick={onClose} />
      <div style={{ width: 600, maxWidth: "92vw", background: "var(--bg)", borderLeft: "1px solid var(--border)", display: "flex", flexDirection: "column", overflow: "hidden", transform: open ? "translateX(0)" : "translateX(100%)", transition: "transform .18s ease" }}>
        <div style={{ flex: 1, overflowY: "auto" }}>
          <div style={{ position: "sticky", top: 0, zIndex: 2, background: "var(--bg)" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
              <Avatar name={validator.name} size={46} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 16, display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                  {validator.name}
                  {detail && (
                    <span className="tag" style={{ background: "var(--accent-weak)", color: "var(--accent)", fontFamily: "var(--mono)", fontSize: 10.5 }}>
                      {t("audience.levelPill", { n: detail.level.n, name: levelName(t, detail.level.n, detail.level.name) }, `Lvl ${detail.level.n} · ${detail.level.name}`)}
                    </span>
                  )}
                  {validator.verified && <span className="verif"><Icon name="checkCircle" size={14} /></span>}
                </div>
                <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>
                  {/* Filtered + joined instead of always three fixed slots --
                      a participant-derived card (Kanban) has no occupation
                      of its own, and always showing that segment left a
                      stray leading separator with nothing in front of it. */}
                  {[
                    validator.occ && <span key="occ">{trFilterLabel(t, validator.occ)}</span>,
                    validator.city && <span key="city">{trFilterLabel(t, validator.city)}</span>,
                    validator.role && <span key="role" className="mono">{trFilterLabel(t, validator.role)}</span>,
                    // Only set when opened from a mission's Participants
                    // Kanban -- the Audience Explorer's own "View Profile"
                    // has no per-mission stage to show here at all.
                    stageCaption && <span key="stage">{stageCaption}</span>,
                  ].filter(Boolean).map((part, i) => (
                    <span key={i}>{i > 0 && <span style={{ margin: "0 6px", color: "var(--text-faint)" }}>|</span>}{part}</span>
                  ))}
                </div>
              </div>
              <button className="btn btn-ghost" style={{ padding: 8 }} onClick={onClose}><Icon name="x" size={16} /></button>
            </div>
            <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)", display: "flex", gap: 10, overflowX: "auto", scrollbarWidth: "none" }}>
              {typeof validator.match === "number" && <StatTile label={t("audience.matchScore", null, "Match")} value={`${validator.match}%`} accent="var(--accent)" />}
              <StatTile label={t("audience.trustScore", null, "Trust score")} value={validator.trust > 0 ? validator.trust : "—"} />
              <StatTile label={t("audience.completionRate", null, "Completion rate")} value={detail ? `${detail.completionRate}%` : "—"} />
              <StatTile label={t("audience.missionsDone", null, "Missions done")} value={detail ? detail.completed : "—"} />
            </div>
          </div>

          <div style={{ padding: "24px 26px", borderBottom: "1px solid var(--border)" }}>
            <h4 style={{ margin: "0 0 18px", fontSize: 14.5, fontWeight: 800, letterSpacing: ".01em" }}>{t("audience.expertiseTags", null, "Expertise")}</h4>
            {(validator.expertise || []).length === 0 ? (
              <div className="muted" style={{ fontSize: 12, padding: "10px 12px", border: "1px dashed var(--border)", borderRadius: "var(--radius-sm)", textAlign: "center" }}>
                {t("audience.noExpertiseYet", null, "No expertise listed yet")}
              </div>
            ) : (
              <div className="aud-tags">{validator.expertise.map(e => <span key={e} className="mtag">{trFilterLabel(t, e)}</span>)}</div>
            )}
          </div>

          <div style={{ padding: "24px 26px", borderBottom: "1px solid var(--border)" }}>
            <h4 style={{ margin: "0 0 18px", fontSize: 14.5, fontWeight: 800, letterSpacing: ".01em" }}>{t("audience.verificationBadges", null, "Verification badges")}</h4>
            {!detail ? (
              <div className="muted" style={{ fontSize: 12.5 }}>{t("actions.loading", null, "Loading…")}</div>
            ) : detail.badges.length === 0 ? (
              <div className="muted" style={{ fontSize: 12, padding: "10px 12px", border: "1px dashed var(--border)", borderRadius: "var(--radius-sm)", textAlign: "center" }}>
                {t("audience.noBadgesYet", null, "No badges earned yet")}
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {detail.badges.map(b => (
                  <div key={b.label} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <span style={{ width: 30, height: 30, borderRadius: 9, background: "var(--success-weak)", color: "var(--success)", display: "grid", placeItems: "center", flex: "none" }}>
                      <Icon name={b.icon} size={16} />
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 12 }}>{badgeLabel(t, b.label)}</div>
                      <div className="faint" style={{ fontSize: 10.5, lineHeight: 1.3 }}>{badgeDesc(t, b.label, b.desc)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ padding: "24px 26px" }}>
            <h4 style={{ margin: "0 0 18px", fontSize: 14.5, fontWeight: 800, letterSpacing: ".01em" }}>{t("audience.recentMissions", null, "Recent missions")}</h4>
            {!detail ? (
              <div className="muted" style={{ fontSize: 12.5 }}>{t("actions.loading", null, "Loading…")}</div>
            ) : detail.recentMissions.length === 0 ? (
              <div className="muted" style={{ fontSize: 12, padding: "10px 12px", border: "1px dashed var(--border)", borderRadius: "var(--radius-sm)", textAlign: "center" }}>
                {t("audience.noRecentMissions", null, "No missions yet")}
              </div>
            ) : (
              detail.recentMissions.map((rm, i) => (
                <div key={rm.id + i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderTop: i > 0 ? "1px solid var(--border)" : "none" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{rm.name}</div>
                    <div className="faint" style={{ fontSize: 11 }}>{rm.date ? new Date(rm.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—"}</div>
                  </div>
                  <span className="tag" style={{ background: "var(--accent-weak)", color: "var(--accent)", fontSize: 10.5, flex: "none" }}>{rm.statusLabel}</span>
                </div>
              ))
            )}
          </div>
        </div>
        <div style={{ padding: "16px 22px", borderTop: "1px solid var(--border)", background: "var(--panel)", display: "flex", gap: 10 }}>
          <button className="btn" style={{ flex: 1, color: "var(--text)", border: "1px solid var(--border)", background: "transparent" }} onClick={onClose}>
            {t("actions.close", null, "Close")}
          </button>
          {onAccept && onReject ? (
            <>
              <button className="btn" style={{ flex: 1, color: "var(--danger)", border: "1px solid color-mix(in srgb,var(--danger) 40%,transparent)", background: "transparent" }}
                disabled={reviewing} onClick={onReject}>
                {t("actions.reject", null, "Reject")}
              </button>
              <Btn variant="primary" style={{ flex: 1 }} disabled={reviewing} onClick={onAccept}>
                {reviewing ? t("actions.working", null, "Working…") : t("actions.accept", null, "Accept")}
              </Btn>
            </>
          ) : (
            onInvite && <Btn variant="primary" style={{ flex: 1 }} icon="userplus" onClick={() => onInvite(validator)}>{t("actions.invite", null, "Invite")}</Btn>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
