import { createContext, useContext, useEffect, useState } from "react";
import { api, setToken, getToken } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [builder, setBuilder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) { setLoading(false); return; }
    api.me()
      .then(({ builder }) => setBuilder(builder))
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const { token, builder } = await api.login(email, password);
    setToken(token);
    setBuilder(builder);
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
    <AuthContext.Provider value={{ builder, setBuilder, loading, login, logout, refreshBuilder }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
