import { useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import { BrandMark } from "../components/BrandMark";
import { useTranslation } from "../i18n/index.jsx";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { getRoles, switchToRoleDraft } from "../data/personaConfig";

export default function RoleSelect() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { builder } = useAuth();

  return (
    <div className="auth-shell">
      <div style={{ position: "absolute", top: 16, right: 24, zIndex: 10 }}>
        <LanguageSwitcher onSave={(lang) => api.setLanguage(lang).catch(() => {})} style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "4px 8px" }} />
      </div>
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
                switchToRoleDraft(builder?.id, r.key, builder);
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
          <a href="/get-started">{t("actions.skip", null, "Skip")} &rarr;</a>
        </p>
      </div>
    </div>
  );
}
