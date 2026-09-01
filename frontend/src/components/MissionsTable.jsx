import Icon from "./Icon";
import { MissionLogo, PBarRow, StatusTag, TypeTag, inr } from "./ui";
import { useTranslation } from "../i18n/index.jsx";

// Region is stored as one long comma-joined string (e.g. every country an
// audience filter matched) — show the first few and collapse the rest into
// a count instead of letting the row balloon to five lines, with the full
// list still available on hover.
function truncateRegion(region, max = 4) {
  if (!region) return "";
  const parts = region.split(", ");
  if (parts.length <= max) return region;
  return `${parts.slice(0, max).join(", ")} +${parts.length - max} more`;
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
};

export default function MissionsTable({ rows, nav, categories, onDelete, tab, selectedIds, onToggleSelect, onToggleSelectAll }) {
  const { t } = useTranslation();
  if (!rows.length) return <div className="muted" style={{ padding: 24 }}>{t("missions.noMissionsYet", null, "No missions yet — create your first one.")}</div>;
  // Every row is selectable here, regardless of status — selection also
  // drives Export, which has no reason to exclude Active/Completed rows
  // (if anything those are the ones most worth exporting). Only the Delete
  // action itself, downstream in Missions.jsx, is restricted to the
  // deletable subset of whatever's selected.
  const allSelected = onToggleSelect && rows.every(m => selectedIds?.has(m.id));
  const isAll = tab === "all";
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
      {/* table-layout: fixed + an explicit width on every column but Mission
          (which just takes whatever's left) is what keeps Mission/Type/
          Created pinned to the same pixel position across tabs — switching
          tabs changes which columns follow, but never shifts the ones that
          come before them, since every column's own width stays constant
          regardless of what row content or sibling columns are present. */}
      <table className="tbl" style={{ tableLayout: "fixed" }}>
        <thead>
          <tr>
            {onToggleSelect && (
              <th style={thStyle(36, "center")}>
                <input type="checkbox" checked={allSelected} onChange={onToggleSelectAll} style={{ cursor: "pointer" }}
                  ref={el => { if (el) el.indeterminate = !allSelected && rows.some(m => selectedIds?.has(m.id)); }} />
              </th>
            )}
            {/* Checkbox/Mission/Type/Created/Delete all get a fixed width
                that's identical no matter which tab is showing — table-
                layout: fixed distributes proportionally to the *sum* of
                every column's declared width, so as long as that sum is the
                same 1136px "budget" on every tab (540px split across
                whichever trailing columns that tab actually needs), these
                leading columns land at the exact same rendered position on
                every tab, not just the same declared px value. Created/
                Deadline/Completed Date/Closed Date are all sized to fit
                both their header label and a real value like "6 Sept 2026"
                on one line without wrapping. */}
            <th style={thStyle(210, "left")}>{t("missions.missionCol", null, "Mission")}</th>
            <th style={thStyle(150, "center")}>{t("missions.typeCol", null, "Type")}</th>
            {isAll && <th style={thStyle(140, "center")}>{t("missions.statusCol", null, "Status")}</th>}
            <th style={thStyle(160, "center")}>{t("missions.createdCol", null, "Created")}</th>
            {isAll && <th style={thStyle(190, "center")}>{t("missions.deadlineCol", null, "Deadline")}</th>}
            {isAll && <th style={thStyle(210, "center")}>{t("missions.completedDateCol", null, "Completed Date")}</th>}
            {/* Both branches below sum to the same 540px trailing budget as
                "All"'s Status+Deadline+CompletedDate — 4 columns when
                there's a date column (Active/Closed/Completed), 3 when
                there isn't (Draft/Archived). */}
            {!isAll && dateCol && <th style={thStyle(160, "center")}>{t(dateCol.label, null, dateCol.fallback)}</th>}
            {!isAll && (
              <>
                <th style={thStyle(dateCol ? 150 : 200, "center")}>{t("metrics.participants", null, "Participants")}</th>
                <th style={thStyle(dateCol ? 90 : 140, "center")}>{t("metrics.reward", null, "Reward")}</th>
                <th style={thStyle(dateCol ? 140 : 200, "center")}>{t("metrics.completion", null, "Completion")}</th>
              </>
            )}
            {onDelete && <th style={thStyle(40, "center")}></th>}
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
              // URL. See CreateMissionWizard's exit-warning modal.
              m.status === "draft" ? { state: { fromDraftList: true } } : undefined
            )}>
              {onToggleSelect && (
                <td onClick={e => e.stopPropagation()} style={cx("center")}>
                  <input type="checkbox" checked={!!selectedIds?.has(m.id)} onChange={() => onToggleSelect(m.id)} />
                </td>
              )}
              <td>
                <div className="t-name">
                  <MissionLogo name={m.name} cat={m.category} size={34} />
                  <div><div>{m.name}</div><div className="t-sub" title={m.region} style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 360 }}>{truncateRegion(m.region)}</div></div>
                </div>
              </td>
              <td style={cx("center")}><TypeTag cat={m.category} categories={categories} /></td>
              {isAll && (
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
              <td style={cx("center")}>{fmtDate(m.createdAt)}</td>
              {isAll && <td style={cx("center")}>{fmtDate(m.deadline)}</td>}
              {isAll && <td style={cx("center")}>{m.status === "completed" ? fmtDate(m.completedAt) : emptyDash()}</td>}
              {!isAll && dateCol && <td style={cx("center")}>{fmtDate(dateCol.get(m))}</td>}
              {!isAll && (
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
                  <td style={cx("center")}>{m.status === "draft" ? <span className="faint" style={{ fontSize: 12.5 }}>{t("status.notStarted", null, "Not started")}</span> : <PBarRow value={m.completion} green={m.completion >= 90} />}</td>
                </>
              )}
              {onDelete && (
                <td style={cx("center")}>
                  {DELETABLE_STATUSES.has(m.status) && (
                  <button
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      border: "none",
                      background: "var(--danger-weak)",
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
