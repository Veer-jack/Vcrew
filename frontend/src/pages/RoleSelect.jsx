import { useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import { BrandMark } from "../components/BrandMark";
import { useTranslation } from "../i18n/index.jsx";

const getRoles = (t) => [
  {
    key: "founder", icon: "rocket", name: t("roles.founder", null, "Founder / Startup"), live: true,
    desc: t("roles.founderDesc", null, "Validate your startup — product feedback, user opinions, beta testing, idea & pricing validation."),
    accent: "#4f46e5",
  },
  {
    key: "company", icon: "building", name: t("roles.company", null, "Company"), live: true,
    desc: t("roles.companyDesc", null, "Evaluate products, packaging, pricing, brand perception and customer experience."),
    accent: "#0891b2",
  },
  {
    key: "researcher", icon: "flask", name: t("roles.researcher", null, "Researcher"), live: true,
    desc: t("roles.researcherDesc", null, "Recruit participants for academic, social, healthcare, or scientific research."),
    accent: "#0d9488",
  },
  {
    key: "organization", icon: "building", name: t("roles.organization", null, "Organization"), live: true,
    desc: t("roles.orgDesc", null, "Gather community, policy and programme feedback — impact assessment and awareness studies."),
    accent: "#c2710c",
  },
];


export default function RoleSelect() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="auth-shell">
      <div className="rise" style={{ width: "100%", maxWidth: 860, textAlign: "center" }}>
        <div style={{ margin: "0 auto 18px" }}><BrandMark size={80} /></div>
        <div className="eyebrow" style={{ marginBottom: 10 }}>{t("onboarding.iNeedFeedback", null, "I need feedback")}</div>
        <h1 style={{ fontSize: 26, marginBottom: 8 }}>{t("onboarding.createBuilderAccount", null, "Create your builder account")}</h1>
        <p className="muted" style={{ marginBottom: 30, fontSize: 14.5 }}>
          {t("onboarding.chooseDescFitsBest", null, "Choose the description that fits you best — we'll tailor every step that follows.")}
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="role-grid">
          {getRoles(t).map((r) => (
            <button
              key={r.key}
              type="button"
              className={`card role-card ${!r.live ? "role-card-soon" : ""}`}
              style={{ "--rc-accent": r.accent, textAlign: "left", cursor: r.live ? "pointer" : "default" }}
              disabled={!r.live}
              onClick={() => {
                if (!r.live) return;
                // Clear any lingering drafts to ensure a clean slate when switching roles
                getRoles(t).forEach(roleObj => {
                  try { localStorage.removeItem(`vc_onboarding_draft_${roleObj.key}`); } catch {}
                });
                // Formally initialize a blank draft so the dashboard instantly knows the user's choice
                try { localStorage.setItem(`vc_onboarding_draft_${r.key}`, JSON.stringify({ step: 0, maxReached: 0, d: {} })); } catch {}
                navigate(`/signup?role=${r.key}`);
              }}
            >
              <div className="row between" style={{ alignItems: "flex-start" }}>
                <span className="intent-ic" style={{ background: `${r.accent}1a`, color: r.accent }}>
                  <Icon name={r.icon} size={18} />
                </span>
                {!r.live && <span className="pill" style={{ fontSize: 11 }}>{t("status.comingSoon", null, "Coming soon")}</span>}
              </div>
              <h3 style={{ margin: "12px 0 4px", fontSize: 15.5 }}>{r.name}</h3>
              <p className="faint" style={{ fontSize: 12.5, lineHeight: 1.5, margin: 0 }}>{r.desc}</p>
              {r.live && <span className="intent-cta">{t("actions.continueAsRole", { role: r.name }, `Continue as ${r.name}`)} <Icon name="arrowRight" size={14} /></span>}
            </button>
          ))}
        </div>

        <p className="faint" style={{ marginTop: 26, fontSize: 12.5 }}>
          <a href="/get-started">&larr; {t("actions.back", null, "Back")}</a>
        </p>
      </div>
    </div>
  );
}
