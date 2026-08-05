import os

with open('src/pages/Settings.jsx', 'r') as f:
    code = f.read()

replacements = [
    ('import PhoneSetup from "../components/PhoneSetup";', 'import PhoneSetup from "../components/PhoneSetup";\nimport { useTranslation } from "../i18n/index.jsx";'),
    ('export default function Settings() {', 'export default function Settings() {\n  const { t } = useTranslation();'),
    ('New passwords do not match.', '{t("settings.errPwdMatch", null, "New passwords do not match.")}'),
    ('New password must be at least 8 characters.', '{t("settings.errPwdLength", null, "New password must be at least 8 characters.")}'),
    ('Password updated successfully.', '{t("settings.pwdSuccess", null, "Password updated successfully.")}'),
    ('Failed to change password.', '{t("settings.errPwdChange", null, "Failed to change password.")}'),
    ('Couldn\'t save changes', '{t("settings.errSave", null, "Couldn\'t save changes")}'),
    ('<span className="eyebrow">Account</span>', '<span className="eyebrow">{t("settings.account", null, "Account")}</span>'),
    ('<h1>Settings</h1>', '<h1>{t("settings.title", null, "Settings")}</h1>'),
    ('<p className="lead">Manage your workspace, sign-in and security options.</p>', '<p className="lead">{t("settings.leadBuilder", null, "Manage your workspace, sign-in and security options.")}</p>'),
    ('Edit profile</Btn>', '{t("actions.editProfile", null, "Edit profile")}</Btn>'),
    ('<label>Your name</label>', '<label>{t("settings.yourName", null, "Your name")}</label>'),
    ('<label>Designation</label>', '<label>{t("settings.designation", null, "Designation")}</label>'),
    ('placeholder="e.g. Founder, Product Manager"', 'placeholder={t("settings.designationPlaceholder", null, "e.g. Founder, Product Manager")}'),
    ('<label>Workspace name</label>', '<label>{t("settings.workspaceName", null, "Workspace name")}</label>'),
    ('<label>Company Website</label>', '<label>{t("settings.companyWebsite", null, "Company Website")}</label>'),
    ('<label>Email</label>', '<label>{t("settings.email", null, "Email")}</label>'),
    ('{busy ? "Saving…" : "Save changes"}', '{busy ? t("actions.saving", null, "Saving…") : t("actions.saveChanges", null, "Save changes")}'),
    ('Cancel</Btn>', '{t("actions.cancel", null, "Cancel")}</Btn>'),
    ('<h2 style={{ fontSize: 18, marginBottom: 8 }}>Security</h2>', '<h2 style={{ fontSize: 18, marginBottom: 8 }}>{t("settings.security", null, "Security")}</h2>'),
    ('<p className="faint mb-5">Change your password to keep your account secure.</p>', '<p className="faint mb-5">{t("settings.securityDesc", null, "Change your password to keep your account secure.")}</p>'),
    ('<label>Current Password</label>', '<label>{t("settings.currentPwd", null, "Current Password")}</label>'),
    ('<label>New Password</label>', '<label>{t("settings.newPwd", null, "New Password")}</label>'),
    ('<label>Confirm New Password</label>', '<label>{t("settings.confirmNewPwd", null, "Confirm New Password")}</label>'),
    ('{pwdBusy ? "Saving…" : "Update password"}', '{pwdBusy ? t("actions.saving", null, "Saving…") : t("actions.updatePassword", null, "Update password")}')
]

for old, new in replacements:
    code = code.replace(old, new)

with open('src/pages/Settings.jsx', 'w') as f:
    f.write(code)

print("Settings modified successfully")
