const fs = require('fs');

function rewriteAppLayout() {
  let code = fs.readFileSync('src/components/AppLayout.jsx', 'utf8');

  code = code.replace(
    'import LanguageSwitcher from "./LanguageSwitcher";',
    'import LanguageSwitcher from "./LanguageSwitcher";\nimport { useTranslation } from "../i18n/index.jsx";'
  );

  code = code.replace(
    'function Sidebar({ closeMobile, builder }) {',
    'function Sidebar({ closeMobile, builder }) {\n  const { t } = useTranslation();'
  );

  code = code.replace(
    '<div key={g.label} className="nav-group-label">{g.label}</div>',
    '<div key={g.label} className="nav-group-label">{t("nav." + g.label.toLowerCase(), null, g.label)}</div>'
  );

  code = code.replace(
    '<Icon name={it.icon} />{it.label}',
    '<Icon name={it.icon} />{t("nav." + it.label.toLowerCase(), null, it.label)}'
  );

  code = code.replace(
    'Create Mission',
    '{t("builder.createMission", null, "Create Mission")}'
  );

  code = code.replace(
    '<span style={{ fontWeight: 700, fontSize: 13 }}>Wallet</span>',
    '<span style={{ fontWeight: 700, fontSize: 13 }}>{t("nav.wallet", null, "Wallet")}</span>'
  );

  code = code.replace(
    'export default function AppLayout() {',
    'export default function AppLayout() {\n  const { t } = useTranslation();'
  );

  code = code.replace(
    '<h1>{pageTitle(location.pathname)}</h1>',
    '<h1>{t("nav." + pageTitle(location.pathname).toLowerCase(), null, pageTitle(location.pathname))}</h1>'
  );

  code = code.replace(
    'placeholder="Search missions…"',
    'placeholder={t("actions.search", null, "Search missions…")}'
  );

  code = code.replace(
    '<Icon name="settings" size={15} /> Settings',
    '<Icon name="settings" size={15} /> {t("nav.settings", null, "Settings")}'
  );

  code = code.replace(
    '<Icon name="logout" size={15} /> Sign out',
    '<Icon name="logout" size={15} /> {t("nav.logout", null, "Sign out")}'
  );

  fs.writeFileSync('src/components/AppLayout.jsx', code);
}

function rewriteVLayout() {
  let code = fs.readFileSync('src/vcomponents/VLayout.jsx', 'utf8');

  code = code.replace(
    'import { vapi } from "../vapi/client";',
    'import { vapi } from "../vapi/client";\nimport { useTranslation } from "../i18n/index.jsx";'
  );

  code = code.replace(
    'export default function VLayout() {',
    'export default function VLayout() {\n  const { t } = useTranslation();'
  );

  code = code.replace(
    '<Icon name={it.icon} />{it.label}',
    '<Icon name={it.icon} />{t("nav." + it.label.toLowerCase().replace(/ /g, ""), null, it.label)}'
  );

  code = code.replace(
    '<Icon name="life" />Help &amp; support',
    '<Icon name="life" />{t("nav.support", null, "Help & support")}'
  );

  code = code.replace(
    '<h1>{pageTitle(location.pathname)}</h1>',
    '<h1>{t("nav." + pageTitle(location.pathname).toLowerCase().replace(/ /g, ""), null, pageTitle(location.pathname))}</h1>'
  );

  fs.writeFileSync('src/vcomponents/VLayout.jsx', code);
}

function rewriteALayout() {
  let code = fs.readFileSync('src/acomponents/ALayout.jsx', 'utf8');

  code = code.replace(
    'import NotificationsSidebar from "../components/NotificationsSidebar";',
    'import NotificationsSidebar from "../components/NotificationsSidebar";\nimport { useTranslation } from "../i18n/index.jsx";'
  );

  code = code.replace(
    'export default function ALayout() {',
    'export default function ALayout() {\n  const { t } = useTranslation();'
  );

  code = code.replace(
    '<Icon name={it.icon} />{it.label}',
    '<Icon name={it.icon} />{t("admin." + it.label.toLowerCase().replace(/ /g, ""), null, it.label)}'
  );

  code = code.replace(
    '<h1>{TITLES[location.pathname] || "Admin"}</h1>',
    '<h1>{t("admin." + (TITLES[location.pathname] || "Admin").toLowerCase().replace(/ /g, ""), null, TITLES[location.pathname] || "Admin")}</h1>'
  );

  code = code.replace(
    '<div className="brand-sub">Admin console</div>',
    '<div className="brand-sub">{t("admin.signIn", null, "Admin console")}</div>'
  );

  fs.writeFileSync('src/acomponents/ALayout.jsx', code);
}

rewriteAppLayout();
rewriteVLayout();
rewriteALayout();
console.log("Layouts modified successfully");
