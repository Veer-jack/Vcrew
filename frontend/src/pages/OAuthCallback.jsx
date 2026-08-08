import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { setToken, api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../i18n/index.jsx";

export default function OAuthCallback() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { setBuilder } = useAuth();

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      navigate("/login?error=" + encodeURIComponent(t("oauthCallback.loginFailed", null, "Login failed, please try again")), { replace: true });
      return;
    }
    setToken(token);
    api.me()
      .then(({ builder }) => {
        // Must land in AuthContext before navigating: the "/" route reads
        // `builder` from context to decide between the dashboard and bouncing
        // to the marketing site, so navigating before this settles is a race
        // — sometimes it wins, sometimes it lands on the marketing site with
        // the user already signed in behind it (exactly what was reported).
        // Setting directly from the response already in hand, instead of
        // calling refreshBuilder() (which would re-fetch the same data with
        // a second /me request), also saves a full extra round-trip.
        setBuilder(builder);
        // If org or designation missing = onboarding not done
        const needsOnboarding = !builder.designation || !builder.org || builder.org === builder.name + "'s workspace";
        navigate(needsOnboarding ? "/get-started/feedback" : "/", { replace: true });
      })
      .catch(() => navigate("/login?error=" + encodeURIComponent(t("oauthCallback.loginFailed", null, "Login failed, please try again")), { replace: true }));
  }, []);

  return (
    <div className="auth-shell">
      <div className="card auth-card rise" style={{ textAlign: "center" }}>
        <p className="muted">{t("oauthCallback.signingIn", null, "Signing you in…")}</p>
      </div>
    </div>
  );
}
