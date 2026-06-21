import { createContext, useContext, useEffect, useState } from "react";
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

  const login = async (email, password) => aapi.login(email, password);

  const totpSetupStart = (email, password) => aapi.totpSetupStart(email, password);

  const completeLogin = (res) => {
    setAToken(res.token);
    setAdmin(res);
    return res;
  };

  const totpSetupConfirm = async (email, password, code) => completeLogin(await aapi.totpSetupConfirm(email, password, code));
  const totpVerify = async (pendingToken, code) => completeLogin(await aapi.totpVerify(pendingToken, code));

  const logout = async () => {
    try { await aapi.logout(); } catch { /* ignore */ }
    setAToken(null);
    setAdmin(null);
  };

  return (
    <AAuthContext.Provider value={{ admin, loading, login, totpSetupStart, totpSetupConfirm, totpVerify, logout }}>
      {children}
    </AAuthContext.Provider>
  );
}

export function useAAuth() {
  const ctx = useContext(AAuthContext);
  if (!ctx) throw new Error("useAAuth must be used within AAuthProvider");
  return ctx;
}
