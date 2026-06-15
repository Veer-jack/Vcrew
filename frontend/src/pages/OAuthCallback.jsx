import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { setToken } from "../api/client";
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
    refreshBuilder()
      .then(() => navigate("/", { replace: true }))
      .catch(() => navigate("/login?error=" + encodeURIComponent("Login failed, please try again"), { replace: true }));
  }, [params, navigate, refreshBuilder]);

  return (
    <div className="auth-shell">
      <div className="card auth-card rise" style={{ textAlign: "center" }}>
        <p className="muted">Signing you in…</p>
      </div>
    </div>
  );
}
