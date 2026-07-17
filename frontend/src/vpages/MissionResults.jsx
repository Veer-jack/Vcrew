import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Icon from "../components/Icon";
import { vapi } from "../vapi/client";
import { useVMeta } from "../vcontext/VMetaContext";
import { VTypeTag } from "../vcomponents/vui";

export default function MissionResults() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { vtypes } = useVMeta();
  const [data, setData] = useState(null);

  useEffect(() => { 
    vapi.task(id).then(setData); 
  }, [id]);

  if (!data) return <div className="page rise"><div className="muted">Loading results…</div></div>;

  const { task } = data;
  const t = vtypes[task.type];

  // Render stars
  const renderStars = (score) => {
    const stars = [];
    const rating = Math.max(1, Math.min(5, Math.round((score || 80) / 20))); // scale 0-100 to 1-5
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Icon key={i} name="star" size={28} style={{ 
          fill: i <= rating ? "var(--warning)" : "transparent", 
          color: i <= rating ? "var(--warning)" : "var(--border-strong)",
          margin: "0 2px"
        }} />
      );
    }
    return stars;
  };

  return (
    <div className="page" style={{ maxWidth: 640, margin: "0 auto", textAlign: "center", paddingTop: "8vh" }}>
      
      <button className="btn btn-quiet rise" onClick={() => navigate("/validator/missions")} style={{ position: "absolute", top: 24, left: 16 }}>
        <Icon name="arrowLeft" />My missions
      </button>

      <div className="rise" style={{ animationDelay: "0.1s" }}>
        <div style={{ width: 80, height: 80, borderRadius: 24, background: "var(--warning)", color: "#fff", display: "grid", placeItems: "center", margin: "0 auto 24px", boxShadow: "0 12px 24px var(--warning-weak)" }}>
          <Icon name="award" size={40} />
        </div>
        
        <h1 style={{ fontSize: 32, fontWeight: 800, margin: "0 0 8px", letterSpacing: "-.02em" }}>Mission Approved!</h1>
        <p className="muted" style={{ fontSize: 16, margin: "0 0 32px" }}>
          Great job on completing the <b>{task.product}</b> mission.
        </p>

        <div className="card" style={{ padding: "32px 24px", textAlign: "center", border: "2px solid var(--warning-weak)", background: "color-mix(in srgb, var(--warning) 3%, transparent)" }}>
          <div className="eyebrow" style={{ color: "var(--warning)", marginBottom: 12 }}>You Earned</div>
          <div style={{ fontSize: 48, fontWeight: 800, color: "var(--success)", letterSpacing: "-.03em", marginBottom: 8 }}>
            ₹{task.reward}
          </div>
          <div className="faint" style={{ fontSize: 13 }}>Added to your pending balance</div>

          <hr style={{ margin: "32px 0", borderColor: "var(--border-weak)" }} />
          
          <div className="eyebrow" style={{ marginBottom: 16 }}>Your Rating</div>
          <div className="row justify-center" style={{ marginBottom: 16 }}>
            {renderStars(task.myScore)}
          </div>
          
          {task.myReason && (
            <div style={{ background: "var(--bg)", padding: 16, borderRadius: 12, textAlign: "left", border: "1px solid var(--border)" }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>Feedback</div>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>"{task.myReason}"</p>
            </div>
          )}
        </div>

        <div style={{ marginTop: 40 }}>
          <button className="btn btn-primary btn-lg" onClick={() => navigate("/validator")} style={{ width: "100%", justifyContent: "center" }}>
            Find more missions <Icon name="arrowRight" />
          </button>
        </div>
      </div>
    </div>
  );
}
