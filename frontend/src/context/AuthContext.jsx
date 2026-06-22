import { createContext, useContext, useEffect, useState } from "react";
import { api, setToken, getToken } from "../api/client";

const AuthContext = createContext(null);

function applyLang(builder) {
  if (builder?.preferredLanguage) {
    // Let the i18n system know — it reads from localStorage on init
    try { localStorage.setItem("vc_lang", builder.preferredLanguage); } catch {}
    document.documentElement.setAttribute("lang", builder.preferredLanguage);
  }
}

export function AuthProvider({ children }) {
  const [builder, setBuilder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) { setLoading(false); return; }
    api.me()
      .then(({ builder }) => { setBuilder(builder); applyLang(builder); })
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const { token, builder } = await api.login(email, password);
    setToken(token);
    setBuilder(builder);
    applyLang(builder);
    return builder;
  };

  const signup = async (payload) => {
    const { token, builder } = await api.signup(payload);
    setToken(token);
    setBuilder(builder);
    applyLang(builder);
    return builder;
  };

  const logout = async () => {
    try { await api.logout(); } catch { /* ignore */ }
    setToken(null);
    setBuilder(null);
  };

  const refreshBuilder = async () => {
    const { builder } = await api.me();
    setBuilder(builder);
    return builder;
  };

  return (
    <AuthContext.Provider value={{ builder, setBuilder, loading, login, signup, logout, refreshBuilder }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
