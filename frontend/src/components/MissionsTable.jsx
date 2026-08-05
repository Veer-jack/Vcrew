import Icon from "./Icon";
import { MissionLogo, PBarRow, StatusTag, TypeTag, inr } from "./ui";
import { useTranslation } from "../i18n/index.jsx";

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
            <tr className="click" key={m.id} onClick={() => nav(`/missions/${m.id}`)}>
              <td>
                <div className="t-name">
                  <MissionLogo name={m.name} cat={m.category} size={34} />
                  <div><div>{m.name}</div><div className="t-sub">{m.region}</div></div>
                </div>
              </td>
              <td><TypeTag cat={m.category} categories={categories} /></td>
              <td><StatusTag status={m.status} /></td>
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
