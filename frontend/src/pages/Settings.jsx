import { useState, useLayoutEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { Avatar, Btn, PasswordInput } from "../components/ui";
import Icon from "../components/Icon";
import PhoneSetup from "../components/PhoneSetup";
import { useTranslation } from "../i18n/index.jsx";
import { PERSONA_CONFIG, resolveCardStep, resolveActivePersonaKey, CARD_SUMMARY, VERIFICATION_SUMMARY, VALIDATE_SUMMARY } from "../data/personaConfig";

// Bare label + chips, no box of its own -- an earlier version wrapped each
// field in its own bordered/shaded tile, which read as a card nested inside
// the card it already sits in. Reference the tester sent (a plain field
// list, values as chips, straight on the card's own background) has no
// nesting at all, so this doesn't either; the caller lays fields out in a
// 2-column grid instead. Chips are blue (.mtag.accent) to match the
// Audience Explorer's own applied-filter chip look.
//
// `dropdown` collapses a long list (Occupation, Country -- picking
// "Worldwide" at onboarding saves every country) behind a "Show all"
// toggle instead of dumping dozens of chips straight into the card. A
// fixed item-count cutoff doesn't work consistently across categories --
// Country's short names fit 10 per row (landing "Show all" on row 1),
// Occupation's longer ones fit fewer (landing it on row 2) -- so this
// measures actual rendered layout instead: however many chips fit within
// the first 2 wrapped rows, minus one slot reserved for the button itself.
function ChipField({ label, values, required, span, dropdown, hideLabel }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const rowRef = useRef(null);
  const [visibleCount, setVisibleCount] = useState(null);
  // A primitive fingerprint, not the array itself -- several callers pass a
  // freshly-mapped/filtered array literal every render, so depending on
  // `values` by reference would re-run this effect (and its setState) every
  // single render, looping forever.
  const valuesKey = (values || []).join("|");

  useLayoutEffect(() => {
    if (!dropdown || open || !rowRef.current) { setVisibleCount(null); return; }
    const chips = Array.from(rowRef.current.children);
    if (chips.length < 2) return;
    const tops = [...new Set(chips.map(c => c.offsetTop))];
    if (tops.length <= 2) { setVisibleCount(null); return; } // already fits within 2 rows as-is
    const thirdRowTop = tops[2];
    const fitCount = chips.filter(c => c.offsetTop < thirdRowTop).length;
    setVisibleCount(Math.max(1, fitCount - 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valuesKey, dropdown, open]);

  const collapsible = dropdown && visibleCount != null;
  const shown = collapsible && !open ? values.slice(0, visibleCount) : values;
  return (
    <div style={span ? { gridColumn: "1 / -1" } : undefined}>
      {/* hideLabel: a card whose own <h2> already says exactly this (a
          single-field card like "Validate") skips the redundant repeat. */}
      {!hideLabel && <label className="faint" style={{ fontSize: 12.5, textTransform: "uppercase", letterSpacing: ".02em" }}>{label}{required && <span style={{ color: "var(--danger)" }}> *</span>}</label>}
      {values?.length ? (
        <div ref={rowRef} className="row gap-2 wrap" style={{ marginTop: 7, alignItems: "center" }}>
          {shown.map(v => <span key={v} className="mtag accent">{v}</span>)}
          {collapsible && (
            <button type="button" className="backlink row gap-1" style={{ fontSize: 12, alignItems: "center" }} onClick={() => setOpen(o => !o)}>
              {open ? t("actions.showLess", null, "Show less") : t("actions.showAllCount", { count: values.length }, `Show all (${values.length})`)}
              <Icon name={open ? "chevronUp" : "chevronDown"} size={12} />
            </button>
          )}
        </div>
      ) : (
        <div className="faint" style={{ marginTop: 7, fontSize: 13 }}>{t("settings.notSet", null, "Not set")}</div>
      )}
    </div>
  );
}

export default function Settings() {
  const { t } = useTranslation();
  const { builder, setBuilder } = useAuth();
  const navigate = useNavigate();
  // Company/Audience edits redirect into the real onboarding step component
  // at /settings/edit-step/:step (see EditAccountStep.jsx, which also shows
  // the full step rail from there) instead of a second, separately-maintained
  // inline copy of the same form -- one step component, used by onboarding
  // AND every later edit, can't drift apart. Falls back to the in-progress
  // draft's persona when onboarding was never finished (builder.persona is
  // only set by the final completion step) -- same resolution the
  // Dashboard's profile-completion banner already uses.
  const activePersonaKey = resolveActivePersonaKey(builder);
  const activePersona = PERSONA_CONFIG[activePersonaKey];
  const companyStepKey = resolveCardStep(activePersona, "company");
  const audienceStepKey = resolveCardStep(activePersona, "audience");
  const validateStepKey = resolveCardStep(activePersona, "validate");
  const companySummary = CARD_SUMMARY[companyStepKey];
  const verificationFields = VERIFICATION_SUMMARY[activePersonaKey];
  // "verify" for every persona except Researcher, who calls this step
  // "ethics" -- Verification is a normal editable step now (tester asked
  // builders be able to re-edit it, not just view it), so this card gets
  // the same Edit-button-into-the-real-step pattern every other card uses.
  const verifyStepKey = activePersona?.components?.verify ? "verify" : (activePersona?.components?.ethics ? "ethics" : null);
  const validateSummary = VALIDATE_SUMMARY[validateStepKey];

  const [changingPassword, setChangingPassword] = useState(false);
  const [pwdCurrent, setPwdCurrent] = useState("");
  const [pwdNew, setPwdNew] = useState("");
  const [pwdConfirm, setPwdConfirm] = useState("");
  const [pwdBusy, setPwdBusy] = useState(false);
  const [pwdError, setPwdError] = useState("");
  const [pwdSuccess, setPwdSuccess] = useState("");
  const [forgotBusy, setForgotBusy] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  const cancelPasswordChange = () => {
    setChangingPassword(false);
    setPwdCurrent(""); setPwdNew(""); setPwdConfirm("");
    setPwdError(""); setForgotSent(false);
  };

  const sendForgotLink = async () => {
    setForgotBusy(true);
    try { await api.forgotPassword(builder.email); } finally { setForgotBusy(false); setForgotSent(true); }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setPwdError(""); setPwdSuccess("");
    if (pwdNew !== pwdConfirm) {
      return setPwdError(t("settings.errPwdMatch", null, "New passwords do not match."));
    }
    if (pwdNew.length < 8) {
      return setPwdError(t("settings.errPwdLength", null, "New password must be at least 8 characters."));
    }
    setPwdBusy(true);
    try {
      await api.changePassword(pwdCurrent, pwdNew);
      setPwdSuccess(t("settings.pwdSuccess", null, "Password updated successfully."));
      setPwdCurrent(""); setPwdNew(""); setPwdConfirm("");
    } catch (err) {
      setPwdError(err.message || t("settings.errPwdChange", null, "Failed to change password."));
    } finally {
      setPwdBusy(false);
    }
  };

  return (
    <div className="page rise">
      <div className="ph">
        <div><h1>{t("settings.title", null, "Account Settings")}</h1><p className="lead">{t("settings.leadBuilder", null, "Manage your workspace, sign-in and security options.")}</p></div>
      </div>

      {/* Same signal and resume logic as the Dashboard's own banner and
          CreateMissionWizard's -- onboardingCompleted is the one dedicated
          "setup actually finished" flag; a partial profile_json from a
          Settings edit alone never sets it. The cards below already show
          real saved values (or "Not set"), so this doesn't block editing —
          it just flags that setup itself is still open. */}
      {!builder?.onboardingCompleted && (
        <div className="card" style={{ maxWidth: 980, marginBottom: 20, borderRadius: "var(--radius)", border: "1px solid var(--danger)", display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", background: "color-mix(in srgb, var(--danger) 8%, var(--panel))", boxShadow: "var(--shadow-sm)" }}>
          <Icon name="user" size={16} style={{ color: "var(--danger)", flexShrink: 0 }} />
          <p style={{ margin: 0, flex: 1, fontSize: 13, color: "var(--text)" }}>
            {t("settings.onboardingWarning", null, "You haven't finished setting up your profile yet. Some details below may be incomplete until you do.")}
          </p>
          <Btn variant="primary" size="sm" onClick={() => navigate(activePersonaKey ? `/signup?role=${activePersonaKey}` : "/get-started/feedback")} style={{ flexShrink: 0, minWidth: 150 }}>{t("actions.completeProfile", null, "Complete Profile")}</Btn>
        </div>
      )}

      {/* 980 gives the detail cards below room to sit two-up (grid,
          minmax 340px) instead of each wasting the full row on a handful
          of chips -- identity (profile/phone) stays a single full-width
          row above since it's one wide horizontal card, not a chip list. */}
      <div className="col gap-5" style={{ maxWidth: 980 }}>
        {/* Profile identity + mobile number merged into one card -- both
            come from the same "Your details" onboarding step, and showing
            them as two separate cards read as an arbitrary split. */}
        <div className="card" style={{ padding: "var(--pad-card)" }}>
          <div className="row between" style={{ alignItems: "center" }}>
            <div className="row gap-4" style={{ alignItems: "center" }}>
              <Avatar name={builder?.name || ""} size={52} color={builder?.color} />
              <div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>{builder?.name}</div>
                {/* Designation, email·org, and website used to each sit on
                    their own line -- combined into one pipe-separated row,
                    same joined-segments pattern used for the validator
                    drawer's header line. */}
                <div className="faint row gap-1" style={{ fontSize: 12.5, flexWrap: "wrap", alignItems: "center", marginTop: 2 }}>
                  {[
                    builder?.designation && <span key="desig">{builder.designation}</span>,
                    (builder?.email || builder?.org) && <span key="eo" style={{ fontSize: 13 }}>{[builder?.email, builder?.org].filter(Boolean).join(" · ")}</span>,
                    builder?.website && (
                      <a key="web" href={builder.website} target="_blank" rel="noopener noreferrer" className="row gap-1" style={{ alignItems: "center", color: "var(--accent)" }}>
                        <Icon name="globe" size={12} />{builder.website.replace(/^https?:\/\//, "")}
                      </a>
                    ),
                  ].filter(Boolean).map((part, i) => (
                    <span key={i} className="row gap-1" style={{ alignItems: "center" }}>
                      {i > 0 && <span style={{ color: "var(--text-faint)" }}>|</span>}
                      {part}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            {/* Edits "Your details" through the same onboarding step
                component the wizard itself uses (EditAccountStep.jsx) --
                previously a second, separately-maintained inline form here,
                which the tester flagged since it edited the same fields
                differently from every other step in Settings. */}
            <Btn variant="ghost" icon="edit" onClick={() => navigate("/settings/edit-step/personal")}>{t("actions.editProfile", null, "Edit profile")}</Btn>
          </div>

          <div style={{ borderTop: "1px solid var(--border)", margin: "16px 0" }} />

          <PhoneSetup bare client={api} phone={builder?.phone} phoneVerified={builder?.phoneVerified}
            prefillPhone={builder?.profile?.mobile}
            onUpdate={(phone) => setBuilder(b => ({ ...b, phone, phoneVerified: !!phone }))}
            onClearPrefill={async () => {
              // Actually clears it server-side — without this, prefillPhone
              // (still sitting in profile.mobile in the DB) just comes right
              // back on the next reload or tab switch, no matter what local
              // state says.
              const res = await api.updateProfile({ profile: { mobile: null } });
              setBuilder(res.builder);
            }} />
        </div>

        {/* Detail cards side by side instead of each stacking full-width for
            a handful of chips -- auto-fit/minmax lets 2 (sometimes 3) share
            a row on wide screens and drop to one column on narrow ones.
            Fields inside each card sit in their own 2-column grid (no boxed
            tile per field -- see ChipField) so short fields like Age/Gender
            share a row instead of each claiming a full line. alignItems:
            start stops a grid row's height from being dictated by its
            tallest sibling (Audience & Demographics' long Country list
            otherwise stretched Preferences into a tall card full of empty
            space, since CSS grid items stretch to the row height by
            default) -- each card now stays only as tall as its own content. */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 20, alignItems: "start" }}>
        {companySummary && (
        <div className="card" style={{ padding: "var(--pad-card)" }}>
          <div className="row between" style={{ alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, margin: 0 }}>{t(companySummary.titleKey, null, companySummary.titleFallback)}</h2>
            <Btn variant="ghost" icon="edit" onClick={() => navigate(`/settings/edit-step/${companyStepKey}`)}>{t("actions.edit", null, "Edit")}</Btn>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {companySummary.fields.filter(f => !f.personas || f.personas.includes(activePersonaKey)).map(f => {
              const val = builder?.profile?.[f.key];
              return <ChipField key={f.key} label={t(f.labelKey, null, f.labelFallback)} values={val ? [val] : []} required={f.required} />;
            })}
          </div>
        </div>
        )}

        {verificationFields && verificationFields.some(f => builder?.profile?.[f.key]) && (
          <div className="card" style={{ padding: "var(--pad-card)" }}>
            <div className="row between" style={{ alignItems: "center", marginBottom: 4 }}>
              <h2 style={{ fontSize: 18, margin: 0 }}>{t("settings.verificationDetails", null, "Verification")}</h2>
              {verifyStepKey && <Btn variant="ghost" icon="edit" onClick={() => navigate(`/settings/edit-step/${verifyStepKey}`)}>{t("actions.edit", null, "Edit")}</Btn>}
            </div>
            <p className="faint" style={{ margin: "0 0 16px", fontSize: 13 }}>{t("settings.verificationHint", null, "Submitted during onboarding — used for trust review.")}</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {verificationFields.filter(f => builder?.profile?.[f.key]).map(f => (
                <ChipField key={f.key} label={t(f.labelKey, null, f.labelFallback)} values={[builder.profile[f.key]]} required={f.required} />
              ))}
            </div>
          </div>
        )}

        {/* "Preferences" is the last onboarding step for every persona
            (StepFinal: feedback frequency + preferred methods) -- Settings
            never had a card for it at all, so it always read as saved data
            that had simply vanished. Placed right after Company/Verification
            (both short, single-value cards) so it pairs into the same row
            as one of them instead of sharing a row with Audience &
            Demographics below, which needs the full row to itself. */}
        {activePersona?.components?.final && (
          <div className="card" style={{ padding: "var(--pad-card)" }}>
            <div className="row between" style={{ alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, margin: 0 }}>{t("settings.preferences", null, "Preferences")}</h2>
              <Btn variant="ghost" icon="edit" onClick={() => navigate("/settings/edit-step/final")}>{t("actions.edit", null, "Edit")}</Btn>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <ChipField label={t("onboarding.final.frequencyLabel", null, "How often will you need feedback?")} values={builder?.profile?.frequency ? [builder.profile.frequency] : []} />
              <ChipField label={t("onboarding.final.methodsLabel", null, "Preferred methods")} values={builder?.profile?.methods} />
            </div>
          </div>
        )}

        {/* Step 3 ("Validate"/"Your needs"/"Goals"/"Research") had the same
            gap Preferences did -- no Settings card at all. Right after
            Preferences fills the empty half of its row instead of opening a
            new one, since both are short single-list cards. Saved values
            are the SelCards `v` codes (e.g. "app", "pricing"), not display
            titles, so they're looked up against that persona's own options
            list for a readable label -- Researcher's `areas` are already
            plain translated strings with no v/t split, hence no lookup. */}
        {validateSummary && (
          <div className="card" style={{ padding: "var(--pad-card)" }}>
            <div className="row between" style={{ alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, margin: 0 }}>{t(validateSummary.titleKey, null, validateSummary.titleFallback)}</h2>
              <Btn variant="ghost" icon="edit" onClick={() => navigate(`/settings/edit-step/${validateStepKey}`)}>{t("actions.edit", null, "Edit")}</Btn>
            </div>
            <ChipField hideLabel label={t(validateSummary.titleKey, null, validateSummary.titleFallback)}
              values={(builder?.profile?.[validateSummary.fieldKey] || []).map(v =>
                validateSummary.optionsFn ? (validateSummary.optionsFn(t).find(o => o.v === v)?.t || v) : v
              )} />
          </div>
        )}

        {/* Full row to itself (gridColumn 1/-1) -- Occupation and especially
            Country can run to dozens of chips (picking "Worldwide" at
            onboarding saves every country), and squeezed into half the row
            next to another card they wrapped/collapsed far sooner than the
            space actually available on the page. */}
        {audienceStepKey && (
          <div className="card" style={{ padding: "var(--pad-card)", gridColumn: "1 / -1" }}>
            <div className="row between" style={{ alignItems: "flex-start", gap: 24, marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 18, margin: 0 }}>{t("settings.audienceDetails", null, "Audience & Demographics")}</h2>
                <p className="faint" style={{ margin: "4px 0 0", fontSize: 13 }}>{t("settings.audienceDetailsDesc", null, "Who you want to hear from — collected at onboarding, used as the starting point for the Audience Explorer.")}</p>
              </div>
              <Btn variant="ghost" icon="edit" onClick={() => navigate(`/settings/edit-step/${audienceStepKey}`)} style={{ flexShrink: 0, marginTop: 1 }}>{t("actions.edit", null, "Edit")}</Btn>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[
                // Age is the one field foValid/coValid actually require for this
                // step (ageBands.length >= 1) -- Country/Gender/Occupation are
                // free to skip, hence only Age gets the required marker.
                { label: t("onboardingFields.age", null, "Age"), values: builder?.profile?.ageBands, required: true },
                { label: t("onboardingFields.gender", null, "Gender"), values: builder?.profile?.genders },
                // Both get the full row (not a 1fr column) -- otherwise
                // Occupation's chips stopped at half the card's width with
                // the other half sitting empty, and Country did too once it
                // only had CHIP_COLLAPSE_AT worth of chips to show (see the
                // bumped collapse count below for the other half of this).
                // "Other" is a derived flag kept alongside a custom entry
                // (see ProfileChips/FilterGroup), not a real value of its
                // own -- stripped here the same way MissionDetail.jsx
                // already strips it from the geography line, so a custom
                // occupation doesn't show up next to a phantom "Other" chip.
                { label: t("onboardingFields.occupation", null, "Occupation"), values: (builder?.profile?.occupations || []).filter(v => v.toLowerCase() !== "other"), span: true, dropdown: true },
                { label: t("onboardingFields.country", null, "Country"), values: Array.isArray(builder?.profile?.country) ? builder.profile.country : (builder?.profile?.country ? [builder.profile.country] : []), span: true, dropdown: true },
                // State/City were saved (LocationFields' own State/Region and
                // City text inputs) but never showed up here at all.
                { label: t("onboardingFields.stateRegion", null, "State / Region"), values: builder?.profile?.state ? [builder.profile.state] : [] },
                { label: t("onboardingFields.city", null, "City"), values: builder?.profile?.district ? [builder.profile.district] : [] },
                { label: t("onboardingFields.education", null, "Education"), values: builder?.profile?.educations },
                { label: t("onboardingFields.incomeBand", null, "Income band"), values: builder?.profile?.incomeBands },
                { label: t("onboardingFields.languages", null, "Languages"), values: builder?.profile?.languages, span: true, dropdown: true },
                // Custom ("Other") interests are tracked in their own array
                // alongside the picked ones, not folded into the same list
                // the way a custom occupation is -- merge both here so a
                // typed-in interest isn't silently missing from this card.
                { label: t("onboardingFields.interests", null, "Interests"), values: [...(builder?.profile?.interests || []), ...(builder?.profile?.interestsOther || [])], span: true, dropdown: true },
              ].map(f => <ChipField key={f.label} label={f.label} values={f.values} required={f.required} span={f.span} dropdown={f.dropdown} />)}
            </div>
          </div>
        )}

        {!builder?.oauthProvider && (
          <div className="card" style={{ padding: "var(--pad-card)", gridColumn: "1 / -1" }}>
            <div className="row between" style={{ alignItems: "center", marginBottom: changingPassword ? 8 : 0 }}>
              <div>
                <h2 style={{ fontSize: 18, margin: 0 }}>{t("settings.security", null, "Security")}</h2>
                <p className="faint mb-5" style={{ margin: "4px 0 0" }}>{t("settings.securityDesc", null, "Change your password to keep your account secure.")}</p>
              </div>
              {!changingPassword && <Btn variant="ghost" icon="edit" onClick={() => setChangingPassword(true)}>{t("settings.changePassword", null, "Change password")}</Btn>}
            </div>
            {changingPassword && (
              <form onSubmit={savePassword} className="col gap-4">
                {pwdError && <div className="err-banner">{pwdError}</div>}
                {pwdSuccess && <div className="banner success">{pwdSuccess}</div>}
                {forgotSent && <div className="banner success">{t("settings.forgotPwdSent", null, "If an account exists for this email, a reset link is on its way.")}</div>}
                <div className="fld">
                  <div className="row between" style={{ alignItems: "baseline" }}>
                    <label>{t("settings.currentPwd", null, "Current Password")}</label>
                    <button type="button" className="backlink" style={{ fontSize: 12.5 }} onClick={sendForgotLink} disabled={forgotBusy}>
                      {forgotBusy ? t("auth.sending", null, "Sending…") : t("settings.forgotCurrentPwd", null, "Forgot it?")}
                    </button>
                  </div>
                  <PasswordInput className="fin" value={pwdCurrent} onChange={e => setPwdCurrent(e.target.value)} required />
                </div>
                <div className="row gap-3 wrap">
                  <div className="fld" style={{ flex: 1, minWidth: 180 }}>
                    <label>{t("settings.newPwd", null, "New Password")}</label>
                    <PasswordInput className="fin" value={pwdNew} onChange={e => setPwdNew(e.target.value)} required />
                  </div>
                  <div className="fld" style={{ flex: 1, minWidth: 180 }}>
                    <label>{t("settings.confirmNewPwd", null, "Confirm New Password")}</label>
                    <PasswordInput className="fin" value={pwdConfirm} onChange={e => setPwdConfirm(e.target.value)} required />
                  </div>
                </div>
                <div className="row gap-2">
                  <Btn variant="primary" type="submit" disabled={pwdBusy}>{pwdBusy ? t("actions.saving", null, "Saving…") : t("actions.updatePassword", null, "Update password")}</Btn>
                  <Btn variant="quiet" type="button" onClick={cancelPasswordChange}>{t("actions.cancel", null, "Cancel")}</Btn>
                </div>
              </form>
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
