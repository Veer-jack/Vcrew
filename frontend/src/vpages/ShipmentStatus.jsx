import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import { Btn } from "../components/ui";
import { vapi } from "../vapi/client";

const STATUS_COPY = {
  awaiting_shipment: { title: "Waiting for the builder to ship", desc: "You'll be notified here once your sample is on its way." },
  shipped: { title: "Your sample is on its way", desc: "Once it arrives, confirm receipt below to unlock the review." },
  received: { title: "Sample received", desc: "" },
};

export default function ShipmentStatus() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [mission, setMission] = useState(null);
  const [shipment, setShipment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const data = await vapi.get(`/missions/${id}/shipment-status`);
        if (data.shipment?.status === "received") {
          navigate(`/validator/missions/${id}/workspace`, { replace: true });
          return;
        }
        setMission(data.mission);
        setShipment(data.shipment);
      } catch {
        setError("Couldn't load shipment status.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, navigate]);

  if (loading) return <div className="page rise"><div className="muted">Loading shipment status…</div></div>;
  if (error) return <div className="page rise"><div className="muted">{error}</div></div>;

  const confirmReceived = async () => {
    setConfirming(true);
    setError("");
    try {
      await vapi.post(`/missions/${id}/shipment/received`, {});
      navigate(`/validator/missions/${id}/workspace`, { replace: true });
    } catch (err) {
      setError(err.message || "Couldn't confirm receipt — try again.");
    } finally {
      setConfirming(false);
    }
  };

  const status = shipment?.status || "awaiting_shipment";
  const copy = STATUS_COPY[status];

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "var(--bg)" }}>
      <div className="rise" style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
        <div style={{ width: 80, height: 80, borderRadius: 24, background: status === "shipped" ? "var(--accent-weak)" : "var(--panel-inset)", display: "grid", placeItems: "center", margin: "0 auto 22px" }}>
          <Icon name={status === "shipped" ? "box" : "clock"} size={36} style={{ color: status === "shipped" ? "var(--accent)" : "var(--text-faint)" }} />
        </div>
        <div style={{ fontSize: 13, color: "var(--text-faint)", marginBottom: 6 }}>{mission?.name}{mission?.brand ? ` · ${mission.brand}` : ""}</div>
        <h2 style={{ margin: "0 0 10px", fontSize: 22, fontWeight: 800 }}>{copy.title}</h2>
        {copy.desc && <p style={{ color: "var(--text-muted)", margin: "0 0 20px", fontSize: 15 }}>{copy.desc}</p>}

        {status === "shipped" && (shipment.tracking_number || shipment.carrier) && (
          <div className="card" style={{ padding: 16, marginBottom: 20, textAlign: "left" }}>
            {shipment.carrier && <div style={{ fontSize: 13, marginBottom: 4 }}><b>Carrier:</b> {shipment.carrier}</div>}
            {shipment.tracking_number && <div style={{ fontSize: 13 }}><b>Tracking number:</b> {shipment.tracking_number}</div>}
          </div>
        )}

        {error && <div className="err-banner" style={{ marginBottom: 16 }}>{error}</div>}

        {status === "shipped" ? (
          <Btn variant="primary" block disabled={confirming} onClick={confirmReceived}>
            {confirming ? "Confirming…" : "I've received it — start reviewing"}
          </Btn>
        ) : (
          <Btn variant="ghost" onClick={() => navigate("/validator/missions")}>Back to My Missions</Btn>
        )}
      </div>
    </div>
  );
}
