import { useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import { BrandMark } from "../components/BrandMark";
import { useTranslation } from "../i18n/index.jsx";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { api } from "../api/client";

const SIDES = (t) => [
  {
    key: "demand",
    icon: "target",
    title: t("landing.builderTitle", null, "I'm a Builder"),
    tagline: t("landing.builderTagline", null, "Validate my product or idea"),
    blurb: t("landing.builderBlurb", null, "Put your idea, product, brand, or research in front of the exact people who should weigh in."),
    href: "/get-started/feedback",
    accent: "#4f46e5",
  },
  {
    key: "supply",
    icon: "star",
    title: t("landing.validatorTitle", null, "I'm a Validator"),
    tagline: t("landing.validatorTagline", null, "Test products & get paid"),
    blurb: t("landing.validatorBlurb", null, "Bring your taste, expertise or everyday perspective. Join missions and get rewarded."),
    href: "/validator/login",
    accent: "#c81e78",
  },
];

export default function IntentFork() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="auth-shell">
      <div style={{ position: "absolute", top: 16, right: 24, zIndex: 10 }}>
        <LanguageSwitcher onSave={(lang) => api.setLanguage(lang).catch(() => {})} style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "4px 8px" }} />
      </div>
      <div className="rise" style={{ width: "100%", maxWidth: 760, textAlign: "center" }}>
        <div style={{ margin: "0 auto 18px" }}><BrandMark size={40} /></div>
        <div className="eyebrow" style={{ marginBottom: 10 }}>{t("landing.welcome", null, "Welcome to ValidationCrew")}</div>
        <h1 style={{ fontSize: 28, marginBottom: 8 }}>{t("landing.whatToDo", null, "What would you like to do?")}</h1>
        <p className="muted" style={{ marginBottom: 32, fontSize: 14.5 }}>
          {t("landing.description", null, "ValidationCrew connects people who need feedback with people who give it. Which side are you on?")}
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }} className="intent-grid">
          {SIDES(t).map((s) => (
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
              <span className="intent-cta">{t("actions.continue", null, "Continue")} <Icon name="arrowRight" size={14} /></span>
            </button>
          ))}
        </div>

        <p className="faint" style={{ marginTop: 26, fontSize: 12.5 }}>
          {t("landing.alreadyAccount", null, "Already have an account?")} <a href="/login">{t("landing.signInFounder", null, "Sign in as a Founder")}</a> or <a href="/validator/login">{t("landing.signInValidator", null, "sign in as a Validator")}</a>.
        </p>
      </div>
    </div>
  );
}
