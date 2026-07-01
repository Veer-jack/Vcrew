import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { setVToken } from "../vapi/client";
import { useVAuth } from "../vcontext/VAuthContext";

export default function OAuthCallback() {
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
    refresh()
      .then(() => { const isNew = params.get("new") === "1"; navigate(isNew ? "/validator/onboarding" : "/validator", { replace: true }); })
      .catch(() => navigate("/validator/login?error=" + encodeURIComponent("Login failed, please try again"), { replace: true }));
  }, [params, navigate, refresh]);

  return (
    <div className="auth-shell">
      <div className="card auth-card rise" style={{ textAlign: "center" }}>
        <p className="muted">Signing you in…</p>
      </div>
    </div>
  );
}
