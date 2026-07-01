import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { setVToken, vapi } from "../vapi/client";
import { useVAuth } from "../vcontext/VAuthContext";

export default function VOAuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { refresh } = useVAuth();

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      navigate("/validator/login?error=" + encodeURIComponent("Login failed, please try again"), { replace: true });
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
      .catch(() => navigate("/validator/login?error=" + encodeURIComponent("Login failed, please try again"), { replace: true }));
  }, []);

  return (
    <div className="auth-shell">
      <div className="card auth-card rise" style={{ textAlign: "center" }}>
        <p className="muted">Signing you in…</p>
      </div>
    </div>
  );
}
