import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AuthSplitScreen from "../components/auth/AuthSplitScreen";
import { useTranslation } from "../i18n/index.jsx";
import { useVAuth } from "../vcontext/VAuthContext";
import { vapi, setVToken } from "../vapi/client";

export default function VLogin() {
  const { t, lang } = useTranslation();
  const { validator, setValidator } = useVAuth();
  const navigate = useNavigate();

  const COPY = {
    headline: t("validator.login.headline", null, "Get paid for sharp product feedback."),
    sub: t("validator.login.sub", null, "Builders need real signal before they ship. Bring your taste and expertise, run structured validations, and earn for every high-signal review — on your own schedule."),
    values: [
      { icon: "coin", title: t("validator.login.v1Title", null, "Earn ₹70–₹220 per task"), desc: t("validator.login.v1Desc", null, "Clear payouts per validation. The sharper your feedback, the higher-paying the tasks you unlock.") },
      { icon: "clock", title: t("validator.login.v2Title", null, "Work whenever you want"), desc: t("validator.login.v2Desc", null, "No quotas, no meetings. Pick tasks that match your expertise and finish them in minutes.") },
      { icon: "target", title: t("validator.login.v3Title", null, "Build a reputation that pays"), desc: t("validator.login.v3Desc", null, "Accuracy is scored. Climb from Verified to Elite and get matched to premium campaigns.") },
    ],
    stats: [[t("validator.login.s1Val", null, "₹41k"), t("validator.login.s1Lbl", null, "top monthly earner")], [t("validator.login.s2Val", null, "2,400"), t("validator.login.s2Lbl", null, "active validators")], [t("validator.login.s3Val", null, "4.9★"), t("validator.login.s3Lbl", null, "avg validator rating")]],
    proof: t("validator.login.proof", null, "Validators from Google, Stripe, indie studios & 40+ countries"),
    signupTitle: t("validator.login.signupTitle", null, "Start earning"),
    signupSub: t("validator.login.signupSub", null, "Create your validator profile in minutes."),
    signinSub: t("validator.login.signinSub", null, "Sign in to pick up validation tasks."),
    field2Label: "Primary expertise", field2Placeholder: "AI products, B2B SaaS", field2Error: "Add at least one area of expertise",
    emailHint: undefined,
    crossText: t("validator.login.crossText", null, "Here to build, not earn?"), crossLabel: t("validator.login.crossLabel", null, "Builder sign in"),
    foot: t("validator.login.foot", null, "Your identity stays private to builders. We only share your expertise tags and feedback quality."),
  };

  useEffect(() => { if (validator) navigate("/validator", { replace: true }); }, [validator, navigate]);
  if (validator) return null;

  const adapter = {
    oauthProviders: () => vapi.oauthProviders(),
    oauthBasePath: "/api/v/auth/oauth",
    firebaseConfig: () => vapi.firebaseConfig(),
    phoneLoginVerify: (idToken) => vapi.phoneLoginVerify(idToken),
    login: (email, password) => vapi.login(email, password).then(({ token, validator }) => { setVToken(token); setValidator(validator); }),
    signup: ({ name, org, email, password }) => vapi.signup({ name, expertise: org, email, password, lang }).then(({ token, validator }) => { setVToken(token); setValidator(validator); }),
    userKey: "validator",
    onAuthed: (token, validator) => { setVToken(token); setValidator(validator); },
  };

  return (
    <AuthSplitScreen
      role="validator"
      copy={COPY}
      adapter={adapter}
      homePath="/validator"
      otherRole={{ href: "/login", label: t("validator.login.otherRole", null, "Builder sign in →") }}
    />
  );
}
