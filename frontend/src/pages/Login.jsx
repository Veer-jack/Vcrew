import { Link } from "react-router-dom";
import AuthSplitScreen from "../components/auth/AuthSplitScreen";
import { useTranslation } from "../i18n/index.jsx";
import { useAuth } from "../context/AuthContext";
import { api, setToken } from "../api/client";

export default function Login() {
  const { t, lang } = useTranslation();
  const { builder, setBuilder } = useAuth();

  const COPY = {
    headline: t("builder.login.headline", null, "Know it's good before you ship it."),
    sub: t("builder.login.sub", null, "AI made building easy — validation is the new bottleneck. Put your idea, page, prototype, MVP or AI product in front of real, vetted people and get a clear answer in days."),
    values: [
      { icon: "bolt", title: t("builder.login.v1Title", null, "Real users in 24–72 hours"), desc: t("builder.login.v1Desc", null, "Skip the LinkedIn guesswork. Get structured feedback from people who match your audience.") },
      { icon: "users", title: t("builder.login.v2Title", null, "Vetted, niche validators"), desc: t("builder.login.v2Desc", null, "AI builders judge AI products. PMs judge PMs. Quality is scored, not random.") },
      { icon: "chart", title: t("builder.login.v3Title", null, "One clear readiness score"), desc: t("builder.login.v3Desc", null, "Every campaign returns a synthesized report with a launch-readiness score — not a pile of raw notes.") },
    ],
    stats: [[t("builder.login.s1Val", null, "12,400+"), t("builder.login.s1Lbl", null, "validations run")], [t("builder.login.s2Val", null, "2,400"), t("builder.login.s2Lbl", null, "vetted validators")], [t("builder.login.s3Val", null, "4.9★"), t("builder.login.s3Lbl", null, "avg signal rating")]],
    proof: t("builder.login.proof", null, "Founders from Ramp, Linear, Vercel & 600+ teams"),
    signupTitle: t("builder.login.signupTitle", null, "Start validating"),
    signupSub: t("builder.login.signupSub", null, "Launch your first campaign in minutes."),
    signinSub: t("builder.login.signinSub", null, "Sign in to manage your validation campaigns."),
    field2Label: "Company / product", field2Placeholder: "Helix Labs", field2Error: "Add your company or product",
    emailHint: t("builder.login.emailHint", null, "use your company domain"),
    crossText: t("builder.login.crossText", null, "Here to earn, not build?"), crossLabel: t("builder.login.crossLabel", null, "Validator sign in"),
    foot: t("builder.login.foot", null, "Protected by SOC 2-grade security. We never share your idea with anyone outside your matched validators."),
  };

  if (builder) {
    return (
      <div className="page rise" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "var(--bg)" }}>
        <div style={{ textAlign: "center", background: "var(--panel)", padding: "40px 32px", borderRadius: "var(--radius)", border: "1px solid var(--border)", maxWidth: 400, boxShadow: "var(--shadow-sm)" }}>
          <h2 style={{ margin: "0 0 12px", fontSize: 24, fontWeight: 800 }}>{t("auth.alreadyLoggedIn", null, "Already logged in")}</h2>
          <p style={{ color: "var(--text-muted)", marginBottom: 24, fontSize: 15 }}><span dangerouslySetInnerHTML={{ __html: t("auth.loggedInAs", { email: `<strong>${builder.email}</strong>` }, "You are currently logged in as {email}.") }} /></p>
          <Link to="/" className="btn btn-primary" style={{ display: "inline-flex", width: "100%", justifyContent: "center" }}>{t("auth.goToDashboard", null, "Go to Dashboard →")}</Link>
        </div>
      </div>
    );
  }

  const adapter = {
    oauthProviders: () => api.oauthProviders(),
    oauthBasePath: "/api/auth/oauth",
    firebaseConfig: () => api.firebaseConfig(),
    phoneLoginVerify: (idToken) => api.phoneLoginVerify(idToken),
    login: (email, password) => api.login(email, password).then(({ token, builder }) => { setToken(token); setBuilder(builder); }),
    signup: ({ name, org, email, password }) => api.signup({ name, org, email, password, lang }).then(({ token, builder }) => { setToken(token); setBuilder(builder); }),
    userKey: "builder",
    onAuthed: (token, builder) => { setToken(token); setBuilder(builder); },
  };

  return (
    <AuthSplitScreen
      role="founder"
      copy={COPY}
      adapter={adapter}
      homePath="/"
      otherRole={{ href: "/validator/login", label: t("builder.login.otherRole", null, "Validator sign in →") }}
      signupHref="/get-started/feedback"
    />
  );
}
