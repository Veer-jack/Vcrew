import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import { getFirebaseAuth, RecaptchaVerifier, signInWithPhoneNumber } from "../firebaseClient";

// `client` is either the builder `api` or validator `vapi` object — both expose
// the same firebaseConfig/phoneLink/phoneRemove methods. `phone`/`phoneVerified`
// come from the current user.
export default function PhoneSetup({ client, phone, phoneVerified, onUpdate }) {
  const [firebaseReady, setFirebaseReady] = useState(true);
  const [editing, setEditing] = useState(false);
  const [step, setStep] = useState("phone"); // 'phone' | 'code'
  const [input, setInput] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const confirmationRef = useRef(null);
  const recaptchaRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    client.firebaseConfig().then(c => setFirebaseReady(!!c.configured)).catch(() => setFirebaseReady(false));
  }, [client]);

  const reset = () => { setEditing(false); setStep("phone"); setInput(""); setCode(""); setError(""); setInfo(""); confirmationRef.current = null; };

  const sendCode = async (e) => {
    e.preventDefault();
    setError(""); setBusy(true);
    try {
      const auth = await getFirebaseAuth(client.firebaseConfig);
      if (!auth) throw new Error("Phone verification isn't configured on this server yet");
      if (!recaptchaRef.current) recaptchaRef.current = new RecaptchaVerifier(auth, containerRef.current, { size: "invisible" });
      confirmationRef.current = await signInWithPhoneNumber(auth, input.trim(), recaptchaRef.current);
      setInfo(`Code sent to ${input.trim()}`);
      setStep("code");
    } catch (err) {
      setError(err.message || "Couldn't send code");
    } finally { setBusy(false); }
  };

  const verifyCode = async (e) => {
    e.preventDefault();
    setError(""); setBusy(true);
    try {
      const cred = await confirmationRef.current.confirm(code.trim());
      const idToken = await cred.user.getIdToken();
      const res = await client.phoneLink(idToken);
      onUpdate?.(res.phone);
      reset();
    } catch (err) {
      setError(err.message || "Couldn't verify code");
    } finally { setBusy(false); }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await client.phoneRemove();
      onUpdate?.(null);
    } finally { setBusy(false); }
  };

  if (!firebaseReady && !phoneVerified) return null;

  return (
    <div className="card" style={{ padding: "var(--pad-card)" }}>
      <div className="row between" style={{ marginBottom: phoneVerified || editing ? 14 : 0 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Phone number</h3>
          <p className="faint" style={{ margin: "4px 0 0", fontSize: 12.5 }}>
            {phoneVerified ? "Used for sign-in with a code and to verify sensitive actions." : "Add a phone number to enable login via SMS code and extra verification for withdrawals."}
          </p>
        </div>
        {phoneVerified && !editing && (
          <div className="row gap-2">
            <span className="tag" style={{ background: "var(--success-weak)", color: "var(--success)" }}><Icon name="check" size={12} />{phone}</span>
            <button className="btn btn-quiet" onClick={remove} disabled={busy}>Remove</button>
          </div>
        )}
        {!phoneVerified && !editing && firebaseReady && (
          <button className="btn btn-ghost" onClick={() => setEditing(true)}><Icon name="plus" size={15} />Add phone</button>
        )}
      </div>

      {editing && (
        <div className="rise" style={{ marginTop: 4 }}>
          {error && <div className="err-banner" style={{ marginBottom: 12 }}>{error}</div>}
          {info && !error && <div className="faint" style={{ marginBottom: 12, fontSize: 12.5 }}>{info}</div>}
          {step === "phone" ? (
            <form onSubmit={sendCode} className="row gap-2" style={{ alignItems: "flex-end" }}>
              <div className="fld" style={{ flex: 1 }}>
                <label>Phone number</label>
                <input className="fin" type="tel" placeholder="+14155551234" value={input} onChange={e => setInput(e.target.value)} required />
              </div>
              <button className="btn btn-primary" disabled={busy} type="submit">{busy ? "Sending…" : "Send code"}</button>
              <button className="btn btn-quiet" type="button" onClick={reset}>Cancel</button>
            </form>
          ) : (
            <form onSubmit={verifyCode} className="row gap-2" style={{ alignItems: "flex-end" }}>
              <div className="fld" style={{ flex: 1 }}>
                <label>Enter the 6-digit code</label>
                <input className="fin" inputMode="numeric" maxLength={6} placeholder="123456" value={code} onChange={e => setCode(e.target.value)} required />
              </div>
              <button className="btn btn-primary" disabled={busy} type="submit">{busy ? "Verifying…" : "Verify"}</button>
              <button className="btn btn-quiet" type="button" onClick={reset}>Cancel</button>
            </form>
          )}
          <div ref={containerRef} />
          <p className="faint" style={{ fontSize: 12, margin: "8px 0 0" }}>Use international format, e.g. +14155551234</p>
        </div>
      )}
    </div>
  );
}
