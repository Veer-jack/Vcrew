import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import { Btn } from "../components/ui";
import { toast } from "react-hot-toast";
import { vapi } from "../vapi/client";
import { useTranslation } from "../i18n/index.jsx";

export default function FocusGroupPoll() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [mission, setMission] = useState(null);
  const [poll, setPoll] = useState(null);
  const [restarted, setRestarted] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const data = await vapi.get(`/missions/${id}/poll-status`);
        if (data.poll?.status === "completed" && data.poll?.outcome === "confirmed") {
          navigate(`/validator/missions/${id}/workspace`, { replace: true });
          return;
        }
        setMission(data.mission);
        setPoll(data.poll);
        setRestarted(!!data.restarted);
        setSelected(new Set(data.poll?.mySlotIds || []));
      } catch {
        setError(t("missions.couldntLoadFocusGroupPoll", null, "Couldn't load the focus group poll."));
      } finally {
        setLoading(false);
      }
    })();
  }, [id, navigate]);

  if (loading) return <div className="page rise"><div className="muted">{t("missions.loadingFocusGroup", null, "Loading focus group schedule…")}</div></div>;
  if (error) return <div className="page rise"><div className="muted">{error}</div></div>;

  const toggleSlot = (slotId) => {
    setSelected(s => {
      const next = new Set(s);
      next.has(slotId) ? next.delete(slotId) : next.add(slotId);
      return next;
    });
  };

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      await vapi.post(`/missions/${id}/poll/respond`, { slotIds: [...selected] });
      setPoll(p => ({ ...p, mySlotIds: [...selected] }));
      toast.success(t("missions.availabilitySaved", null, "Availability saved! You can update this until the builder confirms a time."));
    } catch (err) {
      setError(err.message || t("missions.couldntSaveAvailability", null, "Couldn't save your availability — try again."));
    } finally {
      setBusy(false);
    }
  };

  const status = poll?.status;

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "var(--bg)" }}>
      <div className="rise" style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
        <div style={{ width: 80, height: 80, borderRadius: 24, background: status === "open" ? "var(--accent-weak)" : "var(--panel-inset)", display: "grid", placeItems: "center", margin: "0 auto 22px" }}>
          <Icon name="users" size={36} style={{ color: status === "open" ? "var(--accent)" : "var(--text-faint)" }} />
        </div>
        <div style={{ fontSize: 13, color: "var(--text-faint)", marginBottom: 6 }}>{mission?.name}{mission?.brand ? ` · ${mission.brand}` : ""}</div>

        {!poll && (
          <>
            <h2 style={{ margin: "0 0 10px", fontSize: 22, fontWeight: 800 }}>
              {restarted ? t("missions.pollRestartedTitle", null, "The poll was restarted") : t("missions.waitingForTimes", null, "Waiting for times to be proposed")}
            </h2>
            <p style={{ color: "var(--text-muted)", margin: "0 0 20px", fontSize: 15 }}>
              {restarted
                ? t("missions.pollRestartedDesc", null, "Sorry about that — the builder restarted scheduling for this session. New candidate times are coming soon, and you'll see them here as soon as they're posted.")
                : t("missions.noScheduleDesc", null, "The builder hasn't set up the focus group schedule yet. You'll see it here once they do.")}
            </p>
          </>
        )}

        {status === "open" && (
          <>
            {poll.isRestart && (
              <div className="card" style={{ padding: 12, marginBottom: 16, textAlign: "left", background: "var(--accent-weak)", border: "none" }}>
                <div className="row gap-2" style={{ alignItems: "flex-start" }}>
                  <Icon name="refresh" size={15} style={{ color: "var(--accent)", flexShrink: 0, marginTop: 2 }} />
                  <span style={{ fontSize: 13, color: "var(--accent)" }}>{t("missions.pollRestartedBanner", null, "The builder restarted this poll with new times — please vote again below.")}</span>
                </div>
              </div>
            )}
            <h2 style={{ margin: "0 0 10px", fontSize: 22, fontWeight: 800 }}>{t("missions.markYourAvailability", null, "Mark your availability")}</h2>
            <p style={{ color: "var(--text-muted)", margin: "0 0 16px", fontSize: 14 }}>{t("missions.selectTimeDesc", null, "Select every time you could make it — the builder will pick whichever works for the most people.")}</p>
            <div className="col gap-2" style={{ marginBottom: 20, textAlign: "left" }}>
              {poll.slots.map(s => (
                <label key={s.id} className="card" style={{ padding: 12, display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                  <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggleSlot(s.id)} />
                  <span style={{ fontSize: 14 }}>{new Date(s.scheduledAt).toLocaleString()}</span>
                </label>
              ))}
            </div>
            {error && <div className="err-banner" style={{ marginBottom: 16 }}>{error}</div>}
            {(() => {
              const savedIds = poll.mySlotIds || [];
              // Nothing changed since the last successful save: disable the
              // button instead of leaving it clickable, which previously let
              // every extra click re-fire an identical save + success toast
              // with no feedback that it was a no-op.
              const isDirty = selected.size !== savedIds.length || savedIds.some(sid => !selected.has(sid));
              const label = busy ? t("actions.saving", null, "Saving…")
                : !isDirty && savedIds.length > 0 ? t("actions.saved", null, "Saved")
                : savedIds.length > 0 ? t("actions.updateAvailability", null, "Update availability")
                : t("actions.saveAvailability", null, "Save my availability");
              return (
                <Btn variant="primary" block disabled={busy || !isDirty} onClick={submit}>
                  {label}
                </Btn>
              );
            })()}
          </>
        )}

        {status === "locked" && poll.outcome === "confirmed" && (
          <>
            <h2 style={{ margin: "0 0 10px", fontSize: 22, fontWeight: 800 }}>{t("missions.youAreConfirmed", null, "You're confirmed")}</h2>
            <div className="card" style={{ padding: 16, marginBottom: 20, textAlign: "left" }}>
              <div style={{ fontSize: 13, marginBottom: 4 }}><b>{t("missions.when", null, "When:")}</b> {new Date(poll.slots.find(s => s.id === poll.lockedSlotId)?.scheduledAt).toLocaleString()}</div>
              {poll.meetingLink && <div style={{ fontSize: 13 }}><b>{t("missions.link", null, "Link:")}</b> <a href={poll.meetingLink} target="_blank" rel="noopener noreferrer">{poll.meetingLink}</a></div>}
            </div>
            <p style={{ color: "var(--text-muted)", margin: "0 0 20px", fontSize: 15 }}>{t("missions.afterSessionDesc", null, "After the session, the builder will mark it complete and you'll be able to finish your review here.")}</p>
          </>
        )}

        {(status === "locked" || status === "completed") && poll.outcome === "not_selected" && (
          <>
            <h2 style={{ margin: "0 0 10px", fontSize: 22, fontWeight: 800 }}>{t("missions.timeNoMatch", null, "This session's time didn't match your availability")}</h2>
            <p style={{ color: "var(--text-muted)", margin: "0 0 20px", fontSize: 15 }}>{t("missions.timeNoMatchDesc", null, "The confirmed time isn't one you marked as available, so you won't be part of this session.")}</p>
          </>
        )}

        <Btn variant="ghost" onClick={() => navigate("/validator/missions")}>{t("actions.backToMyMissions", null, "Back to My Missions")}</Btn>
      </div>
    </div>
  );
}
