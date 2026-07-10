import { Link } from "react-router-dom";
import AuthSplitScreen from "../components/auth/AuthSplitScreen";
import { useVAuth } from "../vcontext/VAuthContext";
import { vapi, setVToken } from "../vapi/client";

const COPY = {
  headline: "Get paid for sharp product feedback.",
  sub: "Founders need real signal before they ship. Bring your taste and expertise, run structured validations, and earn for every high-signal review — on your own schedule.",
  values: [
    { icon: "coin", title: "Earn ₹70–₹220 per task", desc: "Clear payouts per validation. The sharper your feedback, the higher-paying the tasks you unlock." },
    { icon: "clock", title: "Work whenever you want", desc: "No quotas, no meetings. Pick tasks that match your expertise and finish them in minutes." },
    { icon: "target", title: "Build a reputation that pays", desc: "Accuracy is scored. Climb from Verified to Elite and get matched to premium campaigns." },
  ],
  stats: [["₹41k", "top monthly earner"], ["2,400", "active validators"], ["4.9★", "avg validator rating"]],
  proof: "Validators from Google, Stripe, indie studios & 40+ countries",
  signupTitle: "Start earning", signupSub: "Create your validator profile in minutes.",
  signinSub: "Sign in to pick up validation tasks.",
  field2Label: "Primary expertise", field2Placeholder: "AI products, B2B SaaS", field2Error: "Add at least one area of expertise",
  emailHint: undefined,
  crossText: "Here to build, not earn?", crossLabel: "Founder sign in",
  foot: "Your identity stays private to founders. We only share your expertise tags and feedback quality.",
};

export default function VLogin() {
  const { validator, setValidator } = useVAuth();

  if (validator) {
    return (
      <div className="page rise" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "var(--bg)" }}>
        <div style={{ textAlign: "center", background: "var(--panel)", padding: "40px 32px", borderRadius: "var(--radius)", border: "1px solid var(--border)", maxWidth: 400, boxShadow: "var(--shadow-sm)" }}>
          <h2 style={{ margin: "0 0 12px", fontSize: 24, fontWeight: 800 }}>Already logged in</h2>
          <p style={{ color: "var(--text-muted)", marginBottom: 24, fontSize: 15 }}>You are currently logged in as <strong>{validator.email}</strong>.</p>
          <Link to="/validator" className="btn btn-primary" style={{ display: "inline-flex", width: "100%", justifyContent: "center" }}>Go to Dashboard →</Link>
        </div>
      </div>
    );
  }

  const adapter = {
    oauthProviders: () => vapi.oauthProviders(),
    oauthBasePath: "/api/v/auth/oauth",
    firebaseConfig: () => vapi.firebaseConfig(),
    phoneLoginVerify: (idToken) => vapi.phoneLoginVerify(idToken),
    login: (email, password) => vapi.login(email, password).then(({ token, validator }) => { setVToken(token); setValidator(validator); }),
    signup: ({ name, org, email, password }) => vapi.signup({ name, expertise: org, email, password }).then(({ token, validator }) => { setVToken(token); setValidator(validator); }),
    userKey: "validator",
    onAuthed: (token, validator) => { setVToken(token); setValidator(validator); },
  };

  return (
    <AuthSplitScreen
      role="validator"
      copy={COPY}
      adapter={adapter}
      homePath="/validator"
      otherRole={{ href: "/login", label: "Founder sign in →" }}
    />
  );
}
