const fs = require('fs');
let code = fs.readFileSync('src/apages/ALogin.jsx', 'utf8');

code = code.replace(
  'import { useAAuth } from "../acontext/AAuthContext";',
  'import { useAAuth } from "../acontext/AAuthContext";\nimport { useTranslation } from "../i18n/index.jsx";'
);

code = code.replace(
  'export default function ALogin() {',
  'export default function ALogin() {\n  const { t } = useTranslation();'
);

code = code.replace(
  'Already logged in',
  '{t("auth.alreadyLoggedIn", null, "Already logged in")}'
);

code = code.replace(
  'You are currently logged in as <strong>{admin.email}</strong>.',
  '<span dangerouslySetInnerHTML={{ __html: t("auth.loggedInAs", { email: `<strong>${admin.email}</strong>` }, "You are currently logged in as {email}.") }} />'
);

code = code.replace(
  'Go to Admin Dashboard →',
  '{t("admin.goToDashboard", null, "Go to Admin Dashboard →")}'
);

code = code.replace(
  '<h1>Admin console</h1>',
  '<h1>{t("admin.signIn", null, "Admin console")}</h1>'
);

code = code.replace(
  'Sign in with the platform operator account.',
  '{t("admin.signInDesc", null, "Sign in with the platform operator account.")}'
);

code = code.replace(
  '<label>Email</label>',
  '<label>{t("auth.email", null, "Email")}</label>'
);

code = code.replace(
  '<label>Password</label>',
  '<label>{t("auth.password", null, "Password")}</label>'
);

code = code.replace(
  '{busy ? "Signing in…" : "Continue"}',
  '{busy ? t("auth.signingIn", null, "Signing in…") : t("actions.continue", null, "Continue")}'
);

code = code.replace(
  '<h1>Save your backup codes</h1>',
  '<h1>{t("admin.saveBackupCodes", null, "Save your backup codes")}</h1>'
);

code = code.replace(
  `These 8 codes let you regain access if you ever lose your authenticator app.
              Each can only be used once. <b>Save them somewhere safe — they won't be shown again.</b>`,
  `<span dangerouslySetInnerHTML={{ __html: t("admin.backupCodesDesc", null, "These 8 codes let you regain access if you ever lose your authenticator app. Each can only be used once. <b>Save them somewhere safe — they won't be shown again.</b>") }} />`
);

code = code.replace(
  "I've saved these — continue to admin",
  '{t("admin.savedCodes", null, "I\\'ve saved these — continue to admin")}'
);

code = code.replace(
  '<h1>Set up two-factor authentication</h1>',
  '<h1>{t("admin.setupTwoFactor", null, "Set up two-factor authentication")}</h1>'
);

code = code.replace(
  'No authenticator is configured yet for this admin account. Scan this QR code with Google Authenticator, 1Password, or any TOTP app, then enter the 6-digit code it generates.',
  '{t("admin.setupTwoFactorDesc", null, "No authenticator is configured yet for this admin account. Scan this QR code with Google Authenticator, 1Password, or any TOTP app, then enter the 6-digit code it generates.")}'
);

code = code.replace(
  "Can't scan? Enter manually:",
  "{t(\"admin.cantScan\", null, \"Can't scan? Enter manually:\")}"
);

code = code.replace(
  '<label>6-digit code</label>',
  '<label>{t("admin.sixDigitCode", null, "6-digit code")}</label>'
);
code = code.replace(
  '<label>6-digit code</label>',
  '<label>{t("admin.sixDigitCode", null, "6-digit code")}</label>'
); // Do it twice

code = code.replace(
  '{busy ? "Verifying…" : "Confirm & finish setup"}',
  '{busy ? t("auth.verifying", null, "Verifying…") : t("admin.confirmAndFinish", null, "Confirm & finish setup")}'
);

code = code.replace(
  '<h1>Enter your code</h1>',
  '<h1>{t("admin.enterCode", null, "Enter your code")}</h1>'
);

code = code.replace(
  'Open your authenticator app and enter the current 6-digit code.',
  '{t("admin.enterCodeDesc", null, "Open your authenticator app and enter the current 6-digit code.")}'
);

code = code.replace(
  '{busy ? "Verifying…" : "Sign in"}',
  '{busy ? t("auth.verifying", null, "Verifying…") : t("auth.signIn", null, "Sign in")}'
);

fs.writeFileSync('src/apages/ALogin.jsx', code);
console.log("ALogin modified successfully");
