import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
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

  // useCallback so these keep a stable identity across renders — without it,
  // every AuthProvider re-render (including the one triggered by calling
  // refreshBuilder itself) hands out a new function reference, which any
  // effect depending on it (e.g. Dashboard's data fetch) reads as "changed"
  // and re-runs, which calls refreshBuilder again... an infinite fetch loop.
  const login = useCallback(async (email, password) => {
    const { token, builder } = await api.login(email, password);
    setToken(token);
    setBuilder(builder);
    applyLang(builder);
    return builder;
  }, []);

  const signup = useCallback(async (payload) => {
    const { token, builder } = await api.signup(payload);
    setToken(token);
    setBuilder(builder);
    applyLang(builder);
    return builder;
  }, []);

  const completeOnboarding = useCallback(async (payload) => {
    const { builder } = await api.completeOnboarding(payload);
    setBuilder(builder);
    return builder;
  }, []);

  const logout = useCallback(async () => {
    try { await api.logout(); } catch { /* ignore */ }
    setToken(null);
    setBuilder(null);
  }, []);

  const refreshBuilder = useCallback(async () => {
    const { builder } = await api.me();
    setBuilder(builder);
    return builder;
  }, []);

  const value = useMemo(
    () => ({ builder, setBuilder, loading, login, signup, completeOnboarding, logout, refreshBuilder }),
    [builder, loading, login, signup, completeOnboarding, logout, refreshBuilder]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
