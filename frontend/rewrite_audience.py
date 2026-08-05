import os

with open('src/pages/Audience.jsx', 'r') as f:
    code = f.read()

replacements = [
    ('import autoTable from "jspdf-autotable";', 'import autoTable from "jspdf-autotable";\nimport { useTranslation } from "../i18n/index.jsx";'),
    ('export default function AudienceExplorer() {', 'export default function AudienceExplorer() {\n  const { t } = useTranslation();'),
    ('<span className="eyebrow">Discovery</span>', '<span className="eyebrow">{t("audience.discovery", null, "Discovery")}</span>'),
    ('<h1>Audience Explorer</h1>', '<h1>{t("audience.title", null, "Audience Explorer")}</h1>'),
    ('<p className="lead">Search verified members and layer filters to find exactly who should validate your product.</p>', '<p className="lead">{t("audience.lead", null, "Search verified members and layer filters to find exactly who should validate your product.")}</p>'),
    ('Create Mission</Btn>', '{t("actions.createMission", null, "Create Mission")}</Btn>'),
    ('Showing the audience you picked when setting up your account.', '{t("audience.showingDefaults", null, "Showing the audience you picked when setting up your account.")}'),
    ('Reset to see everyone</button>', '{t("actions.resetEveryone", null, "Reset to see everyone")}</button>'),
    ('You are exploring a custom audience.', '{t("audience.customAudience", null, "You are exploring a custom audience.")}'),
    ('Restore profile defaults</button>', '{t("actions.restoreDefaults", null, "Restore profile defaults")}</button>'),
    ('label="Matching members"', 'label={t("audience.matchingMembers", null, "Matching members")}'),
    ('label="Verified"', 'label={t("audience.verified", null, "Verified")}'),
    ('label="Avg trust score"', 'label={t("audience.avgTrustScore", null, "Avg trust score")}'),
    ('label="Active this week"', 'label={t("audience.activeThisWeek", null, "Active this week")}'),
    ('<b style={{ fontSize: 15, fontWeight: 800 }}>Filters</b>', '<b style={{ fontSize: 15, fontWeight: 800 }}>{t("audience.filters", null, "Filters")}</b>'),
    ('Reset Filters</Btn>', '{t("actions.resetFilters", null, "Reset Filters")}</Btn>'),
    ('<span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text)" }}>Active Filters</span>', '<span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text)" }}>{t("audience.activeFilters", null, "Active Filters")}</span>'),
    ('Clear all\n                </button>', '{t("actions.clearAll", null, "Clear all")}\n                </button>'),
    ('placeholder="Search by name, role, city…"', 'placeholder={t("audience.searchPlaceholder", null, "Search by name, role, city…")}'),
    ('{results.length} results</span>', '{results.length} {t("audience.results", null, "results")}</span>'),
    ('Sort by: Match', '{t("audience.sortByMatch", null, "Sort by: Match")}'),
    ('Export PDF</Btn>', '{t("actions.exportPdf", null, "Export PDF")}</Btn>'),
    ('title="No members match these filters"', 'title={t("audience.noMembersMatch", null, "No members match these filters")}'),
    ('Reset filters</Btn>', '{t("actions.resetFilters", null, "Reset filters")}</Btn>'),
    ('Try widening your geography or removing an interest to grow the pool.</Empty>', '{t("audience.tryWidening", null, "Try widening your geography or removing an interest to grow the pool.")}</Empty>'),
    ('Verified</span>', '{t("badge.verifiedBuilder", null, "Verified")}</span>'),
    ('Profile {m.profileCompletion}% complete</div>', '{t("audience.profileComplete", { pct: m.profileCompletion }, `Profile ${m.profileCompletion}% complete`)}</div>'),
    ('Establishing Trust', '{t("audience.establishingTrust", null, "Establishing Trust")}'),
    ('Trust {m.trust}', '{t("audience.trust", null, "Trust")} {m.trust}'),
    ('Trust 90+', '{t("audience.trust", null, "Trust")} 90+'),
    ('Invite</Btn>', '{t("actions.invite", null, "Invite")}</Btn>'),
    ('Load more members ({results.length - visibleCount} remaining)</Btn>', '{t("actions.loadMoreMembers", null, "Load more members")} ({results.length - visibleCount} {t("audience.remaining", null, "remaining")})</Btn>'),
    ('title="Restore your default audience?"', 'title={t("audience.restoreTitle", null, "Restore your default audience?")}'),
    ('This will overwrite your current filters and instantly load the audience you specified during your profile setup. Do you want to continue?', '{t("audience.restoreDesc", null, "This will overwrite your current filters and instantly load the audience you specified during your profile setup. Do you want to continue?")}'),
    ('Cancel</Btn>', '{t("actions.cancel", null, "Cancel")}</Btn>'),
    ('Yes, restore defaults</Btn>', '{t("actions.yesRestoreDefaults", null, "Yes, restore defaults")}</Btn>')
]

for old, new in replacements:
    code = code.replace(old, new)

with open('src/pages/Audience.jsx', 'w') as f:
    f.write(code)

print("Audience modified successfully")
