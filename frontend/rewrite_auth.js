const fs = require('fs');
let code = fs.readFileSync('src/components/auth/AuthSplitScreen.jsx', 'utf8');

code = code.replace(
  'const { setLang } = useTranslation();',
  'const { t, setLang } = useTranslation();'
);

code = code.replace(
  'name: mode === "signup" && touched.name && !name.trim() ? "Tell us your name" : "",',
  'name: mode === "signup" && touched.name && !name.trim() ? t("errors.required") : "",'
);

code = code.replace(
  'email: touched.email && email && !emailOk ? "Enter a valid email" : "",',
  'email: touched.email && email && !emailOk ? t("errors.invalidEmail") : "",'
);

code = code.replace(
  'password: touched.password && password.length > 0 && password.length < 8 ? "At least 8 characters" : "",',
  'password: touched.password && password.length > 0 && password.length < 8 ? t("auth.atLeast8Chars") : "",'
);

code = code.replace(
  'setError(err.message || "Something went wrong");',
  'setError(err.message || t("errors.somethingWentWrong"));'
);

code = code.replace(
  '<h1 style={{ fontSize: 23, margin: "0 0 8px" }}>Reset your password</h1>',
  '<h1 style={{ fontSize: 23, margin: "0 0 8px" }}>{t("auth.resetPassword")}</h1>'
);

code = code.replace(
  '<Btn type="submit" variant="primary" size="lg" block disabled={forgotBusy}>{forgotBusy ? "Sending…" : "Send reset link"}</Btn>',
  '<Btn type="submit" variant="primary" size="lg" block disabled={forgotBusy}>{forgotBusy ? t("auth.sending") : t("auth.sendResetLink")}</Btn>'
);

code = code.replace(
  '<button type="button" className="backlink" onClick={() => setStage("main")}>← Back to sign in</button>',
  '<button type="button" className="backlink" onClick={() => setStage("main")}>← {t("auth.backToSignIn")}</button>'
);

code = code.replace(
  '<h1 style={{ fontSize: 23, margin: "0 0 10px" }}>Check your inbox</h1>',
  '<h1 style={{ fontSize: 23, margin: "0 0 10px" }}>{t("auth.checkYourInbox")}</h1>'
);

code = code.replace(
  '<p className="muted" style={{ fontSize: 14 }}>If <b>{email}</b> is registered, you\'ll receive a reset link within a minute. Check your spam folder if it doesn\'t arrive.</p>',
  '<p className="muted" style={{ fontSize: 14 }} dangerouslySetInnerHTML={{ __html: t("auth.resetLinkSent", { email: `<b>${email}</b>` }) }}></p>'
);

code = code.replace(
  '<Btn variant="ghost" onClick={() => setStage("main")}>← Back to sign in</Btn>',
  '<Btn variant="ghost" onClick={() => setStage("main")}>← {t("auth.backToSignIn")}</Btn>'
);

code = code.replace(
  '<button type="button" className={mode === "signin" ? "on" : ""} onClick={() => { setMode("signin"); setError(""); }}>Sign in</button>',
  '<button type="button" className={mode === "signin" ? "on" : ""} onClick={() => { setMode("signin"); setError(""); }}>{t("auth.signIn")}</button>'
);

code = code.replace(
  '<button type="button" className={mode === "signup" ? "on" : ""}\n              onClick={() => { setMode("signup"); setError(""); }}>\n              Create account\n            </button>',
  '<button type="button" className={mode === "signup" ? "on" : ""}\n              onClick={() => { setMode("signup"); setError(""); }}>\n              {t("auth.signUp")}\n            </button>'
);

code = code.replace(
  '{mode === "signin" ? "Welcome back" : copy.signupTitle}',
  '{mode === "signin" ? t("auth.welcomeBack") : copy.signupTitle}'
);

code = code.replace(
  '<GoogleMark size={17} /> Continue with Google',
  '<GoogleMark size={17} /> {t("auth.continueWithGoogle")}'
);

code = code.replace(
  '<span className="faint" style={{ fontSize: 12 }}>or continue with</span>',
  '<span className="faint" style={{ fontSize: 12 }}>{t("auth.orContinueWith")}</span>'
);

code = code.replace(
  '<Icon name="mail" size={15} /> Email',
  '<Icon name="mail" size={15} /> {t("auth.emailTab")}'
);

code = code.replace(
  '<Icon name="phone" size={15} /> Phone',
  '<Icon name="phone" size={15} /> {t("auth.phoneTab")}'
);

code = code.replace(
  '<label>Full name</label>',
  '<label>{t("auth.fullName")}</label>'
);
code = code.replace(
  '<label>Full name</label>',
  '<label>{t("auth.fullName")}</label>'
); // replace both instances

code = code.replace(
  '<label>Password</label>',
  '<label>{t("auth.password")}</label>'
);

code = code.replace(
  'I agree to the Terms of Service and Privacy Policy',
  '{t("auth.agreeToTerms")}'
);
code = code.replace(
  'I agree to the Terms of Service and Privacy Policy',
  '{t("auth.agreeToTerms")}'
); // replace both instances

code = code.replace(
  '{busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}',
  '{busy ? t("auth.pleaseWait") : mode === "signin" ? t("auth.signIn") : t("auth.signUp")}'
);

code = code.replace(
  '<label>Mobile number</label>',
  '<label>{t("auth.mobileNumber")}</label>'
);

code = code.replace(
  '{busy ? "Sending…" : "Send code"}',
  '{busy ? t("auth.sending") : t("auth.sendCode")}'
);

code = code.replace(
  '<p className="otp-lead">Enter the 6-digit code sent to <b>{cc} {phoneDigits}</b> <button type="button" className="backlink" onClick={() => { setOtpSent(false); setOtp(""); }}>Edit</button></p>',
  '<p className="otp-lead"><span dangerouslySetInnerHTML={{ __html: t("auth.enterCode", { phone: `<b>${cc} ${phoneDigits}</b>` }) }} /> <button type="button" className="backlink" onClick={() => { setOtpSent(false); setOtp(""); }}>{t("actions.edit")}</button></p>'
);

code = code.replace(
  '<span>Didn\'t get it?</span>',
  '<span>{t("auth.didntGetIt")}</span>'
);

code = code.replace(
  '{resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}',
  '{resendIn > 0 ? t("auth.resendIn", { seconds: resendIn }) : t("auth.resendCode")}'
);

code = code.replace(
  '{busy ? "Verifying…" : "Verify and continue"}',
  '{busy ? t("auth.verifying") : t("auth.verifyAndContinue")}'
);

code = code.replace(
  'Forgot password?',
  '{t("auth.forgotPassword")}'
);

code = code.replace(
  '<label>Email</label>',
  '<label>{t("auth.email")}</label>'
);

fs.writeFileSync('src/components/auth/AuthSplitScreen.jsx', code);
console.log("AuthSplitScreen modified successfully");
