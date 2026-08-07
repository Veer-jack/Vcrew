import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
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

  // useCallback for a stable identity across renders — see AuthContext.jsx
  // (the builder-side equivalent) for why an unstable refresh() reference
  // here would cause an infinite refetch loop in anything that depends on it.
  const login = useCallback(async (email, password) => {
    const { token, validator } = await vapi.login(email, password);
    setVToken(token);
    setValidator(validator);
    return validator;
  }, []);

  const signup = useCallback(async (payload) => {
    const { token, validator } = await vapi.signup(payload);
    setVToken(token);
    setValidator(validator);
    return validator;
  }, []);

  const logout = useCallback(async () => {
    try { await vapi.logout(); } catch { /* ignore */ }
    setVToken(null);
    setValidator(null);
  }, []);

  const refresh = useCallback(async () => {
    const { validator } = await vapi.me();
    setValidator(validator);
    return validator;
  }, []);

  const value = useMemo(
    () => ({ validator, setValidator, loading, login, signup, logout, refresh }),
    [validator, loading, login, signup, logout, refresh]
  );

  return (
    <VAuthContext.Provider value={value}>
      {children}
    </VAuthContext.Provider>
  );
}

export function useVAuth() {
  const ctx = useContext(VAuthContext);
  if (!ctx) throw new Error("useVAuth must be used within VAuthProvider");
  return ctx;
}
