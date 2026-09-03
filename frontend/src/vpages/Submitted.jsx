import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Icon from "../components/Icon";
import { ScoreRing, VReward, VTypeTag } from "../vcomponents/vui";
import { useVMeta } from "../vcontext/VMetaContext";
import { vapi } from "../vapi/client";
import { deadlineLabel } from "../vutil";
import { useTranslation } from "../i18n/index.jsx";

function NextCard({ task, vtypes, onOpen }) {
  const { t } = useTranslation();
  const vType = vtypes[task.type];
  return (
    <div className="card mkt-cardhover" style={{ padding: 18, display: "grid", gridTemplateColumns: "1fr auto", gap: 18, alignItems: "center", cursor: "pointer" }} onClick={() => onOpen(task)}>
      <div style={{ minWidth: 0 }}>
        <div className="row gap-2 wrap" style={{ marginBottom: 9 }}>
          <VTypeTag type={task.type} vtypes={vtypes} />
          <span className="tag" style={{ background: "var(--accent-weak)", color: "var(--accent)" }}><Icon name="target" size={12} />{task.match}% {t("missions.match", null, "match")}</span>
        </div>
        <div className="row gap-2" style={{ alignItems: "baseline" }}><h3 style={{ margin: 0, fontSize: 19, fontWeight: 800, letterSpacing: "-.02em" }}>{task.product}</h3><span className="muted" style={{ fontSize: 14 }}>· {task.tagline}</span></div>
        <div className="row gap-4 wrap faint" style={{ fontSize: 12.5, marginTop: 8 }}>
          <span className="row gap-2"><Icon name="clock" size={14} />~{task.minutes} min</span>
          <span className="row gap-2"><Icon name="clock" size={14} />{deadlineLabel(task.deadline)}</span>
        </div>
      </div>
      <div className="col" style={{ alignItems: "flex-end", gap: 10, textAlign: "right" }}>
        <VReward amount={task.reward} type={task.rewardType} big />
        <button className="btn btn-primary">{t("actions.startValidating", null, "Start validating")} <Icon name="arrowRight" /></button>
      </div>
    </div>
  );
}

export default function Submitted() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { vtypes } = useVMeta();
  const [next, setNext] = useState(null);
  const result = location.state;

  useEffect(() => {
    vapi.marketplace({ sort: "match" }).then(d => {
      const candidate = d.tasks.find(t => t.id !== id && !t.myStatus);
      setNext(candidate || null);
    });
  }, [id]);

  if (!result) {
    return (
      <div className="page rise" style={{ maxWidth: 600, margin: "0 auto", textAlign: "center", paddingTop: 60 }}>
        <h2>{t("missions.validationSubmitted", null, "Validation submitted")}</h2>
        <p className="muted">{t("missions.workInReview", null, "Your work is in review.")}</p>
        <button className="btn btn-primary" onClick={() => navigate("/validator")}>{t("actions.backToDiscover", null, "Back to discover")}</button>
      </div>
    );
  }

  const { task, score, flags, minutes } = result;

  return (
    <div className="page" style={{ maxWidth: 720, paddingTop: 48 }}>
      <div className="rise" style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", margin: "0 auto 18px", display: "grid", placeItems: "center", background: "var(--success-weak)", color: "var(--success)" }}>
          <Icon name="check" size={34} />
        </div>
        <h2 style={{ margin: "0 0 8px", fontSize: 26, fontWeight: 800, letterSpacing: "-.02em" }}>{t("missions.validationSubmitted", null, "Validation submitted")}</h2>
        <p className="muted" style={{ margin: 0, fontSize: 15 }}>{t("missions.qualityCheckNotice", { product: task.product }, `Nice work on ${task.product}. We're running a quality check — your reward clears once it passes.`)}</p>
      </div>

      <div className="card rise-2" style={{ padding: 24, marginBottom: 16 }}>
        <div className="row between wrap gap-4">
          <div className="row gap-4" style={{ alignItems: "center" }}>
            <ScoreRing value={score} size={72} stroke={7} />
            <div>
              <div className="eyebrow">{t("missions.launchReadinessScore", null, "Your launch-readiness score")}</div>
              <div style={{ fontSize: 18, fontWeight: 800, marginTop: 2 }}>{score >= 75 ? t("status.strongSignal", null, "Strong signal") : score >= 50 ? t("status.mixedSignal", null, "Mixed signal") : t("status.needsWork", null, "Needs work")}</div>
              <div className="faint" style={{ fontSize: 12.5 }}>{t("missions.issuesFlaggedMinSpent", { issues: flags.length, min: minutes }, `${flags.length} issues flagged · ${minutes} min spent`)}</div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="eyebrow">{t("missions.reward", null, "Reward")}</div>
            <VReward amount={task.reward} type={task.rewardType} big />
            <div className="faint" style={{ fontSize: 11 }}>{t("missions.pendingApproval", null, "pending approval")}</div>
          </div>
        </div>
      </div>

      <div className="card rise-2" style={{ padding: 18, marginBottom: 28, display: "flex", gap: 12, alignItems: "center", background: "var(--panel-2)" }}>
        <Icon name="shield" size={22} style={{ color: "var(--success)", flex: "none" }} />
        <div style={{ fontSize: 13.5 }} className="muted">{t("missions.highSignalDesc", null, "High-signal, specific feedback raises your accuracy score and unlocks higher-paying tasks. Low-effort submissions get filtered before the builder ever sees them.")}</div>
      </div>

      {next && (
        <div className="rise-3">
          <div className="eyebrow" style={{ marginBottom: 10 }}>{t("missions.upNext", null, "Up next for you")}</div>
          <NextCard task={next} vtypes={vtypes} onOpen={(t) => navigate(`/validator/missions/${t.id}`)} />
        </div>
      )}
      <div className="row gap-3" style={{ marginTop: 22, justifyContent: "center" }}>
        <button className="btn btn-ghost" onClick={() => navigate("/validator/earnings")}><Icon name="wallet" />{t("actions.viewEarnings", null, "View earnings")}</button>
        <button className="btn btn-primary" onClick={() => navigate("/validator")}>{t("actions.backToAllMissions", null, "Back to all missions")} <Icon name="arrowRight" /></button>
      </div>
    </div>
  );
}
