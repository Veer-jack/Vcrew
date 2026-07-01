import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { setToken, api } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function OAuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { refreshBuilder } = useAuth();

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      navigate("/login?error=" + encodeURIComponent("Login failed, please try again"), { replace: true });
      return;
    }
    setToken(token);
    api.me()
      .then(({ builder }) => {
        refreshBuilder();
        // If org or designation missing = onboarding not done
        const needsOnboarding = !builder.designation || !builder.org || builder.org === builder.name + "'s workspace";
        navigate(needsOnboarding ? "/signup" : "/", { replace: true });
      })
      .catch(() => navigate("/login?error=" + encodeURIComponent("Login failed, please try again"), { replace: true }));
  }, []);

  return (
    <div className="auth-shell">
      <div className="card auth-card rise" style={{ textAlign: "center" }}>
        <p className="muted">Signing you in…</p>
      </div>
    </div>
  );
}
