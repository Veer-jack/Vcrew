import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import { Btn } from "../components/ui";
import { vapi } from "../vapi/client";

export default function InterviewSchedule() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [mission, setMission] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const data = await vapi.get(`/missions/${id}/schedule-status`);
        if (data.schedule?.status === "completed") {
          navigate(`/validator/missions/${id}/workspace`, { replace: true });
          return;
        }
        setMission(data.mission);
        setSchedule(data.schedule);
      } catch {
        setError("Couldn't load interview schedule.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, navigate]);

  if (loading) return <div className="page rise"><div className="muted">Loading interview schedule…</div></div>;
  if (error) return <div className="page rise"><div className="muted">{error}</div></div>;

  const respond = async (accept) => {
    setBusy(true);
    setError("");
    try {
      await vapi.post(`/missions/${id}/schedule/${accept ? "accept" : "decline"}`, {});
      setSchedule(s => ({ ...s, status: accept ? "accepted" : "declined" }));
    } catch (err) {
      setError(err.message || "Couldn't respond — try again.");
    } finally {
      setBusy(false);
    }
  };

  const status = schedule?.status;

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "var(--bg)" }}>
      <div className="rise" style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
        <div style={{ width: 80, height: 80, borderRadius: 24, background: status === "proposed" ? "var(--accent-weak)" : "var(--panel-inset)", display: "grid", placeItems: "center", margin: "0 auto 22px" }}>
          <Icon name="calendar" size={36} style={{ color: status === "proposed" ? "var(--accent)" : "var(--text-faint)" }} />
        </div>
        <div style={{ fontSize: 13, color: "var(--text-faint)", marginBottom: 6 }}>{mission?.name}{mission?.brand ? ` · ${mission.brand}` : ""}</div>

        {!schedule && (
          <>
            <h2 style={{ margin: "0 0 10px", fontSize: 22, fontWeight: 800 }}>Waiting for a time to be proposed</h2>
            <p style={{ color: "var(--text-muted)", margin: "0 0 20px", fontSize: 15 }}>The builder hasn't proposed an interview time yet. You'll see it here once they do.</p>
          </>
        )}

        {status === "proposed" && (
          <>
            <h2 style={{ margin: "0 0 10px", fontSize: 22, fontWeight: 800 }}>Interview time proposed</h2>
            <div className="card" style={{ padding: 16, marginBottom: 20, textAlign: "left" }}>
              <div style={{ fontSize: 13, marginBottom: 4 }}><b>When:</b> {new Date(schedule.scheduled_at).toLocaleString()}</div>
              {schedule.meeting_link && <div style={{ fontSize: 13 }}><b>Link:</b> <a href={schedule.meeting_link} target="_blank" rel="noopener noreferrer">{schedule.meeting_link}</a></div>}
            </div>
            {error && <div className="err-banner" style={{ marginBottom: 16 }}>{error}</div>}
            <div className="row gap-2" style={{ justifyContent: "center" }}>
              <Btn variant="primary" disabled={busy} onClick={() => respond(true)}>{busy ? "Saving…" : "Accept this time"}</Btn>
              <Btn variant="ghost" disabled={busy} onClick={() => respond(false)}>Decline</Btn>
            </div>
          </>
        )}

        {status === "declined" && (
          <>
            <h2 style={{ margin: "0 0 10px", fontSize: 22, fontWeight: 800 }}>You declined this time</h2>
            <p style={{ color: "var(--text-muted)", margin: "0 0 20px", fontSize: 15 }}>Waiting for the builder to propose a new time.</p>
          </>
        )}

        {status === "accepted" && (
          <>
            <h2 style={{ margin: "0 0 10px", fontSize: 22, fontWeight: 800 }}>You're confirmed</h2>
            <div className="card" style={{ padding: 16, marginBottom: 20, textAlign: "left" }}>
              <div style={{ fontSize: 13, marginBottom: 4 }}><b>When:</b> {new Date(schedule.scheduled_at).toLocaleString()}</div>
              {schedule.meeting_link && <div style={{ fontSize: 13 }}><b>Link:</b> <a href={schedule.meeting_link} target="_blank" rel="noopener noreferrer">{schedule.meeting_link}</a></div>}
            </div>
            <p style={{ color: "var(--text-muted)", margin: "0 0 20px", fontSize: 15 }}>After the interview, the builder will mark it complete and you'll be able to finish your review here.</p>
          </>
        )}

        <div style={{ marginTop: 20 }}>
          <Btn variant="ghost" onClick={() => navigate(`/validator/missions/${id}/workspace`)}>Go to Workspace (Tasks)</Btn>
        </div>
      </div>
    </div>
  );
}
