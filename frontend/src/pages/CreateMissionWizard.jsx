import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useSearchParams, useLocation } from "react-router-dom";
import { toast } from "react-hot-toast";
import Icon from "../components/Icon";
import { BrandMark } from "../components/BrandMark";
import { Modal } from "../components/Modal";
import React from 'react';
import { Btn, inr } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { useMeta } from "../context/MetaContext";
import { api } from "../api/client";
import StepTestCases from "../components/StepTestCases";
import { isTestCasesStale } from "../utils/isTestCasesStale";
import {
  getRecentDraftId, setRecentDraftId, clearRecentDraftId,
  getScratch, setScratch, clearScratch, clearAllLocalDraftState, hasContent,
} from "../utils/missionDraft";
import { useTranslation } from "../i18n/index.jsx";
import { trFilterLabel } from "../data/audienceFilterLabels";
import { categoryLabel, categoryDesc, ptypeLabel, ptypeDesc, rewardLabel, rewardDesc } from "../bi18n";

function wzSteps(t) {
  return [
    { t: t("createMission.step1Title", null, "Mission Information"), s: t("createMission.step1Subtitle", null, "Name & category"), hint: t("createMission.step1Hint", null, "Give your mission a clear name and pick the kind of validation you need.") },
    { t: t("createMission.step2Title", null, "Feedback Format"), s: t("createMission.step2Subtitle", null, "How they engage"), hint: t("createMission.step2Hint", null, "Choose how participants will engage with your product.") },
    { t: t("createMission.step3Title", null, "Define the test"), s: t("createMission.step3Subtitle", null, "AI-generated tasks"), hint: t("createMission.step3Hint", null, "Describe your product and let AI generate structured test tasks tailored to this mission type.") },
    { t: t("createMission.step4Title", null, "Audience Builder"), s: t("createMission.step4Subtitle", null, "Who you'll reach"), hint: t("createMission.step4Hint", null, "Layer filters to define exactly who you want to hear from. The count updates live.") },
    { t: t("createMission.step5Title", null, "Reward Setup"), s: t("createMission.step5Subtitle", null, "What they earn"), hint: t("createMission.step5Hint", null, "Set the incentive and size your panel — costs update as you type.") },
    { t: t("createMission.step6Title", null, "Review & Publish"), s: t("createMission.step6Subtitle", null, "Confirm & launch"), hint: t("createMission.step6Hint", null, "One last look before it goes live to your matched audience.") },
  ];
}



// Shown above whichever section of a step is locked once a validator has
// accepted this mission — mirrors the backend's own field-level allowlist
// (PATCH /missions/:id), which silently drops these same fields from an
// update once that's true, so the UI shouldn't offer to edit them at all.
function LockedHint() {
  const { t } = useTranslation();
  return (
    <p className="fhint" style={{ background: "var(--panel-inset)", padding: "10px 12px", borderRadius: "var(--radius)", margin: "0 0 14px", display: "flex", alignItems: "center", gap: 8 }}>
      <Icon name="lock" size={13} style={{ flexShrink: 0, color: "var(--text-faint)" }} />
      {t("createMission.fieldsLockedHint", null, "Locked because a validator has already accepted this mission — shown here for reference.")}
    </p>
  );
}

function StepInfo({ d, set, categories, showErrors, locked }) {
  const { t } = useTranslation();
  const todayStr = new Date().toISOString().slice(0, 10);
  return (
    <div className="rise">
      <div className={`fld ${showErrors && !d.title.trim() ? "fld-invalid" : ""}`} style={{ marginBottom: 18 }}>
        <label>{t("createMission.missionTitleLabel", null, "Mission Title")} <span className="req-star" aria-hidden="true">*</span></label>
        <input className="fin" placeholder={t("createMission.missionTitlePlaceholder", null, "e.g. Cold Brew Can — Taste Panel")} value={d.title} onChange={e => set({ title: e.target.value })} />
        <p className="fhint">{t("createMission.missionTitleHint", null, "Members see this first — make it specific and inviting.")}</p>
      </div>
      <div className={`fld ${showErrors && !d.desc.trim() ? "fld-invalid" : ""}`} style={{ marginBottom: 24 }}>
        <label>{t("createMission.descriptionLabel", null, "Description")} <span className="req-star" aria-hidden="true">*</span></label>
        <textarea className="field" placeholder={t("createMission.descriptionPlaceholder", null, "Describe what you're validating, what participants will do, and what a great submission looks like.")} value={d.desc} onChange={e => set({ desc: e.target.value })} />
      </div>
      <div className={`fld ${showErrors && (!d.deadline || d.deadline < todayStr) ? "fld-invalid" : ""}`} style={{ marginBottom: 24, maxWidth: 280 }}>
        <label>{t("createMission.deadlineLabel", null, "Mission deadline")} <span className="req-star" aria-hidden="true">*</span></label>
        <input className="fin" type="date" min={todayStr} value={d.deadline} onChange={e => set({ deadline: e.target.value < todayStr ? todayStr : e.target.value })} onClick={e => e.currentTarget.showPicker?.()} />
        <p className="fhint">{t("createMission.deadlineHint", null, "The last day this mission accepts new participants.")}</p>
        {showErrors && d.deadline && d.deadline < todayStr && <p className="ferr">{t("createMission.deadlineInPast", null, "Deadline can't be in the past")}</p>}
      </div>
      <div className="fsec"><b>{t("createMission.missionCategoryLabel", null, "Mission Category")} <span className="req-star" aria-hidden="true">*</span></b><span className="line" /><span className="cnt">{t("createMission.pickOne", null, "Pick one")}</span></div>
      {locked && <LockedHint />}
      <div className="optcards" style={locked ? { opacity: 0.6, pointerEvents: "none" } : undefined}>
        {categories.map(c => (
          <button key={c.id} className={`optcard ${d.cat === c.id ? "on" : ""}`} style={{ "--tc": `var(--t-${c.id})` }} disabled={locked} onClick={() => set({ cat: c.id })}>
            <span className="oc-tick"><Icon name="check" size={12} /></span>
            <span className="oc-ic"><Icon name={c.icon} size={20} /></span>
            <b>{categoryLabel(t, c)}</b><p>{categoryDesc(t, c)}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

export function FilterGroup({ title, options, sel, toggle, otherEntries, onOtherEntriesChange, onSelectAll, initialExpanded = true, externalQuery, otherValue = "Other" }) {
  const { t } = useTranslation();
  const [q, setQ] = React.useState("");
  const [expanded, setExpanded] = React.useState(initialExpanded);
  // Uncommitted text for a new "Other" entry — separate from the saved
  // otherEntries array below, so typing doesn't add a filter until Save.
  const [draftOther, setDraftOther] = React.useState("");
  const [addingOther, setAddingOther] = React.useState(false);
  // A caller-driven search (e.g. a modal-wide search bar) takes over this
  // group's own filtering instead of running alongside it — two active
  // queries at once would be confusing and the caller already decided
  // matching groups should be forced open.
  const hasExternalQuery = externalQuery !== undefined;
  const activeQuery = hasExternalQuery ? externalQuery : q;
  const showSearch = !hasExternalQuery && options.length > 8;
  const filtered = activeQuery.trim() ? options.filter(o => o.toLowerCase().includes(activeQuery.toLowerCase())) : options;
  if (hasExternalQuery && externalQuery.trim() && filtered.length === 0) return null;
  const isOpen = (hasExternalQuery && externalQuery.trim()) ? true : expanded;
  const showOtherInput = onOtherEntriesChange && sel.has(otherValue);
  const savedOther = otherEntries || [];
  const saveOther = () => {
    const v = draftOther.trim();
    if (!v) return;
    onOtherEntriesChange([...savedOther, v]);
    setDraftOther("");
    setAddingOther(false);
  };
  // Scoped to this group's own options — `sel` is shared across sibling
  // subgroups (e.g. all of Geography's regions share one Set), so counting
  // sel.size directly would show the whole category's total on every
  // subgroup instead of just what's actually selected here.
  const ownSelectedCount = options.reduce((n, o) => n + (sel.has(o) ? 1 : 0), 0);
  const allSelected = options.length > 0 && options.every(o => sel.has(o));
  return (
    <div className="fsec" style={{ display: "block", margin: "22px 0 10px" }}>
      <div className="row between" style={{ marginBottom: 10, cursor: "pointer" }} onClick={() => setExpanded(v => !v)}>
        <div className="row gap-2" style={{ alignItems: "center" }}>
          <Icon name={isOpen ? "chevronDown" : "chevronRight"} size={14} style={{ color: "var(--text-faint)" }} />
          <b style={{ fontSize: 12.5 }}>{trFilterLabel(t, title)}</b>
        </div>
        <div className="row gap-3" style={{ alignItems: "center" }}>
          {ownSelectedCount > 0 && <span className="cnt mono" style={{ color: "var(--accent)" }}>{t("createMission.selectedCount", { count: ownSelectedCount }, `${ownSelectedCount} selected`)}</span>}
          {onSelectAll && (
            <button className="backlink" style={{ margin: 0, fontSize: 12 }} onClick={e => { e.stopPropagation(); onSelectAll(options); }}>
              {allSelected ? t("createMission.clearAll", null, "Clear all") : t("createMission.selectAll", null, "Select all")}
            </button>
          )}
        </div>
      </div>
      {isOpen && (
        <>
          {showSearch && (
            <input
              className="fin"
              style={{ marginBottom: 10, fontSize: 13 }}
              placeholder={t("createMission.searchGroupPlaceholder", { group: title.toLowerCase() }, `Search ${title.toLowerCase()}…`)}
              value={q}
              onChange={e => setQ(e.target.value)}
            />
          )}
          <div className="chips">
            {filtered.map(o => (
              <button key={o} className={`chip ${sel.has(o) ? "on" : ""}`}
                onClick={() => toggle(title, o)}>
                <span className="ck"><Icon name="check" size={10} /></span>{trFilterLabel(t, o)}
              </button>
            ))}
            {filtered.length === 0 && <span className="muted" style={{ fontSize: 12 }}>{t("createMission.noMatchesFor", { q: activeQuery }, `No matches for "${activeQuery}"`)}</span>}
          </div>
          {showOtherInput && (
            <div style={{ marginTop: 10 }}>
              {savedOther.length > 0 && (
                <div className="row" style={{ flexWrap: "wrap", gap: 8, marginBottom: savedOther.length ? 8 : 0 }}>
                  {savedOther.map((val, i) => (
                    <div key={i} className="afilter-chip">
                      {val} <button onClick={() => onOtherEntriesChange(savedOther.filter((_, j) => j !== i))}><Icon name="x" size={12} /></button>
                    </div>
                  ))}
                </div>
              )}
              {(savedOther.length === 0 || addingOther) ? (
                <div className="row gap-2" style={{ alignItems: "center" }}>
                  <input
                    className="fin"
                    style={{ fontSize: 13, maxWidth: 220 }}
                    placeholder={t("createMission.otherGeoPlaceholder", null, "e.g. Nepal, Sri Lanka…")}
                    value={draftOther}
                    onChange={e => setDraftOther(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); saveOther(); } }}
                  />
                  <button type="button" className="btn btn-primary" style={{ padding: "7px 14px", fontSize: 13 }} disabled={!draftOther.trim()} onClick={saveOther}>{t("actions.save", null, "Save")}</button>
                  <button type="button" className="btn outline" style={{ padding: "7px 14px", fontSize: 13 }} onClick={() => { setDraftOther(""); setAddingOther(false); }}>{t("actions.cancel", null, "Cancel")}</button>
                </div>
              ) : (
                <button type="button" className="backlink" style={{ margin: 0, fontSize: 12.5 }} onClick={() => setAddingOther(true)}>
                  <Icon name="plus" size={13} style={{ verticalAlign: -2, marginRight: 4 }} />{t("createMission.addAnotherOther", null, "Add more")}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
function StepAudience({ d, set, toggle, selectAllInGroup, filters, liveCount, isFetchingCount, basePool }) {
  const { t } = useTranslation();
  const count = liveCount;
  const pct = basePool > 0 ? Math.min(100, Math.round((count / basePool) * 100)) : 0;
  return (
    <div className="rise">
      <div className="reach" style={{ marginBottom: 8, position: "sticky", top: 0, zIndex: 5 }}>
        <div className="reach-top">
          <span className="r-ic"><Icon name="users" size={22} /></span>
          <div style={{ flex: 1, opacity: isFetchingCount ? 0.5 : 1, transition: "opacity 0.2s" }}>
            <div className="r-num" key={count}>{count.toLocaleString("en-IN")} <span style={{ fontSize: 14, color: "var(--text-muted)", fontWeight: 600 }}>{Object.entries(d.filters).flatMap(([, s]) => [...s]).length > 0 ? t("createMission.matchingMembers", null, "matching members") : t("createMission.availableMembers", null, "available members")}</span></div>
            <div className="r-lab">{t("createMission.availableNow", null, "available right now for this audience")}</div>
          </div>
          {isFetchingCount ? (
            <span className="pill" style={{ background: "var(--panel)", color: "var(--text-muted)", border: "none" }}><Icon name="clock" size={13} /> {t("createMission.updating", null, "Updating...")}</span>
          ) : (
            <span className="pill" style={{ background: "var(--success-weak)", color: "var(--success)", border: "none" }}><Icon name="bolt" size={13} /> {t("createMission.live", null, "Live")}</span>
          )}
        </div>
        <div className="r-bar"><i style={{ width: Math.max(4, pct) + "%" }} /></div>
        <div className="r-foot"><span>{t("createMission.narrowerHigherQuality", null, "Narrower = higher quality")}</span><span>{t("createMission.pctOfTotalPool", { pct }, `${pct}% of total pool`)}</span></div>
      </div>
      {(() => {
        const hasAnyFilter = Object.entries(d.filters).flatMap(([, s]) => [...s]).length > 0;
        if (!hasAnyFilter) {
          return (
            <div style={{ padding: "10px 14px", background: "var(--warning-weak)", color: "var(--warning)", borderRadius: "var(--radius-sm)", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <Icon name="alertTriangle" size={16} />
              {t("createMission.noFiltersWarning", null, "Please select at least one filter to define your audience.")}
            </div>
          );
        }
        // Filters ARE selected, but they narrowed the audience down to
        // nobody — a materially different problem from having picked
        // nothing at all, so it gets its own copy pointing at the fix
        // (broaden the selection) rather than reusing the "pick something"
        // warning above.
        if (!isFetchingCount && liveCount === 0) {
          return (
            <div style={{ padding: "10px 14px", background: "var(--warning-weak)", color: "var(--warning)", borderRadius: "var(--radius-sm)", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <Icon name="alertTriangle" size={16} />
              {t("createMission.zeroMatchingWarning", null, "0 matching members for the selected filters — select more or other filters to get matching members for your mission.")}
            </div>
          );
        }
        return null;
      })()}
      {Object.entries(filters).map(([g, opts]) => (
        // Every top-level category gets the same bordered card, whether it's a
        // flat option list (Professional, ValidationCrew Role) or a grouped one
        // (Geography, Interests) — previously only grouped categories had the
        // wrapper, so flat ones looked like loose, unrelated sections by contrast.
        <div key={g} style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "16px 16px 4px", margin: "22px 0" }}>
          {!Array.isArray(opts) && (
            <div className="row between" style={{ marginBottom: 2 }}>
              <b style={{ fontSize: 13.5 }}>{trFilterLabel(t, g)}</b>
              {d.filters[g].size > 0 && (
                <span className="cnt mono" style={{ color: "var(--accent)" }}>
                  {t("createMission.selectedCount", { count: d.filters[g].size }, `${d.filters[g].size} selected`)}
                </span>
              )}
            </div>
          )}
          {Array.isArray(opts) ? (
            <FilterGroup
              title={g} options={opts} sel={d.filters[g]} toggle={toggle}
              otherEntries={d.otherEntries?.[`${g}:Other`]}
              onOtherEntriesChange={(entries) => set({ otherEntries: { ...d.otherEntries, [`${g}:Other`]: entries } })}
              onSelectAll={opts => selectAllInGroup(g, opts, opts.includes("Other") ? `${g}:Other` : undefined)}
            />
          ) : (
            Object.entries(opts).map(([sub, subOpts]) => {
              // "India - 9 cities" reuses "India" itself as its catch-all —
              // there's no literal "Other" in that subgroup's option list, so
              // the free-text follow-up needs to key off whichever catch-all
              // value this specific subgroup actually uses. Keyed by
              // group+subgroup+trigger, not just group+trigger: Interests has
              // "Other" as the trigger in three different subgroups
              // (Lifestyle, Industry, Product Types), so the trigger word
              // alone isn't a unique enough key to keep their custom entries
              // from bleeding into each other's list.
              const subOther = subOpts.includes("Other") ? "Other" : subOpts.includes("India") ? "India" : null;
              const otherKey = subOther ? `${g}:${sub}:${subOther}` : undefined;
              return (
                <FilterGroup key={g + sub} title={sub} options={subOpts} sel={d.filters[g]} toggle={(_, o) => toggle(g, o)}
                  otherEntries={otherKey ? d.otherEntries?.[otherKey] : undefined}
                  onOtherEntriesChange={otherKey ? (entries) => set({ otherEntries: { ...d.otherEntries, [otherKey]: entries } }) : undefined}
                  otherValue={subOther || "Other"}
                  onSelectAll={subOpts => selectAllInGroup(g, subOpts, otherKey)}
                />
              );
            })
          )}
        </div>
      ))}
    </div>
  );
}

function StepParticipation({ d, set, ptypes, locked }) {
  const { t } = useTranslation();
  const trialFieldRef = useRef(null);
  const prevPtype = useRef(d.ptype);
  useEffect(() => {
    // The duration field only appears once "Multi-Day Diary Study" is
    // picked, and it renders below the option cards — easy to miss without
    // scrolling. Scroll it into view right when it appears, not on every
    // render while it's already selected.
    if (d.ptype === "trial" && prevPtype.current !== "trial") {
      trialFieldRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    prevPtype.current = d.ptype;
  }, [d.ptype]);
  return (
    <div className="rise">
      {locked && <LockedHint />}
      <div className="optcards" style={locked ? { opacity: 0.6, pointerEvents: "none" } : undefined}>
        {ptypes.map(p => (
          <button key={p.id} className={`optcard ${d.ptype === p.id ? "on" : ""}`} disabled={locked} onClick={() => set({ ptype: p.id })}>
            <span className="oc-tick"><Icon name="check" size={12} /></span>
            <span className="oc-ic"><Icon name={p.icon} size={20} /></span>
            <b>{ptypeLabel(t, p)}</b><p>{ptypeDesc(t, p)}</p>
            <span className="mtag" style={{ alignSelf: "flex-start", marginTop: 6 }}><Icon name="clock" size={11} style={{ marginRight: 4, verticalAlign: "-2px" }} />{p.id === "trial" ? t("createMission.durationDaysSuffix", { days: d.durationDays }, `${d.durationDays} days`) : p.est}</span>
          </button>
        ))}
      </div>
      {d.ptype === "trial" && (
        <div ref={trialFieldRef} className="fld" style={{ marginTop: 24, maxWidth: 280 }}>
          <label>{t("createMission.trialDurationLabel", null, "How many days should this trial run?")}</label>
          <input
            className="fin"
            type="number"
            min="3"
            max="30"
            disabled={locked}
            value={d.durationDays}
            onChange={e => { const v = e.target.value; set({ durationDays: v === "" ? "" : Number(v) }); }}
            onBlur={() => set({ durationDays: Math.min(30, Math.max(3, Number(d.durationDays) || 7)) })}
          />
          <p className="fhint">{t("createMission.trialDurationHint", null, "Validators check in once per day, then submit their final review at the end. Choose between 3 and 30 days.")}</p>
        </div>
      )}
    </div>
  );
}

const UNVERIFIED_PARTICIPANT_LIMIT = 25;

function StepReward({ d, set, rewards, showErrors, builder, liveCount, isFetchingCount, locked }) {
  const { t } = useTranslation();
  const rw = rewards.find(r => r.id === d.reward.type);
  const needsAmt = rw?.needsAmt;
  const overUnverifiedCap = !builder?.verified && d.reward.participants > UNVERIFIED_PARTICIPANT_LIMIT;
  // Gated on !isFetchingCount rather than liveCount > 0 — the latter hid this
  // warning entirely for a genuinely 0-matching audience (a real, publishable-
  // but-unreachable mission), not just during the brief initial-load window
  // it was meant to cover.
  const overAudienceCount = !isFetchingCount && d.reward.participants > liveCount;
  return (
    <div className="rise">
      <div className="fsec"><b>{t("createMission.rewardTypeLabel", null, "Reward Type")} <span className="req-star" aria-hidden="true">*</span></b><span className="line" /></div>
      {locked && <LockedHint />}
      <div className="optcards c2" style={{ gridTemplateColumns: "repeat(4,1fr)", ...(locked ? { opacity: 0.6, pointerEvents: "none" } : {}) }}>
        {rewards.map(r => (
          <button key={r.id} className={`optcard ${d.reward.type === r.id ? "on" : ""}`} disabled={locked} onClick={() => set({ reward: { ...d.reward, type: r.id } })}>
            <span className="oc-tick"><Icon name="check" size={12} /></span>
            <span className="oc-ic"><Icon name={r.icon} size={20} /></span>
            <b>{rewardLabel(t, r)}</b><p>{rewardDesc(t, r)}</p>
          </button>
        ))}
      </div>

      <div className="fgrid c2" style={{ marginTop: 24 }}>
        {needsAmt && (
          <div className={`fld ${showErrors && !(d.reward.amount > 0) ? "fld-invalid" : ""}`}>
            <label>{t("createMission.rewardAmountLabel", null, "Reward Amount")} <span className="req-star" aria-hidden="true">*</span> <span className="opt">{t("createMission.perParticipant", null, "per participant")}</span></label>
            <div className="inw has-pre">
              <span className="pre">₹</span>
              <input className="fin" type="number" min="1" disabled={locked} value={d.reward.amount} onChange={e => set({ reward: { ...d.reward, amount: e.target.value === "" ? "" : +e.target.value } })} />
            </div>
          </div>
        )}
        <div className={`fld ${showErrors && overUnverifiedCap ? "fld-invalid" : ""}`} style={{ gridColumn: "1 / -1" }}>
          <label>{t("createMission.numberOfParticipantsLabel", null, "Number of Participants")} <span className="req-star" aria-hidden="true">*</span></label>
          <input className="fin" type="number" min="1" max="500" value={d.reward.participants}
            onChange={e => {
              // The value silently clamped to 500 with no explanation — a
              // builder typing 2222 just saw it become 500 and had no idea
              // why. id keeps repeated keystrokes over the limit from
              // stacking multiple toasts.
              if (e.target.value !== "" && +e.target.value > 500) {
                // toast.error()'s icon is drawn outside the message node, so
                // an onClick on just the text never covers it — toast.custom
                // builds the whole card (icon included) so the full thing is
                // clickable, not just the text half.
                toast.custom(
                  (ti) => (
                    <div onClick={() => toast.dismiss(ti.id)} style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--panel)", padding: "12px 16px", borderRadius: "var(--radius)", boxShadow: "var(--shadow-lg)", cursor: "pointer", opacity: ti.visible ? 1 : 0 }}>
                      <Icon name="alertTriangle" size={16} style={{ color: "var(--danger)", flexShrink: 0 }} />
                      <span style={{ fontSize: 14 }}>{t("createMission.participantsMaxToast", null, "Maximum 500 participants per mission.")}</span>
                    </div>
                  ),
                  { id: "participants-max" }
                );
              }
              set({ reward: { ...d.reward, participants: e.target.value === "" ? "" : Math.min(500, Math.max(1, +e.target.value)) } });
            }}
            onBlur={e => { if (e.target.value === "" || +e.target.value < 1) set({ reward: { ...d.reward, participants: 1 } }); }} />
          <p className="fhint">
            {!builder?.verified
              ? t("createMission.participantsHintUnverified", { limit: UNVERIFIED_PARTICIPANT_LIMIT }, `Unverified accounts are limited to ${UNVERIFIED_PARTICIPANT_LIMIT} participants per mission. Verify your website to unlock up to 500.`)
              : t("createMission.participantsHint", null, "We recommend 80–150 for statistically useful feedback. Maximum 500 participants.")}
          </p>
          {overAudienceCount && (
            <p className="fhint" style={{ color: "var(--danger)" }}>
              <Icon name="alertTriangle" size={12} style={{ verticalAlign: -1, marginRight: 4 }} />
              {t("createMission.participantsExceedAudience", { count: liveCount }, `Only ${liveCount.toLocaleString("en-IN")} validators match this audience — widen your filters in step 4.`)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function CostCard({ d, rewards, balance, platformFeePct }) {
  const { t } = useTranslation();
  const rw = rewards.find(r => r.id === d.reward.type);
  const n = +d.reward.participants || 0;
  const per = rw?.needsAmt ? (+d.reward.amount || 0) : 0;
  const { subtotal, fee, fulfil, total } = computeCost(d, rewards, platformFeePct);
  return (
    <div className="estcard accent">
      <span className="eyebrow">{t("createMission.liveCostEstimate", null, "Live cost estimate")}</span>
      <div className="est-num" style={{ margin: "8px 0 14px" }}>{inr(total)}</div>
      <div>
        {rw?.needsAmt && <div className="est-row"><span className="lab">{t("createMission.perParticipantsBreakdown", { per: inr(per), n }, `${inr(per)} × ${n} participants`)}</span><span className="v">{inr(subtotal)}</span></div>}
        {fulfil > 0 && <div className="est-row"><span className="lab">{t("createMission.sampleFulfilmentBreakdown", { n }, `Sample fulfilment × ${n}`)}</span><span className="v">{inr(fulfil)}</span></div>}
        <div className="est-row"><span className="lab">{t("createMission.platformFeeBreakdown", { pct: Math.round(platformFeePct * 100) }, `Platform fee (${Math.round(platformFeePct * 100)}%)`)}</span><span className="v">{inr(fee)}</span></div>
        <div className="est-total"><span className="lab" style={{ fontWeight: 700 }}>{t("createMission.total", null, "Total")}</span><span className="v">{inr(total)}</span></div>
      </div>
      <div className="row gap-2" style={{ marginTop: 14, fontSize: 12, color: "var(--text-faint)" }}>
        <Icon name="shield" size={14} /><span>{t("createMission.escrowNote", null, "Held in escrow · released only on approved submissions")}</span>
      </div>
      <div className="row between" style={{ marginTop: 12, paddingTop: 12, borderTop: "1px dashed var(--border)", fontSize: 12.5 }}>
        <span className="muted">{t("createMission.walletBalance", null, "Wallet balance")}</span><b className="mono">{inr(balance)}</b>
      </div>
    </div>
  );
}


function ReviewRow({ icon, color = "--accent", label, children, onEdit }) {
  const { t } = useTranslation();
  return (
    <div className="row gap-3" style={{ padding: "14px 0", borderTop: "1px solid var(--border)", alignItems: "flex-start" }}>
      <span style={{ width: 34, height: 34, borderRadius: 10, flex: "none", display: "grid", placeItems: "center",
        background: `color-mix(in srgb, var(${color}) 14%, transparent)`, color: `var(${color})` }}><Icon name={icon} size={16} /></span>
      <div style={{ flex: 1, minWidth: 0 }}><div className="faint" style={{ fontSize: 12 }}>{label}</div><div style={{ fontWeight: 700, fontSize: 14, marginTop: 2 }}>{children}</div></div>
      {onEdit && <button className="backlink" style={{ margin: 0, fontSize: 12.5, flex: "none" }} onClick={onEdit}>{t("actions.edit", null, "Edit")}</button>}
    </div>
  );
}
function StepReview({ d, categories, ptypes, rewards, liveCount, onEditStep, missingInfo, missingFormat, missingTasks, missingReward }) {
  const { t } = useTranslation();
  const [descExpanded, setDescExpanded] = React.useState(false);
  const cat = categories.find(c => c.id === d.cat) || categories[0];
  const pt = ptypes.find(p => p.id === d.ptype);
  const rw = rewards.find(r => r.id === d.reward.type);
  const count = liveCount;
  const allFilters = Object.entries(d.filters).flatMap(([, s]) => [...s]);
  for (const entries of Object.values(d.otherEntries || {})) allFilters.push(...(entries || []));
  const descLong = d.desc && d.desc.length > 160;
  // A step can go from valid to broken after Continue was already clicked on
  // it (e.g. deleting every test case on Step 3, then reaching Review via the
  // step rail instead of the disabled Continue button) — the review rows
  // above just quietly omit whatever's missing, with no indication Publish
  // is actually blocked. This is the visible reason why.
  const issues = [
    missingInfo && { label: t("createMission.issueInfo", null, "Mission info is incomplete"), step: 0, cta: t("createMission.goToStep1", null, "Go to Step 1") },
    missingFormat && { label: t("createMission.issueFormat", null, "Feedback format not selected"), step: 1, cta: t("createMission.goToStep2", null, "Go to Step 2") },
    missingTasks && { label: t("createMission.issueTasks", null, "No test cases — every task needs at least 1 step and 1 question"), step: 2, cta: t("createMission.goToStep3", null, "Go to Step 3") },
    missingReward && { label: t("createMission.issueReward", null, "Reward setup is incomplete or invalid"), step: 4, cta: t("createMission.goToStep5", null, "Go to Step 5") },
  ].filter(Boolean);
  return (
    <div className="rise">
      {issues.length > 0 && (
        <div className="card" style={{ padding: "14px 16px", marginBottom: 14, borderColor: "var(--danger)", background: "color-mix(in srgb, var(--danger) 8%, var(--panel))" }}>
          <div className="row gap-2" style={{ alignItems: "flex-start" }}>
            <Icon name="alertTriangle" size={17} style={{ color: "var(--danger)", flexShrink: 0, marginTop: 1 }} />
            <div style={{ flex: 1 }}>
              <b style={{ fontSize: 14, color: "var(--danger)" }}>{t("createMission.cantPublishYet", null, "Can't publish yet")}</b>
              <div className="col gap-2" style={{ marginTop: 8 }}>
                {issues.map((iss, i) => (
                  <div key={i} className="row between" style={{ alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 13 }}>{iss.label}</span>
                    <Btn variant="outline" size="sm" onClick={() => onEditStep(iss.step)}>{iss.cta}</Btn>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="card" style={{ padding: "4px 20px 14px" }}>
        <ReviewRow icon="edit" color="--accent-2" label={t("createMission.missionTitleReviewLabel", null, "Mission title")} onEdit={() => onEditStep(0)}>{d.title || <span className="faint">{t("createMission.untitledMission", null, "Untitled mission")}</span>}</ReviewRow>
        <ReviewRow icon={cat?.icon || "layers"} color="--warning" label={t("createMission.categoryLabel", null, "Category")} onEdit={() => onEditStep(0)}>{cat && categoryLabel(t, cat)}</ReviewRow>
        <ReviewRow icon={pt?.icon || "list"} color="--success" label={t("createMission.participationTypeLabel", null, "Participation type")} onEdit={() => onEditStep(1)}>{pt && ptypeLabel(t, pt)} · ~{pt?.est}</ReviewRow>
        <ReviewRow icon="users" color="--accent-2" label={t("createMission.audienceLabel", null, "Audience")} onEdit={() => onEditStep(3)}>{count.toLocaleString("en-IN")} {t("createMission.audienceFiltersSummary", { count: allFilters.length || "no" }, `matching members · ${allFilters.length || "no"} filters`)}</ReviewRow>
        <ReviewRow icon={rw?.icon || "coins"} color="--danger" label={t("createMission.rewardLabel", null, "Reward")} onEdit={() => onEditStep(4)}>{rw?.needsAmt ? t("createMission.amountEach", { amount: inr(d.reward.amount) }, `${inr(d.reward.amount)} each`) : (rw && rewardLabel(t, rw))} · {t("createMission.participantsSuffix", { n: d.reward.participants }, `${d.reward.participants} participants`)}</ReviewRow>
        {d.tasks?.length > 0 && (
          <ReviewRow icon="checkCircle" color="--success" label={t("createMission.testCasesEyebrow", { count: d.tasks.length }, `Test cases (${d.tasks.length})`)} onEdit={() => onEditStep(2)}>
            <div className="col gap-1" style={{ marginTop: 2 }}>
              {d.tasks.map((tk, i) => (
                <div key={i} className="row gap-2" style={{ fontSize: 13.5 }}>
                  <span className="faint mono" style={{ width: 16, flexShrink: 0 }}>{i + 1}.</span>
                  <span>{tk.title || t("createMission.untitledTask", null, "Untitled task")}</span>
                </div>
              ))}
            </div>
          </ReviewRow>
        )}
        {d.desc && (
          <ReviewRow icon="fileText" color="--warning" label={t("createMission.descriptionEyebrow", null, "Description")} onEdit={() => onEditStep(0)}>
            <span style={!descExpanded && descLong ? { display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" } : undefined}>{d.desc}</span>
            {descLong && <button className="backlink" style={{ margin: "4px 0 0", fontSize: 12.5 }} onClick={() => setDescExpanded(v => !v)}>{descExpanded ? t("actions.showLess", null, "Show less") : t("actions.readMore", null, "Read more")}</button>}
          </ReviewRow>
        )}
        {allFilters.length > 0 && (
          <ReviewRow icon="filter" color="--accent" label={t("createMission.audienceFiltersEyebrow", null, "Audience filters")} onEdit={() => onEditStep(3)}>
            <div className="chips" style={{ marginTop: 4 }}>{allFilters.map(f => <span key={f} className="chip on" style={{ pointerEvents: "none" }}>{f}</span>)}</div>
          </ReviewRow>
        )}
      </div>
    </div>
  );
}

function emptyFilters(filters) {
  return Object.fromEntries(Object.keys(filters).map(k => [k, new Set()]));
}

function flatOptions(opts) {
  return Array.isArray(opts) ? opts : Object.values(opts).flat();
}

// The backend already free-text substring-matches these groups (see
// getRealMatchCount in backend/src/routes/audience.js), so each "Other"
// chip's typed entries can be sent straight through as their own entries —
// no need to swap them in for the literal "Other" marker (the backend
// treats "Other" itself as a no-op, same as "Worldwide"/"Remote").
function buildAudiencePayload(d) {
  const audience = Object.fromEntries(Object.entries(d.filters).map(([k, v]) => [k, [...v]]));
  // Keys are "group:trigger" for flat categories or "group:subgroup:trigger"
  // for subgrouped ones — the first segment is always the group, the last is
  // always the actual trigger value to check for, so each catch-all's custom
  // entries only get appended when its own trigger is actually selected, not
  // any other catch-all (even one sharing the same trigger word elsewhere).
  for (const [key, entries] of Object.entries(d.otherEntries || {})) {
    if (!entries?.length) continue;
    const parts = key.split(":");
    const group = parts[0];
    const trigger = parts[parts.length - 1];
    if (audience[group]?.includes(trigger)) audience[group] = [...audience[group], ...entries];
  }
  return audience;
}

function computeCost(d, rewards, platformFeePct) {
  const rw = rewards.find(r => r.id === d.reward.type);
  const n = +d.reward.participants || 0;
  const per = rw?.needsAmt ? (+d.reward.amount || 0) : 0;
  const subtotal = per * n;
  const fee = Math.round(subtotal * platformFeePct);
  const fulfil = d.reward.type === "sample" ? n * 60 : 0;
  return { subtotal, fee, fulfil, total: subtotal + fee + fulfil };
}

const GEO_GROUP = "Geography";
const WORLDWIDE = "Worldwide";

// Reverse of buildAudiencePayload(): rehydrates a fetched draft mission back
// into the wizard's internal `d` shape so an existing draft can be resumed
// through the full 6-step flow instead of just the lightweight edit modal.
function missionToDraft(mission, filters, categories, ptypes) {
  const emptyF = emptyFilters(filters);
  const audience = mission.audience || {};
  const draft = {
    title: mission.name || "",
    desc: mission.description || "",
    cat: mission.category || categories[0]?.id || "feedback",
    ptype: mission.ptype || ptypes[0]?.id || "ptest",
    reward: {
      type: mission.reward?.type || "fixed",
      amount: mission.reward?.amount || 0,
      participants: mission.participants?.target || 1,
    },
    filters: emptyF,
    testCaseForm: mission.testCaseForm?.form || null,
    genFor: mission.testCaseForm?.genFor || null,
    durationDays: mission.durationDays || 7,
    deadline: mission.deadline ? mission.deadline.slice(0, 10) : "",
    tasks: mission.tasks || [],
  };
  const otherEntries = {};
  for (const g of Object.keys(emptyF)) {
    const vals = audience[g];
    if (!Array.isArray(vals)) continue;
    const flatOpts = flatOptions(filters[g]);
    if (flatOpts.includes("Other")) {
      // A known value is a real option (including the "Other" and "India"
      // catch-alls themselves) and gets kept as-is. Unrecognized values are
      // the free text the builder typed alongside whichever catch-all was
      // selected. The saved payload itself doesn't tag which catch-all each
      // custom entry came from when a group has more than one active at once
      // (e.g. Geography's "India" and "Other", or Interests having "Other"
      // in more than one subgroup) — attribute them all to whichever one is
      // found first; a rare case, and retyping after resuming corrects it if
      // it lands under the "wrong" one.
      const known = new Set(flatOpts);
      const sel = new Set();
      const entries = [];
      for (const v of vals) { if (known.has(v)) sel.add(v); else entries.push(v); }
      draft.filters[g] = sel;
      if (entries.length) {
        let bucketKey = `${g}:Other`;
        if (!Array.isArray(filters[g])) {
          for (const [sub, subOpts] of Object.entries(filters[g])) {
            const subOther = subOpts.includes("Other") ? "Other" : subOpts.includes("India") ? "India" : null;
            if (subOther && sel.has(subOther)) { bucketKey = `${g}:${sub}:${subOther}`; break; }
          }
        }
        otherEntries[bucketKey] = entries;
      }
    } else {
      draft.filters[g] = new Set(vals);
    }
  }
  draft.otherEntries = otherEntries;
  return draft;
}

// Plain-object <-> wizard-draft conversion for the local scratch copy (see
// utils/missionDraft.js) — Sets aren't JSON-serializable, so filters round-trip
// through arrays.
function draftToPlain(d) {
  const data = { ...d, filters: {} };
  for (const k in d.filters) data.filters[k] = Array.from(d.filters[k] || []);
  return data;
}
function plainToDraft(data, emptyF) {
  if (!data) return null;
  const out = { ...data, filters: { ...emptyF } };
  for (const k in (data.filters || {})) out.filters[k] = new Set(data.filters[k] || []);
  return out;
}

export default function CreateMissionWizard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { id: missionId } = useParams();
  const [searchParams] = useSearchParams();
  const { builder, refreshBuilder } = useAuth();
  const { categories, ptypes, rewards, filters, platformFeePct } = useMeta();
  const WZ_STEPS = wzSteps(t);
  const lastStep = WZ_STEPS.length - 1;

  // Scoped per-builder so switching accounts on the same browser never shows
  // one builder's in-progress mission draft to another.
  const builderId = builder?.id;

  // True only when this exact page load was reached by clicking a specific
  // draft row in a list (Missions → Draft tab, or Dashboard's recent-
  // missions table) — carried on the navigation itself (browser history
  // state, set by MissionsTable), not the URL, since the URL for "resume
  // this draft" is identical either way. Every other route in here (Create
  // Mission's picker below, the Dashboard banner) never sets this, so it's
  // absent there. Drives whether the exit modal's destructive action means
  // "stop auto-resuming this" (the common case) or "actually delete it"
  // (only when the builder deliberately opened this specific saved draft).
  const openedFromDraftTab = !!location.state?.fromDraftList;

  // Resuming an existing mission opens on Review by default, with every step
  // already unlocked via the rail/Edit links — the scratch localStorage draft
  // (for an in-progress *new* mission) plays no part in this flow. A caller
  // that wants a specific step up front (e.g. Mission Detail's Audience tab
  // jumping straight to Step 4) can pass ?step=N.
  const initialEditStep = () => {
    const s = parseInt(searchParams.get("step") || "", 10);
    return Number.isInteger(s) && s >= 0 && s <= lastStep ? s : lastStep;
  };

  const [step, setStep] = useState(() => {
    if (missionId) return initialEditStep();
    const scratch = getScratch(builderId);
    return scratch?.step || 0;
  });

  const [maxReached, setMaxReached] = useState(() => {
    if (missionId) return lastStep; // placeholder until the fetch below lands
    const scratch = getScratch(builderId);
    return Math.max(scratch?.step || 0, scratch?.maxReached || 0);
  });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [published, setPublished] = useState(false);
  const [showExitWarning, setShowExitWarning] = useState(false);
  const [deletingDraft, setDeletingDraft] = useState(false);
  const [showStartFreshWarning, setShowStartFreshWarning] = useState(false);
  const [showStaleWarning, setShowStaleWarning] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  // Always starts true — even the fresh-wizard path needs one round trip
  // (the draft-picker check below) before it's safe to render anything, so
  // a real draft never flashes an empty form first.
  const [loadingMission, setLoadingMission] = useState(true);
  // Non-null while "Create Mission" is waiting on the builder to choose
  // between an existing draft and starting fresh — see the fetch below.
  const [draftPicker, setDraftPicker] = useState(null);
  // Mirrors the backend's own field-level allowlist (PATCH /missions/:id) —
  // once any participant has moved past "invited", category/ptype/tasks/
  // reward/duration get silently dropped from an update request, so the UI
  // locks them here instead of letting the builder edit fields that won't
  // actually save. wasActive distinguishes "editing an already-live mission"
  // from "resuming an unpublished draft", for the Step 6 button/toast copy.
  const [canFullyEdit, setCanFullyEdit] = useState(true);
  const [wasActive, setWasActive] = useState(false);
  // Set once this brand-new mission's scratch draft has been silently
  // promoted to a real backend draft (see the auto-promote effect below).
  // Only ever relevant for the no-missionId ("/missions/new") case — once a
  // missionId is in the URL, that alone is the id to act on everywhere else
  // in this file.
  const [promotedId, setPromotedId] = useState(null);
  // "Create Mission" asks the server what draft(s) actually exist rather
  // than trusting the local pointer alone — the pointer can only ever name
  // one, but the Draft tab is cumulative (nothing there ever auto-deletes),
  // so there may be several. Zero: straight into a fresh wizard. One or
  // more: hand the choice to the builder via draftPicker below instead of
  // silently resuming whichever the pointer happens to name.
  useEffect(() => {
    if (missionId) return;
    // Start Fresh already made this exact decision for the builder — asking
    // again here would just re-show the same choice they just walked away
    // from. Same navigation-state technique as openedFromDraftTab above:
    // rides along on the navigate() call itself, invisible to every other
    // way of landing on this route (the Dashboard banner, the sidebar
    // "Create Mission" link, a direct URL visit all still get the real check).
    if (location.state?.skipDraftPicker) { setLoadingMission(false); return; }
    let cancelled = false;
    api.missions({ status: "draft" }).then(({ missions }) => {
      if (cancelled) return;
      if (!missions || missions.length === 0) {
        clearRecentDraftId(builderId); // stale pointer, if any — nothing to point at anymore
        setLoadingMission(false);
        return;
      }
      // Server already orders drafts newest-first (created_at DESC) — that's
      // "the latest" for pre-selecting, unless the pointer names one of the
      // ones actually in this list, in which case honor it (it reflects
      // whichever draft was most recently *touched*, not just created).
      const recentId = getRecentDraftId(builderId);
      const defaultId = missions.some(m => m.id === recentId) ? recentId : missions[0].id;
      setDraftPicker({ drafts: missions, selectedId: defaultId });
      setLoadingMission(false);
    }).catch(() => {
      // Fail open — a transient error here shouldn't block creating a
      // mission; worst case the builder just doesn't see the picker.
      if (!cancelled) setLoadingMission(false);
    });
    return () => { cancelled = true; };
  }, [missionId, builderId]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);
  // Bumped by startFresh() — lets an auto-promote request that was already
  // in flight when "Start fresh" was clicked recognize it's been abandoned
  // once it resolves, instead of silently re-attaching an orphaned mission
  // to the wizard the user just reset.
  const freshStartRef = useRef(0);
  // Lets the stale-test-cases confirmation modal's "Yes, Regenerate" trigger
  // an actual regeneration on StepTestCases instead of just closing itself.
  const testCasesRef = useRef(null);
  // Holds whatever the debounced draft-autosave effect below hasn't flushed
  // to the server yet, so it can still be sent immediately if the wizard
  // unmounts before the debounce fires — see that effect for the full story.
  const pendingSaveRef = useRef(null);
  // Start Fresh walks away from an existing draft non-destructively at
  // first — this remembers which one (see doStartFresh below), so the
  // true-unmount check further down can decide whether to actually delete
  // it: only if the fresh session that followed never ends up with real
  // content of its own by the time the builder leaves. Deliberately a
  // separate ref from pendingSaveRef, not reused — mixing two different
  // concerns into one shared ref is exactly what caused an earlier bug in
  // this file (one effect's cleanup silently clobbering another's pending
  // value on the same render).
  // An array, not a single slot — clicking "Start fresh" more than once
  // before ever reaching the true unmount (still possible: the rail button
  // stays visible on the resulting blank page) must not forget the first
  // abandoned draft when the second click overwrites it. Every entry in
  // here gets the same treatment at unmount time.
  const startFreshAbandonedRef = useRef([]); // Array<{ id, builderId }>
  // Mirrors promotedId into a ref so the true-unmount cleanup (an effect
  // with an empty dependency array, whose closure is captured once at
  // mount and never refreshed) can read its *current* value instead of a
  // stale one from whenever the component first rendered.
  const promotedIdRef = useRef(null);
  useEffect(() => { promotedIdRef.current = promotedId; }, [promotedId]);
  // Reflects the real autosave effects below, not a cosmetic timer — "idle"
  // means nothing worth saving yet, "saving" while a create/update request
  // for the backend draft is actually in flight, "saved" once it lands.
  // Resuming an existing draft starts "saved" since it's already persisted.
  const [saveStatus, setSaveStatus] = useState(() => missionId ? "saved" : "idle");

  const freshDraft = () => ({
    title: "", desc: "", cat: "",
    filters: emptyFilters(filters),
    ptype: "",
    reward: { type: "", amount: "", participants: "" },
    genFor: null,
    durationDays: 7,
    deadline: "",
  });

  const [d, setD] = useState(() => {
    if (missionId) return freshDraft(); // placeholder until the fetch below lands
    const scratch = plainToDraft(getScratch(builderId), emptyFilters(filters));
    return (scratch && hasContent(scratch)) ? scratch : freshDraft();
  });

  const publishedRef = useRef(published);
  const contentRef = useRef(hasContent(d));

  useEffect(() => {
    publishedRef.current = published;
    contentRef.current = hasContent(d);
  }, [published, d]);

  useEffect(() => {
    return () => {
      if (!publishedRef.current && contentRef.current) {
        try { sessionStorage.setItem("vcrew_mission_draft_backnav", "1"); } catch { /* ignore */ }
      }
    };
  }, []);

  useEffect(() => {
    if (!missionId) return;
    let cancelled = false;
    api.mission(missionId)
      .then(({ mission }) => {
        if (cancelled) return;

        setCanFullyEdit(!!mission.canFullyEdit);
        const active = mission.status !== "draft";
        setWasActive(active);
        // A live mission was never a "recent draft" — only point the resume
        // pointer at genuine drafts, however this one was opened (a fresh
        // auto-promote elsewhere, the Dashboard banner, or a direct Draft
        // tab click) — so "Create Mission" always resumes whichever draft
        // was most recently touched, by any route.
        if (!active) setRecentDraftId(builderId, missionId);

        const newD = missionToDraft(mission, filters, categories, ptypes);
        setD(newD);

        let calcMax = 0;
        if (newD.title?.trim() && newD.desc?.trim() && newD.deadline) {
          calcMax = 1;
          if (newD.ptype) {
            calcMax = 2;
            if (newD.tasks?.length > 0) {
              calcMax = 5;
            }
          }
        }

        const realMax = active ? lastStep : calcMax;
        let targetStep = parseInt(searchParams.get("step"), 10);
        if (!Number.isInteger(targetStep) || targetStep < 0 || targetStep > realMax) {
          targetStep = realMax;
        }

        setStep(targetStep);
        setMaxReached(realMax);
        setLoadingMission(false);
      })
      .catch(() => {
        // Stale pointer (e.g. deleted from another tab/device) — clear it so
        // "Create Mission" doesn't keep bouncing back to a dead draft.
        clearRecentDraftId(builderId);
        navigate("/missions", { replace: true });
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missionId]);

  const [liveCount, setLiveCount] = useState(0);
  const [isFetchingCount, setIsFetchingCount] = useState(false);
  // The real, unfiltered total — fetched once, used as the "% of total pool"
  // denominator. Previously that denominator was a hardcoded guess
  // (1,284,000), so any real audience (a few hundred/thousand people) always
  // rounded down to "0% of total pool" no matter how broad the filters were.
  const [basePool, setBasePool] = useState(0);

  useEffect(() => {
    api.audienceMatchCount({}).then(res => setBasePool(res.count)).catch(() => {});
  }, []);

  useEffect(() => {
    setTimeout(() => setIsFetchingCount(true), 0);
    const audience = buildAudiencePayload(d);
    api.audienceMatchCount(audience)
      .then(res => setLiveCount(res.count))
      .catch(() => {})
      .finally(() => setIsFetchingCount(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d.filters, d.otherEntries]);

  // Pre-promotion scratch safety net — the only local write that happens
  // before a real DB draft exists, and only once there's real content worth
  // not losing (an untouched form leaves zero trace anywhere, by design).
  // Skipped once a real draft backs this session (missionId or promotedId):
  // the DB is the source of truth from that point on, and the debounced
  // autosave effect below keeps it current instead.
  useEffect(() => {
    if (missionId || promotedId || published) return;
    if (!hasContent(d)) return;
    setScratch(builderId, { ...draftToPlain(d), step, maxReached });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d, step, maxReached, missionId, promotedId, published, builderId]);

  // Native browser prompt for tab close/refresh — only once there's real
  // content worth warning about; an untouched form shouldn't trigger it.
  useEffect(() => {
    if (published || !hasContent(d)) return;
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [published, d]);

  // Browser back/swipe-back can't be reliably intercepted with a blocking
  // confirm dialog (no clean way to hook a trackpad swipe), so instead of
  // trying to stop it, flag that it happened — the Dashboard checks this
  // once on mount and shows a brief toast confirming the draft is still
  // there, instead of leaving the user to wonder if it's gone.
  useEffect(() => {
    if (published) return;
    const handlePopState = () => {
      try { sessionStorage.setItem("vcrew_mission_draft_backnav", "1"); } catch { /* ignore */ }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [published]);

  const startFresh = () => setShowStartFreshWarning(true);
  // "Start fresh" walks away from whatever draft is currently open without
  // touching it right away — it only clears the local recent-draft
  // pointer/scratch so nothing resumes it automatically next time "Create
  // Mission" is clicked, same non-destructive move the Draft tab's own
  // Cancel flow uses elsewhere. Whether that old draft actually gets
  // deleted is decided later, once it's clear whether the fresh session
  // that follows ever amounts to anything — see startFreshAbandonedRef and
  // the true-unmount effect that reads it, further down.
  //
  // Never marks anything for cleanup when wasActive — an already-live,
  // published mission is not a draft to discard under any circumstance,
  // confirmed or not; Start Fresh here only ever resets local wizard state.
  //
  // Also bumps freshStartRef so an auto-promote request that's already
  // mid-flight at this exact moment (2-second debounce already elapsed,
  // response not back yet) knows to clean up the orphaned mission it
  // creates instead of resurfacing it.
  const doStartFresh = () => {
    setShowStartFreshWarning(false);
    freshStartRef.current++;
    const abandonedId = missionId || promotedId;
    if (abandonedId && !wasActive) startFreshAbandonedRef.current = [...startFreshAbandonedRef.current, { id: abandonedId, builderId }];
    clearAllLocalDraftState(builderId);
    setPromotedId(null);
    setD(freshDraft());
    setStep(0);
    setMaxReached(0);
    if (missionId) navigate("/missions/new", { replace: true, state: { skipDraftPicker: true } });
  };

  // The two choices on the "Create Mission" draft picker (see draftPicker
  // state and the render branch below). Choosing an existing draft updates
  // the pointer to match — same as opening one from the Draft tab — so the
  // Dashboard banner and the next "Create Mission" click both agree on
  // whichever one the builder just picked.
  const draftPickerChooseNew = () => setDraftPicker(null);
  const draftPickerContinue = () => {
    const id = draftPicker.selectedId;
    setRecentDraftId(builderId, id);
    // Clear the picker and re-arm the loading gate before navigating —
    // otherwise the stale picker (this component instance doesn't remount,
    // just its :id param changes) would flash again for the moment it takes
    // the missionId-fetch effect below to resolve.
    setDraftPicker(null);
    setLoadingMission(true);
    navigate(`/missions/${id}/edit`, { replace: true });
  };

  const set = (patch) => setD(p => ({ ...p, ...patch }));
  // Turning Worldwide on fills in every Geography chip as an explicit
  // selection (rather than leaving it as a lone marker) so every chip reads
  // as checked and each one stays individually clickable — unchecking one is
  // a real removal, not a no-op, while Worldwide and the rest stay checked.
  // Turning Worldwide back off (however that happens — its own chip, or
  // "Global & Remote"'s Clear all) collapses the whole expansion back to
  // whatever was selected before Worldwide went on, rather than leaving
  // every individually-"checked" chip behind — that snapshot/restore only
  // needs to trigger on the specific transition where Worldwide's own
  // membership in the Set flips, not on every other chip's toggle (which
  // must keep working normally while Worldwide stays selected).
  // Trade-off accepted knowingly: while expanded, the backend matches an
  // explicit place-name list instead of true "no restriction", which can
  // match slightly fewer validators than a bare Worldwide marker would.
  const applyWorldwideTransition = (prevSet, naiveNext) => {
    const prevHasW = prevSet.has(WORLDWIDE);
    const nextHasW = naiveNext.has(WORLDWIDE);
    if (!prevHasW && nextHasW) return { s: new Set([...flatOptions(filters[GEO_GROUP]), WORLDWIDE]), snapshot: [...prevSet] };
    if (prevHasW && !nextHasW) return { s: new Set(), snapshot: undefined, restore: true };
    return { s: naiveNext };
  };
  const toggle = (group, opt) => setD(p => {
    const s = new Set(p.filters[group]); s.has(opt) ? s.delete(opt) : s.add(opt);
    if (group !== GEO_GROUP) return { ...p, filters: { ...p.filters, [group]: s } };
    const { s: geoSet, snapshot, restore } = applyWorldwideTransition(p.filters[GEO_GROUP], s);
    const finalSet = restore ? (p.geoBeforeWorldwide ? new Set(p.geoBeforeWorldwide) : new Set()) : geoSet;
    return { ...p, filters: { ...p.filters, [GEO_GROUP]: finalSet }, geoBeforeWorldwide: restore ? null : (snapshot ?? p.geoBeforeWorldwide) };
  });
  // Select-all / clear-all for one category or subcategory's own option list —
  // toggles based on whether every option in it is already selected, so the
  // button reads "Select all" until fully checked, then flips to "Clear all".
  const selectAllInGroup = (group, opts, otherKey) => setD(p => {
    const s = new Set(p.filters[group]);
    const allIn = opts.every(o => s.has(o));
    if (allIn) opts.forEach(o => s.delete(o)); else opts.forEach(o => s.add(o));
    let geoBeforeWorldwide = p.geoBeforeWorldwide;
    let finalSet = s;
    if (group === GEO_GROUP) {
      const { s: geoSet, snapshot, restore } = applyWorldwideTransition(p.filters[GEO_GROUP], s);
      finalSet = restore ? (p.geoBeforeWorldwide ? new Set(p.geoBeforeWorldwide) : new Set()) : geoSet;
      geoBeforeWorldwide = restore ? null : (snapshot ?? p.geoBeforeWorldwide);
    }
    const next = { ...p, filters: { ...p.filters, [group]: finalSet }, geoBeforeWorldwide };
    // Clearing the group that owns an "Other" catch-all should also drop its
    // custom text entries — otherwise they'd sit orphaned in state (hidden
    // since the checkbox that reveals them is now off) and reappear
    // unexpectedly if that catch-all gets checked again later.
    if (allIn && otherKey) next.otherEntries = { ...p.otherEntries, [otherKey]: [] };
    return next;
  });

  const cost = computeCost(d, rewards, platformFeePct);
  const last = step === lastStep;
  // Saving an already-active mission doesn't re-charge its full cost — only
  // a target increase pulls more escrow, and the backend already validates
  // that on its own — so this full-cost pre-check only makes sense for a
  // genuinely new publish (brand-new mission or a still-unpublished draft).
  const insufficientFunds = !wasActive && (step === 4 || last) && cost.total > (builder?.balance ?? 0);
  const selectedReward = rewards.find(r => r.id === d.reward.type);
  const rewardAmountOk = !selectedReward?.needsAmt || d.reward.amount > 0;
  const participantsOk = builder?.verified || d.reward.participants <= UNVERIFIED_PARTICIPANT_LIMIT;
  // Mirrors StepReward's own overAudienceCount warning — requesting more
  // participants than the selected audience can actually supply isn't just
  // a bad estimate, it's a mission that can never fully fill, so it blocks
  // the same way rewardAmountOk/participantsOk do rather than staying a
  // warning-only nudge. Gated on isFetchingCount, not liveCount === 0 — the
  // latter let a genuinely 0-matching audience through unblocked (0 === 0
  // reads as "no restriction yet"), publishing a mission nobody could ever
  // see; only the brief initial-load window should be exempt, not a real
  // zero-match result.
  const withinAudienceCount = isFetchingCount || d.reward.participants <= liveCount;
  const todayStr = new Date().toISOString().slice(0, 10);
  const fieldsValid = (step !== 0 || (d.title.trim() && d.desc.trim() && d.cat && d.deadline && d.deadline >= todayStr))
    && (step !== 1 || !!d.ptype)
    && (step !== 2 || (d.tasks && d.tasks.length > 0 && d.tasks.every(tk =>
      tk.steps?.length > 0 && tk.steps.every(s => s.trim()) &&
      tk.questions?.length > 0 && tk.questions.every(q => q.text?.trim())
    )))
    // Selecting a filter isn't enough on its own — if it narrows the
    // audience down to nobody, Continue stays blocked the same way Step 5
    // blocks on withinAudienceCount below, for the same reason: a mission
    // built on a 0-match audience can never reach anyone. isFetchingCount
    // exempts only the brief initial-load window, not a real zero result.
    && (step !== 3 || ((Object.values(d.filters).some(s => s.size > 0) || Object.values(d.otherEntries || {}).some(e => e?.length > 0)) && (isFetchingCount || liveCount > 0)))
    && (step !== 4 || (!!d.reward.type && d.reward.participants > 0 && rewardAmountOk && participantsOk && withinAudienceCount));
  const canNext = fieldsValid && !insufficientFunds;
  // fieldsValid only checks whichever step is CURRENTLY open — the step
  // rail lets a builder jump straight past a step whose requirements broke
  // after the fact (e.g. deleting every test case on Step 3, then jumping to
  // Review via the rail instead of the disabled Continue button), leaving
  // Publish enabled at Review with a genuinely incomplete mission. This
  // re-checks every step's own requirements regardless of which one is
  // current, and is what actually gates Publish and its warning banner.
  const missingInfo = !(d.title.trim() && d.desc.trim() && d.cat && d.deadline && d.deadline >= todayStr);
  const missingFormat = !d.ptype;
  const missingTasks = !d.tasks || d.tasks.length === 0 || !d.tasks.every(tk =>
    tk.steps?.length > 0 && tk.steps.every(s => s.trim()) &&
    tk.questions?.length > 0 && tk.questions.every(q => q.text?.trim())
  );
  const missingReward = !(d.reward.type && d.reward.participants > 0 && rewardAmountOk && participantsOk && withinAudienceCount);
  const readyToPublish = !missingInfo && !missingFormat && !missingTasks && !missingReward;

  const buildMissionPayload = (status) => {
    const audience = buildAudiencePayload(d);
    audience._maxReached = maxReached;
    const geo = (audience.Geography || []).filter(v => v.toLowerCase() !== "other");
    return {
      name: d.title || t("createMission.untitledMission", null, "Untitled mission"),
      description: d.desc,
      category: d.cat,
      ptype: d.ptype,
      status,
      target: d.reward.participants,
      reward: { type: d.reward.type, amount: d.reward.amount },
      region: geo.length ? geo.join(", ") : "Worldwide",
      audience,
      tasks: d.tasks,
      testCaseForm: (d.testCaseForm || d.genFor) ? { form: d.testCaseForm || null, genFor: d.genFor || null } : null,
      durationDays: d.durationDays,
      deadline: d.deadline || null,
    };
  };

  // Silently promotes a brand-new mission's localStorage-only scratch draft
  // to a real backend draft once it has content worth not losing — the same
  // canonical hasContent() the scratch write, the Dashboard banner, and the
  // Missions toast all use, so none of them can drift out of sync with each
  // other. One-shot: once promotedId is set, this effect stops firing and
  // the update effect below takes over keeping that same row current.
  useEffect(() => {
    if (missionId || promotedId || published) { pendingSaveRef.current = null; return; }
    if (!hasContent(d)) { pendingSaveRef.current = null; return; }
    const startGen = freshStartRef.current;
    const payload = buildMissionPayload("draft");
    // Tracked so the flush-on-unmount effect further down can still create
    // this draft (with everything typed so far, not just whatever had
    // already been sitting there 2 seconds ago) if the builder navigates
    // away before this debounce ever gets to fire.
    pendingSaveRef.current = { kind: "create", payload, startGen, builderId };
    const timer = setTimeout(() => {
      pendingSaveRef.current = null;
      setSaveStatus("saving");
      api.createMission(payload).then(({ mission }) => {
        // "Start fresh" ran while this request was already in flight — the
        // wizard has moved on, so this mission was never actually seen by
        // the user and would otherwise sit orphaned forever. Clean it up
        // instead of re-attaching it to the reset wizard as promotedId.
        if (freshStartRef.current !== startGen) { api.deleteMission(mission.id).catch(() => {}); return; }
        setRecentDraftId(builderId, mission.id);
        clearScratch(builderId); // a real DB row now exists — it's the source of truth from here on
        setPromotedId(mission.id);
        setSaveStatus("saved");
      }).catch(() => setSaveStatus("idle") /* stays localStorage-only; retries on the next content change */);
    }, 2000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d, missionId, promotedId, published, builderId, maxReached]);

  // Autosave while resuming an existing draft, or once a new mission has been
  // auto-promoted above: edits are already backed by a real row that nobody
  // else can see or is acting on yet, so there's no separate "Save as Draft"
  // click to hang them on — debounce and PATCH the draft in place instead.
  // Silently ignored on failure, same as any other autosave; the next
  // successful edit/publish will catch it up.
  //
  // Critical: must NOT run at all when wasActive is true. This same effect
  // also covers editing an already-live mission (missionId set, no
  // promotedId), and a live mission is a different situation entirely —
  // validators may already be matched to it or working on it, so nothing
  // should reach the real record until the builder explicitly clicks "Save
  // changes". This used to autosave every field (not just status) to the
  // live row on every keystroke with zero confirmation, so background-typing
  // an edit and navigating away without saving still silently overwrote it.
  useEffect(() => {
    const id = missionId || promotedId;
    // No id yet at all — this is still the pre-promotion phase, which the
    // create effect above owns. Deliberately doesn't touch pendingSaveRef
    // here: on every render before promotion, that effect runs first and
    // sets it, and this effect running right after with a blanket null
    // would silently wipe out that pending create on every single edit,
    // defeating the unmount-flush safety net for the entire phase before a
    // real draft row exists — exactly the gap that let the last edit
    // (test cases) go unsaved.
    if (!id) return;
    if (loadingMission || published || wasActive) { pendingSaveRef.current = null; return; }
    const payload = buildMissionPayload("draft");
    // Tracked outside the timer so the flush-on-unmount effect below can
    // still send this exact payload if the builder navigates away before
    // the debounce ever gets to fire — see that effect for why.
    pendingSaveRef.current = { kind: "update", id, payload };
    const timer = setTimeout(() => {
      pendingSaveRef.current = null;
      setSaveStatus("saving");
      api.updateMission(id, payload)
        .then(() => setSaveStatus("saved"))
        .catch(() => setSaveStatus("idle"));
    }, 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d, missionId, promotedId, loadingMission, published, wasActive, maxReached]);

  // Both debounces above (the initial create, and the update once a draft
  // row exists) cancel their own timer on every d change — that's the
  // debounce working as intended. But that same cleanup also runs when the
  // wizard unmounts entirely (navigating away, e.g. browser Back), and in
  // that case cancelling silently drops whatever edit was still pending —
  // there's no local fallback to catch it once a real draft row exists (the
  // scratch copy is intentionally cleared at that point, DB is the source
  // of truth from then on), and even before promotion, a fast enough
  // sequence of edits can keep resetting the 2-second create-debounce
  // indefinitely without ever letting it fire. Empty deps here on purpose:
  // this cleanup must only run on the wizard's true, final unmount, not on
  // every re-render — otherwise it would flush prematurely on every
  // debounce reset too. The request itself outlives the component (an
  // in-app route change doesn't cancel an in-flight fetch), so it still
  // completes normally; setRecentDraftId/clearScratch are plain localStorage
  // writes, not React state, so they're still safe and meaningful to call
  // from a .then() after the component is long gone.
  useEffect(() => {
    return () => {
      const pending = pendingSaveRef.current;
      if (!pending) return;
      if (pending.kind === "update") {
        api.updateMission(pending.id, pending.payload).catch(() => {});
      } else {
        api.createMission(pending.payload).then(({ mission }) => {
          if (freshStartRef.current !== pending.startGen) { api.deleteMission(mission.id).catch(() => {}); return; }
          setRecentDraftId(pending.builderId, mission.id);
          clearScratch(pending.builderId);
        }).catch(() => {});
      }
    };
  }, []);

  // Resolves what "Start fresh" deferred: on the wizard's true final
  // unmount, every draft that was walked away from (there can be more than
  // one if Start Fresh was clicked repeatedly before ever leaving) gets
  // deleted unconditionally — the whole point of Start Fresh is that only
  // the newest attempt should end up surviving, so the old one is never
  // meant to stick around once the builder actually leaves, whether or not
  // the fresh session replaced it with something real. Additionally, if
  // that fresh session itself never ended up with real content (contentRef
  // mirrors hasContent(d), kept current — see its own effect above) —
  // typed nothing, or typed something that got silently promoted and was
  // then emptied out again before leaving — its own promoted row (if any)
  // is deleted too, so an abandoned empty attempt leaves nothing behind
  // either. If it DOES have real content, that one survives as the sole
  // remaining draft. Kept fully separate from the pendingSaveRef-based
  // flush effect above: different concern (cleanup, not save), different
  // ref, no shared state between them to avoid the class of bug that caused
  // earlier in this file. Empty deps on purpose — same reasoning as above,
  // this must only run on the wizard's true, final unmount.
  useEffect(() => {
    return () => {
      const abandonedList = startFreshAbandonedRef.current;
      if (!abandonedList.length) return;
      const builderIdForClear = abandonedList[0].builderId;
      for (const { id } of abandonedList) api.deleteMission(id).catch(() => {});
      let alsoDeletedPromotedId = null;
      if (!contentRef.current) {
        const stillPromotedId = promotedIdRef.current;
        if (stillPromotedId) { api.deleteMission(stillPromotedId).catch(() => {}); alsoDeletedPromotedId = stillPromotedId; }
      }
      const idsInvolved = [...abandonedList.map(a => a.id), alsoDeletedPromotedId].filter(Boolean);
      if (idsInvolved.includes(getRecentDraftId(builderIdForClear))) {
        clearRecentDraftId(builderIdForClear);
      }
    };
  }, []);

  useEffect(() => {
    if (saveStatus === "saved") {
      const timer = setTimeout(() => setSaveStatus("idle"), 2500);
      return () => clearTimeout(timer);
    }
  }, [saveStatus]);

  const publish = async () => {
    setBusy(true); setError("");
    try {
      const payload = buildMissionPayload("active");
      const existingId = missionId || promotedId;
      const { mission } = existingId ? await api.updateMission(existingId, payload) : await api.createMission(payload);
      setPublished(true);
      clearAllLocalDraftState(builderId);
      await refreshBuilder();
      toast.success(wasActive
        ? t("settings.changesSaved", null, "Changes saved")
        : t("createMission.publishSuccess", null, "Mission published successfully"));
      // Plain navigate() here left the wizard's own /edit URL on the history
      // stack, so browser/swipe Back from the published mission reopened the
      // draft steps instead of going anywhere useful. Replacing this page
      // with the Missions list first, then pushing the mission detail page
      // on top, means Back lands on the list regardless of how the wizard
      // was originally reached.
      navigate("/missions", { replace: true });
      navigate(`/missions/${mission.id}`);
    } catch (err) {
      setError(err.message || (wasActive
        ? t("settings.saveFailed", null, "Couldn't save changes")
        : t("createMission.publishError", null, "Couldn't publish this mission")));
    } finally {
      setBusy(false);
    }
  };

  const advanceStep = () => {
    if (last && !builder?.onboardingCompleted) {
      setError(t("createMission.profileRequiredToPublish", null, "Complete your profile before publishing — you can still save this mission as a draft."));
      // The Publish button sits at the bottom of a long, scrolled-down review
      // page, and this warning renders at the top — without scrolling back up,
      // a user who's been scrolled down the whole time would never see why
      // nothing happened when they clicked Publish.
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (last) return publish();
    const next = step + 1;
    setStep(next);
    setMaxReached(m => Math.max(m, next));
  };
  const goNext = () => {
    // Publish specifically needs the holistic check — fieldsValid only ever
    // validates whichever step is current, which is always true-by-default
    // on Review itself (see readyToPublish above for why).
    if (last ? !readyToPublish : !fieldsValid) {
      setShowErrors(true);
      setError(t("onboarding.fillRequiredFields", null, "Please fill in the required fields before continuing."));
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setShowErrors(false); setError("");
    // Asks rather than silently proceeding or silently blocking — the
    // "regenerate" action itself stays right here on Step 3 either way.
    if (step === 2 && isTestCasesStale(d)) {
      setShowStaleWarning(true);
      return;
    }
    advanceStep();
  };
  const editStep = (i) => { setShowErrors(false); setError(""); setStep(i); };
  const goBack = () => { setShowErrors(false); setError(""); setStep(s => s - 1); };

  // Mirrors the backend's PATCH /missions/:id allowlist — category, ptype,
  // tasks, and reward all stop being sent once a validator has accepted.
  const fieldsLocked = !!missionId && !canFullyEdit;

  const StepBody = [
    <StepInfo d={d} set={set} categories={categories} showErrors={showErrors} locked={fieldsLocked} />,
    <StepParticipation d={d} set={set} ptypes={ptypes} locked={fieldsLocked} />,
    fieldsLocked ? (
      <div className="rise">
        <LockedHint />
        <fieldset disabled style={{ border: "none", padding: 0, margin: 0, opacity: 0.6, pointerEvents: "none" }}>
          <StepTestCases d={d} set={set} ref={testCasesRef} />
        </fieldset>
      </div>
    ) : <StepTestCases d={d} set={set} ref={testCasesRef} />,
    <StepAudience d={d} set={set} toggle={toggle} selectAllInGroup={selectAllInGroup} filters={filters} liveCount={liveCount} isFetchingCount={isFetchingCount} basePool={basePool} />,
    <StepReward d={d} set={set} rewards={rewards} showErrors={showErrors} builder={builder} liveCount={liveCount} isFetchingCount={isFetchingCount} locked={fieldsLocked} />,
    <StepReview d={d} categories={categories} ptypes={ptypes} rewards={rewards} liveCount={liveCount} onEditStep={editStep} missingInfo={missingInfo} missingFormat={missingFormat} missingTasks={missingTasks} missingReward={missingReward} />,
  ][step];

  if (loadingMission) {
    // Deliberately not the "wz" class here — it defines the rail/main two-
    // column grid, so a single child inside it only centers within the
    // narrow rail column instead of the full viewport.
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <p className="muted">{t("createMission.loadingDraft", null, "Loading draft…")}</p>
      </div>
    );
  }

  if (draftPicker) {
    const { drafts, selectedId } = draftPicker;
    const single = drafts.length === 1;
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <Modal title={single ? t("createMission.continueDraftTitle", null, "Continue your draft?") : t("createMission.pickDraftTitle", null, "Continue a draft?")} onClose={draftPickerChooseNew} width={480} hideCloseIcon>
          <div style={{ padding: 20 }}>
            {single ? (
              <p style={{ margin: "0 0 4px", fontSize: 14 }}>
                {t("createMission.continueDraftBody", { name: drafts[0].name || t("createMission.untitledMission", null, "Untitled mission") }, `You have a draft mission "${drafts[0].name || t("createMission.untitledMission", null, "Untitled mission")}" in progress. Continue where you left off, or start something new?`)}
              </p>
            ) : (
              <>
                <p style={{ margin: "0 0 12px", fontSize: 14 }}>
                  {t("createMission.pickDraftBody", null, "You have a few drafts in progress. Pick one to continue, or start something new.")}
                </p>
                <div className="col gap-2" style={{ maxHeight: 300, overflowY: "auto" }}>
                  {drafts.map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setDraftPicker(p => ({ ...p, selectedId: m.id }))}
                      style={{
                        textAlign: "left", padding: "10px 14px", borderRadius: "var(--radius)", cursor: "pointer",
                        border: m.id === selectedId ? "1.5px solid var(--accent)" : "1px solid var(--border)",
                        background: m.id === selectedId ? "var(--accent-weak)" : "var(--panel)",
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: 13.5 }}>{m.name || t("createMission.untitledMission", null, "Untitled mission")}</div>
                      <div className="faint" style={{ fontSize: 12, marginTop: 2 }}>
                        {t("createMission.draftCreatedOn", { date: new Date(m.createdAt).toLocaleDateString() }, `Created ${new Date(m.createdAt).toLocaleDateString()}`)}
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
            <div className="row gap-2" style={{ marginTop: 20, justifyContent: "flex-end" }}>
              <button className="btn outline" onClick={draftPickerChooseNew}>{t("createMission.createNewMission", null, "Create new mission")}</button>
              <button className="btn btn-primary" onClick={draftPickerContinue}>
                {single ? t("createMission.continueThisDraft", null, "Continue draft") : t("actions.continue", null, "Continue")}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  return (
    <div className="wz" data-layout="rail">
      {saveStatus !== "idle" && !wasActive && (
        <span
          className="pill"
          style={{ position: "fixed", top: 18, right: 24, zIndex: 50, gap: 6, fontSize: 12, fontWeight: 700, color: "var(--accent)", background: "var(--accent-weak)", border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)", boxShadow: "var(--shadow-sm)" }}
        >
          {saveStatus === "saving"
            ? <><Icon name="refresh" size={13} style={{ animation: "spin 0.9s linear infinite" }} />{t("createMission.savingStatus", null, "Saving…")}</>
            : <><Icon name="check" size={13} />{t("createMission.autoSavedStatus", null, "Auto-saved")}</>}
        </span>
      )}
      <aside className="wz-rail">
        <div className="wz-brand">
          <BrandMark size={52} />
          <div><div className="brand-name">Validation<span style={{ color: "var(--text-faint)" }}>Crew</span></div><div className="brand-sub">{missionId ? t("createMission.editDraft", null, "Edit draft") : t("createMission.newMission", null, "New mission")}</div></div>
        </div>
        <div className="wz-steps">
          {WZ_STEPS.map((s, i) => (
            <button key={i} className={`wz-step ${i === step ? "cur" : i < maxReached ? "done" : "up"}`} disabled={i > maxReached} onClick={() => { if (i <= maxReached) { setShowErrors(false); setError(""); setStep(i); } }}>
              <span className="sd">{i !== step && i < maxReached ? <Icon name="check" size={14} /> : i + 1}</span>
              <span className="sm"><b>{s.t}</b><p>{s.s}</p></span>
            </button>
          ))}
        </div>
        <div className="wz-rail-foot">
          <button className="backlink" onClick={startFresh}><Icon name="refresh" size={16} /> {t("createMission.startFresh", null, "Start fresh")}</button>
          {step === 0 ? (
            <button className="btn" onClick={() => setShowExitWarning(true)} style={{ alignSelf: "flex-start", marginLeft: 10, border: "1.5px solid var(--accent)", color: "var(--accent)", background: "transparent", minWidth: 100 }}>{t("createMission.cancel", null, "Cancel")}</button>
          ) : (
            <div className="row gap-2" style={{ alignItems: "center", marginLeft: 10 }}>
              <button className="btn" onClick={() => setShowExitWarning(true)} style={{ border: "1.5px solid var(--accent)", color: "var(--accent)", background: "transparent", minWidth: 100 }}>{t("createMission.cancel", null, "Cancel")}</button>
              <button className="btn" onClick={goBack} style={{ color: "var(--accent)", background: "transparent", border: "none" }}>{t("createMission.back", null, "Back")}</button>
            </div>
          )}
        </div>
      </aside>

      <div className="wz-main">
        {(builder?.balance ?? 0) < 500 ? (
          <div className="card" style={{ margin: "24px 48px 0", borderRadius: "var(--radius)", border: "1px solid var(--danger)", display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", background: "color-mix(in srgb, var(--danger) 8%, var(--panel))", boxShadow: "var(--shadow-sm)" }}>
            <Icon name="alertTriangle" size={16} style={{ color: "var(--danger)", flexShrink: 0 }} />
            <p style={{ margin: 0, flex: 1, fontSize: 13, color: "var(--text)" }}>
              {t("createMission.lowBalanceWarning", null, "Your balance is low — top up your wallet before publishing to avoid interruptions.")}
            </p>
            <Btn variant="primary" size="sm" icon="plus" onClick={() => navigate("/wallet")} style={{ flexShrink: 0, minWidth: 150 }}>{t("actions.addFunds", null, "Add funds")}</Btn>
          </div>
        ) : step === 0 ? (
          <div className="estcard accent" style={{ margin: "24px 48px 0", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "16px 24px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span className="eyebrow" style={{ margin: 0, fontSize: 11 }}>{t("createMission.walletBalance", null, "Wallet balance")}</span>
              <div className="est-num" style={{ margin: 0, fontSize: 28, color: "var(--text)" }}>{inr(builder?.balance)}</div>
            </div>
            <div className="row gap-2" style={{ fontSize: 13, color: "var(--text-muted)", backgroundColor: "var(--panel-inset)", padding: "8px 12px", borderRadius: 8 }}>
              <Icon name="shield" size={15} style={{ color: "var(--accent)" }} /><span>{t("createMission.escrowNote", null, "Held in escrow · released only on approved submissions")}</span>
            </div>
          </div>
        ) : null}
        {!builder?.onboardingCompleted && (
          <div className="card" style={{ margin: "16px 48px 0", borderRadius: "var(--radius)", border: "1px solid var(--danger)", display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", background: "color-mix(in srgb, var(--danger) 8%, var(--panel))", boxShadow: "var(--shadow-sm)" }}>
            <Icon name="user" size={16} style={{ color: "var(--danger)", flexShrink: 0 }} />
            <p style={{ margin: 0, flex: 1, fontSize: 13, color: "var(--text)" }}>
              {t("createMission.onboardingWarning", null, "You can keep building this mission, but you'll need to select your role and finish setup before it can go live.")}
            </p>
            <Btn variant="primary" size="sm" onClick={() => navigate(builder?.persona ? `/signup?role=${builder.persona}` : "/get-started/feedback")} style={{ flexShrink: 0, minWidth: 150 }}>{t("actions.completeProfile", null, "Complete Profile")}</Btn>
          </div>
        )}
        <div className="wz-content wide">
          {/* Step 1 already has its own sidebar cards for these — repeating
              them as banners there too would be redundant. Every other step
              had no visibility into either warning at all until Review,
              where publishing was blocked with no earlier heads-up. */}
          <div className="wz-head">
            <span className="step-of">{t("createMission.stepOfTotal", { current: step + 1, total: WZ_STEPS.length }, `Step ${step + 1} of ${WZ_STEPS.length}`)}</span>
            <h2>{WZ_STEPS[step].t}</h2>
            <p>{WZ_STEPS[step].hint}</p>
          </div>
          {error && <div className="err-banner" style={{ marginBottom: 16 }}>{error}</div>}
          {last ? (
            <div className="split">
              <div>{StepBody}</div>
              <div className="sticky-side">
                <CostCard d={d} rewards={rewards} balance={builder?.balance} platformFeePct={platformFeePct} />
                <div className="card" style={{ padding: 16, marginTop: 14, background: "color-mix(in srgb, var(--accent-weak) 55%, var(--panel))", borderColor: "color-mix(in srgb, var(--accent) 30%, var(--border))" }}>
                  <div className="row gap-2" style={{ alignItems: "flex-start" }}>
                    <Icon name="info" size={17} style={{ color: "var(--accent)", flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <b style={{ fontSize: 14, color: "var(--accent)" }}>{t("createMission.whatHappensNextTitle", null, "What happens next?")}</b>
                      <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--text)", lineHeight: 1.55 }}>
                        {t("createMission.whatHappensNextBody", null, "Once you publish, your mission will be reviewed and goes live to the selected audience within a few minutes.")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : StepBody}
        </div>
      </div>

      <div className="wz-foot">
        <div className="wz-foot-inner">
          <span className="grow" />
          {step === 2 && !canNext && (
            <span className="muted" style={{ fontSize: 12.5, marginRight: 4 }}>
              {!d.tasks?.length
                ? t("createMission.needAtLeastOneTask", null, "Add at least one test case to continue")
                : t("createMission.needCompleteTasks", null, "Every task needs at least 1 step and 1 question to continue")}
            </span>
          )}
          {step === 3 && <span className="muted" style={{ fontSize: 12.5, marginRight: 4, opacity: isFetchingCount ? 0.5 : 1, transition: "opacity 0.2s" }}>{t("createMission.membersCount", { count: liveCount.toLocaleString("en-IN") }, `${liveCount.toLocaleString("en-IN")} members`)}</span>}
          {step === 4 && (
            <span className="muted mono" style={{ fontSize: 12.5, marginRight: 4, color: insufficientFunds ? "var(--danger)" : undefined }}>
              {t("createMission.estCost", { amount: inr(cost.total) }, `${inr(cost.total)} est.`)}
              {insufficientFunds && ` · ${t("createMission.insufficientBalance", null, "exceeds wallet balance")}`}
            </span>
          )}
          {last ? (
            <div className="row gap-2">
              <span
                style={{ display: "inline-block" }}
                title={insufficientFunds ? t("createMission.insufficientBalanceHint", null, "Your wallet balance isn't enough to cover this reward setup — top up your wallet or lower the cost to continue.")
                  : !readyToPublish ? t("createMission.fixIssuesAbove", null, "Fix the issues above before publishing.") : undefined}
              >
                <Btn
                  variant="primary"
                  iconRight="bolt"
                  disabled={insufficientFunds || busy || !readyToPublish}
                  onClick={goNext}
                  style={!readyToPublish ? { opacity: 0.5, pointerEvents: "none" } : undefined}
                >
                  {wasActive
                    ? (busy ? t("actions.saving", null, "Saving…") : t("actions.saveChanges", null, "Save changes"))
                    : (busy ? t("createMission.publishing", null, "Publishing…") : t("createMission.publishMission", null, "Publish Mission"))}
                </Btn>
              </span>
            </div>
          ) : (
            <span
              style={{ display: "inline-block" }}
              title={insufficientFunds ? t("createMission.insufficientBalanceHint", null, "Your wallet balance isn't enough to cover this reward setup — top up your wallet or lower the cost to continue.")
                : !fieldsValid ? t("onboarding.fillRequiredFields", null, "Please fill in the required fields before continuing.") : undefined}
            >
              <Btn
                variant="primary"
                iconRight="arrowRight"
                disabled={insufficientFunds || busy || !fieldsValid}
                onClick={goNext}
              >
                {t("createMission.continue", null, "Continue")}
              </Btn>
            </span>
          )}
        </div>
      </div>

      {/* A live mission was never autosaved (see wasActive above) — Cancel
          here just discards in-memory edits, nothing else. It's a distinct,
          simpler action from leaving a draft, so it gets its own copy
          instead of the drafts modal below. */}
      {showExitWarning && wasActive && (
        <Modal title={t("createMission.leaveWithoutSavingTitle", null, "Leave without saving?")} onClose={() => setShowExitWarning(false)} width={420} hideCloseIcon>
          <div style={{ padding: 20 }}>
            <p style={{ margin: "0 0 14px", fontSize: 14 }}>
              {t("createMission.leaveWithoutSavingBody", null, "Your changes haven't been saved. If you leave now they'll be lost — the mission itself stays exactly as it is.")}
            </p>
            <div className="row gap-2" style={{ marginTop: 24, justifyContent: "flex-end" }}>
              <button className="btn outline" onClick={() => setShowExitWarning(false)}>{t("actions.keepEditing", null, "Keep editing")}</button>
              <button className="btn btn-primary" onClick={() => navigate(-1)}>{t("createMission.leaveAnyway", null, "Leave anyway")}</button>
            </div>
          </div>
        </Modal>
      )}
      {showExitWarning && !wasActive && openedFromDraftTab && (
        // Deliberately opened this specific saved draft from a list (the
        // Draft tab, or Dashboard's recent-missions table) — the builder
        // already knows exactly which mission this is and chose to open it,
        // so "discard" here means "delete it," matching the trash icon in
        // those same lists, not "stop auto-resuming this" like the generic
        // Create-Mission-flow modal below. This is the one place the wizard
        // itself deletes a mission.
        <Modal title={t("createMission.deleteDraftTitle", null, "Delete this draft?")} onClose={() => { if (!deletingDraft) setShowExitWarning(false); }} width={420} hideCloseIcon>
          <div style={{ padding: 20 }}>
            <p style={{ margin: "0 0 14px", fontSize: 14 }}>
              {t("createMission.deleteDraftBody", null, "This permanently deletes this draft mission and everything in it. This can't be undone.")}
            </p>
            <div className="row gap-2" style={{ marginTop: 24, justifyContent: "flex-end" }}>
              <button className="btn outline" disabled={deletingDraft} onClick={() => setShowExitWarning(false)}>{t("actions.keepEditing", null, "Keep editing")}</button>
              <button
                className="btn"
                style={{ background: "var(--danger)", color: "#fff", border: "none" }}
                disabled={deletingDraft}
                onClick={async () => {
                  setDeletingDraft(true);
                  pendingSaveRef.current = null; // about to delete the mission — nothing left to flush on unmount
                  try {
                    await api.deleteMission(missionId);
                    if (getRecentDraftId(builderId) === missionId) clearRecentDraftId(builderId);
                    toast.success(t("createMission.draftDeletedToast", null, "Draft deleted successfully"));
                    navigate("/missions?tab=draft");
                  } catch (err) {
                    setDeletingDraft(false);
                    toast.error(err.message || t("createMission.draftDeleteFailed", null, "Couldn't delete this draft — try again."));
                  }
                }}
              >
                {deletingDraft ? t("actions.deleting", null, "Deleting…") : t("createMission.deleteDraft", null, "Delete draft")}
              </button>
            </div>
          </div>
        </Modal>
      )}
      {showExitWarning && !wasActive && !openedFromDraftTab && (() => {
        // Whether this draft is already save-worthy (a real DB row exists,
        // or enough content exists that the pending debounce will promote
        // it momentarily) — drives both the copy and whether "Discard" is
        // even offered, since an untouched form has nothing to discard.
        const saveWorthy = missionId || promotedId || hasContent(d);
        return (
          <Modal title={t("createMission.unsavedChangesTitle", null, "Leave this draft?")} onClose={() => setShowExitWarning(false)} width={440} hideCloseIcon>
            <div style={{ padding: 20 }}>
              <p style={{ margin: "0 0 14px", fontSize: 14 }}>
                {saveWorthy
                  ? t("createMission.leaveSavedDraftBody", null, "This draft is already saved — you can keep it and continue later from Missions → Draft, or discard it so it stops being suggested next time you click Create Mission.")
                  : t("createMission.leaveUnsavedDraftBody", null, "You haven't entered anything yet, so there's nothing to save. Leaving now won't create a draft.")}
              </p>
              <div className="row gap-2" style={{ marginTop: 24, justifyContent: "flex-end" }}>
                {saveWorthy && (
                  <button className="btn outline" onClick={() => {
                    // Discard only ever clears the local resume pointer/scratch —
                    // the DB draft itself is never deleted here. The Draft tab's
                    // trash icon is the one place that actually removes it.
                    clearAllLocalDraftState(builderId);
                    navigate("/");
                  }}>{t("createMission.discardDraft", null, "Discard draft")}</button>
                )}
                <button className="btn btn-primary" onClick={() => navigate("/")}>
                  {saveWorthy ? t("createMission.keepAsDraft", null, "Keep as draft") : t("actions.leave", null, "Leave")}
                </button>
              </div>
            </div>
          </Modal>
        );
      })()}

      {showStartFreshWarning && (
        <Modal title={t("createMission.startFreshTitle", null, "Start Fresh")} onClose={() => setShowStartFreshWarning(false)} width={400} hideCloseIcon>
          <div style={{ padding: 20 }}>
            <p style={{ margin: "0 0 14px", fontSize: 14 }}>
              {t("createMission.startFreshConfirm", null, "Start a new mission from scratch? This discards your current draft.")}
            </p>
            <div className="row gap-2" style={{ marginTop: 24, justifyContent: "flex-end" }}>
              <button className="btn outline" onClick={() => setShowStartFreshWarning(false)}>{t("actions.cancel", null, "Cancel")}</button>
              <button className="btn btn-primary" onClick={doStartFresh}>{t("createMission.startFresh", null, "Start fresh")}</button>
            </div>
          </div>
        </Modal>
      )}

      {showStaleWarning && (
        <Modal title={t("createMission.staleTestCasesTitle", null, "Test cases may be out of date")} onClose={() => setShowStaleWarning(false)} width={440} hideCloseIcon>
          <div style={{ padding: 20 }}>
            <p style={{ margin: "0 0 14px", fontSize: 14 }}>
              {t("createMission.staleTestCasesBody", null, "We've noticed the test case details were updated after these test cases were generated. We recommend regenerating them. Do you want to regenerate?")}
            </p>
            <div className="row gap-2" style={{ marginTop: 24, justifyContent: "flex-end" }}>
              <button className="btn outline" onClick={() => { setShowStaleWarning(false); testCasesRef.current?.regenerate(); }}>{t("createMission.yesRegenerate", null, "Yes, Regenerate")}</button>
              <button className="btn btn-primary" onClick={() => { setShowStaleWarning(false); advanceStep(); }}>{t("createMission.noContinue", null, "No, Continue")}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
