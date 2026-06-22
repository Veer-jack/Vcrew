import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import { getFirebaseAuth, RecaptchaVerifier, signInWithPhoneNumber } from "../firebaseClient";

// `client` exposes firebaseConfig()/stepUpVerify(idToken). `phone` is the
// account's already-verified phone number. On success, calls onVerified(stepUpToken).
export default function StepUpModal({ client, phone, title = "Confirm it's you", onVerified, onClose }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const [sent, setSent] = useState(false);
  const confirmationRef = useRef(null);
  const recaptchaRef = useRef(null);
  const containerRef = useRef(null);

  const send = async () => {
    setError(""); setBusy(true);
    try {
      const auth = await getFirebaseAuth(client.firebaseConfig);
      if (!auth) throw new Error("Phone verification isn't configured on this server yet");
      if (!recaptchaRef.current) recaptchaRef.current = new RecaptchaVerifier(auth, containerRef.current, { size: "invisible" });
      confirmationRef.current = await signInWithPhoneNumber(auth, phone, recaptchaRef.current);
      setSent(true);
    } catch (err) {
      setError(err.message || "Couldn't send code");
    } finally { setBusy(false); }
  };

  useEffect(() => { send(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const verify = async (e) => {
    e.preventDefault();
    setError(""); setBusy(true);
    try {
      const cred = await confirmationRef.current.confirm(code.trim());
      const idToken = await cred.user.getIdToken();
      const res = await client.stepUpVerify(idToken);
      onVerified(res.stepUpToken);
    } catch (err) {
      setError(err.message || "Couldn't verify code");
    } finally { setBusy(false); }
  };

  return (
    <div style={{ display: "contents" }}>
      <div className="notif-overlay" onClick={onClose} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 400, maxWidth: "92vw", zIndex: 61,
        background: "var(--panel)", border: "var(--hairline) solid var(--border)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-lg)" }} className="rise">
        <div className="row between" style={{ padding: "16px 20px", borderBottom: "var(--hairline) solid var(--border)" }}>
          <b style={{ fontSize: 15 }}>{title}</b>
          <button className="icon-btn" aria-label="Close" style={{ width: 30, height: 30 }} onClick={onClose}><Icon name="x" size={15} /></button>
        </div>
        <div style={{ padding: 20 }}>
          {error && <div className="err-banner" style={{ marginBottom: 12 }}>{error}</div>}
          {sent && <p className="muted" style={{ margin: "0 0 14px", fontSize: 13.5 }}>Enter the 6-digit code we just sent to {phone}.</p>}
          <form onSubmit={verify} className="col gap-3">
            <input className="fin" inputMode="numeric" maxLength={6} placeholder="123456" value={code} onChange={e => setCode(e.target.value)} autoFocus required />
            <div ref={containerRef} />
            <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? "Verifying…" : "Verify and continue"}</button>
            <button className="backlink" type="button" onClick={send} disabled={busy} style={{ margin: "0 auto" }}>Resend code</button>
          </form>
        </div>
      </div>
    </div>
  );
}
