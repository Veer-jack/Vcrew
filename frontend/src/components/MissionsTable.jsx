import Icon from "./Icon";
import { MissionLogo, PBarRow, StatusTag, TypeTag, inr } from "./ui";
import { useTranslation } from "../i18n/index.jsx";

// Column-width ellipsis alone let a title of short words (e.g. "AI App UX
// Test Beta") show all 5 words if they happened to fit in 360px -- the
// tester wants a hard word-count cap regardless of how much space is
// actually used, not just a visual overflow cutoff.
function truncateTitle(name, max = 3) {
  if (!name) return "";
  const words = name.trim().split(/\s+/);
  if (words.length <= max) return name;
  return `${words.slice(0, max).join(" ")}...`;
}

// The em-dash "no value yet" placeholder always sits centered in its cell,
// regardless of whether that column's real values are left- or right-
// aligned (e.g. the numeric .num columns) — a lone "—" reads oddly hugging
// one edge the way a real number or date would.
function emptyDash() {
  return <span className="faint" style={{ display: "block", textAlign: "center" }}>—</span>;
}

function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : emptyDash();
}

// A draft was never live, and closed/archived have already had their outcome
// settled — none of these leave anyone or anything relying on the row
// staying around. Active/completed are excluded: they carry a real
// participant/submission history, so deleting one belongs behind "close the
// mission" (a status change, not a row disappearing), never a checkbox.
// Mirrors DELETABLE_STATUSES in backend/src/routes/missions.js — the backend
// re-checks this itself before actually deleting anything, this copy is
// only for what the UI offers to select.
export const DELETABLE_STATUSES = new Set(["draft", "closed", "archived"]);

// A single status tab already says what every row in it is — repeating that
// as its own column is pure noise there, unlike "All", where it's the only
// thing telling rows apart. Each single-status tab gets one extra date
// column instead, whichever one is actually meaningful for that status; the
// rest (Draft, Archived) have no such date worth a column of its own.
const TAB_DATE_COL = {
  active: { key: "deadline", label: "missions.deadlineCol", fallback: "Deadline", get: m => m.deadline },
  closed: { key: "closedAt", label: "missions.closedDateCol", fallback: "Closed Date", get: m => m.closedAt },
  completed: { key: "completedAt", label: "missions.completedDateCol", fallback: "Completed Date", get: m => m.completedAt },
  // Falls back to createdAt for a draft that's never actually been edited
  // since it was made (e.g. auto-promoted with just a title typed so far) --
  // updatedAt is only ever set once a real PATCH happens (see missions.js).
  draft: { key: "updatedAt", label: "missions.lastEditedCol", fallback: "Last Edited", get: m => m.updatedAt || m.createdAt },
};

// compact is its own mode, not a reuse of an existing tab: none of the
// tab-driven column combinations below can produce "Status AND
// Participants/Reward/Completion together, but no Created/Deadline/
// Completed Date" -- Status only ever shows for the "all" tab, and
// Participants/Reward/Completion only ever show for a single-status tab,
// mutually exclusive today. Dashboard's Recent Missions preview (mixed
// statuses, no need for the Created/Deadline/Completed Date columns that
// make sense on the full Missions page) is genuinely a third shape, not a
// variant of either existing one -- kept as a separate branch so neither
// of those two paths' behavior changes at all.
export default function MissionsTable({ rows, nav, categories, onDelete, tab, selectedIds, onToggleSelect, onToggleSelectAll, compact, notifCounts }) {
  const { t } = useTranslation();
  if (!rows.length) return <div className="muted" style={{ padding: 24 }}>{t("missions.noMissionsYet", null, "No missions yet — create your first one.")}</div>;
  // Every row is selectable here, regardless of status — selection also
  // drives Export, which has no reason to exclude Active/Completed rows
  // (if anything those are the ones most worth exporting). Only the Delete
  // action itself, downstream in Missions.jsx, is restricted to the
  // deletable subset of whatever's selected.
  const allSelected = onToggleSelect && rows.every(m => selectedIds?.has(m.id));
  const isAll = tab === "all";
  // A draft never ran — Completion is always "Not started" for every single
  // row here, with no exception, unlike Archived (which can carry a real
  // final % from before it got archived). Nothing to compare across rows,
  // so the column is pure noise specifically on this tab.
  const hideCompletion = tab === "draft";
  const dateCol = TAB_DATE_COL[tab];
  // Every column is now sized generously enough that nothing should need to
  // wrap at all — white-space: normal (overriding the shared .tbl header's
  // nowrap) is kept purely as a safety net for an unusually long value (a
  // long locale's date format, say), not something relied on day to day.
  // overflow-wrap: break-word was deliberately dropped — it was breaking a
  // whole word mid-letter ("COMPLETE" / "D DATE") instead of wrapping at the
  // space between words, which read worse than the original problem.
  // textAlign here doubles as the matching <td>'s alignment for that column
  // (see cx() below) — center for anything short and label-like (dates,
  // status), right for the numeric ones, left only for Mission's own
  // identity column.
  const thStyle = (width, align, extra) => ({ width, whiteSpace: "normal", textAlign: align, ...extra });
  const cx = (align, extra) => ({ textAlign: align, ...extra });
  return (
    <div className="tbl-wrap missions-tbl-wrap">
      {/* table-layout: fixed + an explicit width on every column keeps
          Type/Created/etc. pinned to the same pixel position regardless of
          which trailing columns a given tab shows. Mission gets a fixed px
          width, not a %: verified live (real render, not just spec-reading)
          that browsers largely ignore a percentage width on <col> once
          it's mixed with pixel-width sibling columns under
          table-layout:fixed -- it silently fell back to "whatever's left
          over after the fixed-px columns", which on a tab with more
          trailing columns (Active/Completed/...) was almost nothing, so
          only Draft (fewest other columns) ever looked right. Every other
          column here is plain px and renders at exactly its declared size,
          which is why Mission is too now. 240px comfortably fits a title
          already capped to 3 words (see truncateTitle above) -- shrunk
          from an earlier 360px specifically to reclaim the dead space a
          tester flagged, since the old width was sized for uncapped
          titles that no longer render here. A name too long even for
          240px still gets a "..." via the ellipsis below rather than
          wrapping. On a narrow viewport this can push the table past the
          container width, which just overflows into the (deliberately
          unstyled, see .missions-tbl-wrap) horizontal scroll instead of
          squeezing anything further. */}
      <table className="tbl" style={{ tableLayout: "fixed" }}>
        {/* <col> widths, not just widths on the <th> cells -- table-layout:fixed
            is only unambiguously required to honor column widths declared
            this way, and mixing a "%" width in with the "px" widths on <th>
            alone wasn't taking effect reliably across tabs. Kept in exact
            lockstep with the <thead> row right below (same conditions, same
            order) since colgroup has no per-column label to visually
            cross-check against if the two ever drift apart. */}
        <colgroup>
          {onToggleSelect && <col style={{ width: 36 }} />}
          <col style={{ width: 240 }} />
          <col style={{ width: 130 }} />
          {(isAll || compact) && <col style={{ width: 120 }} />}
          {!compact && <col style={{ width: 140 }} />}
          {isAll && <col style={{ width: 150 }} />}
          {isAll && <col style={{ width: 150 }} />}
          {!isAll && !compact && dateCol && <col style={{ width: 140 }} />}
          {(!isAll || compact) && (
            <>
              <col style={{ width: 120 }} />
              <col style={{ width: 80 }} />
              {!hideCompletion && <col style={{ width: 120 }} />}
            </>
          )}
          {onDelete && <col style={{ width: 32 }} />}
        </colgroup>
        <thead>
          <tr>
            {onToggleSelect && (
              <th style={thStyle(undefined, "center")}>
                <input type="checkbox" checked={allSelected} onChange={onToggleSelectAll} style={{ cursor: "pointer" }}
                  ref={el => { if (el) el.indeterminate = !allSelected && rows.some(m => selectedIds?.has(m.id)); }} />
              </th>
            )}
            <th style={thStyle(undefined, "left", { padding: "13px 24px" })}>{t("missions.missionCol", null, "Mission")}</th>
            <th style={thStyle(undefined, "center")}>{t("missions.typeCol", null, "Type")}</th>
            {(isAll || compact) && <th style={thStyle(undefined, "center")}>{t("missions.statusCol", null, "Status")}</th>}
            {!compact && <th style={thStyle(undefined, "center")}>{t("missions.createdCol", null, "Created")}</th>}
            {isAll && <th style={thStyle(undefined, "center")}>{t("missions.deadlineCol", null, "Deadline")}</th>}
            {isAll && <th style={thStyle(undefined, "center")}>{t("missions.completedDateCol", null, "Completed Date")}</th>}
            {!isAll && !compact && dateCol && <th style={thStyle(undefined, "center")}>{t(dateCol.label, null, dateCol.fallback)}</th>}
            {(!isAll || compact) && (
              <>
                <th style={thStyle(undefined, "center")}>{t("metrics.participants", null, "Participants")}</th>
                <th style={thStyle(undefined, "center")}>{t("metrics.reward", null, "Reward")}</th>
                {!hideCompletion && <th style={thStyle(undefined, "center")}>{t("metrics.completion", null, "Completion")}</th>}
              </>
            )}
            {onDelete && <th style={thStyle(undefined, "center", { padding: "13px 8px" })}></th>}
          </tr>
        </thead>
        <tbody>
          {rows.map(m => (
            <tr className="click" key={m.id} onClick={() => nav(
              m.status === "draft" ? `/missions/${m.id}/edit` : `/missions/${m.id}`,
              // Lets the wizard tell "opened this specific saved draft from a
              // list" apart from "landed here via Create Mission / the
              // banner" — same URL either way, so this rides along on the
              // navigation itself (browser history state) rather than the
              // URL. See CreateMissionWizard's exit-warning modal. For a
              // non-draft row, carries which tab this list was on so the
              // mission detail page's "Missions" breadcrumb can return here
              // instead of always landing back on the default All tab.
              m.status === "draft" ? { state: { fromDraftList: true } } : { state: { fromTab: tab } }
            )}>
              {onToggleSelect && (
                <td onClick={e => e.stopPropagation()} style={cx("center")}>
                  <input type="checkbox" checked={!!selectedIds?.has(m.id)} onChange={() => onToggleSelect(m.id)} />
                </td>
              )}
              <td style={{ padding: "13px 24px", maxWidth: 0 }}>
                <div className="t-name" style={{ minWidth: 0, width: "100%" }}>
                  <MissionLogo name={m.name} cat={m.category} size={34} />
                  <div style={{ minWidth: 0, flex: "1 1 0%" }}>
                    <div className="row gap-2" style={{ alignItems: "center", minWidth: 0 }}>
                      <span title={m.name} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{truncateTitle(m.name)}</span>
                      {notifCounts?.[m.id] > 0 && (
                        <span title={t("missions.unreadUpdatesHint", { count: notifCounts[m.id] }, `${notifCounts[m.id]} unread update${notifCounts[m.id] === 1 ? "" : "s"}`)}
                          style={{ display: "inline-flex", alignItems: "center", gap: 3, flex: "none", background: "var(--danger)", color: "#fff", padding: "1px 7px 1px 5px", borderRadius: 10, fontSize: 11, fontWeight: 700 }}>
                          <Icon name="alertCircle" size={11} />{notifCounts[m.id]}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </td>
              <td style={cx("center")}><TypeTag cat={m.category} categories={categories} /></td>
              {(isAll || compact) && (
                <td style={cx("center")}>
                  <div className="row gap-2" style={{ alignItems: "center", justifyContent: "center" }}>
                    <StatusTag status={m.status} />
                    {/* A genuine never-published draft can never have real
                        participants — nobody could join a mission that was
                        never live. Seeing this tag on a "draft" row is a
                        clear signal something's off (e.g. a live mission
                        that briefly ended up back in Draft), worth
                        investigating rather than assuming it's a normal,
                        unstarted draft. */}
                    {m.status === "draft" && m.participants.joined > 0 && (
                      <span className="tag" title={t("missions.wasPublishedHint", null, "This draft has real participants — it was published before.")}
                        style={{ background: "var(--warning-weak)", color: "var(--warning)", fontSize: 11 }}>
                        <Icon name="alertTriangle" size={11} style={{ verticalAlign: -1, marginRight: 3 }} />
                        {t("missions.wasPublished", null, "Was published")}
                      </span>
                    )}
                  </div>
                </td>
              )}
              {!compact && <td style={cx("center")}>{fmtDate(m.createdAt)}</td>}
              {isAll && <td style={cx("center")}>{fmtDate(m.deadline)}</td>}
              {/* completedAt is a permanent historical record, set once the moment
                  a mission is actually completed and never cleared afterward --
                  an archived mission that went through "completed" first should
                  still show that date, not blank out just because it later moved
                  on to a different status. */}
              {isAll && <td style={cx("center")}>{m.completedAt ? fmtDate(m.completedAt) : emptyDash()}</td>}
              {!isAll && !compact && dateCol && <td style={cx("center")}>{fmtDate(dateCol.get(m))}</td>}
              {(!isAll || compact) && (
                <>
                  <td className="num" style={cx("center")}>
                    {m.status === "draft" && (m.audience?._maxReached ?? 0) < 4 ? (
                      emptyDash()
                    ) : (
                      <>{m.participants.joined}<span className="faint"> / {m.participants.target}</span></>
                    )}
                  </td>
                  <td className="num" style={cx("center")}>
                    {m.status === "draft" && (m.audience?._maxReached ?? 0) < 4 ? (
                      emptyDash()
                    ) : (
                      m.reward.type === "sample" ? t("reward.sample", null, "Sample") : m.reward.type === "free" ? t("reward.free", null, "Free") : inr(m.reward.amount)
                    )}
                  </td>
                  {!hideCompletion && <td style={cx("center")}>{m.status === "draft" ? <span className="faint" style={{ fontSize: 12.5 }}>{t("status.notStarted", null, "Not started")}</span> : <PBarRow value={m.completion} green={m.completion >= 90} />}</td>}
                </>
              )}
              {onDelete && (
                <td style={cx("center", { padding: "13px 8px" })}>
                  {DELETABLE_STATUSES.has(m.status) && (
                  <button
                    className="mtbl-del-btn"
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: "var(--radius-sm)",
                      border: "none",
                      background: "transparent",
                      color: "var(--danger)",
                      display: "grid",
                      placeItems: "center",
                      cursor: "pointer",
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(m.id);
                    }}
                  >
                    <Icon name="trash" size={16} />
                  </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
