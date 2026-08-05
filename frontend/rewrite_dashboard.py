import os

with open('src/pages/Dashboard.jsx', 'r') as f:
    code = f.read()

replacements = [
    ('import { PERSONA_CONFIG } from "../data/personaConfig";', 'import { PERSONA_CONFIG } from "../data/personaConfig";\nimport { useTranslation } from "../i18n/index.jsx";'),
    ('function ProfileCompletionBanner({ builder, nav }) {', 'function ProfileCompletionBanner({ builder, nav }) {\n  const { t } = useTranslation();'),
    ('function QuickActions({ nav, balance }) {', 'function QuickActions({ nav, balance }) {\n  const { t } = useTranslation();'),
    ('function ActivityFeed({ rows }) {', 'function ActivityFeed({ rows }) {\n  const { t } = useTranslation();'),
    ('export default function Dashboard() {', 'export default function Dashboard() {\n  const { t } = useTranslation();'),
    ('<h3 style={{ fontSize: 20, marginBottom: 8, color: "var(--heading)", fontWeight: 600 }}>Select your role and complete setup</h3>', '<h3 style={{ fontSize: 20, marginBottom: 8, color: "var(--heading)", fontWeight: 600 }}>{t("dashboard.selectRole", null, "Select your role and complete setup")}</h3>'),
    ('Choose the role that best describes you to personalize your workspace and begin the setup process.', '{t("dashboard.selectRoleDesc", null, "Choose the role that best describes you to personalize your workspace and begin the setup process.")}'),
    ('No role selected', '{t("dashboard.noRoleSelected", null, "No role selected")}'),
    ('Setup not started', '{t("dashboard.setupNotStarted", null, "Setup not started")}'),
    ('<h4 style={{ fontSize: 13, fontWeight: 600, color: "var(--heading)", marginBottom: 16 }}>Choose your role</h4>', '<h4 style={{ fontSize: 13, fontWeight: 600, color: "var(--heading)", marginBottom: 16 }}>{t("dashboard.chooseRole", null, "Choose your role")}</h4>'),
    ('Select Role', '{t("actions.selectRole", null, "Select Role")}'),
    (' of {totalSteps} completed', ' {t("dashboard.of", null, "of")} {totalSteps} {t("dashboard.completed", null, "completed")}'),
    ('View all steps &rarr;', '{t("actions.viewAllSteps", null, "View all steps &rarr;")}'),
    ('Complete your {title} profile', '{t("dashboard.completeProfile", null, "Complete your")} {title} {t("dashboard.profile", null, "profile")}'),
    ('Step {currentStepNum} of {totalSteps}', '{t("dashboard.step", null, "Step")} {currentStepNum} {t("dashboard.of", null, "of")} {totalSteps}'),
    ('Next step', '{t("dashboard.nextStep", null, "Next step")}'),
    ('Continue filling out your {nextStep?.label?.toLowerCase() || "details"}.', '{t("dashboard.continueFilling", null, "Continue filling out your")} {nextStep?.label?.toLowerCase() || t("dashboard.details", null, "details")}.'),
    ('Continue Setup &rarr;', '{t("actions.continueSetup", null, "Continue Setup &rarr;")}'),
    ('Change role</Btn>', '{t("actions.changeRole", null, "Change role")}</Btn>'),
    ('Launch a new study', 't("dashboard.qaLaunchNew", null, "Launch a new study")'),
    ('Find the right members', 't("dashboard.qaFindMembers", null, "Find the right members")'),
    ('Analytics & exports', 't("dashboard.qaAnalytics", null, "Analytics & exports")'),
    ('available', 't("dashboard.available", null, "available")'),
    ('No recent activity yet.', '{t("dashboard.noActivity", null, "No recent activity yet.")}'),
    ('Couldn\'t load dashboard data.', '{t("dashboard.loadError", null, "Couldn\'t load dashboard data.")}'),
    ('Retry</button>', '{t("actions.retry", null, "Retry")}</button>'),
    ('<div className="muted">Loading…</div>', '<div className="muted">{t("actions.loading", null, "Loading…")}</div>'),
    ('Your account has been rejected', '{t("dashboard.accountRejected", null, "Your account has been rejected")}'),
    ('Reason: ', '{t("dashboard.reason", null, "Reason: ")}'),
    ('The website provided could not be verified. Please ensure the link is correct.', '{t("dashboard.verificationFailed", null, "The website provided could not be verified. Please ensure the link is correct.")}'),
    ('You can edit your details and apply for re-verification.', '{t("dashboard.reapplyDesc", null, "You can edit your details and apply for re-verification.")}'),
    ('{isApplying ? "Applying..." : "Apply for Re-verification"}', '{isApplying ? t("actions.applying", null, "Applying...") : t("actions.applyReverification", null, "Apply for Re-verification")}'),
    ('Your account is unverified', '{t("dashboard.accountUnverified", null, "Your account is unverified")}'),
    ('You can run up to 3 active missions with a maximum of 25 participants each.', '{t("dashboard.unverifiedDesc1", null, "You can run up to 3 active missions with a maximum of 25 participants each.")}'),
    ('To unlock unlimited campaigns, verify your website through your profile settings — an admin will review it within 24 hours.', '{t("dashboard.unverifiedDesc2", null, "To unlock unlimited campaigns, verify your website through your profile settings — an admin will review it within 24 hours.")}'),
    ('View Profile</button>', '{t("actions.viewProfile", null, "View Profile")}</button>'),
    ('<span className="eyebrow">Builder workspace</span>', '<span className="eyebrow">{t("dashboard.builderWorkspace", null, "Builder workspace")}</span>'),
    ('<h1>Welcome back, {firstName}</h1>', '<h1>{t("dashboard.welcomeBack", null, "Welcome back,")} {firstName}</h1>'),
    ('<p className="lead">Here\'s how {builder?.org}\'s validation missions are tracking today.</p>', '<p className="lead">{t("dashboard.howMissionsTracking", { org: builder?.org }, `Here\'s how ${builder?.org || ""}\'s validation missions are tracking today.`)}</p>'),
    ('Browse audience</Btn>', '{t("actions.browseAudience", null, "Browse audience")}</Btn>'),
    ('Create Mission</Btn>', '{t("actions.createMission", null, "Create Mission")}</Btn>'),
    ('label="Active Missions"', 'label={t("dashboard.activeMissions", null, "Active Missions")}'),
    ('label="Completed Missions"', 'label={t("dashboard.completedMissions", null, "Completed Missions")}'),
    ('label="Total Participants"', 'label={t("dashboard.totalParticipants", null, "Total Participants")}'),
    ('label="Pending Participants"', 'label={t("dashboard.pendingParticipants", null, "Pending Participants")}'),
    ('label="Total Spend"', 'label={t("dashboard.totalSpend", null, "Total Spend")}'),
    ('label="Avg Completion Rate"', 'label={t("dashboard.avgCompletionRate", null, "Avg Completion Rate")}'),
    ('label="Wallet Balance"', 'label={t("dashboard.walletBalance", null, "Wallet Balance")}'),
    ('<h2 className="h-lg">Quick actions</h2>', '<h2 className="h-lg">{t("dashboard.quickActions", null, "Quick actions")}</h2>'),
    ('<h3 className="h-md">Recent missions</h3>', '<h3 className="h-md">{t("dashboard.recentMissions", null, "Recent missions")}</h3>'),
    ('{showAllMissions ? "Close" : "View all missions"}', '{showAllMissions ? t("actions.close", null, "Close") : t("actions.viewAllMissions", null, "View all missions")}'),
    ('<h3 className="h-md">Activity feed</h3>', '<h3 className="h-md">{t("dashboard.activityFeed", null, "Activity feed")}</h3>'),
    ('{showAllActivity ? "Close" : "View all"}', '{showAllActivity ? t("actions.close", null, "Close") : t("actions.viewAll", null, "View all")}')
]

# QuickActions map specifically
qa_replacement = '''  const items = [
    { ic: "plus", t: t("actions.createMission", null, "Create Mission"), s: t("dashboard.qaLaunchNew", null, "Launch a new study"), go: () => nav("/missions/new") },
    { ic: "compass", t: t("actions.browseAudience", null, "Browse Audience"), s: t("dashboard.qaFindMembers", null, "Find the right members"), go: () => nav("/audience") },
    { ic: "chart", t: t("actions.viewReports", null, "View Reports"), s: t("dashboard.qaAnalytics", null, "Analytics & exports"), go: () => nav("/analytics") },
    { ic: "wallet", t: t("actions.manageWallet", null, "Manage Wallet"), s: `${inr(balance)} ${t("dashboard.available", null, "available")}`, go: () => nav("/wallet") },
  ];'''

code = code.replace('''  const items = [
    { ic: "plus", t: "Create Mission", s: "Launch a new study", go: () => nav("/missions/new") },
    { ic: "compass", t: "Browse Audience", s: "Find the right members", go: () => nav("/audience") },
    { ic: "chart", t: "View Reports", s: "Analytics & exports", go: () => nav("/analytics") },
    { ic: "wallet", t: "Manage Wallet", s: `${inr(balance)} available`, go: () => nav("/wallet") },
  ];''', qa_replacement)


# Persona maps specifically
persona_replacement = '''            {[
              { icon: "rocket", name: t("role.founder", null, "Founder / Startup"), desc: t("role.founderDesc", null, "Validate your startup ideas, get feedback and grow faster."), color: "#4f46e5" },
              { icon: "building", name: t("role.company", null, "Company"), desc: t("role.companyDesc", null, "Test products, understand users and make data-driven decisions."), color: "#0891b2" },
              { icon: "flask", name: t("role.researcher", null, "Researcher"), desc: t("role.researchDesc", null, "Conduct research, collect insights and contribute to knowledge."), color: "#0d9488" },
              { icon: "users", name: t("role.organization", null, "Organization"), desc: t("role.orgDesc", null, "Drive programs, measure impact and engage your community."), color: "#c2710c" }
            ].map(r => ('''

code = code.replace('''            {[
              { icon: "rocket", name: "Founder / Startup", desc: "Validate your startup ideas, get feedback and grow faster.", color: "#4f46e5" },
              { icon: "building", name: "Company", desc: "Test products, understand users and make data-driven decisions.", color: "#0891b2" },
              { icon: "flask", name: "Researcher", desc: "Conduct research, collect insights and contribute to knowledge.", color: "#0d9488" },
              { icon: "users", name: "Organization", desc: "Drive programs, measure impact and engage your community.", color: "#c2710c" }
            ].map(r => (''', persona_replacement)


for old, new in replacements:
    code = code.replace(old, new)

with open('src/pages/Dashboard.jsx', 'w') as f:
    f.write(code)

print("Dashboard modified successfully")
