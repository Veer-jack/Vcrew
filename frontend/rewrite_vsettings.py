import os

with open('src/vpages/VSettings.jsx', 'r') as f:
    code = f.read()

replacements = [
    ('import Icon from "../components/Icon";', 'import Icon from "../components/Icon";\nimport { useTranslation } from "../i18n/index.jsx";'),
    ('export default function VSettings() {', 'export default function VSettings() {\n  const { t } = useTranslation();'),
    ('New passwords do not match.', 't("settings.errPwdMatch", null, "New passwords do not match.")'),
    ('New password must be at least 8 characters.', 't("settings.errPwdLength", null, "New password must be at least 8 characters.")'),
    ('Password updated successfully.', 't("settings.pwdSuccess", null, "Password updated successfully.")'),
    ('Failed to change password.', 't("settings.pwdFailed", null, "Failed to change password.")'),
    ('Couldn\'t save changes', 't("settings.saveFailed", null, "Couldn\'t save changes")'),
    ('<h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Settings</h1>', '<h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>{t("settings.title", null, "Settings")}</h1>'),
    ('<h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Profile Information</h3>', '<h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{t("settings.profileInfo", null, "Profile Information")}</h3>'),
    ('Update your personal details and email address.', '{t("settings.profileDesc", null, "Update your personal details and email address.")}'),
    ('<label style={{ fontSize: 13, fontWeight: 600 }}>Full Name</label>', '<label style={{ fontSize: 13, fontWeight: 600 }}>{t("settings.fullName", null, "Full Name")}</label>'),
    ('<label style={{ fontSize: 13, fontWeight: 600 }}>Email Address</label>', '<label style={{ fontSize: 13, fontWeight: 600 }}>{t("settings.emailAddress", null, "Email Address")}</label>'),
    ('✓ Changes saved', '✓ {t("settings.changesSaved", null, "Changes saved")}'),
    ('{busy ? "Saving…" : "Save Changes"}', '{busy ? t("actions.saving", null, "Saving…") : t("actions.saveChanges", null, "Save Changes")}'),
    ('<h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Account Information</h3>', '<h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{t("settings.accountInfo", null, "Account Information")}</h3>'),
    ('View your account details and unique identifiers.', '{t("settings.accountDesc", null, "View your account details and unique identifiers.")}'),
    ('<label style={{ fontSize: 13, fontWeight: 600 }}>Validator ID</label>', '<label style={{ fontSize: 13, fontWeight: 600 }}>{t("settings.validatorId", null, "Validator ID")}</label>'),
    ('<label style={{ fontSize: 13, fontWeight: 600 }}>Handle</label>', '<label style={{ fontSize: 13, fontWeight: 600 }}>{t("settings.handle", null, "Handle")}</label>'),
    ('<h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Security</h3>', '<h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{t("settings.security", null, "Security")}</h3>'),
    ('Change your password to keep your account secure.', '{t("settings.securityDesc", null, "Change your password to keep your account secure.")}'),
    ('<label style={{ fontSize: 13, fontWeight: 600 }}>Current Password</label>', '<label style={{ fontSize: 13, fontWeight: 600 }}>{t("settings.currentPwd", null, "Current Password")}</label>'),
    ('placeholder="Enter current password"', 'placeholder={t("settings.enterCurrentPwd", null, "Enter current password")}'),
    ('<label style={{ fontSize: 13, fontWeight: 600 }}>New Password</label>', '<label style={{ fontSize: 13, fontWeight: 600 }}>{t("settings.newPwd", null, "New Password")}</label>'),
    ('placeholder="Enter new password"', 'placeholder={t("settings.enterNewPwd", null, "Enter new password")}'),
    ('<label style={{ fontSize: 13, fontWeight: 600 }}>Confirm New Password</label>', '<label style={{ fontSize: 13, fontWeight: 600 }}>{t("settings.confirmNewPwd", null, "Confirm New Password")}</label>'),
    ('placeholder="Confirm new password"', 'placeholder={t("settings.confirmNewPwdPlaceholder", null, "Confirm new password")}'),
    ('{pwdBusy ? "Saving…" : "Update Password"}', '{pwdBusy ? t("actions.saving", null, "Saving…") : t("actions.updatePassword", null, "Update Password")}'),
    ('<h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>More settings coming soon</h3>', '<h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{t("settings.moreSettings", null, "More settings coming soon")}</h3>'),
    ('We\'re working on new preferences and customizations for your account.', '{t("settings.moreSettingsDesc", null, "We\'re working on new preferences and customizations for your account.")}'),
    ('<div className="eyebrow" style={{ marginBottom: 16 }}>Account type</div>', '<div className="eyebrow" style={{ marginBottom: 16 }}>{t("settings.accountType", null, "Account type")}</div>'),
    ('<div style={{ fontWeight: 600, fontSize: 14 }}>Type</div>', '<div style={{ fontWeight: 600, fontSize: 14 }}>{t("settings.type", null, "Type")}</div>'),
    ('{validator?.validator_type === "user" ? "User — Consumer tester" : validator?.validator_type === "tester" ? "Verified Tester" : "Validator — Professional"}', '{validator?.validator_type === "user" ? t("settings.userTester", null, "User — Consumer tester") : validator?.validator_type === "tester" ? t("settings.verifiedTester", null, "Verified Tester") : t("settings.validatorPro", null, "Validator — Professional")}'),
    ('{validator?.validator_type === "user" ? "User" : validator?.validator_type === "tester" ? "Tester" : "Validator"}', '{validator?.validator_type === "user" ? t("badge.user", null, "User") : validator?.validator_type === "tester" ? t("badge.tester", null, "Tester") : t("badge.validator", null, "Validator")}'),
    ('<div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Verification status</div>', '<div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{t("settings.verificationStatus", null, "Verification status")}</div>'),
    ('Under review — admin will respond within 72 hours', '{t("settings.underReview", null, "Under review — admin will respond within 72 hours")}'),
    ('Verified {validator?.tester_tier === "senior" ? "Senior" : "Junior"} Tester — premium missions unlocked', '{t("settings.verifiedTag", null, "Verified")} {validator?.tester_tier === "senior" ? t("settings.senior", null, "Senior") : t("settings.junior", null, "Junior")} {t("settings.testerUnlocked", null, "Tester — premium missions unlocked")}'),
    ('Application not approved — you can update your profile and reapply', '{t("settings.applicationNotApproved", null, "Application not approved — you can update your profile and reapply")}'),
    ('Reapply for Verified Tester</button>', '{t("settings.reapplyTester", null, "Reapply for Verified Tester")}</button>'),
    ('<div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>Upgrade your account</div>', '<div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>{t("settings.upgradeAccount", null, "Upgrade your account")}</div>'),
    ('Have professional expertise? Upgrade to Validator to access app testing and digital product missions.</p>', '{t("settings.upgradeDesc", null, "Have professional expertise? Upgrade to Validator to access app testing and digital product missions.")}</p>'),
    ('Upgrade to Validator →', '{t("settings.upgradeValidator", null, "Upgrade to Validator →")}'),
    ('<div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>Apply for Verified Tester</div>', '<div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>{t("settings.applyTester", null, "Apply for Verified Tester")}</div>'),
    ('Have QA or product testing experience? Apply for verified status to access premium high-pay missions.</p>', '{t("settings.applyTesterDesc", null, "Have QA or product testing experience? Apply for verified status to access premium high-pay missions.")}</p>'),
    ('Apply for Verified Tester →', '{t("settings.applyTesterBtn", null, "Apply for Verified Tester →")}'),
    ('<h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "var(--danger)" }}>Sign Out</h3>', '<h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "var(--danger)" }}>{t("settings.signOutTitle", null, "Sign Out")}</h3>'),
    ('You\'ll need to sign back in to access your missions and earnings.</p>', '{t("settings.signOutDesc", null, "You\'ll need to sign back in to access your missions and earnings.")}</p>'),
    ('Sign out\n        </button>', '{t("actions.signOut", null, "Sign out")}\n        </button>')
]

for old, new in replacements:
    code = code.replace(old, new)

with open('src/vpages/VSettings.jsx', 'w') as f:
    f.write(code)

print("VSettings modified successfully")
