import { createContext, useContext, useEffect, useState } from "react";
import { vapi, setVToken, getVToken } from "../vapi/client";

const VAuthContext = createContext(null);

export function VAuthProvider({ children }) {
  const [validator, setValidator] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getVToken()) { setLoading(false); return; }
    vapi.me()
      .then(({ validator }) => setValidator(validator))
      .catch(() => setVToken(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const { token, validator } = await vapi.login(email, password);
    setVToken(token);
    setValidator(validator);
    return validator;
  };

  const signup = async (payload) => {
    const { token, validator } = await vapi.signup(payload);
    setVToken(token);
    setValidator(validator);
    return validator;
  };

  const logout = async () => {
    try { await vapi.logout(); } catch { /* ignore */ }
    setVToken(null);
    setValidator(null);
  };

  const refresh = async () => {
    const { validator } = await vapi.me();
    setValidator(validator);
    return validator;
  };

  return (
    <VAuthContext.Provider value={{ validator, setValidator, loading, login, signup, logout, refresh }}>
      {children}
    </VAuthContext.Provider>
  );
}

export function useVAuth() {
  const ctx = useContext(VAuthContext);
  if (!ctx) throw new Error("useVAuth must be used within VAuthProvider");
  return ctx;
}
