import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { setVToken, vapi } from "../vapi/client";
import { useVAuth } from "../vcontext/VAuthContext";
import { useTranslation } from "../i18n/index.jsx";

export default function VOAuthCallback() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { setValidator } = useVAuth();

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      navigate("/validator/login?error=" + encodeURIComponent(t("vOauthCallback.loginFailed", null, "Login failed, please try again")), { replace: true });
      return;
    }
    setVToken(token);
    vapi.me()
      .then(({ validator }) => {
        // Must land in VAuthContext before navigating — RequireVAuth reads
        // `validator` from context to decide whether to bounce back to
        // /validator/login, so navigating before this settles is a race (see
        // the matching fix in pages/OAuthCallback.jsx for the builder side).
        // Setting directly from the response already in hand, instead of
        // calling refresh() (a second /me request for the same data), also
        // saves a full extra round-trip.
        setValidator(validator);
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
