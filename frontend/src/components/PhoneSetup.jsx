import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import { getFirebaseAuth, RecaptchaVerifier, signInWithPhoneNumber } from "../firebaseClient";
import { COUNTRIES } from "./auth/countries";
import { useTranslation } from "../i18n/index.jsx";

// `client` is either the builder `api` or validator `vapi` object — both expose
// the same firebaseConfig/phoneLink/phoneRemove methods. `phone`/`phoneVerified`
// come from the current user.
export default function PhoneSetup({ client, phone, phoneVerified, prefillPhone, onUpdate }) {
  const { t } = useTranslation();
  const [firebaseReady, setFirebaseReady] = useState(true);
  const [editing, setEditing] = useState(false);
  // Once the user says "use a different number" we must stop re-offering the
  // stale onboarding number for the rest of this visit — otherwise every
  // fresh "Add phone" click would silently refill it again.
  const [prefillDismissed, setPrefillDismissed] = useState(false);
  const [step, setStep] = useState("phone"); // 'phone' | 'code'
  const [phoneInput, setPhoneInput] = useState("");
  const [ccIdx, setCcIdx] = useState(() => {
    const idx = COUNTRIES.findIndex((c) => c[1] === "+91");
    return idx === -1 ? 0 : idx;
  });
  const cc = COUNTRIES[ccIdx] ? COUNTRIES[ccIdx][1] : "+91";
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

  const reset = () => { setEditing(false); setStep("phone"); setPhoneInput(""); setCode(""); setError(""); setInfo(""); confirmationRef.current = null; };

  const sendCode = async (e) => {
    e.preventDefault();
    setError(""); setBusy(true);
    
    const phoneDigits = phoneInput.replace(/\D/g, "");
    if (!phoneDigits) {
      setError(t("auth.enterValidPhoneNumber", null, "Please enter a valid phone number"));
      setBusy(false);
      return;
    }
    
    try {
      const auth = await getFirebaseAuth(client.firebaseConfig);
      if (!auth) throw new Error(t("auth.phoneVerificationNotConfigured", null, "Phone verification isn't configured on this server yet"));
      if (!recaptchaRef.current) recaptchaRef.current = new RecaptchaVerifier(auth, containerRef.current, { size: "invisible" });
      confirmationRef.current = await signInWithPhoneNumber(auth, `${cc}${phoneDigits}`, recaptchaRef.current);
      setInfo(t("auth.codeSentTo", { cc, phoneDigits }, `Code sent to ${cc} ${phoneDigits}`));
      setStep("code");
    } catch (err) {
      // If reCAPTCHA fails silently or due to an error, we might need to reset it.
      if (recaptchaRef.current) {
        recaptchaRef.current.clear();
        recaptchaRef.current = null;
      }
      setError(err.message || t("auth.couldntSendCodeRetry", null, "Couldn't send code. Please try again."));
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
      setError(err.message || t("auth.couldntVerifyCode", null, "Couldn't verify code"));
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
      <div className="row between" style={{ marginBottom: phoneVerified || editing || (!prefillDismissed && prefillPhone) ? 14 : 0 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>{t("auth.mobileNumber", null, "Mobile number")}</h3>
          <p className="faint" style={{ margin: "4px 0 0", fontSize: 12.5 }}>
            {phoneVerified
              ? t("auth.phoneUsedFor", null, "Used for sign-in with a code and to verify sensitive actions.")
              : (!prefillDismissed && prefillPhone)
                ? t("auth.verifyPhoneDesc", null, "We found this number on your profile — verify it to enable login via SMS code and extra verification for withdrawals.")
                : t("auth.addPhoneDesc", null, "Add a mobile number to enable login via SMS code and extra verification for withdrawals.")}
          </p>
        </div>
        {phoneVerified && !editing && (
          <div className="row gap-2">
            <span className="tag" style={{ background: "var(--success-weak)", color: "var(--success)" }}><Icon name="check" size={12} />{phone}</span>
            <button className="btn btn-quiet" onClick={remove} disabled={busy}>{t("actions.remove", null, "Remove")}</button>
          </div>
        )}
        {!phoneVerified && !editing && !prefillDismissed && prefillPhone && (
          <div className="row gap-2">
            <span className="tag" style={{ background: "var(--warning-weak)", color: "var(--warning)" }}><Icon name="clock" size={12} />{prefillPhone}</span>
            <button className="btn btn-primary" onClick={() => { setPhoneInput(prefillPhone); setEditing(true); }}>{t("actions.verify", null, "Verify")}</button>
            <button className="btn btn-quiet" onClick={() => setPrefillDismissed(true)}>{t("actions.useDifferentNumber", null, "Use a different number")}</button>
          </div>
        )}
        {!phoneVerified && !editing && (prefillDismissed || !prefillPhone) && firebaseReady && (
          <button className="btn btn-ghost" onClick={() => { setPhoneInput(""); setEditing(true); }}><Icon name="plus" size={15} />{t("actions.addPhone", null, "Add phone")}</button>
        )}
      </div>

      {editing && (
        <div className="rise" style={{ marginTop: 4 }}>
          {error && <div className="err-banner" style={{ marginBottom: 12 }}>{error}</div>}
          {info && !error && <div className="faint" style={{ marginBottom: 12, fontSize: 12.5 }}>{info}</div>}
          {step === "phone" ? (
            <form onSubmit={sendCode} className="row gap-2" style={{ alignItems: "flex-end" }}>
              <div className="fld" style={{ flex: 1 }}>
                <label>{t("auth.mobileNumber", null, "Mobile number")}</label>
                <div className="phone-row" style={{ display: "flex", gap: "8px" }}>
                  <select className="cc-select fin" value={ccIdx} onChange={(e) => setCcIdx(Number(e.target.value))} style={{ width: "120px", flexShrink: 0 }}>
                    {COUNTRIES.map((c, i) => <option key={c[2]} value={i}>{c[0]} {c[1]}</option>)}
                  </select>
                  <input className="fin" type="tel" placeholder="98765 43210" value={phoneInput} onChange={e => setPhoneInput(e.target.value)} required style={{ flex: 1 }} />
                </div>
              </div>
              <button className="btn btn-primary" disabled={busy} type="submit">{busy ? t("actions.sending", null, "Sending…") : t("actions.sendCode", null, "Send code")}</button>
              <button className="btn btn-quiet" type="button" onClick={reset}>{t("actions.cancel", null, "Cancel")}</button>
            </form>
          ) : (
            <form onSubmit={verifyCode} className="row gap-2" style={{ alignItems: "flex-end" }}>
              <div className="fld" style={{ flex: 1 }}>
                <label>{t("auth.enter6DigitCode", null, "Enter the 6-digit code")}</label>
                <input className="fin" inputMode="numeric" maxLength={6} placeholder="123456" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} required />
              </div>
              <button className="btn btn-primary" disabled={busy} type="submit">{busy ? t("actions.verifying", null, "Verifying…") : t("actions.verify", null, "Verify")}</button>
              <button className="btn btn-quiet" type="button" onClick={reset}>{t("actions.cancel", null, "Cancel")}</button>
            </form>
          )}
          <div ref={containerRef} />
          <p className="faint" style={{ fontSize: 12, margin: "8px 0 0" }}>{t("auth.useInternationalFormat", null, "Use international format, e.g. +14155551234")}</p>
        </div>
      )}
    </div>
  );
}
