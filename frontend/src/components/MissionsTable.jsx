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

export default function MissionsTable({ rows, nav, categories, onDelete }) {
  const { t } = useTranslation();
  if (!rows.length) return <div className="muted" style={{ padding: 24 }}>{t("missions.noMissionsYet", null, "No missions yet — create your first one.")}</div>;
  return (
    <div className="tbl-wrap">
      <table className="tbl">
        <thead>
          <tr>
            <th>{t("missions.missionCol", null, "Mission")}</th><th>{t("missions.typeCol", null, "Type")}</th><th>{t("missions.statusCol", null, "Status")}</th>
            <th style={{ textAlign: "right" }}>{t("metrics.participants", null, "Participants")}</th>
            <th style={{ textAlign: "right" }}>{t("metrics.reward", null, "Reward")}</th>
            <th style={{ width: 150 }}>{t("metrics.completion", null, "Completion")}</th>
            {onDelete && <th style={{ width: 40 }}></th>}
          </tr>
        </thead>
        <tbody>
          {rows.map(m => (
            <tr className="click" key={m.id} onClick={() => nav(m.status === "draft" ? `/missions/${m.id}/edit` : `/missions/${m.id}`)}>
              <td>
                <div className="t-name">
                  <MissionLogo name={m.name} cat={m.category} size={34} />
                  <div><div>{m.name}</div><div className="t-sub" title={m.region} style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 360 }}>{truncateRegion(m.region)}</div></div>
                </div>
              </td>
              <td><TypeTag cat={m.category} categories={categories} /></td>
              <td>
                <div className="row gap-2" style={{ alignItems: "center" }}>
                  <StatusTag status={m.status} />
                  {/* A genuine never-published draft can never have real
                      participants — nobody could join a mission that was
                      never live. Seeing this tag on a "draft" row is a clear
                      signal something's off (e.g. a live mission that
                      briefly ended up back in Draft), worth investigating
                      rather than assuming it's a normal, unstarted draft. */}
                  {m.status === "draft" && m.participants.joined > 0 && (
                    <span className="tag" title={t("missions.wasPublishedHint", null, "This draft has real participants — it was published before.")}
                      style={{ background: "var(--warning-weak)", color: "var(--warning)", fontSize: 11 }}>
                      <Icon name="alertTriangle" size={11} style={{ verticalAlign: -1, marginRight: 3 }} />
                      {t("missions.wasPublished", null, "Was published")}
                    </span>
                  )}
                </div>
              </td>
              <td className="num">{m.participants.joined}<span className="faint"> / {m.participants.target}</span></td>
              <td className="num">{m.reward.type === "sample" ? t("reward.sample", null, "Sample") : m.reward.type === "free" ? t("reward.free", null, "Free") : inr(m.reward.amount)}</td>
              <td>{m.status === "draft" ? <span className="faint" style={{ fontSize: 12.5 }}>{t("status.notStarted", null, "Not started")}</span> : <PBarRow value={m.completion} green={m.completion >= 90} />}</td>
              {onDelete && (
                <td>
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
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
