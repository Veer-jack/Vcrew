import { useRef, useState } from "react";
import { Btn } from "./ui";
import { getFirebaseAuth, RecaptchaVerifier, signInWithPhoneNumber } from "../firebaseClient";

// `client` exposes firebaseConfig() and phoneLoginVerify(idToken).
// On success calls onSuccess(token, user) where `user` is keyed by `userKey`.
export default function PhoneLoginForm({ client, userKey, onSuccess }) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState("phone");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const confirmationRef = useRef(null);
  const recaptchaRef = useRef(null);
  const containerRef = useRef(null);

  const sendCode = async (e) => {
    e.preventDefault();
    setError(""); setBusy(true);
    try {
      const auth = await getFirebaseAuth(client.firebaseConfig);
      if (!auth) throw new Error("Phone login isn't configured on this server yet");
      if (!recaptchaRef.current) recaptchaRef.current = new RecaptchaVerifier(auth, containerRef.current, { size: "invisible" });
      confirmationRef.current = await signInWithPhoneNumber(auth, phone.trim(), recaptchaRef.current);
      setStep("code");
    } catch (err) {
      setError(err.message || "Couldn't send code");
    } finally { setBusy(false); }
  };

  const verify = async (e) => {
    e.preventDefault();
    setError(""); setBusy(true);
    try {
      const cred = await confirmationRef.current.confirm(code.trim());
      const idToken = await cred.user.getIdToken();
      const res = await client.phoneLoginVerify(idToken);
      onSuccess(res.token, res[userKey]);
    } catch (err) {
      setError(err.message || "Couldn't verify code");
    } finally { setBusy(false); }
  };

  return (
    <form onSubmit={step === "phone" ? sendCode : verify} className="col gap-4">
      {error && <div className="err-banner">{error}</div>}
      {step === "phone" ? (
        <div className="fld">
          <label>Phone number</label>
          <input className="fin" type="tel" placeholder="+14155551234" value={phone} onChange={e => setPhone(e.target.value)} required autoFocus />
        </div>
      ) : (
        <div className="fld">
          <label>Enter the 6-digit code sent to {phone}</label>
          <input className="fin" inputMode="numeric" maxLength={6} placeholder="123456" value={code} onChange={e => setCode(e.target.value)} required autoFocus />
        </div>
      )}
      <div ref={containerRef} />
      <Btn type="submit" variant="primary" size="lg" block disabled={busy}>
        {busy ? "Please wait…" : step === "phone" ? "Send code" : "Verify and sign in"}
      </Btn>
      {step === "code" && (
        <button type="button" className="backlink" style={{ margin: "0 auto" }} onClick={() => { setStep("phone"); setCode(""); setError(""); }}>
          Use a different number
        </button>
      )}
    </form>
  );
}
