import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Icon from "../Icon";
import { BrandMark } from "../BrandMark";
import { Btn } from "../ui";
import { GoogleMark, GithubMark, LinkedInMark } from "../SocialIcons";
import OtpBoxes from "./OtpBoxes";
import { COUNTRIES } from "./countries";
import { getFirebaseAuth, RecaptchaVerifier, signInWithPhoneNumber } from "../../firebaseClient";
import { detectLangFromCountryCode } from "../../i18n/languages.js";
import { useTranslation } from "../../i18n/index.jsx";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const SSO_MARKS = { google: GoogleMark, github: GithubMark, linkedin: LinkedInMark };

/**
 * Shared split-screen sign-in / sign-up screen. One component drives both
 * the Founder (builder) and Validator auth pages -- role-specific copy,
 * endpoints and backend wiring are passed in via props rather than
 * duplicating this whole screen twice.
 *
 * adapter: {
 *   oauthProviders, oauthBasePath, firebaseConfig, phoneLoginVerify,
 *   login(email, password), signup({ name, org, email, password }),
 *   userKey, onAuthed(token, user),
 * }
 */
export default function AuthSplitScreen({ role, copy, adapter, homePath, otherRole, signupHref }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState("signin"); // signin | signup
  const [stage, setStage] = useState("main"); // main | forgot | forgot-sent
  const [method, setMethod] = useState("email"); // email | phone
  const [providers, setProviders] = useState({});
  const [smsReady, setSmsReady] = useState(false);

  const [name, setName] = useState("");
  const [org, setOrg] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [agree, setAgree] = useState(false);
  const [touched, setTouched] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [ccIdx, setCcIdx] = useState(() => COUNTRIES.findIndex((c) => c[1] === "+91"));
  const cc = COUNTRIES[ccIdx] ? COUNTRIES[ccIdx][1] : "+91";
  const { setLang } = useTranslation();

  const handleCcChange = (e) => {
    const idx = Number(e.target.value);
    setCcIdx(idx);
    const selectedCc = COUNTRIES[idx]?.[1];
    if (selectedCc) {
      const detectedLang = detectLangFromCountryCode(selectedCc);
      if (detectedLang) setLang(detectedLang);
    }
  };
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const confirmationRef = useRef(null);
  const recaptchaRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    adapter.oauthProviders().then((d) => setProviders(d.providers)).catch(() => {});
    adapter.firebaseConfig().then((d) => setSmsReady(!!d.configured)).catch(() => {});
    const params = new URLSearchParams(location.search);
    const oauthError = params.get("error");
    if (oauthError) setError(oauthError);
  }, [location.search]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendIn]);

  const emailOk = EMAIL_RE.test(email);
  const errs = {
    name: mode === "signup" && touched.name && !name.trim() ? "Tell us your name" : "",
    org: mode === "signup" && touched.org && !org.trim() ? copy.field2Error : "",
    email: touched.email && email && !emailOk ? "Enter a valid email" : "",
    password: touched.password && password.length > 0 && password.length < 8 ? "At least 8 characters" : "",
  };
  const emailFormValid = emailOk && password.length >= 8 && (mode === "signin" || (name.trim() && org.trim() && agree));

  const goAfterAuth = () => navigate(location.state?.from || homePath, { replace: true });

  const submitEmail = async (e) => {
    e.preventDefault();
    setTouched({ name: true, org: true, email: true, password: true });
    setError("");
    if (!emailFormValid) return;
    setBusy(true);
    try {
      if (mode === "signin") await adapter.login(email, password);
      else await adapter.signup({ name: name.trim(), org: org.trim(), email: email.trim(), password });
      goAfterAuth();
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally { setBusy(false); }
  };

  const phoneDigits = phone.replace(/\D/g, "");
  const phoneOk = cc === "+91" ? phoneDigits.length === 10 : (phoneDigits.length >= 7 && phoneDigits.length <= 13);

  const sendOtp = async () => {
    setTouched((t) => ({ ...t, name: true, org: true }));
    setError("");
    if (!phoneOk) return;
    if (mode === "signup" && !(name.trim() && org.trim() && agree)) return;
    setBusy(true);
    try {
      const auth = await getFirebaseAuth(adapter.firebaseConfig);
      if (!auth) throw new Error("Phone sign-in isn't configured on this server yet");
      if (!recaptchaRef.current) recaptchaRef.current = new RecaptchaVerifier(auth, containerRef.current, { size: "invisible" });
      confirmationRef.current = await signInWithPhoneNumber(auth, `${cc}${phoneDigits}`, recaptchaRef.current);
      setOtpSent(true);
      setResendIn(30);
    } catch (err) {
      setError(err.message || "Couldn't send code");
    } finally { setBusy(false); }
  };

  const verifyOtp = async () => {
    if (otp.length !== 6) return;
    setError(""); setBusy(true);
    try {
      const cred = await confirmationRef.current.confirm(otp);
      const idToken = await cred.user.getIdToken();
      const res = await adapter.phoneLoginVerify(idToken);
      adapter.onAuthed(res.token, res[adapter.userKey]);
      goAfterAuth();
    } catch (err) {
      setError(err.message || "Incorrect code");
    } finally { setBusy(false); }
  };

  const [forgotBusy, setForgotBusy] = useState(false);
  const submitForgot = async (e) => {
    e.preventDefault();
    setForgotBusy(true);
    try { await adapter.forgotPassword(email); } catch { /* always show success */ }
    finally { setForgotBusy(false); setStage("forgot-sent"); }
  };

  if (stage === "forgot") return (
    <div className="asplit">
      <div className="asplit-brand">
        <div className="asplit-brand-logo"><BrandMark size={40} /></div>
        <h1 className="asplit-headline">{copy.headline}</h1>
        <p className="asplit-sub">{copy.sub}</p>
      </div>
      <div className="asplit-form-col">
        <div className="asplit-form rise">
          <h1 style={{ fontSize: 23, margin: "0 0 8px" }}>Reset your password</h1>
          <p className="muted" style={{ fontSize: 13.5, margin: "0 0 20px" }}>Enter your email and we'll send you a reset link if an account exists.</p>
          {error && <div className="err-banner" style={{ marginBottom: 16 }}>{error}</div>}
          <form onSubmit={submitForgot} className="col gap-4">
            <div className="fld"><label>Email</label>
              <input className="fin" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" autoFocus required />
            </div>
            <Btn type="submit" variant="primary" size="lg" block disabled={forgotBusy}>{forgotBusy ? "Sending…" : "Send reset link"}</Btn>
          </form>
          <p className="asplit-cross" style={{ marginTop: 16 }}><button type="button" className="backlink" onClick={() => setStage("main")}>← Back to sign in</button></p>
        </div>
      </div>
    </div>
  );

  if (stage === "forgot-sent") return (
    <div className="asplit">
      <div className="asplit-brand">
        <div className="asplit-brand-logo"><BrandMark size={40} /></div>
        <h1 className="asplit-headline">{copy.headline}</h1>
      </div>
      <div className="asplit-form-col">
        <div className="asplit-form rise" style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: 23, margin: "0 0 10px" }}>Check your inbox</h1>
          <p className="muted" style={{ fontSize: 14 }}>If <b>{email}</b> is registered, you'll receive a reset link within a minute. Check your spam folder if it doesn't arrive.</p>
          <Btn variant="ghost" onClick={() => setStage("main")}>← Back to sign in</Btn>
        </div>
      </div>
    </div>
  );

  const activeProviders = Object.entries(providers).filter(([, on]) => on);
  const googleProv = activeProviders.find(([k]) => k === "google");
  const otherProvs = activeProviders.filter(([k]) => k !== "google");

  return (
    <div className="asplit">
      <div className="asplit-brand">
        <div className="asplit-brand-logo"><BrandMark size={40} /></div>
        <h1 className="asplit-headline">{copy.headline}</h1>
        <p className="asplit-sub">{copy.sub}</p>
        <div className="asplit-values">
          {copy.values.map((v) => (
            <div key={v.title} className="asplit-value">
              <span className="asplit-value-ic"><Icon name={v.icon} size={17} /></span>
              <div><b>{v.title}</b><p>{v.desc}</p></div>
            </div>
          ))}
        </div>
        <div className="asplit-stats">
          {copy.stats.map(([val, label]) => (
            <div key={label} className="asplit-stat"><b>{val}</b><span>{label}</span></div>
          ))}
        </div>
        <p className="asplit-proof">{copy.proof}</p>
      </div>

      <div className="asplit-form-col">
        <div className="asplit-form rise">
          <div className="asplit-tabs">
            <button type="button" className={mode === "signin" ? "on" : ""} onClick={() => { setMode("signin"); setError(""); }}>Sign in</button>
            <button type="button" className={mode === "signup" ? "on" : ""}
              onClick={() => { if (signupHref) navigate(signupHref); else { setMode("signup"); setError(""); } }}>
              Create account
            </button>
          </div>

          <h1 style={{ fontSize: 23, margin: "0 0 4px" }}>{mode === "signin" ? "Welcome back" : copy.signupTitle}</h1>
          <p className="muted" style={{ fontSize: 13.5, margin: "0 0 20px" }}>{mode === "signin" ? copy.signinSub : copy.signupSub}</p>

          {error && <div className="err-banner" style={{ marginBottom: 16 }}>{error}</div>}

          {activeProviders.length > 0 && (
            <div className="sso-grid">
              {googleProv && (
                <a className="btn btn-ghost full" href={`${adapter.oauthBasePath}/google`}>
                  <GoogleMark size={17} /> Continue with Google
                </a>
              )}
              {otherProvs.map(([key]) => {
                const Mark = SSO_MARKS[key];
                return (
                  <a key={key} className="btn btn-ghost" href={`${adapter.oauthBasePath}/${key}`}>
                    {Mark ? <Mark size={16} /> : null} {key.charAt(0).toUpperCase() + key.slice(1)}
                  </a>
                );
              })}
            </div>
          )}

          {activeProviders.length > 0 && (
            <div className="row gap-3" style={{ alignItems: "center", margin: "16px 0 0" }}>
              <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
              <span className="faint" style={{ fontSize: 12 }}>or continue with</span>
              <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
            </div>
          )}

          {smsReady ? (
            <div className="method-tabs">
              <button type="button" className={`method-tab ${method === "email" ? "on" : ""}`} onClick={() => { setMethod("email"); setError(""); }}>
                <Icon name="mail" size={15} /> Email
              </button>
              <button type="button" className={`method-tab ${method === "phone" ? "on" : ""}`} onClick={() => { setMethod("phone"); setError(""); }}>
                <Icon name="phone" size={15} /> Phone
              </button>
            </div>
          ) : <div style={{ height: 18 }} />}

          {method === "email" ? (
            <form onSubmit={submitEmail} className="col gap-4">
              {mode === "signup" && (
                <>
                  <div className="fld">
                    <label>Full name</label>
                    <input className="fin" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => setTouched((t) => ({ ...t, name: true }))} placeholder="Ananya Sharma" autoFocus />
                    {errs.name && <p className="ferr">{errs.name}</p>}
                  </div>
                  <div className="fld">
                    <label>{copy.field2Label}</label>
                    <input className="fin" value={org} onChange={(e) => setOrg(e.target.value)} onBlur={() => setTouched((t) => ({ ...t, org: true }))} placeholder={copy.field2Placeholder} />
                    {errs.org && <p className="ferr">{errs.org}</p>}
                  </div>
                </>
              )}
              <div className="fld">
                <label>{mode === "signup" ? "Work email" : "Email"}{copy.emailHint && mode === "signup" && <span className="faint"> · {copy.emailHint}</span>}</label>
                <input className="fin" type="email" value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => setTouched((t) => ({ ...t, email: true }))} placeholder="you@company.com" autoFocus={mode === "signin"} />
                {errs.email && <p className="ferr">{errs.email}</p>}
              </div>
              <div className="fld">
                <label>Password</label>
                <div className="inw">
                  <input className="fin" type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} onBlur={() => setTouched((t) => ({ ...t, password: true }))} placeholder={mode === "signup" ? "At least 8 characters" : "••••••••"} />
                  <button type="button" onClick={() => setShowPw((s) => !s)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-faint)" }}>
                    <Icon name={showPw ? "eye" : "eye"} size={16} />
                  </button>
                </div>
                {errs.password && <p className="ferr">{errs.password}</p>}
                {mode === "signin" && (
                  <button type="button" className="backlink" style={{ float: "right", marginTop: 6 }}
                    onClick={() => setStage("forgot")}>
                    Forgot password?
                  </button>
                )}
              </div>
              {mode === "signup" && (
                <label className="row gap-2" style={{ fontSize: 12.5, color: "var(--text-faint)", alignItems: "flex-start" }}>
                  <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} style={{ marginTop: 2 }} />
                  I agree to the Terms of Service and Privacy Policy
                </label>
              )}
              <Btn type="submit" variant="primary" size="lg" block disabled={busy}>
                {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
              </Btn>
            </form>
          ) : (
            <div className="col gap-4">
              {mode === "signup" && !otpSent && (
                <>
                  <div className="fld">
                    <label>Full name</label>
                    <input className="fin" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => setTouched((t) => ({ ...t, name: true }))} placeholder="Ananya Sharma" />
                    {errs.name && <p className="ferr">{errs.name}</p>}
                  </div>
                  <div className="fld">
                    <label>{copy.field2Label}</label>
                    <input className="fin" value={org} onChange={(e) => setOrg(e.target.value)} onBlur={() => setTouched((t) => ({ ...t, org: true }))} placeholder={copy.field2Placeholder} />
                    {errs.org && <p className="ferr">{errs.org}</p>}
                  </div>
                  <label className="row gap-2" style={{ fontSize: 12.5, color: "var(--text-faint)", alignItems: "flex-start" }}>
                    <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} style={{ marginTop: 2 }} />
                    I agree to the Terms of Service and Privacy Policy
                  </label>
                </>
              )}
              {!otpSent ? (
                <>
                  <div className="fld">
                    <label>Mobile number</label>
                    <div className="phone-row">
                      <select className="cc-select" value={ccIdx} onChange={handleCcChange}>
                        {COUNTRIES.map((c, i) => <option key={c[2]} value={i}>{c[0]} {c[1]}</option>)}
                      </select>
                      <input className="fin" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98765 43210" />
                    </div>
                  </div>
                  <div ref={containerRef} />
                  <Btn type="button" variant="primary" size="lg" block disabled={busy} onClick={sendOtp}>
                    {busy ? "Sending…" : "Send code"}
                  </Btn>
                </>
              ) : (
                <>
                  <p className="otp-lead">Enter the 6-digit code sent to <b>{cc} {phoneDigits}</b> <button type="button" className="backlink" onClick={() => { setOtpSent(false); setOtp(""); }}>Edit</button></p>
                  <OtpBoxes value={otp} onChange={setOtp} />
                  <div className="resend-row">
                    <span>Didn't get it?</span>
                    <button type="button" disabled={resendIn > 0} onClick={sendOtp}>{resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}</button>
                  </div>
                  <Btn type="button" variant="primary" size="lg" block disabled={busy || otp.length !== 6} onClick={verifyOtp}>
                    {busy ? "Verifying…" : "Verify and continue"}
                  </Btn>
                </>
              )}
            </div>
          )}

          <p className="asplit-cross">{copy.crossText} <a href={otherRole.href}>{otherRole.label}</a></p>
          <p className="asplit-foot">{copy.foot}</p>
        </div>
      </div>
    </div>
  );
}
