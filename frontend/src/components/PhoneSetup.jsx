import { useRef, useState } from "react";
import Icon from "./Icon";
import { getFirebaseAuth, RecaptchaVerifier, signInWithPhoneNumber } from "../firebaseClient";
import { COUNTRIES } from "./auth/countries";
import { useTranslation } from "../i18n/index.jsx";
import { friendlyAuthError } from "./auth/AuthSplitScreen";

// `client` is either the builder `api` or validator `vapi` object — both expose
// the same firebaseConfig/phoneLink/phoneRemove methods. `phone`/`phoneVerified`
// come from the current user. `onClearPrefill` (optional) persists "forget this
// onboarding-collected number" server-side — without it, prefillPhone comes
// right back on the next reload/tab-switch since nothing local survives that.
export default function PhoneSetup({ client, phone, phoneVerified, prefillPhone, onUpdate, onClearPrefill }) {
  const { t } = useTranslation();
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
      if (!auth) throw new Error(t("auth.phoneVerificationNotConfigured", null, "Phone verification isn't available right now"));
      if (!recaptchaRef.current) recaptchaRef.current = new RecaptchaVerifier(auth, containerRef.current, { size: "invisible" });
      confirmationRef.current = await signInWithPhoneNumber(auth, `${cc}${phoneDigits}`, recaptchaRef.current);
      setInfo(t("auth.codeSentTo", { cc, phoneDigits }, `Code sent to ${cc} ${phoneDigits}`));
      setStep("code");
    } catch (err) {
      // clear() itself can throw when the widget is already broken (the exact
      // case being recovered from) — unguarded, that second exception would
      // crash this function before setError below ever runs, so the raw
      // Firebase/reCAPTCHA error reaches the user instead of the fallback text.
      if (recaptchaRef.current) {
        try { recaptchaRef.current.clear(); } catch { /* already torn down */ }
        recaptchaRef.current = null;
      }
      setError(friendlyAuthError(err, t, t("auth.errSendCodeRetry", null, "We couldn't send the verification code. Please check your phone number and try again.")));
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
      // A real verified number now supersedes whatever onboarding-time
      // number was sitting in the prefill (whether this is that same
      // number now confirmed, or a different one typed via Edit Number) --
      // clearing it here, on actual success, means a later Remove falls
      // back to a plain "Add phone" instead of resurrecting a now-stale
      // suggestion.
      await onClearPrefill?.();
      reset();
    } catch (err) {
      setError(friendlyAuthError(err, t, t("auth.couldntVerifyCode", null, "Couldn't verify code")));
    } finally { setBusy(false); }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await client.phoneRemove();
      onUpdate?.(null);
      // Without this, removing a verified number just falls back to the
      // onboarding prefill chip — the user would see the number they just
      // removed pop right back up as "Verify this number" instead of a
      // clean "Add phone" state. setPrefillDismissed alone only lasted for
      // this page visit — reload or navigate back and prefillPhone (still
      // sitting in the profile on the server) would resurrect it, so this
      // also asks the parent to actually clear it server-side.
      setPrefillDismissed(true);
      await onClearPrefill?.();
    } finally { setBusy(false); }
  };

  const useDifferentNumber = () => {
    // Just opens the form blank -- doesn't touch the prefill at all. It used
    // to clear it server-side immediately on this click, before any actual
    // edit happened: open the form to look, then Cancel with nothing typed,
    // and the onboarding number was already gone with no way back. Now that
    // only happens once a new number is actually verified (see verifyCode);
    // Cancel from here behaves exactly like Cancel from Verify -- the old
    // number is untouched and the card goes right back to showing it.
    setPhoneInput("");
    setEditing(true);
  };

  // Buttons show regardless of firebaseReady — if this environment's Firebase
  // genuinely isn't configured, sendCode's own error handling below already
  // surfaces a friendly message when Send code is actually clicked, so the
  // rest of the flow (no-stale-prefill, etc.) stays fully testable
  // without gating it behind infra that isn't set up here yet.
  const showPending = !phoneVerified && !editing && !prefillDismissed && prefillPhone;
  const showAdd = !phoneVerified && !editing && (prefillDismissed || !prefillPhone);

  return (
    <div className="card" style={{ padding: "var(--pad-card)" }}>
      <div style={{ marginBottom: phoneVerified || editing || showPending ? 14 : 0 }}>
        {/* showPending crams a longer description alongside a pill and two
            buttons on one line -- looked cluttered at normal card widths.
            Its own row below (title/description stay full-width) fixes
            that; the other two states stay as a single row since they're
            just one short line each. */}
        <div className="row between" style={{ alignItems: "center" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>{t("auth.mobileNumber", null, "Mobile number")}</h3>
            {!showPending && (
              <p className="faint" style={{ margin: "4px 0 0", fontSize: 12.5 }}>
                {phoneVerified
                  ? t("auth.phoneUsedFor", null, "Used for sign-in with a code and to verify sensitive actions.")
                  : t("auth.addPhoneDesc", null, "Add a mobile number to enable login via SMS code and extra verification for withdrawals.")}
              </p>
            )}
          </div>
          {phoneVerified && !editing && (
            <div className="row gap-2">
              <span className="tag" style={{ background: "var(--success-weak)", color: "var(--success)" }}><Icon name="check" size={12} />{phone}</span>
              <button className="btn btn-quiet" onClick={remove} disabled={busy}>{t("actions.remove", null, "Remove")}</button>
            </div>
          )}
          {showAdd && (
            <button className="btn btn-ghost" onClick={() => { setPhoneInput(""); setEditing(true); }}><Icon name="plus" size={15} />{t("actions.addPhone", null, "Add phone")}</button>
          )}
        </div>
        {showPending && (
          <>
            <p className="faint" style={{ margin: "4px 0 0", fontSize: 12.5 }}>{t("auth.verifyPhoneDesc", null, "Verify this number to enable SMS login and extra security.")}</p>
            <div className="row gap-2" style={{ marginTop: 12, flexWrap: "wrap" }}>
              <span className="tag" style={{ background: "var(--warning-weak)", color: "var(--warning)" }}><Icon name="clock" size={12} />{prefillPhone}</span>
              <button className="btn btn-primary" onClick={() => { setPhoneInput(prefillPhone); setEditing(true); }}>{t("actions.verify", null, "Verify")}</button>
              <button className="btn btn-ghost" onClick={useDifferentNumber}><Icon name="edit" size={15} />{t("actions.editNumber", null, "Edit Number")}</button>
            </div>
          </>
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
