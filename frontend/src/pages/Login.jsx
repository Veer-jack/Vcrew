import AuthSplitScreen from "../components/auth/AuthSplitScreen";
import { useAuth } from "../context/AuthContext";
import { api, setToken } from "../api/client";

const COPY = {
  headline: "Know it's good before you ship it.",
  sub: "AI made building easy — validation is the new bottleneck. Put your idea, page, prototype, MVP or AI product in front of real, vetted people and get a clear answer in days.",
  values: [
    { icon: "bolt", title: "Real users in 24–72 hours", desc: "Skip the LinkedIn guesswork. Get structured feedback from people who match your audience." },
    { icon: "users", title: "Vetted, niche validators", desc: "AI builders judge AI products. PMs judge PMs. Quality is scored, not random." },
    { icon: "chart", title: "One clear readiness score", desc: "Every campaign returns a synthesized report with a launch-readiness score — not a pile of raw notes." },
  ],
  stats: [["12,400+", "validations run"], ["2,400", "vetted validators"], ["4.9★", "avg signal rating"]],
  proof: "Founders from Ramp, Linear, Vercel & 600+ teams",
  signupTitle: "Start validating", signupSub: "Launch your first campaign in minutes.",
  signinSub: "Sign in to manage your validation campaigns.",
  field2Label: "Company / product", field2Placeholder: "Helix Labs", field2Error: "Add your company or product",
  emailHint: "use your company domain",
  crossText: "Here to earn, not build?", crossLabel: "Validator sign in",
  foot: "Protected by SOC 2-grade security. We never share your idea with anyone outside your matched validators.",
};

export default function Login() {
  const { setBuilder } = useAuth();

  const adapter = {
    oauthProviders: () => api.oauthProviders(),
    oauthBasePath: "/api/auth/oauth",
    firebaseConfig: () => api.firebaseConfig(),
    phoneLoginVerify: (idToken) => api.phoneLoginVerify(idToken),
    login: (email, password) => api.login(email, password).then(({ token, builder }) => { setToken(token); setBuilder(builder); }),
    signup: ({ name, org, email, password }) => api.signup({ name, org, email, password, persona: "founder" }).then(({ token, builder }) => { setToken(token); setBuilder(builder); }),
    userKey: "builder",
    onAuthed: (token, builder) => { setToken(token); setBuilder(builder); },
  };

  return (
    <AuthSplitScreen
      role="founder"
      copy={COPY}
      adapter={adapter}
      homePath="/"
      otherRole={{ href: "/validator/login", label: "Validator sign in →" }}
      signupHref="/get-started"
    />
  );
}
