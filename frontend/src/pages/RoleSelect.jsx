import { useNavigate, useSearchParams } from "react-router-dom";
import Icon from "../components/Icon";
import { BrandLogoFull } from "../components/BrandMark";
import { useTranslation } from "../i18n/index.jsx";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { getRoles, switchToRoleDraft } from "../data/personaConfig";

export default function RoleSelect() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { builder } = useAuth();
  // Set when the wizard's own step-0 Back button lands here (see
  // OnboardingWizard's goBack) -- highlights whichever role that draft
  // already belongs to, so someone who just wants to double-check the
  // description isn't left wondering which card was theirs.
  const [params] = useSearchParams();
  const current = params.get("current");

  return (
    <div className="auth-shell" style={{ background: "var(--panel-inset)" }}>
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 72, background: "var(--panel-inset)", borderBottom: "1px solid var(--border)", zIndex: 10, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px" }}>
        <BrandLogoFull height={32} />
        <LanguageSwitcher onSave={(lang) => api.setLanguage(lang).catch(() => {})} style={{ background: "transparent", border: "none", padding: "4px 8px" }} />
      </div>
      <div className="rise" style={{ width: "100%", maxWidth: 860, textAlign: "center", paddingTop: 56, margin: "0 auto" }}>
        <h1 style={{ fontSize: 44, letterSpacing: "-1px", marginBottom: 12, fontWeight: 700, color: "var(--text)" }}>{t("onboarding.pickYourRole", null, "Pick your role")}</h1>
        <p className="muted" style={{ marginBottom: 44, fontSize: 16 }}>
          {t("onboarding.chooseDescFitsBest", null, "Choose the description that fits you best — we'll tailor every step that follows.")}
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="role-grid">
          {getRoles(t).map((r) => {
            const isCurrent = r.key === current;
            return (
            <button
              key={r.key}
              type="button"
              className={`card role-card ${!r.live ? "role-card-soon" : ""}`}
              style={{ "--rc-accent": r.accent, textAlign: "left", cursor: r.live ? "pointer" : "default", position: "relative", borderColor: isCurrent ? r.accent : undefined, boxShadow: isCurrent ? `var(--shadow-lg), 0 0 0 1px ${r.accent}` : undefined }}
              disabled={!r.live}
              onClick={() => {
                if (!r.live) return;
                // Re-picking the same role this draft is already for isn't a
                // role change -- switchToRoleDraft wipes every draft
                // unconditionally, which would erase whatever was already
                // typed in on step 0 just for glancing at the description
                // again. Only an actual switch to a *different* role resets.
                if (r.key !== current) switchToRoleDraft(builder?.id, r.key, builder);
                navigate(`/signup?role=${r.key}`);
              }}
            >
              <div className="row between" style={{ alignItems: "center", marginBottom: 12 }}>
                <div className="row" style={{ gap: 12 }}>
                  <span className="intent-ic" style={{ background: `${r.accent}1a`, color: r.accent, width: 44, height: 44, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon name={r.icon} size={20} />
                  </span>
                  <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{r.name}</h3>
                </div>
                {!r.live && <span className="pill" style={{ fontSize: 11 }}>{t("status.comingSoon", null, "Coming soon")}</span>}
              </div>

              <p className="muted" style={{ fontSize: 13, lineHeight: 1.6, margin: 0 }}>{r.desc}</p>
              
              {r.pills && (
                <div style={{ display: "flex", flexWrap: "nowrap", overflow: "hidden", gap: 6, marginTop: 16 }}>
                  {r.pills.map((pill, i) => (
                    <span key={i} style={{ fontSize: 11, background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-muted)", fontWeight: 600, padding: "3px 8px", borderRadius: 20, whiteSpace: "nowrap" }}>
                      {pill}
                    </span>
                  ))}
                </div>
              )}

              {r.live && (
                <span className="intent-cta" style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 6, color: r.accent, fontWeight: 700, fontSize: 14 }}>
                  {t("actions.continueAsRole", { role: r.name }, `Continue as ${r.name}`)} <Icon name="arrowRight" size={18} />
                </span>
              )}
            </button>
            );
          })}
        </div>

        <p className="muted" style={{ marginTop: 32, fontSize: 13 }}>
          {t("auth.alreadyMember", null, "Already a member?")} <a href="/login" style={{ marginLeft: 6, color: "var(--accent)", fontWeight: 700 }}>{t("auth.signIn", null, "Sign in")}</a>
        </p>
      </div>
    </div>
  );
}
