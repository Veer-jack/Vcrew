import { useEffect, useState } from "react";
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

function StatusPill({ status, t }) {
  const style = STATUS_STYLE[status] || STATUS_STYLE.closed;
  const label = {
    pending: t("invitations.statusPending", null, "Pending"),
    accepted: t("invitations.statusAccepted", null, "Accepted"),
    declined: t("invitations.statusDeclined", null, "Declined"),
    closed: t("invitations.statusClosed", null, "Closed"),
    cancelled: t("invitations.statusCancelled", null, "Cancelled"),
  }[status] || status;
  return <span className="tag" style={{ background: style.bg, color: style.fg }}>{label}</span>;
}

export default function Invitations() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);

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

  return (
    <div className="page rise">
      <div className="ph">
        <div>
          <span className="eyebrow">{t("invitations.eyebrow", null, "Outreach")}</span>
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
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>{t("invitations.memberCol", null, "Member")}</th>
                <th>{t("invitations.missionCol", null, "Mission")}</th>
                <th>{t("invitations.statusCol", null, "Status")}</th>
                <th style={{ width: 120 }}></th>
              </tr>
            </thead>
            <tbody>
              {invitations.map(inv => (
                <tr key={inv.id}>
                  <td>
                    <div className="t-name">
                      <Avatar name={inv.validator.name} size={32} />
                      <div>
                        <div className="row" style={{ gap: 6, alignItems: 'center' }}>
                          {inv.validator.name}
                          {inv.isWaitlist && <span title={t("invitations.waitlistTitle", null, "Invited from Waitlist")} style={{ color: "var(--accent)", display: "flex" }}><Icon name="star" size={14} /></span>}
                        </div>
                        <div className="t-sub">{inv.validator.city}</div>
                      </div>
                    </div>
                  </td>
                  <td className="click" onClick={() => navigate(`/missions/${inv.mission.id}`)}>{inv.mission.name}</td>
                  <td><StatusPill status={inv.status} t={t} /></td>
                  <td>
                    {inv.status === "pending" && (
                      <Btn variant="ghost" size="sm" disabled={cancellingId === inv.id} onClick={() => handleCancel(inv)}>
                        {cancellingId === inv.id ? t("actions.cancelling", null, "Withdrawing…") : t("invitations.uninvite", null, "Withdraw")}
                      </Btn>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
