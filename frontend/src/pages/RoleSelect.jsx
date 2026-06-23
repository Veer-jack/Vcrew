import { useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import { BrandMark } from "../components/BrandMark";

const ROLES = [
  {
    key: "founder", icon: "rocket", name: "Founder", live: true,
    desc: "Validate your startup — product feedback, user opinions, beta testing, idea & pricing validation.",
    accent: "#4f46e5",
  },
  {
    key: "company", icon: "building", name: "Company", live: true,
    desc: "Evaluate products, packaging, pricing, brand perception and customer experience.",
    accent: "#0891b2",
  },
  {
    key: "researcher", icon: "flask", name: "Researcher", live: true,
    desc: "Recruit participants for academic, social, healthcare, or scientific research.",
    accent: "#0d9488",
  },
  {
    key: "organization", icon: "building", name: "Organization", live: true,
    desc: "Gather community, policy and programme feedback — impact assessment and awareness studies.",
    accent: "#c2710c",
  },
];

export default function RoleSelect() {
  const navigate = useNavigate();

  return (
    <div className="auth-shell">
      <div className="rise" style={{ width: "100%", maxWidth: 860, textAlign: "center" }}>
        <div style={{ margin: "0 auto 18px" }}><BrandMark size={80} /></div>
        <div className="eyebrow" style={{ marginBottom: 10 }}>I need feedback</div>
        <h1 style={{ fontSize: 26, marginBottom: 8 }}>Pick your role</h1>
        <p className="muted" style={{ marginBottom: 30, fontSize: 14.5 }}>
          Choose the description that fits you best — we'll tailor every step that follows.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="role-grid">
          {ROLES.map((r) => (
            <button
              key={r.key}
              type="button"
              className={`card role-card ${!r.live ? "role-card-soon" : ""}`}
              style={{ "--rc-accent": r.accent, textAlign: "left", cursor: r.live ? "pointer" : "default" }}
              disabled={!r.live}
              onClick={() => r.live && navigate(`/signup?role=${r.key}`)}
            >
              <div className="row between" style={{ alignItems: "flex-start" }}>
                <span className="intent-ic" style={{ background: `${r.accent}1a`, color: r.accent }}>
                  <Icon name={r.icon} size={18} />
                </span>
                {!r.live && <span className="pill" style={{ fontSize: 11 }}>Coming soon</span>}
              </div>
              <h3 style={{ margin: "12px 0 4px", fontSize: 15.5 }}>{r.name}</h3>
              <p className="faint" style={{ fontSize: 12.5, lineHeight: 1.5, margin: 0 }}>{r.desc}</p>
              {r.live && <span className="intent-cta">Continue as {r.name} <Icon name="arrowRight" size={14} /></span>}
            </button>
          ))}
        </div>

        <p className="faint" style={{ marginTop: 26, fontSize: 12.5 }}>
          <a href="/get-started">&larr; Back</a>
        </p>
      </div>
    </div>
  );
}
