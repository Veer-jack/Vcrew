import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { setVToken, vapi } from "../vapi/client";
import { useVAuth } from "../vcontext/VAuthContext";
import { useTranslation } from "../i18n/index.jsx";

export default function VOAuthCallback() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { refresh } = useVAuth();

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      navigate("/validator/login?error=" + encodeURIComponent(t("vOauthCallback.loginFailed", null, "Login failed, please try again")), { replace: true });
      return;
    }
    setVToken(token);
    vapi.me()
      .then(({ validator }) => {
        refresh();
        // If handle or city missing = onboarding not done
        const needsOnboarding = !validator.city || !validator.handle || validator.handle === validator.email?.split("@")[0];
        navigate(needsOnboarding ? "/validator/onboarding" : "/validator", { replace: true });
      })
      .catch(() => navigate("/validator/login?error=" + encodeURIComponent(t("vOauthCallback.loginFailed", null, "Login failed, please try again")), { replace: true }));
  }, []);

  return (
    <div className="auth-shell">
      <div className="card auth-card rise" style={{ textAlign: "center" }}>
        <p className="muted">{t("vOauthCallback.signingIn", null, "Signing you in…")}</p>
      </div>
    </div>
  );
}
