const fs = require('fs');

let code = fs.readFileSync('src/pages/IntentFork.jsx', 'utf8');

code = code.replace(
  'import { BrandMark } from "../components/BrandMark";',
  'import { BrandMark } from "../components/BrandMark";\nimport { useTranslation } from "../i18n/index.jsx";\nimport LanguageSwitcher from "../components/LanguageSwitcher";\nimport { api } from "../api/client";'
);

code = code.replace(
  'export default function IntentFork() {',
  'export default function IntentFork() {\n  const { t } = useTranslation();'
);

code = code.replace(
  'const SIDES = [',
  'const SIDES = (t) => ['
);

code = code.replace(
  'title: "I\'m a Builder",',
  'title: t("landing.builderTitle", null, "I\\'m a Builder"),'
);

code = code.replace(
  'tagline: "Validate my product or idea",',
  'tagline: t("landing.builderTagline", null, "Validate my product or idea"),'
);

code = code.replace(
  'blurb: "Put your idea, product, brand, or research in front of the exact people who should weigh in.",',
  'blurb: t("landing.builderBlurb", null, "Put your idea, product, brand, or research in front of the exact people who should weigh in."),'
);

code = code.replace(
  'title: "I\'m a Validator",',
  'title: t("landing.validatorTitle", null, "I\\'m a Validator"),'
);

code = code.replace(
  'tagline: "Test products & get paid",',
  'tagline: t("landing.validatorTagline", null, "Test products & get paid"),'
);

code = code.replace(
  'blurb: "Bring your taste, expertise or everyday perspective. Join missions and get rewarded.",',
  'blurb: t("landing.validatorBlurb", null, "Bring your taste, expertise or everyday perspective. Join missions and get rewarded."),'
);

code = code.replace(
  'SIDES.map',
  'SIDES(t).map'
);

code = code.replace(
  '<div className="auth-shell">',
  '<div className="auth-shell">\n      <div style={{ position: "absolute", top: 16, right: 24, zIndex: 10 }}>\n        <LanguageSwitcher onSave={(lang) => api.setLanguage(lang).catch(() => {})} style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "4px 8px" }} />\n      </div>'
);

code = code.replace(
  '<div className="eyebrow" style={{ marginBottom: 10 }}>Welcome to ValidationCrew</div>',
  '<div className="eyebrow" style={{ marginBottom: 10 }}>{t("landing.welcome", null, "Welcome to ValidationCrew")}</div>'
);

code = code.replace(
  '<h1 style={{ fontSize: 28, marginBottom: 8 }}>What would you like to do?</h1>',
  '<h1 style={{ fontSize: 28, marginBottom: 8 }}>{t("landing.whatToDo", null, "What would you like to do?")}</h1>'
);

code = code.replace(
  'ValidationCrew connects people who need feedback with people who give it. Which side are you on?',
  '{t("landing.description", null, "ValidationCrew connects people who need feedback with people who give it. Which side are you on?")}'
);

code = code.replace(
  'Continue <Icon name="arrowRight" size={14} />',
  '{t("actions.continue", null, "Continue")} <Icon name="arrowRight" size={14} />'
);

code = code.replace(
  'Already have an account?',
  '{t("landing.alreadyAccount", null, "Already have an account?")}'
);

code = code.replace(
  '>Sign in as a Founder<',
  '>{t("landing.signInFounder", null, "Sign in as a Founder")}<'
);

code = code.replace(
  '>sign in as a Validator<',
  '>{t("landing.signInValidator", null, "sign in as a Validator")}<'
);

fs.writeFileSync('src/pages/IntentFork.jsx', code);
console.log("IntentFork modified successfully");
