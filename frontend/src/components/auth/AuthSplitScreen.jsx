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
import { EMAIL_RE, isPasswordValid } from "../../utils/validators.js";

const SSO_MARKS = { google: GoogleMark, github: GithubMark, linkedin: LinkedInMark };

// Firebase surfaces raw SDK error codes/messages (e.g. "Firebase: Error
// (auth/error-code:-39)."); map the common ones to copy a user can act on
// instead of showing the SDK string verbatim.
export function friendlyAuthError(err, t, fallback) {
  const code = err?.code || "";
  const map = {
    "auth/invalid-phone-number": t("auth.errInvalidPhone", null, "Please enter a valid mobile number."),
    "auth/too-many-requests": t("auth.errTooManyRequests", null, "Too many attempts. Please wait a bit and try again."),
    "auth/operation-not-allowed": t("auth.errRegionNotEnabled", null, "SMS sign-in isn't available for this region yet. Please try a different sign-in method."),
    "auth/user-not-found": t("auth.errInvalidCredentials", null, "Incorrect email or password."),
    "auth/wrong-password": t("auth.errInvalidCredentials", null, "Incorrect email or password."),
    "auth/invalid-credential": t("auth.errInvalidCredentials", null, "Incorrect email or password."),
    "auth/email-already-in-use": t("auth.errEmailInUse", null, "An account with this email already exists."),
    "auth/invalid-email": t("errors.invalidEmail"),
    "auth/weak-password": t("auth.errWeakPassword", null, "Please choose a stronger password (at least 8 characters)."),
    "auth/code-expired": t("auth.errCodeExpired", null, "This code has expired. Please request a new one."),
    "auth/invalid-verification-code": t("auth.incorrectCode", null, "Incorrect code."),
  };
  if (map[code]) return map[code];
  if (/recaptcha/i.test(err?.message || "")) return t("auth.errSendCodeRetry", null, "We couldn't send the verification code. Please check your phone number and try again.");
  // Our own backend (non-Firebase requests, e.g. email/password signup) sends
  // deliberately user-facing validation text on 4xx responses — show that
  // directly instead of masking it behind the generic fallback below.
  if (err?.status >= 400 && err?.status < 500 && err?.message && !/^Request failed/.test(err.message)) return err.message;
  // Any other unrecognized Firebase code (e.g. a captcha-check-failed variant
  // whose message doesn't literally contain "recaptcha") still falls through
  // here — callers in a specific context (like "we were sending a code") can
  // pass a fallback tailored to that instead of the generic default below.
  return fallback || t("errors.somethingWentWrong");
}

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
export default function AuthSplitScreen({ copy, adapter, homePath, otherRole, signupHref }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get("mode") === "signup" ? "signup" : "signin";
  }); // signin | signup
  const [stage, setStage] = useState("main"); // main | forgot | forgot-sent
  const [method, setMethod] = useState("email"); // email | phone
  const [providers, setProviders] = useState({});
  const [smsReady, setSmsReady] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [agree, setAgree] = useState(false);
  const [touched, setTouched] = useState({});
  const [error, setError] = useState("");
  const [phoneErr, setPhoneErr] = useState("");
  const [busy, setBusy] = useState(false);

  const [ccIdx, setCcIdx] = useState(() => COUNTRIES.findIndex((c) => c[1] === "+91"));
  const cc = COUNTRIES[ccIdx] ? COUNTRIES[ccIdx][1] : "+91";
  const { t, setLang } = useTranslation();

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
    if (oauthError) setTimeout(() => setError(oauthError), 0);
  }, [location.search, adapter]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendIn]);

  const emailOk = EMAIL_RE.test(email);
  const errs = {
    name: mode === "signup" && touched.name && !name.trim() ? t("errors.required") : "",
    email: touched.email && !email.trim() ? t("errors.required") : (touched.email && email && !emailOk ? t("errors.invalidEmail") : ""),
    password: touched.password && !isPasswordValid(password)
      ? (password.trim().length === 0 ? t("errors.required") : t("errors.passwordTooShort", null, "Password must be at least 8 characters"))
      : "",
    agree: mode === "signup" && touched.agree && !agree ? t("auth.mustAcceptTerms", null, "Please accept the Terms & Conditions") : "",
  };
  const emailFormValid = emailOk && isPasswordValid(password) && (mode === "signin" || (name.trim() && agree));

  const goAfterAuth = () => navigate(location.state?.from || homePath, { replace: true });

  const submitEmail = async (e) => {
    e.preventDefault();
    setTouched({ name: true, email: true, password: true, agree: true });
    setError("");
    if (!emailFormValid) return;
    setBusy(true);
    try {
      if (mode === "signin") await adapter.login(email, password);
      else {
        await adapter.signup({ name: name.trim(), org: "", email: email.trim(), password });
        if (signupHref) { navigate(signupHref, { replace: true }); return; }
      }
      goAfterAuth();
    } catch (err) {
      // This is the backend REST signup/login path, not Firebase — the
      // backend already returns clean, specific copy ("An account with that
      // email already exists"), so trust err.message here instead of
      // friendlyAuthError's Firebase-code map, which doesn't apply to these
      // errors and was swallowing them into a generic "Something went wrong."
      setError(err.message || t("errors.somethingWentWrong"));
    } finally { setBusy(false); }
  };

  const phoneDigits = phone.replace(/\D/g, "");
  // E.164 caps the whole number (country code + subscriber number) at 15
  // digits — a long country-code prefix (e.g. +1876) plus a 13-digit number
  // can exceed that even though 13 looks fine in isolation, and that's what
  // Firebase rejects as "TOO_LONG (auth/invalid-phone-number)".
  const e164Ok = (cc.replace(/\D/g, "").length + phoneDigits.length) <= 15;
  const phoneOk = e164Ok && (cc === "+91" ? phoneDigits.length === 10 : (phoneDigits.length >= 7 && phoneDigits.length <= 13));

  const sendOtp = async () => {
    setTouched((t) => ({ ...t, name: true, agree: true }));
    setError("");
    setPhoneErr("");
    if (!phoneOk) {
      setPhoneErr(phoneDigits.length === 0 ? t("errors.required") : t("auth.enterValidPhoneNumber", null, "Please enter a valid mobile number"));
      return;
    }
    if (mode === "signup" && !(name.trim() && agree)) return;
    setBusy(true);
    try {
      const auth = await getFirebaseAuth(adapter.firebaseConfig);
      if (!auth) throw new Error(t("auth.phoneSignInNotConfigured", null, "Phone sign-in isn't configured on this server yet"));
      if (!recaptchaRef.current) recaptchaRef.current = new RecaptchaVerifier(auth, containerRef.current, { size: "invisible" });
      confirmationRef.current = await signInWithPhoneNumber(auth, `${cc}${phoneDigits}`, recaptchaRef.current);
      setOtpSent(true);
      setResendIn(30);
    } catch (err) {
      // A stale/consumed reCAPTCHA widget throws on the next attempt (e.g.
      // after switching country code) — drop it so the retry gets a fresh one.
      // clear() itself can throw when the widget is already in that broken
      // state (the exact case we're recovering from) — if it does, that
      // second, unguarded exception previously crashed this function before
      // reaching setPhoneErr below, so the user saw the raw Firebase/
      // reCAPTCHA error instead of the friendly message meant to replace it.
      if (recaptchaRef.current) {
        try { recaptchaRef.current.clear(); } catch { /* already torn down */ }
        recaptchaRef.current = null;
      }
      // Bug report explicitly wants send-code failures shown below the
      // Mobile Number field, not in the shared top-of-form banner. Any
      // unrecognized failure here still happened while sending the code, so
      // it gets the code-sending-specific message instead of a bare
      // "Something went wrong" that doesn't tell the user what to do.
      setPhoneErr(friendlyAuthError(err, t, t("auth.errSendCodeRetry", null, "We couldn't send the verification code. Please check your phone number and try again.")));
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
      setError(friendlyAuthError(err, t));
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
        <div className="asplit-brand-logo"><BrandMark size={80} /></div>
        <h1 className="asplit-headline">{copy.headline}</h1>
        <p className="asplit-sub">{copy.sub}</p>
      </div>
      <div className="asplit-form-col">
        <div className="asplit-form rise">
          <h1 style={{ fontSize: 23, margin: "0 0 8px" }}>{t("auth.resetPassword")}</h1>
          <p className="muted" style={{ fontSize: 13.5, margin: "0 0 20px" }}>{t("auth.enterEmailForResetLink", null, "Enter your email and we'll send you a reset link if an account exists.")}</p>
          {error && <div className="err-banner" style={{ marginBottom: 16 }}>{error}</div>}
          <form onSubmit={submitForgot} className="col gap-4">
            <div className="fld"><label>{t("auth.email")}</label>
              <input className="fin" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" autoFocus required />
            </div>
            <Btn type="submit" variant="primary" size="lg" block disabled={forgotBusy}>{forgotBusy ? t("auth.sending") : t("auth.sendResetLink")}</Btn>
          </form>
          <p className="asplit-cross" style={{ marginTop: 16 }}><button type="button" className="backlink" onClick={() => setStage("main")}>← {t("auth.backToSignIn")}</button></p>
        </div>
      </div>
    </div>
  );

  if (stage === "forgot-sent") return (
    <div className="asplit">
      <div className="asplit-brand">
        <div className="asplit-brand-logo"><BrandMark size={80} /></div>
        <h1 className="asplit-headline">{copy.headline}</h1>
      </div>
      <div className="asplit-form-col">
        <div className="asplit-form rise" style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: 23, margin: "0 0 10px" }}>{t("auth.checkYourInbox")}</h1>
          <p className="muted" style={{ fontSize: 14 }} dangerouslySetInnerHTML={{ __html: t("auth.resetLinkSent", { email: `<b>${email}</b>` }) }}></p>
          <Btn variant="ghost" onClick={() => setStage("main")}>← {t("auth.backToSignIn")}</Btn>
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
        <div className="asplit-brand-logo"><BrandMark size={80} /></div>
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
            <button type="button" className={mode === "signin" ? "on" : ""} onClick={() => { setMode("signin"); setError(""); }}>{t("auth.signIn")}</button>
            <button type="button" className={mode === "signup" ? "on" : ""}
              onClick={() => { setMode("signup"); setError(""); }}>
              {t("auth.signUp")}
            </button>
          </div>

          <h1 style={{ fontSize: 23, margin: "0 0 4px" }}>{mode === "signin" ? t("auth.welcomeBack") : copy.signupTitle}</h1>
          <p className="muted" style={{ fontSize: 13.5, margin: "0 0 20px" }}>{mode === "signin" ? copy.signinSub : copy.signupSub}</p>

          {error && <div className="err-banner" style={{ marginBottom: 16 }}>{error}</div>}

          {activeProviders.length > 0 && (
            <div className="sso-grid">
              {googleProv && (
                <a className="btn btn-ghost full" href={`${adapter.oauthBasePath}/google?mode=${mode}`}>
                  <GoogleMark size={17} /> {t("auth.continueWithGoogle")}
                </a>
              )}
              {otherProvs.map(([key]) => {
                const Mark = SSO_MARKS[key];
                return (
                  <a key={key} className="btn btn-ghost" href={`${adapter.oauthBasePath}/${key}?mode=${mode}`}>
                    {Mark ? <Mark size={16} /> : null} {key.charAt(0).toUpperCase() + key.slice(1)}
                  </a>
                );
              })}
            </div>
          )}

          {activeProviders.length > 0 && (
            <div className="row gap-3" style={{ alignItems: "center", margin: "16px 0 0" }}>
              <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
              <span className="faint" style={{ fontSize: 12 }}>{t("auth.orContinueWith")}</span>
              <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
            </div>
          )}

          {smsReady ? (
            <div className="method-tabs">
              <button type="button" className={`method-tab ${method === "email" ? "on" : ""}`} onClick={() => { setMethod("email"); setError(""); }}>
                <Icon name="mail" size={15} /> {t("auth.emailTab")}
              </button>
              <button type="button" className={`method-tab ${method === "phone" ? "on" : ""}`} onClick={() => { setMethod("phone"); setError(""); }}>
                <Icon name="phone" size={15} /> {t("auth.phoneTab")}
              </button>
            </div>
          ) : <div style={{ height: 18 }} />}

          {method === "email" ? (
            <form onSubmit={submitEmail} className="col gap-4">
              {mode === "signup" && (
                <>
                  <div className="fld">
                    <label>{t("auth.fullName")}</label>
                    <input className="fin" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => setTouched((t) => ({ ...t, name: true }))} placeholder="Ananya Sharma" autoFocus />
                    {errs.name && <p className="ferr">{errs.name}</p>}
                  </div>

                </>
              )}
              <div className="fld">
                <label>{mode === "signup" ? t("auth.workEmail", null, "Work email") : t("auth.email", null, "Email")}{copy.emailHint && mode === "signup" && <span className="faint"> · {copy.emailHint}</span>}</label>
                <input className="fin" type="email" value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => setTouched((t) => ({ ...t, email: true }))} placeholder="you@company.com" autoFocus={mode === "signin"} />
                {errs.email && <p className="ferr">{errs.email}</p>}
              </div>
              <div className="fld">
                <label>{t("auth.password")}</label>
                <div className="inw">
                  <input className="fin" type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} onBlur={() => setTouched((t) => ({ ...t, password: true }))} placeholder={mode === "signup" ? t("auth.atLeast8Chars", null, "At least 8 characters") : "••••••••"} />
                  <button type="button" onClick={() => setShowPw((s) => !s)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-faint)" }}>
                    <Icon name={showPw ? "eye" : "eye"} size={16} />
                  </button>
                </div>
                {errs.password && <p className="ferr">{errs.password}</p>}
                {mode === "signin" && (
                  <button type="button" className="backlink" style={{ float: "right", marginTop: 6 }}
                    onClick={() => { setError(""); setStage("forgot"); }}>
                    {t("auth.forgotPassword")}
                  </button>
                )}
              </div>
              {mode === "signup" && (
                <div>
                  <label className="row gap-2" style={{ fontSize: 12.5, color: "var(--text-faint)", alignItems: "flex-start" }}>
                    <input type="checkbox" checked={agree} onChange={(e) => { setAgree(e.target.checked); setTouched((t) => ({ ...t, agree: true })); }} style={{ marginTop: 2 }} />
                    {t("auth.agreeToTerms")}
                  </label>
                  {errs.agree && <p className="ferr">{errs.agree}</p>}
                </div>
              )}
              <Btn type="submit" variant="primary" size="lg" block disabled={busy}>
                {busy ? t("auth.pleaseWait") : mode === "signin" ? t("auth.signIn") : t("auth.signUp")}
              </Btn>
            </form>
          ) : (
            <div className="col gap-4">
              {mode === "signup" && !otpSent && (
                <>
                  <div className="fld">
                    <label>{t("auth.fullName")}</label>
                    <input className="fin" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => setTouched((t) => ({ ...t, name: true }))} placeholder="Ananya Sharma" />
                    {errs.name && <p className="ferr">{errs.name}</p>}
                  </div>

                  <label className="row gap-2" style={{ fontSize: 12.5, color: "var(--text-faint)", alignItems: "flex-start" }}>
                    <input type="checkbox" checked={agree} onChange={(e) => { setAgree(e.target.checked); setTouched((t) => ({ ...t, agree: true })); }} style={{ marginTop: 2 }} />
                    {t("auth.agreeToTerms")}
                  </label>
                  {errs.agree && <p className="ferr">{errs.agree}</p>}
                </>
              )}
              {!otpSent ? (
                <>
                  <div className="fld">
                    <label>{t("auth.mobileNumber")}</label>
                    <div className="phone-row">
                      <select className="cc-select" value={ccIdx} onChange={handleCcChange}>
                        {COUNTRIES.map((c, i) => <option key={c[2]} value={i}>{c[0]} {c[1]}</option>)}
                      </select>
                      <input className="fin" type="tel" value={phone} onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "")); setPhoneErr(""); }} placeholder="98765 43210" />
                    </div>
                    <p className="fhint">{cc === "+91"
                      ? t("auth.phoneHintIndia", null, "Enter your 10-digit mobile number, without the country code")
                      : t("auth.phoneHintOther", null, "Enter your mobile number (7–13 digits), without the country code")}</p>
                    {phoneErr && <p className="ferr">{phoneErr}</p>}
                  </div>
                  <div ref={containerRef} />
                  <Btn type="button" variant="primary" size="lg" block disabled={busy} onClick={sendOtp}>
                    {busy ? t("auth.sending") : t("auth.sendCode")}
                  </Btn>
                </>
              ) : (
                <>
                  <p className="otp-lead"><span dangerouslySetInnerHTML={{ __html: t("auth.enterCode", { phone: `<b>${cc} ${phoneDigits}</b>` }) }} /> <button type="button" className="backlink" onClick={() => { setOtpSent(false); setOtp(""); }}>{t("actions.edit")}</button></p>
                  <OtpBoxes value={otp} onChange={setOtp} />
                  <div className="resend-row">
                    <span>{t("auth.didntGetIt")}</span>
                    <button type="button" disabled={resendIn > 0} onClick={sendOtp}>{resendIn > 0 ? t("auth.resendIn", { seconds: resendIn }) : t("auth.resendCode")}</button>
                  </div>
                  <Btn type="button" variant="primary" size="lg" block disabled={busy || otp.length !== 6} onClick={verifyOtp}>
                    {busy ? t("auth.verifying") : t("auth.verifyAndContinue")}
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
