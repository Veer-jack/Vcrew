import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "./Icon";
import { PasswordInput } from "./ui";
import { useTranslation } from "../i18n/index.jsx";
import { isValidMobile } from "../data/onboarding";
import countryRegionData from "country-region-data/data.json";
import { api } from "../api/client";

// Same source the validator side's onboarding already uses (VOnboarding.jsx)
// -- this used to pull from auth/countries.js instead, a much smaller list
// originally built for the phone country-code picker (~100 entries vs this
// package's ~249), so builder and validator onboarding disagreed on which
// countries even exist.
const COUNTRY_NAMES = countryRegionData.map(c => c.countryName).sort((a, b) => a.localeCompare(b));
// Country -> its own state/region names, same source as COUNTRY_NAMES --
// this is what lets State go from free text to "everywhere the currently
// selected countries actually have a region for."
const REGIONS_BY_COUNTRY = Object.fromEntries(countryRegionData.map(c => [c.countryName, c.regions.map(r => r.name)]));

export function Field({ label, optional, required, span, hint, invalid, action, children, dataField, issue }) {
  return (
    <div className={`fld${span ? " fld-span" : ""}${invalid ? " fld-invalid" : ""}`} data-field={dataField}>
      {(label || action) && (
        <div className="row between" style={{ alignItems: "center", marginBottom: 8 }}>
          <label style={{ fontWeight: 800, color: "var(--text-strong)", fontSize: 14 }}>{label}{required && <span style={{ color: "var(--danger)" }}> *</span>} {optional ? <span className="faint" style={{ fontWeight: 400 }}>(optional)</span> : null}</label>
          {action}
        </div>
      )}
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

// The "Other, please specify" follow-up for a ChipsDropdown whose option
// list includes an "Other" sentinel (paired with hideChips/closeOnPick on
// that dropdown) -- typing a value and saving replaces the sentinel with
// the real typed text as its own independently-removable chip, same shape
// as CreateMissionWizard's own d.otherEntries[key] and the onboarding
// Research area field's identical pattern. Deliberately simpler than
// FilterGroup's own "Other" handling (no separate remembered-but-currently-
// unchecked pool a custom entry can be toggled back into without retyping)
// -- onSave/onRemove decide what that means for the caller's own fields.
function OtherEntryField({ isOpen, customValues, onSave, onRemove, onCancel, placeholder, showErrors }) {
  const { t } = useTranslation();
  const [input, setInput] = useState("");
  const save = () => {
    const v = input.trim();
    if (!v) return;
    onSave(v);
    setInput("");
  };
  return (
    <>
      {customValues.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div className="eyebrow" style={{ fontSize: 11, marginBottom: 6 }}>{t("onboardingFields.other", null, "Other")}</div>
          <div className="row gap-2" style={{ flexWrap: "wrap" }}>
            {customValues.map(v => (
              <div key={v} className="chip on" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {v}
                <button type="button" onClick={() => onRemove(v)} style={{ background: "none", border: "none", padding: 0, margin: 0, cursor: "pointer", color: "inherit", display: "flex" }}>
                  <Icon name="x" size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      {isOpen && (
        <div style={{ marginTop: 14, maxWidth: 420 }}>
          <Field label={t("onboardingFields.pleaseSpecify", null, "Please specify")} invalid={showErrors && !input.trim() && customValues.length === 0}>
            <div className="row gap-2">
              <TextInput value={input} onChange={setInput} placeholder={placeholder} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); save(); } }} />
              <button type="button" className="btn btn-primary" disabled={!input.trim()} onClick={save}>{t("actions.save", null, "Save")}</button>
              <button type="button" className="btn btn-ghost" onClick={() => { setInput(""); onCancel(); }}>{t("actions.cancel", null, "Cancel")}</button>
            </div>
          </Field>
        </div>
      )}
    </>
  );
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

// Same "Clear all" a ChipsDropdown's own internal Select all row already
// does when everything is selected -- placed outside the menu too, next to
// the field's "N selected" count, so clearing doesn't require opening the
// dropdown first. Only clears this field's real options, same as the
// internal one leaves any custom "Other" value (not in `options`) alone.
export function ClearAllAction({ options, value, onChange, closeOnPick = [], multi = true }) {
  const { t } = useTranslation();
  const sel = multi ? (value || []) : (value ? [value] : []);
  const bulkTargets = options.filter(o => !closeOnPick.includes(o));
  const anySelected = bulkTargets.some(o => sel.includes(o));
  if (!anySelected) return null;
  return (
    <button type="button" className="backlink" style={{ margin: 0, fontSize: 12, flexShrink: 0 }}
      onClick={() => onChange(multi ? sel.filter(x => !bulkTargets.includes(x)) : "")}>
      {t("createMission.clearAll", null, "Clear all")}
    </button>
  );
}

export function TextInput({ value, onChange, placeholder, type = "text", disabled, maxLength, onKeyDown, style, icon }) {
  if (type === "password") {
    return <PasswordInput className="fin" value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={style} />;
  }
  if (icon) {
    return (
      <div className="inw has-pre">
        <span className="pre"><Icon name={icon} size={15} /></span>
        <input className="fin" type={type} value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} disabled={disabled} maxLength={maxLength} onKeyDown={onKeyDown} style={style} />
      </div>
    );
  }
  return <input className="fin" type={type} value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} disabled={disabled} maxLength={maxLength} onKeyDown={onKeyDown} style={style} />;
}

export function Textarea({ value, onChange, placeholder }) {
  return <textarea className="fin" rows={3} value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />;
}

export function SelectInput({ value, onChange, options, placeholder, style, ...props }) {
  return (
    <ChipsDropdown 
      multi={false}
      value={value}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      style={style}
      {...props}
    />
  );
}

export function FSection({ label, count, required, action, invalid, dataField, issue }) {
  return (
    <>
      <div className={invalid ? "fsection-invalid" : ""} style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 12, marginBottom: 16 }} data-field={dataField}>
        <span style={{ fontWeight: 700, fontSize: 14, color: invalid ? "var(--danger)" : "var(--text-strong)", whiteSpace: "nowrap" }}>
          {label}{required && <span style={{ color: "var(--danger)" }}> *</span>}
        </span>
        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        {(count || action) && (
          <div className="row gap-3" style={{ alignItems: "center" }}>
            {count && <span className="faint" style={{ fontSize: 12 }}>{count}</span>}
            {action}
          </div>
        )}
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
export function Chips({ options, value, onChange, multi = true, hideCheck = false }) {
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
          {!hideCheck && <span className="ck"><Icon name="check" size={10} /></span>}{o}
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

// A menu row's checked state used to be conveyed only by bolder text + a
// tinted background -- a tester flagged that as easy to miss at a glance
// compared to an explicit checkbox, the same signal every other multi-
// select in this app (Chips' own .ck square) already gives.
function Checkbox({ on }) {
  return (
    <span style={{ width: 15, height: 15, borderRadius: 4, flexShrink: 0, display: "grid", placeItems: "center", border: "1.5px solid " + (on ? "var(--accent)" : "var(--border-strong)"), background: on ? "var(--accent)" : "transparent", color: "#fff" }}>
      {on && <Icon name="check" size={10} />}
    </span>
  );
}

export function ChipsDropdown({ options, value, onChange, placeholder, hideChips = [], closeOnPick = [], multi = true, selectAll = true, groupOf, style, disabled }) {
  const { t } = useTranslation();
  const sel = multi ? (value || []) : (value ? [value] : []);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const [search, setSearch] = useState("");
  const btnRef = useRef(null);
  const searchRef = useRef(null);

  // Fresh search box every time this opens, not whatever was left over from
  // last time -- and focused immediately, so typing to filter doesn't need
  // an extra click first.
  useEffect(() => {
    if (!open) { 
      const timer = setTimeout(() => setSearch(""), 0);
      return () => clearTimeout(timer);
    }
    searchRef.current?.focus();
  }, [open]);
  const matchesSearch = search.trim()
    ? options.filter(o => o.toLowerCase().includes(search.trim().toLowerCase()))
    : options;
  // groupOf(option) => its parent's name (e.g. a state's country, a city's
  // state) -- State/City need this once more than one country/state is
  // selected at once, so their combined option lists don't read as one
  // undifferentiated pile. Sorted by [group, option] so groups themselves
  // land alphabetically too, not just each group's own contents. Ungrouped
  // callers (Country, Occupation, Interests, Research area, Sample size)
  // never pass groupOf, so filteredOptions stays the plain sorted-by-caller
  // list it always was for them.
  const filteredOptions = groupOf
    ? [...matchesSearch].sort((a, b) => {
        const ga = groupOf(a), gb = groupOf(b);
        return ga === gb ? a.localeCompare(b) : ga.localeCompare(gb);
      })
    : matchesSearch;

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
  }, [open]);

  const toggle = (o) => {
    // Single-select: picking replaces the value outright and always closes
    // -- there's nothing left to pick *for* once one choice is made, same
    // as a native <select>, unlike multi where several picks in a row is
    // the whole point of staying open.
    if (!multi) { onChange(o); setOpen(false); return; }
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

  // Select all/none toggles every *real* option, same as the option list a
  // Select all click on Country/Occupation/Interests always excluded --
  // closeOnPick already marks the one value here (e.g. "Other") that isn't
  // a real category to bulk-select into, it just opens a follow-up input.
  const bulkTargets = options.filter(o => !closeOnPick.includes(o));
  const allSelected = multi && bulkTargets.length > 0 && bulkTargets.every(o => sel.includes(o));
  const toggleSelectAll = () => {
    if (allSelected) { onChange(sel.filter(x => !bulkTargets.includes(x))); return; }
    const merged = new Set(sel);
    bulkTargets.forEach(o => merged.add(o));
    onChange([...merged]);
  };

  return (
    <div>
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          if (!open) reposition();
          setOpen(o => !o);
        }}
        className="fin"
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: disabled ? "default" : "pointer", textAlign: "left", width: "100%", ...style }}
      >
        {/* Multi: always the placeholder, never restated as "N selected"
            here -- callers already show that count in their own FSection
            header above this field, and the picked values themselves are
            right below as chips. Single: there's only ever the one value
            and no chip row to show it in, so the trigger shows it directly,
            same as a native <select> would. */}
        <span className={multi || !value ? "faint" : undefined}>{multi ? (placeholder || t("onboardingFields.selectPlaceholder", null, "Select…")) : (value || placeholder || t("onboardingFields.selectPlaceholder", null, "Select…"))}</span>
        <svg viewBox="0 0 10 7" width="10" height="7" style={{ flexShrink: 0, color: "#94a3b8", transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "none" }}>
          <path d="M0 0 L10 0 L5 7 Z" fill="currentColor" />
        </svg>
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
                view along with whatever it just filtered out. Skipped
                entirely for single-select -- every such field in this app
                is a short, fixed list (e.g. Sample size's 7 ranges), and a
                search box over something that short to pick just one from
                is pure clutter, not a shortcut. */}
            {multi && (
              <div style={{ padding: 8, borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
                <input ref={searchRef} className="fin" value={search} onChange={e => setSearch(e.target.value)} placeholder={t("actions.search", null, "Search")} style={{ width: "100%" }} />
              </div>
            )}
            <div style={{ overflowY: "auto", padding: 6, flex: 1, minHeight: 0 }}>
              {/* Pinned above the (possibly search-filtered) list below, not
                  part of it -- it always acts on every real option regardless
                  of what's currently typed into search, so it stays put
                  instead of disappearing/reappearing as you filter. */}
              {multi && selectAll && bulkTargets.length > 1 && (
                <button type="button" role="menuitemcheckbox" aria-checked={allSelected} onClick={toggleSelectAll}
                  style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", padding: "8px 10px", borderRadius: "var(--radius-sm)", border: "none", cursor: "pointer", fontSize: 13.5, fontWeight: 700, color: "var(--accent)", background: "transparent", marginBottom: 4, borderBottom: "1px solid var(--border)" }}
                >
                  <Checkbox on={allSelected} />
                  {allSelected ? t("createMission.clearAll", null, "Clear all") : t("createMission.selectAll", null, "Select all")}
                </button>
              )}
              {filteredOptions.length === 0 ? (
                <div className="faint" style={{ padding: "10px 8px", fontSize: 13 }}>{t("onboarding.noMatchesFor", { q: search }, `No matches for "${search}"`)}</div>
              ) : filteredOptions.map((o, i) => {
                const on = sel.includes(o);
                // A header only when this row's group differs from the row
                // before it -- filteredOptions is already sorted by group,
                // so that's the one moment a new group actually starts.
                const g = groupOf?.(o);
                const showHeader = groupOf && (i === 0 || groupOf(filteredOptions[i - 1]) !== g);
                return (
                  <div key={o}>
                    {showHeader && (
                      <div className="faint" style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".03em", padding: "10px 10px 4px" }}>{g}</div>
                    )}
                    <button type="button" role="menuitemcheckbox" aria-checked={on} onClick={() => toggle(o)}
                      style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", padding: "8px 10px", borderRadius: "var(--radius-sm)", border: "none", cursor: "pointer", fontSize: 13.5, fontWeight: on ? 700 : 500, color: on ? "var(--accent)" : "var(--text)", background: on ? "var(--accent-weak)" : "transparent" }}
                    >
                      {multi && <Checkbox on={on} />}
                      {o}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </>,
        document.body
      )}
      {multi && chipValues.length > 0 && (
        <div className="row gap-2" style={{ flexWrap: "wrap", marginTop: 10 }}>
          {chipValues.slice(0, 3).map(o => (
            <div key={o} className="chip on" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {o}
              <button type="button" onClick={() => toggle(o)} style={{ background: "none", border: "none", padding: 0, margin: 0, cursor: "pointer", color: "inherit", display: "flex" }}>
                <Icon name="x" size={14} />
              </button>
            </div>
          ))}
          {chipValues.length > 3 && (
            <div className="chip faint" style={{ display: "flex", alignItems: "center", gap: 6, cursor: "default", background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", fontSize: 13, fontWeight: 500 }}>
              +{chipValues.length - 3} more
            </div>
          )}
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
          style={{ textAlign: "left", padding: o.icon ? "16px 16px 14px 16px" : 14, cursor: "pointer", display: "flex", flexDirection: o.icon ? "column" : "row", justifyContent: "space-between", alignItems: o.icon ? "flex-start" : "center" }} onClick={() => toggle(o.v)}>
          
          {o.icon ? (
            <>
              <div style={{ display: "flex", width: "100%", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: isOn(o.v) ? "var(--accent)" : "var(--panel-inset)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: isOn(o.v) ? "#fff" : "var(--text-strong)", transition: "all 0.2s" }}>
                  <Icon name={o.icon} size={16} />
                </div>
                <div style={{ width: 18, height: 18, borderRadius: "50%", border: isOn(o.v) ? "none" : "1.5px solid var(--border-strong)", background: isOn(o.v) ? "var(--accent)" : "transparent", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginLeft: 10 }}>
                  {isOn(o.v) && <Icon name="check" size={10} />}
                </div>
              </div>
              <div style={{ width: "100%" }}>
                <b style={{ fontSize: 13.5, display: "block" }}>{o.t}</b>
                <p className="faint" style={{ fontSize: 12, margin: "3px 0 0", display: "block" }}>{o.d}</p>
              </div>
            </>
          ) : (
            <>
              <div>
                <b style={{ fontSize: 13.5 }}>{o.t}</b>
                <p className="faint" style={{ fontSize: 12, margin: "3px 0 0" }}>{o.d}</p>
              </div>
              <div style={{ width: 18, height: 18, borderRadius: "50%", border: isOn(o.v) ? "none" : "1.5px solid var(--border-strong)", background: isOn(o.v) ? "var(--accent)" : "transparent", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginLeft: 10 }}>
                {isOn(o.v) && <Icon name="check" size={10} />}
              </div>
            </>
          )}
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
    <div className="reach" style={{ 
      marginBottom: 32, 
      position: "sticky", 
      top: 0, 
      zIndex: 10 
    }}>
      <div className="reach-top">
        <span className="r-ic"><Icon name="users" size={22} /></span>
        <div style={{ flex: 1, opacity: updating ? 0.5 : 1, transition: "opacity .2s" }}>
          <div className="r-num">{firstLoad ? "—" : reach.toLocaleString("en-US")}</div>
          <div className="r-lab">{firstLoad ? t("onboardingFields.findingAudience", null, "Finding your audience…") : t("onboardingFields.validatorsMatch", null, "validators match this audience")}</div>
        </div>
        {updating && (
          <span className="pill" style={{ background: "var(--panel)", color: "var(--text-muted)", border: "none" }}><Icon name="clock" size={13} /> {t("onboardingFields.updating", null, "Updating…")}</span>
        )}
      </div>
      <div className="r-bar"><i style={{ width: Math.max(4, pct) + "%" }} /></div>
      <div className="r-foot"><span>{t("createMission.highlyTargeted", null, "Highly targeted pool")}</span><span>{t("createMission.pctOfNetwork", { pct }, `${pct}% of network`)}</span></div>
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

  // State options: union of every currently selected country's own regions
  // -- State used to be a bare free-text box with no idea what country it
  // was even in. Each name is tagged with which country contributed it, for
  // the dropdown's own group headers once more than one country is active.
  // ponytail: a region name that exists in two different countries (rare)
  // keeps whichever country's copy this loop reaches first rather than
  // trying to show it under both -- upgrade path is a real per-country-
  // qualified value if that ever turns out to matter in practice.
  const stateToCountry = {};
  const stateOptionsSet = new Set();
  for (const c of countries) {
    for (const r of (REGIONS_BY_COUNTRY[c] || [])) {
      if (!stateOptionsSet.has(r)) { stateOptionsSet.add(r); stateToCountry[r] = c; }
    }
  }
  const stateOptions = [...stateOptionsSet];
  const rawState = d.state;
  const states = Array.isArray(rawState) ? rawState : (rawState ? [rawState] : []);

  // Dropping a country shouldn't leave its states still selected -- same
  // cleanup the City effect below does one level further down for states.
  useEffect(() => {
    const stillValid = states.filter(s => stateOptionsSet.has(s));
    if (stillValid.length !== states.length) set("state", stillValid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(countries)]);

  // City options: the backend's /geo/cities is scoped to one country+state
  // pair per call, so this fires one request per currently selected state
  // and merges the results -- tagged with which state each city came from,
  // same grouping treatment State gets from country. Same rare-collision
  // simplification as state names above: a city name shared by two selected
  // states keeps whichever state's copy arrives first.
  const [cityOptions, setCityOptions] = useState([]);
  const [cityToState, setCityToState] = useState({});
  useEffect(() => {
    if (!withCity || states.length === 0) { 
      const timer = setTimeout(() => { setCityOptions([]); setCityToState({}); }, 0);
      return () => clearTimeout(timer);
    }
    let cancelled = false;
    Promise.all(states.map(s =>
      api.get(`/geo/cities?country=${encodeURIComponent(stateToCountry[s] || "")}&state=${encodeURIComponent(s)}`)
        .then(res => ({ state: s, cities: res?.cities || [] }))
        .catch(() => ({ state: s, cities: [] }))
    )).then(results => {
      if (cancelled) return;
      const seen = new Set();
      const map = {};
      for (const { state, cities } of results) {
        for (const city of cities) {
          if (!seen.has(city)) { seen.add(city); map[city] = state; }
        }
      }
      setCityOptions([...seen]);
      setCityToState(map);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [withCity, JSON.stringify(states)]);

  const rawCity = d.city;
  const cities = Array.isArray(rawCity) ? rawCity : (rawCity ? [rawCity] : []);
  // Same cleanup as State's own effect, one level down: a city whose state
  // got deselected (or whose fetch just came back without it) shouldn't
  // linger as if it were still a real pick.
  useEffect(() => {
    if (!withCity) return;
    const validSet = new Set(cityOptions);
    const stillValid = cities.filter(c => validSet.has(c));
    if (stillValid.length !== cities.length) set("city", stillValid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [withCity, JSON.stringify(cityOptions)]);
  return (
    <div className="fgrid c2">
      <Field label={t("onboardingFields.country", null, "Country")} required invalid={showErrors && countries.length === 0} dataField={dataField} issue={issue} action={<ClearAllAction options={COUNTRY_NAMES} value={countries} onChange={(v) => set("country", v)} />}>
        <ChipsDropdown options={COUNTRY_NAMES} value={countries} onChange={(v) => set("country", v)} placeholder={t("onboardingFields.selectCountryPlaceholder", null, "Select country(ies)")} />
      </Field>
      <Field label={t("onboardingFields.stateRegion", null, "State")} action={<ClearAllAction options={stateOptions} value={states} onChange={(v) => set("state", v)} />}>
        <ChipsDropdown options={stateOptions} value={states} onChange={(v) => set("state", v)}
          placeholder={countries.length ? t("onboardingFields.selectStatePlaceholder", null, "Select state(s)") : t("onboardingFields.selectCountryFirstPlaceholder", null, "Select a country first")}
          groupOf={countries.length > 1 ? (s => stateToCountry[s]) : undefined} />
      </Field>
      {withCity && (
        <Field label={t("onboardingFields.city", null, "City")} optional action={<ClearAllAction options={cityOptions} value={cities} onChange={(v) => set("city", v)} />}>
          <ChipsDropdown options={cityOptions} value={cities} onChange={(v) => set("city", v)}
            placeholder={states.length ? t("onboardingFields.selectCityPlaceholder", null, "Select city(ies)") : t("onboardingFields.selectStateFirstPlaceholder", null, "Select a state first")}
            groupOf={states.length > 1 ? (c => cityToState[c]) : undefined} />
        </Field>
      )}
    </div>
  );
}

export function DemographicsRow({ d, set, ageOptions, genderOptions, showErrors, requireAge, requireGender, issue }) {
  const { t } = useTranslation();
  const ageOpts = ageOptions || ["18–24", "25–34", "35–44", "45–54", "55+"];
  const genderOpts = genderOptions || [t("onboardingFields.any", null, "Any"), t("onboardingFields.genderFemale", null, "Female"), t("onboardingFields.genderMale", null, "Male")];
  return (
    <div className="col gap-3">
      <Field label={t("onboardingFields.age", null, "Age range")} invalid={showErrors && requireAge && !(d.ageBands || []).length} dataField={requireAge ? "ageBands" : undefined} issue={issue}>
        <Chips options={ageOpts} value={d.ageBands} onChange={(v) => set("ageBands", v)} />
      </Field>
      <Field label={t("onboardingFields.gender", null, "Gender")} invalid={showErrors && requireGender && !(d.genders || []).length} dataField={requireGender ? "genders" : undefined} issue={issue}>
        <Chips options={genderOpts} value={d.genders} onChange={(v) => set("genders", v)} />
      </Field>
    </div>
  );
}

export function ProfileChips({ d, set, region, show = {}, occOptions, incomeOptions, interestOptions, showErrors, requireOccupation, issue }) {
  const { t } = useTranslation();
  const notYetTrackedHint = t("onboardingFields.notYetTrackedHint", null, "Not yet tracked on validator profiles — doesn't affect the match count.");

  const defaultOccOptions = occOptions || [t("onboardingFields.occStudent", null, "Student"), t("onboardingFields.occWorkingProfessional", null, "Working Professional"), t("onboardingFields.occEntrepreneur", null, "Entrepreneur"), t("onboardingFields.occHomemaker", null, "Homemaker"), t("onboardingFields.occRetired", null, "Retired"), t("onboardingFields.any", null, "Any")];
  // occupationsOther mirrors whichever of the current selection's entries
  // aren't one of the preset options -- exposed separately because Settings
  // reads it back that way (profile.occupationsOther) alongside occupations
  // itself, same shape Interests already persists.
  const customOccs = d.occupationsOther || [];
  const occupationOptions = defaultOccOptions;
  const occSel = new Set(d.occupations || []);
  const hasOtherOcc = occupationOptions.includes("Other");
  const saveOtherOcc = (val) => {
    set("occupations", [...(d.occupations || []).filter(o => o !== "Other"), val]);
    set("occupationsOther", [...customOccs, val]);
  };
  const removeOtherOcc = (val) => {
    set("occupations", (d.occupations || []).filter(o => o !== val));
    set("occupationsOther", customOccs.filter(v => v !== val));
  };
  const cancelOtherOcc = () => set("occupations", (d.occupations || []).filter(o => o !== "Other"));

  const educationOptions = [t("onboardingFields.eduHighSchool", null, "High school"), t("onboardingFields.eduDiploma", null, "Diploma"), t("onboardingFields.eduUndergraduate", null, "Undergraduate"), t("onboardingFields.eduPostgraduate", null, "Postgraduate"), t("onboardingFields.eduPhd", null, "PhD / Doctorate")];
  const incomeBandOptions = incomeOptions || (region === "india" ? ["< ₹3L", "₹3–6L", "₹6–12L", "₹12–25L", "₹25L–1Cr", "₹1Cr+"] : ["< $25k", "$25–50k", "$50–100k", "$100–200k", "$200k+"]);
  const languageOptions = region === "india"
    ? [t("onboardingFields.langHindi", null, "Hindi"), t("onboardingFields.langEnglish", null, "English"), t("onboardingFields.langTamil", null, "Tamil"), t("onboardingFields.langTelugu", null, "Telugu"), t("onboardingFields.langKannada", null, "Kannada"), t("onboardingFields.langBengali", null, "Bengali"), t("onboardingFields.langMarathi", null, "Marathi"), t("onboardingFields.langGujarati", null, "Gujarati"), t("onboardingFields.langMalayalam", null, "Malayalam"), t("onboardingFields.langPunjabi", null, "Punjabi")]
    : [t("onboardingFields.langEnglish", null, "English"), t("onboardingFields.langSpanish", null, "Spanish"), t("onboardingFields.langFrench", null, "French"), t("onboardingFields.langGerman", null, "German"), t("onboardingFields.langMandarin", null, "Mandarin"), t("onboardingFields.langArabic", null, "Arabic"), t("onboardingFields.langPortuguese", null, "Portuguese"), t("onboardingFields.langJapanese", null, "Japanese")];

  const defaultIntOptions = interestOptions || [t("onboardingFields.intAI", null, "AI"), t("onboardingFields.intStartups", null, "Startups"), t("onboardingFields.intFitness", null, "Fitness"), t("onboardingFields.intHealthcare", null, "Healthcare"), t("onboardingFields.intEducation", null, "Education"), t("onboardingFields.intFinance", null, "Finance"), t("onboardingFields.intGaming", null, "Gaming"), t("onboardingFields.intParenting", null, "Parenting"), t("onboardingFields.intTravel", null, "Travel"), t("onboardingFields.intFashion", null, "Fashion"), t("onboardingFields.intFood", null, "Food"), t("onboardingFields.intSustainability", null, "Sustainability")];
  const customInts = d.interestsOther || [];
  const finalIntOptions = defaultIntOptions;
  const intSel = new Set(d.interests || []);
  const hasOtherInt = finalIntOptions.includes("Other");
  const saveOtherInt = (val) => {
    set("interests", [...(d.interests || []).filter(o => o !== "Other"), val]);
    set("interestsOther", [...customInts, val]);
  };
  const removeOtherInt = (val) => {
    set("interests", (d.interests || []).filter(o => o !== val));
    set("interestsOther", customInts.filter(v => v !== val));
  };
  const cancelOtherInt = () => set("interests", (d.interests || []).filter(o => o !== "Other"));

  return (
    <div className="col gap-3">
      {show.occupation && (
        <div className={showErrors && requireOccupation && !occSel.size ? "fld-invalid" : undefined} data-field={requireOccupation ? "occupations" : undefined}>
          <FSection label={t("onboardingFields.occupation", null, "Occupation")} required={requireOccupation}
            count={occSel.size ? t("onboarding.selectedCount", { count: occSel.size }, `${occSel.size} selected`) : null}
            action={<ClearAllAction options={occupationOptions} value={d.occupations} onChange={(v) => set("occupations", v)} closeOnPick={hasOtherOcc ? ["Other"] : []} />}
            invalid={showErrors && requireOccupation && !occSel.size} dataField={requireOccupation ? "occupations" : undefined} issue={issue} />
          <ChipsDropdown options={occupationOptions} value={d.occupations} onChange={(v) => set("occupations", v)} placeholder={t("onboardingFields.selectOccupationPlaceholder", null, "Select occupation(s)")} hideChips={hasOtherOcc ? ["Other"] : []} closeOnPick={hasOtherOcc ? ["Other"] : []} />
          {hasOtherOcc && (
            <OtherEntryField isOpen={occSel.has("Other")} customValues={customOccs} onSave={saveOtherOcc} onRemove={removeOtherOcc} onCancel={cancelOtherOcc} placeholder={t("onboardingFields.occupationOtherPlaceholder", null, "e.g. Product Designer")} showErrors={showErrors} />
          )}
        </div>
      )}
      {show.education && (
        <Field label={t("onboardingFields.education", null, "Education")} optional
          action={<SelectAllToggle options={educationOptions} value={d.educations} onChange={(v) => set("educations", v)} />}>
          <Chips options={educationOptions} value={d.educations} onChange={(v) => set("educations", v)} />
        </Field>
      )}
      {show.income && (
        <Field label={t("onboardingFields.incomeBand", null, "Income range (annual)")}>
          <Chips options={incomeBandOptions} value={d.incomeBands} onChange={(v) => set("incomeBands", v)} />
        </Field>
      )}
      {show.languages && (
        <Field label={t("onboardingFields.languages", null, "Languages")} optional hint={notYetTrackedHint}
          action={<SelectAllToggle options={languageOptions} value={d.languages} onChange={(v) => set("languages", v)} />}>
          <Chips options={languageOptions} value={d.languages} onChange={(v) => set("languages", v)} />
        </Field>
      )}
      {show.interests && (
        <div>
          <FSection label={t("onboardingFields.interests", null, "Interests")}
            count={intSel.size ? t("onboarding.selectedCount", { count: intSel.size }, `${intSel.size} selected`) : null}
            action={<ClearAllAction options={finalIntOptions} value={d.interests} onChange={(v) => set("interests", v)} closeOnPick={hasOtherInt ? ["Other"] : []} />} />
          <ChipsDropdown options={finalIntOptions} value={d.interests} onChange={(v) => set("interests", v)} placeholder={t("onboardingFields.selectInterestsPlaceholder", null, "Select interest(s)")} hideChips={hasOtherInt ? ["Other"] : []} closeOnPick={hasOtherInt ? ["Other"] : []} />
          {hasOtherInt && (
            <OtherEntryField isOpen={intSel.has("Other")} customValues={customInts} onSave={saveOtherInt} onRemove={removeOtherInt} onCancel={cancelOtherInt} placeholder={t("onboardingFields.interestOtherPlaceholder", null, "e.g. Photography")} showErrors={showErrors} />
          )}
        </div>
      )}
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
export function VerifyRow({ icon, title, desc, placeholder, value, onChange, optional, showErrors, validate, dataField, issue, submitLabel = "Submit for review", submittedLabel = "Sent for review", submittedIcon = "clock", submittedTheme = "warning" }) {
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const trimmed = (value || "").trim();
  const liveError = validate ? validate(value) : null;
  const missingRequired = showErrors && !optional && !trimmed;
  const invalid = missingRequired || (!!trimmed && !!liveError);
  
  const canSubmit = !!trimmed && !invalid && !isSubmitting;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
    }, 1500);
  };

  const isSuccess = submittedTheme === "success";

  return (
    <div className="card" style={{ padding: 20, marginBottom: 16, display: "flex", gap: 20, alignItems: "center", border: invalid ? "1px solid var(--danger)" : undefined }} data-field={dataField}>
      <div style={{ width: 36, height: 36, borderRadius: 8, background: submitted ? "#ecfdf5" : "var(--panel-inset)", color: submitted ? "#10b981" : "var(--text-strong)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon name={submitted ? "check" : icon} size={18} />
      </div>
      
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <b style={{ fontSize: 13.5, color: "var(--text-strong)", marginBottom: 10 }}>{title} {optional && <span className="faint" style={{ fontWeight: 400 }}>optional</span>}</b>
        
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1 }}>
            <input 
              className={`fin ${invalid ? "fin-invalid" : ""}`} 
              style={{ width: "100%", padding: "8px 12px", background: (submitted || isSubmitting) ? "var(--bg)" : undefined, color: (submitted || isSubmitting) ? "var(--text-strong)" : undefined }} 
              value={value || ""} 
              onChange={(e) => { onChange(e.target.value); setSubmitted(false); }} 
              placeholder={placeholder} 
              disabled={submitted || isSubmitting}
            />
            {submittedTheme === "success" && <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-faint)", pointerEvents: "none" }}><Icon name="chevronDown" size={16} /></div>}
          </div>
          
          {submitted ? (
            <div style={{ background: isSuccess ? "#ecfdf5" : "#fffbeb", color: isSuccess ? "#10b981" : "#d97706", padding: "8px 16px", borderRadius: 100, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
              <Icon name={submittedIcon} size={14} />
              {submittedLabel}
            </div>
          ) : isSubmitting ? (
            <button 
              disabled
              style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 6, padding: "8px 16px", fontSize: 13, fontWeight: 500, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6, cursor: "default" }}>
              <Icon name="loader" className="spin" size={14} style={{ color: "#8b5cf6" }} />
              Submitting
            </button>
          ) : (
            <button 
              onClick={handleSubmit} 
              disabled={!canSubmit} 
              style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 6, padding: "8px 16px", fontSize: 13, fontWeight: 500, color: canSubmit ? "var(--text-strong)" : "var(--text-muted)", opacity: canSubmit ? 1 : 0.5, cursor: canSubmit ? "pointer" : "default" }}>
              {submitLabel}
            </button>
          )}
        </div>
        
        {trimmed && liveError && <div className="err" style={{ fontSize: 12, color: "var(--danger)", marginTop: 6 }}>{liveError}</div>}
        <p className="faint" style={{ fontSize: 12, margin: "8px 0 0" }}>{desc}</p>
        <FieldIssue id={dataField} issue={issue} />
      </div>
    </div>
  );
}

const TrustProfileRow = ({ label, desc, added, last }) => (
  <div className="row between" style={{ alignItems: "center", paddingBottom: last ? 0 : 12, borderBottom: last ? "none" : "1px solid var(--border)" }}>
    <div className="row gap-2" style={{ alignItems: "center" }}>
      <div style={{ width: 20, height: 20, borderRadius: "50%", background: added ? "var(--accent)" : "transparent", border: added ? "none" : "1.5px solid var(--border-strong)", color: added ? "#fff" : "var(--border-strong)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon name="check" size={12} />
      </div>
      <span style={{ fontSize: 13.5, fontWeight: added ? 700 : 400, color: added ? "inherit" : "var(--text-muted)" }}>{label}</span>
    </div>
    {added ? (
      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", background: "var(--accent-weak)", padding: "2px 8px", borderRadius: 12 }}>Added</span>
    ) : (
      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{desc}</span>
    )}
  </div>
);

export function TrustProfileWidget({ d }) {
  const hasDomain = !!(d?.vWebsiteInput || d?.website);
  const hasCompanyPage = !!d?.vCompanyInput;
  const hasRegistry = !!(d?.gst || d?.cin || d?.taxId);

  return (
    <div className="card" style={{ padding: "20px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--accent-weak)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="shieldCheck" size={16} />
        </div>
        <b style={{ fontSize: 15 }}>Trust profile</b>
      </div>
      
      <div className="col gap-3">
        <TrustProfileRow label="Identity" desc="" added={!!d?.fullName} />
        <TrustProfileRow label="Email" desc="Company domain" added={!!d?.email} />
        <TrustProfileRow label="LinkedIn" desc="Verified profile" added={!!d?.linkedin} />
        <TrustProfileRow label="Domain" desc="Website ownership" added={hasDomain} />
        <TrustProfileRow label="Company page" desc="LinkedIn company" added={hasCompanyPage} />
        <TrustProfileRow label="Business registry" desc="GST / CIN / Tax ID" added={hasRegistry} last={true} />
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
    <div className="col gap-4">
      <Field label={t("onboardingFields.fullName", null, "Full name")} invalid={showErrors && !(d.fullName || "").trim()} dataField="fullName" issue={issue}>
        <div style={{ position: "relative" }}>
          <div style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}>
            <Icon name="user" size={16} />
          </div>
          <TextInput value={d.fullName} onChange={(v) => set("fullName", v)} placeholder="RK" style={{ paddingLeft: 42 }} />
        </div>
      </Field>
      
      <div className="fgrid c2">
        <Field label={t("onboardingFields.email", null, "Work email")} invalid={showErrors && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email || "")} dataField="email" issue={issue}
          action={<span style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}><Icon name="lock" size={12} /> private</span>}
          hint={t("onboardingFields.emailHint", null, "A work domain raises your trust tier")}
        >
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}>
              <Icon name="mail" size={16} />
            </div>
            <TextInput type="email" value={d.email} onChange={(v) => set("email", v)} placeholder="rkgit7767@gmail.com" disabled={emailLocked} style={{ paddingLeft: 42, paddingRight: 42 }} />
            <div style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", color: "var(--success)" }}>
              <Icon name="check" size={16} />
            </div>
          </div>
        </Field>
        
        <Field label={t("onboardingFields.mobileNumber", null, "Mobile number")} optional hint="Used only for verification">
          <div className="fin opt-pill" style={{ display: "flex", padding: 0, overflow: "hidden", background: "var(--panel-inset)" }}>
            <div style={{ padding: "0 16px", borderRight: "1px solid var(--border)", display: "flex", alignItems: "center", fontSize: 15, color: "var(--text-muted)" }}>
              +91
            </div>
            <div style={{ flex: 1 }}>
              <TextInput value={d.mobile} onChange={(v) => set("mobile", v)} placeholder="7032982932" style={{ border: "none", boxShadow: "none", background: "transparent", borderRadius: 0, width: "100%", height: "100%" }} />
            </div>
          </div>
        </Field>
      </div>

      <div className="fgrid c2">
        <Field label={roleField?.label || t("onboardingFields.jobTitle", null, "Job title")} invalid={showErrors && !d.designation} dataField="designation" issue={issue}>
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", zIndex: 1, pointerEvents: "none" }}>
              <Icon name="briefcase" size={16} />
            </div>
            <SelectInput value={d.designation} onChange={(v) => set("designation", v)} options={roleOptions} placeholder={t("onboardingFields.selectRole", null, "Select role")} style={{ paddingLeft: 42 }} />
          </div>
        </Field>
        
        <Field label={t("onboardingFields.linkedin", null, "LinkedIn profile")} optional hint="Speeds up reviewer trust">
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}>
              <Icon name="link" size={16} />
            </div>
            <TextInput value={d.linkedin} onChange={(v) => set("linkedin", v)} placeholder="linkedin.com/in/..." style={{ paddingLeft: 42 }} />
          </div>
        </Field>
      </div>

      {isOther && (
        <Field label={t("onboardingFields.customRole", null, "Your role")} span invalid={showErrors && !(d.designationOther || "").trim()} dataField="designationOther" issue={issue}>
          <TextInput value={d.designationOther} onChange={(v) => set("designationOther", v)} placeholder={t("onboardingFields.customRolePlaceholder", null, "Type your role")} />
        </Field>
      )}
    </div>
  );
}
