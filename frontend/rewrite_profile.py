import os

with open('src/vpages/Profile.jsx', 'r') as f:
    code = f.read()

replacements = [
    ('import { vapi } from "../vapi/client";', 'import { vapi } from "../vapi/client";\nimport { useTranslation } from "../i18n/index.jsx";'),
    ('export default function Profile() {', 'export default function Profile() {\n  const { t } = useTranslation();'),
    ('<div className="muted">Loading…</div>', '<div className="muted">{t("actions.loading", null, "Loading…")}</div>'),
    ('Couldn\'t load profile. Please refresh.', '{t("profile.loadError", null, "Couldn\'t load profile. Please refresh.")}'),
    ('Couldn\'t save changes', 't("profile.saveError", null, "Couldn\'t save changes")'),
    ('Edit profile</button>', '{t("actions.editProfile", null, "Edit profile")}</button>'),
    ('<label>Name</label>', '<label>{t("profile.name", null, "Name")}</label>'),
    ('<label>Handle</label>', '<label>{t("profile.handle", null, "Handle")}</label>'),
    ('placeholder="yourhandle"', 'placeholder={t("profile.yourhandle", null, "yourhandle")}'),
    ('<label>Occupation</label>', '<label>{t("profile.occupation", null, "Occupation")}</label>'),
    ('<label>Industry</label>', '<label>{t("profile.industry", null, "Industry")}</label>'),
    ('<label>Location (City)</label>', '<label>{t("profile.location", null, "Location (City)")}</label>'),
    ('placeholder="e.g. Software Engineer"', 'placeholder={t("profile.egSoftwareEngineer", null, "e.g. Software Engineer")}'),
    ('placeholder="e.g. Technology"', 'placeholder={t("profile.egTechnology", null, "e.g. Technology")}'),
    ('placeholder="e.g. Bengaluru"', 'placeholder={t("profile.egBengaluru", null, "e.g. Bengaluru")}'),
    ('<label>Shipping address <span className="opt">optional — needed only for Sample Distribution missions</span></label>', '<label>{t("profile.shippingAddress", null, "Shipping address")} <span className="opt">{t("profile.optionalShipping", null, "optional — needed only for Sample Distribution missions")}</span></label>'),
    ('placeholder="Address line 1"', 'placeholder={t("profile.address1", null, "Address line 1")}'),
    ('placeholder="Address line 2 (optional)"', 'placeholder={t("profile.address2", null, "Address line 2 (optional)")}'),
    ('placeholder="City"', 'placeholder={t("profile.city", null, "City")}'),
    ('placeholder="State"', 'placeholder={t("profile.state", null, "State")}'),
    ('placeholder="Postal code"', 'placeholder={t("profile.postalCode", null, "Postal code")}'),
    ('placeholder="Country"', 'placeholder={t("profile.country", null, "Country")}'),
    ('<label>Bio</label>', '<label>{t("profile.bio", null, "Bio")}</label>'),
    ('placeholder="A short bio about yourself..."', 'placeholder={t("profile.bioPlaceholder", null, "A short bio about yourself...")}'),
    ('<label>Specialties (up to 6)</label>', '<label>{t("profile.specialtiesLimit", null, "Specialties (up to 6)")}</label>'),
    ('placeholder="Add a specialty and press Enter"', 'placeholder={t("profile.addSpecialty", null, "Add a specialty and press Enter")}'),
    ('Add</button>', '{t("actions.add", null, "Add")}</button>'),
    ('{busy ? "Saving…" : "Save changes"}', '{busy ? t("actions.saving", null, "Saving…") : t("actions.saveChanges", null, "Save changes")}'),
    ('Cancel</button>', '{t("actions.cancel", null, "Cancel")}</button>'),
    ('<span className="eyebrow">Trust Score</span>', '<span className="eyebrow">{t("profile.trustScore", null, "Trust Score")}</span>'),
    ('Top 5% on platform</div>', '{t("profile.top5", null, "Top 5% on platform")}</div>'),
    ('<span className="eyebrow">Expertise</span>', '<span className="eyebrow">{t("profile.expertise", null, "Expertise")}</span>'),
    ('Across {(data.expertise || []).length} niches</div>', '{t("profile.across", null, "Across")} {(data.expertise || []).length} {t("profile.niches", null, "niches")}</div>'),
    ('label="Completion rate"', 'label={t("profile.completionRate", null, "Completion rate")}'),
    ('sub="Started → submitted"', 'sub={t("profile.startedSubmitted", null, "Started → submitted")}'),
    ('label="Missions completed"', 'label={t("profile.missionsCompleted", null, "Missions completed")}'),
    ('sub={`₹${(data.lifetime || 0).toLocaleString("en-IN")} lifetime`}', 'sub={`₹${(data.lifetime || 0).toLocaleString("en-IN")} ${t("profile.lifetime", null, "lifetime")}`}' ),
    ('Reputation ladder</h3>', '{t("profile.reputationLadder", null, "Reputation ladder")}</h3>'),
    (' validations to ', ' {t("profile.validationsTo", null, "validations to")} '),
    ('You</span>', '{t("profile.you", null, "You")}</span>'),
    ('Expertise scores</h3>', '{t("profile.expertiseScores", null, "Expertise scores")}</h3>'),
    ('Verification badges</h3>', '{t("profile.verificationBadges", null, "Verification badges")}</h3>')
]

for old, new in replacements:
    code = code.replace(old, new)

with open('src/vpages/Profile.jsx', 'w') as f:
    f.write(code)

print("Profile modified successfully")
