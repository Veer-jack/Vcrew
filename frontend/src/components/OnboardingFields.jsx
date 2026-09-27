import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "./Icon";
import { PasswordInput } from "./ui";
import { useTranslation } from "../i18n/index.jsx";
import { FilterGroup } from "../pages/CreateMissionWizard";
import { isValidMobile } from "../data/onboarding";
import countryRegionData from "country-region-data/data.json";

// Same source the validator side's onboarding already uses (VOnboarding.jsx)
// -- this used to pull from auth/countries.js instead, a much smaller list
// originally built for the phone country-code picker (~100 entries vs this
// package's ~249), so builder and validator onboarding disagreed on which
// countries even exist.
const COUNTRY_NAMES = countryRegionData.map(c => c.countryName).sort((a, b) => a.localeCompare(b));

export function Field({ label, optional, span, hint, invalid, action, children, dataField, issue }) {
  return (
    <div className={`fld${span ? " fld-span" : ""}${invalid ? " fld-invalid" : ""}`} data-field={dataField}>
      <div className="row between" style={{ alignItems: "center" }}>
        <label>{label} {optional ? <span className="faint">(optional)</span> : <span className="req-star" aria-hidden="true"> *</span>}</label>
        {action}
      </div>
      {children}
      <FieldIssue id={dataField} issue={issue} />
      {hint && <p className="fhint">{hint}</p>}
    </div>
  );
}

// Placed inline wherever a step wants the "please fill this in" message to
// show once the wizard has identified the single field that's actually
// missing (see OnboardingWizard's goNext / EditAccountStep's handleSave) --
// renders nothing unless this field is specifically the one currently
// reported (a boolean `invalid` can be true for every empty required field
// at once; `issue` only ever names one, so its message isn't repeated on
// every field that happens to also be empty).
export function FieldIssue({ id, issue }) {
  if (!issue || !id || issue.id !== id) return null;
  return <p className="ferr">{issue.message}</p>;
}

// "Select all"/"Clear all" for a plain Chips multi-select -- Country
// already had this via FilterGroup (which also brings search/collapse/
// custom-entry machinery a short options list doesn't need), so this gives
// every other chip category (Validator Type, Age, Gender, Occupation,
// Education, Income band, Languages, Interests) the same affordance without
// pulling in FilterGroup itself.
export function SelectAllToggle({ options, value, onChange }) {
  const { t } = useTranslation();
  const sel = value || [];
  const allSelected = options.length > 0 && options.every(o => sel.includes(o));
  return (
    <button type="button" className="backlink" style={{ margin: 0, fontSize: 12, flexShrink: 0 }}
      onClick={() => onChange(allSelected ? [] : [...options])}>
      {allSelected ? t("createMission.clearAll", null, "Clear all") : t("createMission.selectAll", null, "Select all")}
    </button>
  );
}

export function TextInput({ value, onChange, placeholder, type = "text", disabled, maxLength, onKeyDown }) {
  if (type === "password") {
    return <PasswordInput className="fin" value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />;
  }
  return <input className="fin" type={type} value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} disabled={disabled} maxLength={maxLength} onKeyDown={onKeyDown} />;
}

export function Textarea({ value, onChange, placeholder }) {
  return <textarea className="fin" rows={3} value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />;
}

export function SelectInput({ value, onChange, options, placeholder }) {
  const { t } = useTranslation();
  return (
    <select className="fin" value={value || ""} onChange={(e) => onChange(e.target.value)}>
      <option value="" disabled>{placeholder || t("onboardingFields.selectPlaceholder", null, "Select…")}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

export function FSection({ label, count, required, action, invalid, dataField, issue }) {
  return (
    <>
      <div className="row between" style={{ margin: "18px 0 10px", alignItems: "center" }} data-field={dataField}>
        <div className="eyebrow" style={{ fontSize: 12, color: invalid ? "var(--danger)" : undefined }}>{label}{required && <span className="req-star" aria-hidden="true"> *</span>}</div>
        <div className="row gap-3" style={{ alignItems: "center" }}>
          {count && <span className="faint" style={{ fontSize: 12 }}>{count}</span>}
          {action}
        </div>
      </div>
      <FieldIssue id={dataField} issue={issue} />
    </>
  );
}

// Single or multi-select pill chips, used for plain string option lists.
// Lists over 10 options collapse behind a "Show more/less" toggle (same
// threshold FilterGroup already uses for its own default expanded/collapsed
// state) -- a currently-selected option never hides, even past the cutoff,
// so a collapsed view can never look like a selection silently vanished.
export function Chips({ options, value, onChange, multi = true }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const sel = value || (multi ? [] : "");
  const isOn = (o) => (multi ? sel.includes(o) : sel === o);
  const toggle = (o) => {
    if (!multi) { onChange(sel === o ? "" : o); return; }
    onChange(sel.includes(o) ? sel.filter((x) => x !== o) : [...sel, o]);
  };
  const collapsible = options.length > 10;
  const visible = collapsible && !open ? options.filter((o, i) => i < 10 || isOn(o)) : options;
  return (
    <div className="row gap-2" style={{ flexWrap: "wrap", alignItems: "center" }}>
      {visible.map((o) => (
        // Same .ck checkmark box FilterGroup's own chips already render --
        // these plain Chips groups (Age, Gender, Education, ...) were
        // missing it, so a selection only read as "selected" via the border
        // color, not the checkmark every other filter chip in the app has.
        <button key={o} type="button" className={`chip${isOn(o) ? " on" : ""}`} onClick={() => toggle(o)}>
          <span className="ck"><Icon name="check" size={10} /></span>{o}
        </button>
      ))}
      {collapsible && (
        <button type="button" className="backlink row gap-1" style={{ fontSize: 12, alignItems: "center" }} onClick={() => setOpen(o => !o)}>
          {open ? t("actions.showLess", null, "Show less") : t("actions.showAllCount", { count: options.length }, `Show all (${options.length})`)}
          <Icon name={open ? "chevronUp" : "chevronDown"} size={12} />
        </button>
      )}
    </div>
  );
}

// Multi-select as a collapsed dropdown + removable chips below, instead of
// an always-expanded checkbox grid (Chips, above) -- same underlying
// selection (still just an array in d), different presentation for a field
// where the option list itself doesn't need to stay visible once picked.
// The popover is portal-rendered to document.body and positioned via the
// trigger's own getBoundingClientRect(), same fix as the Discover/Audience
// Explorer Sort dropdowns: an absolutely-positioned menu inside a .rise-
// animated step container gets its own stacking context from the entrance
// animation, so a later sibling would paint over it regardless of z-index.
// Stays open across multiple picks (closes only on an outside click) so
// picking several options doesn't mean reopening the menu each time.
export function ChipsDropdown({ options, value, onChange, placeholder, hideChips = [], closeOnPick = [] }) {
  const { t } = useTranslation();
  const sel = value || [];
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const [search, setSearch] = useState("");
  const btnRef = useRef(null);
  const searchRef = useRef(null);

  // Fresh search box every time this opens, not whatever was left over from
  // last time -- and focused immediately, so typing to filter doesn't need
  // an extra click first.
  useEffect(() => {
    if (!open) { setSearch(""); return; }
    searchRef.current?.focus();
  }, [open]);
  const filteredOptions = search.trim() ? options.filter(o => o.toLowerCase().includes(search.trim().toLowerCase())) : options;

  const reposition = () => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 6, left: r.left, width: r.width });
  };
  // `pos` was only ever computed once, at the moment of opening -- fine
  // while nothing on the page moves, but this field's own chips render
  // right below the trigger, so picking something reflows the page under
  // an already-open menu (and the same happens on any ordinary scroll
  // while it's open) and the menu stayed wherever it was first drawn,
  // no longer anywhere near the trigger it belongs to. Recomputes on every
  // scroll/resize while open instead of once. Capture phase on scroll --
  // this can be scrolling inside the wizard's own content pane, not just
  // window-level, and only the capture phase sees a scroll on an ancestor.
  useEffect(() => {
    if (!open) return;
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const toggle = (o) => {
    const adding = !sel.includes(o);
    onChange(adding ? [...sel, o] : sel.filter(x => x !== o));
    // e.g. "Other" -- picking it opens a text input the menu itself would
    // otherwise sit on top of (it stays open across ordinary picks so
    // several can be chosen in one go, but there's nothing left to pick
    // *for* here until that input is dealt with).
    if (adding && closeOnPick.includes(o)) setOpen(false);
  };
  // Only ever removes one of this dropdown's own options -- a caller
  // showing additional, non-preset entries (e.g. a typed-in "Other" value)
  // renders and removes those itself, same as Chips leaves that to callers.
  // hideChips additionally skips a picked option here even though it's one
  // of this dropdown's own -- for a trigger value (e.g. "Other") a caller
  // already represents with its own follow-up UI (the "please specify"
  // input), so it isn't shown twice.
  const chipValues = sel.filter(o => options.includes(o) && !hideChips.includes(o));

  return (
    <div>
      <button
        ref={btnRef}
        type="button"
        onClick={() => {
          if (!open) reposition();
          setOpen(o => !o);
        }}
        className="fin"
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", textAlign: "left", width: "100%" }}
      >
        {/* Always the placeholder, never restated as "N selected" here --
            callers already show that count in their own FSection header
            above this field, and the picked values themselves are right
            below as chips. */}
        <span className="faint">{placeholder || t("onboardingFields.selectPlaceholder", null, "Select…")}</span>
        <Icon name={open ? "chevronUp" : "chevronDown"} size={14} style={{ flexShrink: 0, color: "var(--text-muted)" }} />
      </button>
      {open && pos && createPortal(
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 49 }} onClick={() => setOpen(false)} />
          <div role="menu" style={{
            position: "fixed", top: pos.top, left: pos.left, width: pos.width, zIndex: 50, maxHeight: 320,
            background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius)",
            boxShadow: "var(--shadow-md)", display: "flex", flexDirection: "column",
          }}>
            {/* Its own row, outside the scrolling list below -- otherwise
                typing to filter would scroll the search box itself out of
                view along with whatever it just filtered out. */}
            <div style={{ padding: 8, borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
              <input ref={searchRef} className="fin" value={search} onChange={e => setSearch(e.target.value)} placeholder={t("actions.search", null, "Search")} style={{ width: "100%" }} />
            </div>
            <div style={{ overflowY: "auto", padding: 6, flex: 1, minHeight: 0 }}>
              {filteredOptions.length === 0 ? (
                <div className="faint" style={{ padding: "10px 8px", fontSize: 13 }}>{t("onboarding.noMatchesFor", { q: search }, `No matches for "${search}"`)}</div>
              ) : filteredOptions.map(o => {
                const on = sel.includes(o);
                return (
                  <button key={o} type="button" role="menuitemcheckbox" aria-checked={on} onClick={() => toggle(o)}
                    style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 10px", borderRadius: "var(--radius-sm)", border: "none", cursor: "pointer", fontSize: 13.5, fontWeight: on ? 700 : 500, color: on ? "var(--accent)" : "var(--text)", background: on ? "var(--accent-weak)" : "transparent" }}
                  >
                    {o}
                  </button>
                );
              })}
            </div>
          </div>
        </>,
        document.body
      )}
      {chipValues.length > 0 && (
        <div className="row gap-2" style={{ flexWrap: "wrap", marginTop: 10 }}>
          {chipValues.map(o => (
            <div key={o} className="chip on" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {o}
              <button type="button" onClick={() => toggle(o)} style={{ background: "none", border: "none", padding: 0, margin: 0, cursor: "pointer", color: "inherit", display: "flex" }}>
                <Icon name="x" size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Card-style options with title + description, single or multi-select.
export function SelCards({ options, value, onChange, multi = false, cols = 2 }) {
  const sel = value || (multi ? [] : "");
  const isOn = (v) => (multi ? sel.includes(v) : sel === v);
  const toggle = (v) => {
    if (!multi) { onChange(v); return; }
    onChange(sel.includes(v) ? sel.filter((x) => x !== v) : [...sel, v]);
  };
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 10 }} className="selcard-grid">
      {options.map((o) => (
        <button key={o.v} type="button" className={`card selcard${isOn(o.v) ? " selcard-on" : ""}`}
          style={{ textAlign: "left", padding: 14, cursor: "pointer" }} onClick={() => toggle(o.v)}>
          <b style={{ fontSize: 13.5 }}>{o.t}</b>
          <p className="faint" style={{ fontSize: 12, margin: "3px 0 0" }}>{o.d}</p>
        </button>
      ))}
    </div>
  );
}

// Same `.reach`/`.r-*` classes and layout CreateMissionWizard's own
// StepAudience reach banner uses (see builder.css) -- previously a plain
// `.card` with its own bespoke markup, which is the "why doesn't this look
// like the mission-creation audience step" gap the tester flagged.
export function ReachMeter({ reach, base, firstLoad, updating }) {
  const { t } = useTranslation();
  const pct = firstLoad ? 0 : Math.max(4, Math.min(100, Math.round((reach / base) * 100)));
  return (
    <div className="reach" style={{ marginBottom: 16 }}>
      <div className="reach-top">
        <span className="r-ic"><Icon name="users" size={22} /></span>
        <div style={{ flex: 1, opacity: updating ? 0.5 : 1, transition: "opacity .2s" }}>
          <div className="r-num">{firstLoad ? "—" : reach.toLocaleString("en-US")}</div>
          <div className="r-lab">{firstLoad ? t("onboardingFields.findingAudience", null, "Finding your audience…") : t("onboardingFields.peopleMatchNow", null, "people match right now")}</div>
        </div>
        {updating ? (
          <span className="pill" style={{ background: "var(--panel)", color: "var(--text-muted)", border: "none" }}><Icon name="clock" size={13} /> {t("onboardingFields.updating", null, "Updating…")}</span>
        ) : (
          <span className="pill" style={{ background: "var(--success-weak)", color: "var(--success)", border: "none" }}><Icon name="bolt" size={13} /> {t("createMission.live", null, "Live")}</span>
        )}
      </div>
      <div className="r-bar"><i style={{ width: Math.max(4, pct) + "%" }} /></div>
      <div className="r-foot"><span>{t("createMission.narrowerHigherQuality", null, "Narrower = higher quality")}</span><span>{t("createMission.pctOfTotalPool", { pct }, `${pct}% of total pool`)}</span></div>
    </div>
  );
}

export function LocationFields({ d, set, withCity, showErrors, dataField, issue }) {
  const { t } = useTranslation();
  // Older saved profiles still have `country` as a single string — coerce
  // to an array so this keeps working for builders who onboarded before
  // Country became multi-select.
  const rawCountry = d.country;
  const countries = Array.isArray(rawCountry) ? rawCountry : (rawCountry ? [rawCountry] : []);
  return (
    <div className="fgrid c2">
      <div style={{ gridColumn: "1 / -1" }}>
        {/* Dropdown + chips instead of an always-expanded checkbox grid --
            same ChipsDropdown the onboarding Research area field uses,
            better suited to a ~249-option list than a grid that used to
            need its own "initially expanded" override just to be usable. */}
        <FSection label={t("onboardingFields.country", null, "Country")} required
          count={countries.length ? t("onboarding.selectedCount", { count: countries.length }, `${countries.length} selected`) : null}
          action={<SelectAllToggle options={COUNTRY_NAMES} value={countries} onChange={(v) => set("country", v)} />}
          invalid={showErrors && countries.length === 0} dataField={dataField} issue={issue} />
        <ChipsDropdown options={COUNTRY_NAMES} value={countries} onChange={(v) => set("country", v)} placeholder={t("onboardingFields.selectCountryPlaceholder", null, "Select country(ies)")} />
      </div>
      <Field label={t("onboardingFields.stateRegion", null, "State / Region")} optional>
        <TextInput value={d.state} onChange={(v) => set("state", v)} placeholder={t("onboardingFields.stateRegionPlaceholder", null, "Karnataka")} />
      </Field>
      {withCity && (
        <Field label={t("onboardingFields.city", null, "City")} optional>
          <TextInput value={d.district} onChange={(v) => set("district", v)} placeholder={t("onboardingFields.cityPlaceholder", null, "Bengaluru")} />
        </Field>
      )}
    </div>
  );
}

export function DemographicsRow({ d, set, ageOptions, genderOptions, showErrors, requireAge, requireGender, issue }) {
  const { t } = useTranslation();
  const ageOpts = ageOptions || ["18–24", "25–34", "35–44", "45–54", "55+"];
  const genderOpts = genderOptions || [t("onboardingFields.any", null, "Any"), t("onboardingFields.genderFemale", null, "Female"), t("onboardingFields.genderMale", null, "Male"), t("onboardingFields.genderNonBinary", null, "Non-binary")];
  return (
    <div className="fgrid c2">
      <Field label={t("onboardingFields.age", null, "Age")} invalid={showErrors && requireAge && !(d.ageBands || []).length} dataField={requireAge ? "ageBands" : undefined} issue={issue} action={<SelectAllToggle options={ageOpts} value={d.ageBands} onChange={(v) => set("ageBands", v)} />}>
        <Chips options={ageOpts} value={d.ageBands} onChange={(v) => set("ageBands", v)} />
      </Field>
      <Field label={t("onboardingFields.gender", null, "Gender")} invalid={showErrors && requireGender && !(d.genders || []).length} dataField={requireGender ? "genders" : undefined} issue={issue} action={<SelectAllToggle options={genderOpts} value={d.genders} onChange={(v) => set("genders", v)} />}>
        <Chips options={genderOpts} value={d.genders} onChange={(v) => set("genders", v)} />
      </Field>
    </div>
  );
}

export function ProfileChips({ d, set, region, show = {}, occOptions, incomeOptions, interestOptions, showErrors, requireOccupation, issue }) {
  const { t } = useTranslation();
  const notYetTrackedHint = t("onboardingFields.notYetTrackedHint", null, "Not yet tracked on validator profiles — doesn't affect the match count.");

  const defaultOccOptions = occOptions || [t("onboardingFields.occStudent", null, "Student"), t("onboardingFields.occWorkingProfessional", null, "Working Professional"), t("onboardingFields.occEntrepreneur", null, "Entrepreneur"), t("onboardingFields.occHomemaker", null, "Homemaker"), t("onboardingFields.occRetired", null, "Retired"), t("onboardingFields.any", null, "Any")];
  // A saved custom entry needs to stay listed (so it can be re-checked)
  // even while unchecked -- deriving this list from d.occupations itself
  // (the old approach) meant unchecking it via Clear all also deleted it
  // outright, since the same array tracked both "known" and "currently
  // selected". occupationsOther is its own independent field, exactly
  // like CreateMissionWizard's own d.otherEntries[key], so Clear all only
  // ever touches selection.
  const customOccs = d.occupationsOther || [];
  const occupationOptions = defaultOccOptions;
  const occSel = new Set(d.occupations || []);
  // Same {toggle, onSelectAll} shape LocationFields' Country uses -- title
  // arg is ignored (one group per call here, unlike CreateMissionWizard's
  // shared multi-group filters object).
  const toggleOcc = (_, o) => set("occupations", occSel.has(o) ? (d.occupations || []).filter(x => x !== o) : [...(d.occupations || []), o]);
  const selectAllOcc = (opts) => {
    const s = new Set(d.occupations || []);
    const allIn = opts.every(o => s.has(o));
    if (allIn) { opts.forEach(o => s.delete(o)); s.delete("Other"); } else { opts.forEach(o => s.add(o)); }
    set("occupations", [...s]);
  };

  const educationOptions = [t("onboardingFields.eduHighSchool", null, "High school"), t("onboardingFields.eduDiploma", null, "Diploma"), t("onboardingFields.eduUndergraduate", null, "Undergraduate"), t("onboardingFields.eduPostgraduate", null, "Postgraduate"), t("onboardingFields.eduPhd", null, "PhD / Doctorate")];
  const incomeBandOptions = incomeOptions || (region === "india" ? ["< ₹3L", "₹3–6L", "₹6–12L", "₹12–25L", "₹25L–1Cr", "₹1Cr+"] : ["< $25k", "$25–50k", "$50–100k", "$100–200k", "$200k+"]);
  const languageOptions = region === "india"
    ? [t("onboardingFields.langHindi", null, "Hindi"), t("onboardingFields.langEnglish", null, "English"), t("onboardingFields.langTamil", null, "Tamil"), t("onboardingFields.langTelugu", null, "Telugu"), t("onboardingFields.langKannada", null, "Kannada"), t("onboardingFields.langBengali", null, "Bengali"), t("onboardingFields.langMarathi", null, "Marathi"), t("onboardingFields.langGujarati", null, "Gujarati"), t("onboardingFields.langMalayalam", null, "Malayalam"), t("onboardingFields.langPunjabi", null, "Punjabi")]
    : [t("onboardingFields.langEnglish", null, "English"), t("onboardingFields.langSpanish", null, "Spanish"), t("onboardingFields.langFrench", null, "French"), t("onboardingFields.langGerman", null, "German"), t("onboardingFields.langMandarin", null, "Mandarin"), t("onboardingFields.langArabic", null, "Arabic"), t("onboardingFields.langPortuguese", null, "Portuguese"), t("onboardingFields.langJapanese", null, "Japanese")];

  const defaultIntOptions = interestOptions || [t("onboardingFields.intAI", null, "AI"), t("onboardingFields.intStartups", null, "Startups"), t("onboardingFields.intFitness", null, "Fitness"), t("onboardingFields.intHealthcare", null, "Healthcare"), t("onboardingFields.intEducation", null, "Education"), t("onboardingFields.intFinance", null, "Finance"), t("onboardingFields.intGaming", null, "Gaming"), t("onboardingFields.intParenting", null, "Parenting"), t("onboardingFields.intTravel", null, "Travel"), t("onboardingFields.intFashion", null, "Fashion"), t("onboardingFields.intFood", null, "Food"), t("onboardingFields.intSustainability", null, "Sustainability")];
  const customInts = d.interestsOther || [];
  const finalIntOptions = defaultIntOptions;
  const intSel = new Set(d.interests || []);
  const toggleInt = (_, o) => set("interests", intSel.has(o) ? (d.interests || []).filter(x => x !== o) : [...(d.interests || []), o]);
  const selectAllInt = (opts) => {
    const s = new Set(d.interests || []);
    const allIn = opts.every(o => s.has(o));
    if (allIn) { opts.forEach(o => s.delete(o)); s.delete("Other"); } else { opts.forEach(o => s.add(o)); }
    set("interests", [...s]);
  };

  return (
    <div className="col gap-3">
      {show.occupation && (() => {
        // Matches CreateMissionWizard's own audience filters exactly: a
        // literal "Other" option gets split into its own trailing
        // FilterGroup section (its own header, count, Select all, collapse)
        // instead of living as a trigger chip inside the main grid -- that
        // inline-trigger version is what shipped first here and wasn't what
        // was actually asked for.
        const hasOther = occupationOptions.includes("Other");
        const mainOpts = hasOther ? occupationOptions.filter(o => o !== "Other") : occupationOptions;
        return (
          <div className={showErrors && requireOccupation && !occSel.size ? "fld-invalid" : undefined} data-field={requireOccupation ? "occupations" : undefined}>
            <FilterGroup
              title={t("onboardingFields.occupation", null, "Occupation")}
              required
              options={mainOpts}
              sel={occSel}
              toggle={toggleOcc}
              // Read-only here -- this group doesn't grow its own "add
              // other" input; it just needs to know about the sibling
              // Other section's saved entries so this header's own
              // selected-count/Select all account for them too.
              otherEntries={hasOther ? customOccs : undefined}
              onSelectAll={selectAllOcc}
              // FilterGroup's own default (collapsed past 10 options) hid
              // this by default even when someone already has 20+ real
              // selections -- same override Country already gets.
              initialExpanded
            />
            {requireOccupation && <FieldIssue id="occupations" issue={issue} />}
            {hasOther && (
              <FilterGroup
                title={t("onboardingFields.other", null, "Other")}
                options={["Other"]}
                sel={occSel}
                toggle={toggleOcc}
                otherEntries={customOccs}
                onOtherEntriesChange={(entries) => set("occupationsOther", entries)}
                onSelectAll={selectAllOcc}
                otherPlaceholder={t("onboardingFields.occupationOtherPlaceholder", null, "e.g. Product Designer")}
              />
            )}
          </div>
        );
      })()}
      {show.education && (
        <Field label={t("onboardingFields.education", null, "Education")} optional hint={notYetTrackedHint}
          action={<SelectAllToggle options={educationOptions} value={d.educations} onChange={(v) => set("educations", v)} />}>
          <Chips options={educationOptions} value={d.educations} onChange={(v) => set("educations", v)} />
        </Field>
      )}
      {show.income && (
        <Field label={t("onboardingFields.incomeBand", null, "Income band")} optional
          action={<SelectAllToggle options={incomeBandOptions} value={d.incomeBands} onChange={(v) => set("incomeBands", v)} />}>
          <Chips options={incomeBandOptions} value={d.incomeBands} onChange={(v) => set("incomeBands", v)} />
        </Field>
      )}
      {show.languages && (
        <Field label={t("onboardingFields.languages", null, "Languages")} optional hint={notYetTrackedHint}
          action={<SelectAllToggle options={languageOptions} value={d.languages} onChange={(v) => set("languages", v)} />}>
          <Chips options={languageOptions} value={d.languages} onChange={(v) => set("languages", v)} />
        </Field>
      )}
      {show.interests && (() => {
        const hasOther = finalIntOptions.includes("Other");
        const mainOpts = hasOther ? finalIntOptions.filter(o => o !== "Other") : finalIntOptions;
        return (
          <>
            <FilterGroup
              title={t("onboardingFields.interests", null, "Interests")}
              options={mainOpts}
              sel={intSel}
              toggle={toggleInt}
              otherEntries={hasOther ? customInts : undefined}
              onSelectAll={selectAllInt}
              initialExpanded
            />
            {hasOther && (
              <FilterGroup
                title={t("onboardingFields.other", null, "Other")}
                options={["Other"]}
                sel={intSel}
                toggle={toggleInt}
                otherEntries={customInts}
                onOtherEntriesChange={(entries) => set("interestsOther", entries)}
                onSelectAll={selectAllInt}
                otherPlaceholder={t("onboardingFields.interestOtherPlaceholder", null, "e.g. Photography")}
              />
            )}
          </>
        );
      })()}
    </div>
  );
}

// "Verify" steps record a claim for manual review — there is no automated
// DNS/domain-ownership or document verification pipeline today. This used to
// hide the input behind a Submit button and a "Submitted" pill once clicked,
// which meant the value you'd just typed vanished from view with no way to
// see it again short of hitting Edit — same shape as every other field in
// the wizard now: a plain, always-visible, always-editable input with its
// error (if any) shown live underneath, no separate submit step.
export function VerifyRow({ icon, title, desc, placeholder, value, onChange, optional, showErrors, validate, dataField, issue }) {
  const trimmed = (value || "").trim();
  const liveError = validate ? validate(value) : null;
  const missingRequired = showErrors && !optional && !trimmed;
  const invalid = missingRequired || (!!trimmed && !!liveError);

  return (
    <div className="card" style={{ padding: 14, marginBottom: 10, display: "flex", gap: 12, alignItems: "flex-start", border: invalid ? "1px solid var(--danger)" : undefined }} data-field={dataField}>
      <span className="intent-ic" style={{ background: "var(--accent-weak)", color: "var(--accent)", flex: "none" }}>
        <Icon name={icon} size={16} />
      </span>
      <div style={{ flex: 1 }}>
        <b style={{ fontSize: 13.5 }}>{title} {optional ? <span className="faint" style={{ fontWeight: 400 }}>(optional)</span> : <span className="req-star" aria-hidden="true"> *</span>}</b>
        <p className="faint" style={{ fontSize: 12, margin: "2px 0 8px" }}>{desc}</p>
        <input className={`fin ${invalid ? "fin-invalid" : ""}`} style={{ width: "100%" }} value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
        {trimmed && liveError && <div className="err" style={{ fontSize: 12, color: "var(--danger)", marginTop: 6 }}>{liveError}</div>}
        <FieldIssue id={dataField} issue={issue} />
      </div>
    </div>
  );
}

export function PersonalFields({ d, set, roleField, showErrors, emailLocked, issue }) {
  const { t } = useTranslation();
  const otherLabel = t("onboardingFields.roleOther", null, "Other");
  const defaultOptions = [t("onboardingFields.roleFounderCeo", null, "Founder & CEO"), t("onboardingFields.roleCofounder", null, "Co-founder"), t("onboardingFields.roleProductManager", null, "Product Manager"), t("onboardingFields.roleHeadOfProduct", null, "Head of Product"), t("onboardingFields.roleGrowthMarketing", null, "Growth / Marketing"), t("onboardingFields.roleDesignLead", null, "Design Lead"), t("onboardingFields.roleEngineeringLead", null, "Engineering Lead"), t("onboardingFields.roleOperations", null, "Operations"), otherLabel];
  const roleOptions = roleField?.options ? [...roleField.options, otherLabel] : defaultOptions;
  const isOther = d.designation === otherLabel;
  return (
    <div className="fgrid c2">
      <Field label={t("onboardingFields.fullName", null, "Full name")} invalid={showErrors && !(d.fullName || "").trim()} dataField="fullName" issue={issue}>
        <TextInput value={d.fullName} onChange={(v) => set("fullName", v)} placeholder={t("onboardingFields.fullNamePlaceholder", null, "Aarav Mehta")} />
      </Field>
      <Field label={t("onboardingFields.email", null, "Email")} invalid={showErrors && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email || "")} dataField="email" issue={issue}>
        <TextInput type="email" value={d.email} onChange={(v) => set("email", v)} placeholder={t("onboardingFields.emailPlaceholder", null, "you@company.com")} disabled={emailLocked} />
      </Field>
      <Field
        label={t("onboardingFields.mobileNumber", null, "Mobile number")}
        invalid={showErrors && !isValidMobile(d.mobile)}
        dataField="mobile" issue={issue}
        hint={t("onboardingFields.mobileNumberHint", null, "A 10-digit Indian mobile number, or add a country code (e.g. +1 555 123 4567) if you're outside India.")}
      >
        <TextInput value={d.mobile} onChange={(v) => set("mobile", v.replace(/[^\d+ ]/g, "").slice(0, 15))} maxLength={15} placeholder={t("onboardingFields.mobileNumberPlaceholder", null, "+91 98765 43210")} />
      </Field>
      <Field label={roleField?.label || t("onboardingFields.jobTitle", null, "Job title")} invalid={showErrors && !d.designation} dataField="designation" issue={issue}>
        <SelectInput value={d.designation} onChange={(v) => set("designation", v)} options={roleOptions} placeholder={t("onboardingFields.selectRole", null, "Select role")} />
      </Field>
      {isOther && (
        <Field label={t("onboardingFields.customRole", null, "Your role")} span invalid={showErrors && !(d.designationOther || "").trim()} dataField="designationOther" issue={issue}>
          <TextInput value={d.designationOther} onChange={(v) => set("designationOther", v)} placeholder={t("onboardingFields.customRolePlaceholder", null, "Type your role")} />
        </Field>
      )}
    </div>
  );
}
