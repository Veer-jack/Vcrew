import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { aapi, setAToken, getAToken } from "../aapi/client";

const AAuthContext = createContext(null);

export function AAuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getAToken()) { setLoading(false); return; }
    aapi.me()
      .then((res) => setAdmin(res))
      .catch(() => setAToken(null))
      .finally(() => setLoading(false));
  }, []);

  // useCallback for a stable identity across renders — see AuthContext.jsx
  // (the builder-side equivalent) for why an unstable function reference here
  // would cause an infinite refetch loop in anything that depends on it.
  const login = useCallback((email, password) => aapi.login(email, password), []);

  const totpSetupStart = useCallback((email, password) => aapi.totpSetupStart(email, password), []);

  const completeLogin = useCallback((res) => {
    setAToken(res.token);
    setAdmin(res);
    return res;
  }, []);

  const totpSetupConfirm = useCallback(async (email, password, code) => completeLogin(await aapi.totpSetupConfirm(email, password, code)), [completeLogin]);
  const totpVerify = useCallback(async (pendingToken, code) => completeLogin(await aapi.totpVerify(pendingToken, code)), [completeLogin]);

  const logout = useCallback(async () => {
    try { await aapi.logout(); } catch { /* ignore */ }
    setAToken(null);
    setAdmin(null);
  }, []);

  const value = useMemo(
    () => ({ admin, loading, login, totpSetupStart, totpSetupConfirm, totpVerify, logout }),
    [admin, loading, login, totpSetupStart, totpSetupConfirm, totpVerify, logout]
  );

  return (
    <AAuthContext.Provider value={value}>
      {children}
    </AAuthContext.Provider>
  );
}

export function useAAuth() {
  const ctx = useContext(AAuthContext);
  if (!ctx) throw new Error("useAAuth must be used within AAuthProvider");
  return ctx;
}
