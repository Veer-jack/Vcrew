import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, Btn, Empty } from "../components/ui";
import Icon from "../components/Icon";
import { api } from "../api/client";
import { toast } from "react-hot-toast";
import { useTranslation } from "../i18n/index.jsx";

const STATUS_STYLE = {
  pending: { bg: "var(--accent-weak)", fg: "var(--accent)" },
  accepted: { bg: "var(--success-weak)", fg: "var(--success)" },
  declined: { bg: "var(--danger-weak)", fg: "var(--danger)" },
  closed: { bg: "var(--panel-inset)", fg: "var(--text-muted)" },
  cancelled: { bg: "var(--panel-inset)", fg: "var(--text-muted)" },
};

function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—";
}

function statusLabel(status, t) {
  return {
    pending: t("invitations.statusPending", null, "Pending"),
    accepted: t("invitations.statusAccepted", null, "Accepted"),
    declined: t("invitations.statusDeclined", null, "Declined"),
    closed: t("invitations.statusClosed", null, "Closed"),
    cancelled: t("invitations.statusCancelled", null, "Cancelled"),
  }[status] || status;
}

const ALL_STATUSES = ["pending", "accepted", "declined", "closed", "cancelled"];

function StatusPill({ status, t }) {
  const style = STATUS_STYLE[status] || STATUS_STYLE.closed;
  return (
    <span className="tag" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: style.bg, color: style.fg }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor", flexShrink: 0 }} />
      {statusLabel(status, t)}
    </span>
  );
}

// Grouping by validator so the same person invited to five missions shows up
// once, not as five rows repeating their name/avatar. Groups with at least
// one still-Pending invite float to the top — those are the ones that might
// still need action (a Withdraw), unlike a validator who's fully
// Declined/Cancelled everywhere.
function groupInvitations(invitations) {
  const map = new Map();
  for (const inv of invitations) {
    const key = inv.validator.id;
    if (!map.has(key)) map.set(key, { validator: inv.validator, items: [] });
    map.get(key).items.push(inv);
  }
  const groups = [...map.values()];
  groups.sort((a, b) => {
    const aPending = a.items.some(i => i.status === "pending");
    const bPending = b.items.some(i => i.status === "pending");
    return aPending === bPending ? 0 : aPending ? -1 : 1;
  });
  return groups;
}

export default function Invitations() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const [expanded, setExpanded] = useState(new Set());
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef(null);
  const toggleStatus = (s) => setStatusFilter(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  // A "cover the page, close on click" overlay div doesn't reliably work --
  // some ancestor CSS (backdrop-filter, transform, etc.) can make it the
  // containing block for that fixed overlay, so it only ever spans that
  // ancestor's own box instead of the true page (same class of bug
  // AppLayout's profile dropdown hit). A document-level listener sidesteps
  // that entirely.
  useEffect(() => {
    if (!filterOpen) return;
    const onDocClick = (e) => { if (!filterRef.current?.contains(e.target)) setFilterOpen(false); };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [filterOpen]);

  const toggleExpand = (validatorId) => setExpanded(prev => {
    const next = new Set(prev);
    if (next.has(validatorId)) next.delete(validatorId); else next.add(validatorId);
    return next;
  });

  useEffect(() => {
    api.missionInvitations()
      .then(res => setInvitations(res.invitations || []))
      .catch(() => toast.error(t("invitations.failedToLoad", null, "Failed to load invitations")))
      .finally(() => setLoading(false));
  }, [t]);

  const handleCancel = async (inv) => {
    setCancellingId(inv.id);
    try {
      await api.cancelInvite(inv.mission.id, inv.validator.id);
      setInvitations(prev => prev.map(i => i.id === inv.id ? { ...i, status: "cancelled" } : i));
      toast.success(t("invitations.cancelSuccess", { name: inv.validator.name }, `Invitation to ${inv.validator.name} withdrawn`));
    } catch (err) {
      toast.error(err.message || t("invitations.cancelFailed", null, "Couldn't withdraw this invitation"));
    } finally {
      setCancellingId(null);
    }
  };

  // Matches on the validator's own name or any mission they were invited
  // to -- either is a reasonable thing to be looking someone up by. A
  // mission-name match still shows that validator's whole group (every
  // mission they're in), not just the one that matched, so an expanded
  // card never looks like it's silently missing rows. Same "whole group if
  // anything inside it matches" rule for the status filter -- a validator
  // with one Pending invite among four Declined ones still needs to show
  // up (and show all four) when filtering to Pending.
  const filtered = groupInvitations(invitations).filter(g => {
    const matchesQ = !q.trim() || g.validator.name.toLowerCase().includes(q.trim().toLowerCase()) ||
      g.items.some(i => i.mission.name.toLowerCase().includes(q.trim().toLowerCase()));
    const matchesStatus = statusFilter.length === 0 || g.items.some(i => statusFilter.includes(i.status));
    return matchesQ && matchesStatus;
  });

  return (
    <div className="page rise">
      <div className="ph">
        <div>
          <h1>{t("invitations.title", null, "Invitations")}</h1>
          <p className="lead">{t("invitations.lead", null, "Everyone you've invited to a mission, and whether they've responded.")}</p>
        </div>
      </div>

      {loading ? (
        <div className="muted" style={{ padding: 24 }}>{t("actions.loading", null, "Loading…")}</div>
      ) : invitations.length === 0 ? (
        <Empty icon="send" title={t("invitations.emptyTitle", null, "No invitations sent yet")}>
          {t("invitations.emptyBody", null, "Invite validators to a mission from the Audience tab or a mission's participant panel.")}
        </Empty>
      ) : (
        <>
          <div className="row gap-2" style={{ marginBottom: 16 }}>
            <div style={{ position: "relative" }} ref={filterRef}>
              <button title={t("invitations.filterTitle", null, "Filter")} onClick={() => setFilterOpen(o => !o)}
                style={{ position: "relative", width: 36, height: 36, borderRadius: "50%", border: "1px solid var(--border)", background: "var(--panel)", display: "grid", placeItems: "center", cursor: "pointer" }}>
                <Icon name="filter" size={16} />
                {statusFilter.length > 0 && (
                  <span style={{ position: "absolute", top: -2, right: -2, width: 8, height: 8, borderRadius: "50%", background: "var(--accent)" }} />
                )}
              </button>
              {filterOpen && (
                  <div role="menu" style={{
                    position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 50, width: 220,
                    background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius)",
                    boxShadow: "var(--shadow-md)", padding: "14px",
                  }}>
                    <div className="row" style={{ alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                      <div style={{ fontSize: 14, fontWeight: 800 }}>{t("invitations.filterStatus", null, "Filter by Status")}</div>
                      {statusFilter.length > 0 && (
                        <button style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 12.5, fontWeight: 700, color: "var(--accent)" }}
                          onClick={() => setStatusFilter([])}>
                          {t("actions.clearAll", null, "Clear all")}
                        </button>
                      )}
                    </div>
                    <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>{t("invitations.filterStatusHint", null, "Select one or more statuses")}</div>
                    <div className="col gap-1">
                      {ALL_STATUSES.map(s => {
                        const on = statusFilter.includes(s);
                        return (
                          <label key={s} className="menu-item" style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "8px", cursor: "pointer", borderRadius: "var(--radius-sm)", fontSize: 13.5, fontWeight: on ? 700 : 500, color: on ? "var(--accent)" : "var(--text)", background: on ? "var(--accent-weak)" : "transparent" }}>
                            <input type="checkbox" checked={on} onChange={() => toggleStatus(s)} style={{ cursor: "pointer" }} />
                            {statusLabel(s, t)}
                          </label>
                        );
                      })}
                    </div>
                  </div>
              )}
            </div>
            <div className="seg-search" style={{ maxWidth: 360 }}>
              <Icon name="search" size={16} />
              <input placeholder={t("invitations.searchPlaceholder", null, "Search by validator or mission…")} value={q} onChange={e => setQ(e.target.value)} />
            </div>
          </div>
          {filtered.length === 0 ? (
            <div className="muted" style={{ padding: 24 }}>{t("invitations.noneMatch", null, "No invitations match")} "{q}".</div>
          ) : (
          // Each validator is its own card -- collapsed, it's just the name row;
          // the Mission/Invited on/Status/Action columns only exist inside a
          // card once it's actually expanded, not as a permanent header row
          // sitting over every collapsed group too.
          <div className="col gap-3">
          {filtered.map(g => {
            const hasWaitlist = g.items.some(i => i.isWaitlist);
            const isOpen = expanded.has(g.validator.id);
            return (
              <div key={g.validator.id} className="card" style={{ padding: 0, overflow: "hidden" }}>
                <div className="click row between" style={{ alignItems: "center", padding: "11px 20px", cursor: "pointer" }} onClick={() => toggleExpand(g.validator.id)}>
                  {/* .t-name's flex-row + bold-name layout is CSS-scoped to a
                      .tbl ancestor (it was always inside a <table> before) --
                      this card header isn't one anymore, so both are set
                      inline here instead of silently falling back to a
                      stacked, unbolded layout. */}
                  <div className="t-name" style={{ display: "flex", alignItems: "center", gap: 11 }}>
                    <Avatar name={g.validator.name} size={38} />
                    <div>
                      {/* fontWeight lives here now, not on the outer wrapper --
                          that inherited down into .t-sub (the city line)
                          below too, bolding text that was never meant to be. */}
                      <div className="row" style={{ gap: 6, alignItems: "center", fontWeight: 700 }}>
                        {g.validator.name}
                        <span className="tag" title={g.items.map(i => i.mission.name).join("\n")} style={{ background: "var(--accent-weak)", color: "var(--accent)" }}>{g.items.length}</span>
                        {hasWaitlist && <span title={t("invitations.waitlistTitle", null, "Invited from Waitlist")} style={{ color: "var(--accent)", display: "flex" }}><Icon name="star" size={14} /></span>}
                      </div>
                      <div className="t-sub">{g.validator.city}</div>
                    </div>
                  </div>
                  <Icon name={isOpen ? "chevronUp" : "chevronDown"} size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                </div>
                {isOpen && (
                  <div className="tbl-wrap" style={{ borderTop: "var(--hairline) solid var(--border)", padding: "0 20px" }}>
                    <table className="tbl">
                      <thead>
                        <tr>
                          <th style={{ textAlign: "center" }}>{t("invitations.missionCol", null, "Mission")}</th>
                          <th style={{ textAlign: "center" }}>{t("invitations.invitedOnCol", null, "Invited on")}</th>
                          <th style={{ textAlign: "center" }}>{t("invitations.statusCol", null, "Status")}</th>
                          <th style={{ width: 120, textAlign: "center" }}>{t("invitations.actionCol", null, "Action")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {g.items.map(inv => (
                          <tr key={inv.id}>
                            <td className="click" style={{ textAlign: "center" }} onClick={() => navigate(`/missions/${inv.mission.id}`)}>{inv.mission.name}</td>
                            <td className="muted" style={{ fontSize: 13, textAlign: "center" }}>{fmtDate(inv.createdAt)}</td>
                            <td style={{ textAlign: "center" }}><StatusPill status={inv.status} t={t} /></td>
                            <td style={{ textAlign: "center" }}>
                              {inv.status === "pending" ? (
                                <Btn size="sm" disabled={cancellingId === inv.id} onClick={() => handleCancel(inv)} style={{ background: "var(--accent)", color: "#fff" }}>
                                  {cancellingId === inv.id ? t("actions.cancelling", null, "Withdrawing…") : t("invitations.uninvite", null, "Withdraw")}
                                </Btn>
                              ) : <span className="faint">—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
          </div>
          )}
        </>
      )}
    </div>
  );
}
