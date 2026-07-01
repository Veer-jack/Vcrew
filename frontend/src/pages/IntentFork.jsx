import { useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import { BrandMark } from "../components/BrandMark";

const SIDES = [
  {
    key: "demand",
    icon: "target",
    title: "I'm a Builder",
    tagline: "Validate my product or idea",
    blurb: "Put your idea, product, brand, or research in front of the exact people who should weigh in.",
    href: "/get-started/feedback",
    accent: "#4f46e5",
  },
  {
    key: "supply",
    icon: "star",
    title: "I'm a Validator",
    tagline: "Test products & get paid",
    blurb: "Bring your taste, expertise or everyday perspective. Join missions and get rewarded.",
    href: "/validator/login",
    accent: "#c81e78",
  },
];

export default function IntentFork() {
  const navigate = useNavigate();

  return (
    <div className="auth-shell">
      <div className="rise" style={{ width: "100%", maxWidth: 760, textAlign: "center" }}>
        <div style={{ margin: "0 auto 18px" }}><BrandMark size={40} /></div>
        <div className="eyebrow" style={{ marginBottom: 10 }}>Welcome to ValidationCrew</div>
        <h1 style={{ fontSize: 28, marginBottom: 8 }}>What would you like to do?</h1>
        <p className="muted" style={{ marginBottom: 32, fontSize: 14.5 }}>
          ValidationCrew connects people who need feedback with people who give it. Which side are you on?
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }} className="intent-grid">
          {SIDES.map((s) => (
            <button
              key={s.key}
              type="button"
              className="card intent-card"
              style={{ "--ic-accent": s.accent, textAlign: "left", cursor: "pointer" }}
              onClick={() => { if (s.external) window.location.href = s.href; else navigate(s.href); }}
            >
              <span className="intent-ic" style={{ background: `${s.accent}1a`, color: s.accent }}>
                <Icon name={s.icon} size={20} />
              </span>
              <h3 style={{ margin: "14px 0 4px", fontSize: 17 }}>{s.title}</h3>
              <p className="muted" style={{ fontSize: 13, margin: "0 0 8px" }}>{s.tagline}</p>
              <p className="faint" style={{ fontSize: 12.5, lineHeight: 1.5, margin: 0 }}>{s.blurb}</p>
              <span className="intent-cta">Continue <Icon name="arrowRight" size={14} /></span>
            </button>
          ))}
        </div>

        <p className="faint" style={{ marginTop: 26, fontSize: 12.5 }}>
          Already have an account? <a href="/login">Sign in as a Founder</a> or <a href="/validator/login">sign in as a Validator</a>.
        </p>
      </div>
    </div>
  );
}
