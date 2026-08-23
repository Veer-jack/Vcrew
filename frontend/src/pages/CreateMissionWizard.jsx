import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
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
      {Object.entries(d.filters).flatMap(([, s]) => [...s]).length === 0 && (
        <div style={{ padding: "10px 14px", background: "var(--warning-weak)", color: "var(--warning)", borderRadius: "var(--radius-sm)", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <Icon name="alertTriangle" size={16} />
          {t("createMission.noFiltersWarning", null, "Please select at least one filter to define your audience.")}
        </div>
      )}
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

function StepReward({ d, set, rewards, showErrors, builder, liveCount, locked }) {
  const { t } = useTranslation();
  const rw = rewards.find(r => r.id === d.reward.type);
  const needsAmt = rw?.needsAmt;
  const overUnverifiedCap = !builder?.verified && d.reward.participants > UNVERIFIED_PARTICIPANT_LIMIT;
  const overAudienceCount = liveCount > 0 && d.reward.participants > liveCount;
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

function serializeDraft(d) {
  const data = { ...d, filters: {} };
  for (const k in d.filters) {
    data.filters[k] = Array.from(d.filters[k] || []);
  }
  return JSON.stringify(data);
}

function deserializeDraft(jsonStr, emptyF) {
  try {
    const data = JSON.parse(jsonStr);
    for (const k in data.filters) {
      data.filters[k] = new Set(data.filters[k] || []);
    }
    data.filters = { ...emptyF, ...data.filters };
    return data;
  } catch {
    return null;
  }
}

// Module scope (not component state): evaluated once per real browser page
// load, and untouched by client-side route changes, since those don't
// re-run module code. That's exactly the signal needed to tell "the user
// hit reload" apart from "the user navigated away and back within the app" —
// the Navigation Timing API only flags the *document's* load as type
// "reload", and that value is otherwise indistinguishable from ordinary SPA
// remounts once read. The guard flag ensures the draft is only ever wiped
// once per real reload, not on every subsequent SPA visit to this route.
let handledFreshReload = false;
function clearDraftIfFreshReload(draftKey) {
  if (handledFreshReload) return;
  handledFreshReload = true;
  try {
    if (performance.getEntriesByType("navigation")[0]?.type !== "reload") return;
  } catch { return; }
  try {
    localStorage.removeItem(draftKey);
    localStorage.removeItem(draftKey + "_step");
    localStorage.removeItem(draftKey + "_maxReached");
    localStorage.removeItem(draftKey + "_promotedId");
  } catch { /* ignore */ }
}

export default function CreateMissionWizard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id: missionId } = useParams();
  const [searchParams] = useSearchParams();
  const { builder, refreshBuilder } = useAuth();
  const { categories, ptypes, rewards, filters, platformFeePct } = useMeta();
  const WZ_STEPS = wzSteps(t);
  const lastStep = WZ_STEPS.length - 1;

  // Scoped per-builder so switching accounts on the same browser never shows
  // one builder's in-progress mission draft to another.
  const DRAFT_KEY = `vcrew_mission_draft_${builder?.id || "anon"}`;
  clearDraftIfFreshReload(DRAFT_KEY);

  // Resuming an existing mission opens on Review by default, with every step
  // already unlocked via the rail/Edit links — the scratch localStorage draft
  // (for an in-progress *new* mission) plays no part in this flow. A caller
  // that wants a specific step up front (e.g. Mission Detail's Audience tab
  // jumping straight to Step 4) can pass ?step=N.
  const initialEditStep = () => {
    const s = parseInt(searchParams.get("step") || "", 10);
    return Number.isInteger(s) && s >= 0 && s <= lastStep ? s : lastStep;
  };
  
  const isPromotedDraft = missionId && missionId === localStorage.getItem(DRAFT_KEY + "_promotedId");

  const [step, setStep] = useState(() => {
    if (missionId && !isPromotedDraft) return initialEditStep();
    return parseInt(localStorage.getItem(DRAFT_KEY + "_step") || "0", 10);
  });
  
  const [maxReached, setMaxReached] = useState(() => {
    if (missionId && !isPromotedDraft) return lastStep;
    // When using local state, we need the initial step evaluated just above, but
    // since we can't refer to the state variable during initialization, we recalculate it.
    const initialStep = parseInt(localStorage.getItem(DRAFT_KEY + "_step") || "0", 10);
    return Math.max(initialStep, parseInt(localStorage.getItem(DRAFT_KEY + "_maxReached") || "0", 10));
  });
  
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [published, setPublished] = useState(false);
  const [showExitWarning, setShowExitWarning] = useState(false);
  const [showStartFreshWarning, setShowStartFreshWarning] = useState(false);
  const [showStaleWarning, setShowStaleWarning] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [loadingMission, setLoadingMission] = useState(!!missionId);
  // Mirrors the backend's own field-level allowlist (PATCH /missions/:id) —
  // once any participant has moved past "invited", category/ptype/tasks/
  // reward/duration get silently dropped from an update request, so the UI
  // locks them here instead of letting the builder edit fields that won't
  // actually save. wasActive distinguishes "editing an already-live mission"
  // from "resuming an unpublished draft", for the Step 6 button/toast copy.
  const [canFullyEdit, setCanFullyEdit] = useState(true);
  const [wasActive, setWasActive] = useState(false);
  // Set once this brand-new mission's scratch draft has been silently
  // promoted to a real backend draft (see the auto-save effect below) —
  // read from localStorage first so a page reload resumes updating the same
  // row instead of creating a duplicate.
  const [promotedId, setPromotedId] = useState(() => (!missionId || isPromotedDraft) ? (localStorage.getItem(DRAFT_KEY + "_promotedId") || null) : null);
  // "Create Mission" should always resume whatever draft is already in
  // progress, however it was opened before — checking localStorage's own
  // promotedId alone missed a draft that was opened through the Draft tab
  // instead of freshly auto-promoted here, since nothing in that path ever
  // touched localStorage. Asking the server directly is the one source of
  // truth that's consistent regardless of entry point. Runs once per mount
  // (missionId never changes on this route), so it doesn't interfere with
  // the ongoing autosave effects below.
  useEffect(() => {
    if (missionId) return;
    let cancelled = false;
    api.missions({ status: "draft" }).then(({ missions }) => {
      if (!cancelled && missions?.length > 0) navigate(`/missions/${missions[0].id}/edit`, { replace: true });
    }).catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missionId]);

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
    if (missionId && !isPromotedDraft) return freshDraft(); // placeholder until the fetch below lands
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
      const parsed = deserializeDraft(saved, emptyFilters(filters));
      if (parsed) return parsed;
    }
    return freshDraft();
  });

  const hasContent = Boolean(d.title.trim() || d.desc.trim() || d.cat || d.ptype || (d.tasks && d.tasks.length > 0) || d.reward.type || d.deadline);
  
  const publishedRef = useRef(published);
  const hasContentRef = useRef(hasContent);

  useEffect(() => {
    publishedRef.current = published;
    hasContentRef.current = hasContent;
  }, [published, hasContent]);

  useEffect(() => {
    return () => {
      if (!publishedRef.current && hasContentRef.current) {
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
        setWasActive(mission.status !== "draft");
        
        if (isPromotedDraft) {
          setLoadingMission(false);
          return;
        }

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
        
        const realMax = mission.status !== "draft" ? lastStep : calcMax;
        let targetStep = parseInt(searchParams.get("step"), 10);
        if (!Number.isInteger(targetStep) || targetStep < 0 || targetStep > realMax) {
          targetStep = realMax;
        }
        
        setStep(targetStep);
        setMaxReached(realMax);
        setLoadingMission(false);
      })
      .catch(() => navigate("/missions", { replace: true }));
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

  // Auto-save to localStorage — survives reload/tab-close by design, so the
  // exit-warning copy ("your progress has been auto-saved") stays true.
  // Skipped entirely while resuming an existing draft: that content is
  // already safely persisted server-side, and writing it into the "new
  // mission" scratch slot would make the next "Create Mission" click
  // confusingly resume this same draft's content.
  useEffect(() => {
    if (!published && (!missionId || isPromotedDraft)) {
      localStorage.setItem(DRAFT_KEY, serializeDraft(d));
      localStorage.setItem(DRAFT_KEY + "_step", step);
      localStorage.setItem(DRAFT_KEY + "_maxReached", maxReached);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d, step, maxReached, published, missionId, isPromotedDraft]);

  // Native browser prompt for tab close/refresh
  useEffect(() => {
    if (published) return;
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [published]);

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

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    localStorage.removeItem(DRAFT_KEY + "_step");
    localStorage.removeItem(DRAFT_KEY + "_maxReached");
    localStorage.removeItem(DRAFT_KEY + "_promotedId");
  };

  const startFresh = () => setShowStartFreshWarning(true);
  const doStartFresh = async () => {
    setShowStartFreshWarning(false);
    // "Start fresh" is the one explicit discard action — unlike Leave Page,
    // which deliberately keeps the draft recoverable — so a silently
    // auto-promoted backend draft needs to be cleaned up here too, not just
    // the local scratch copy. Also bumps freshStartRef so an auto-promote
    // request that's already mid-flight at this exact moment (2-second
    // debounce already elapsed, response not back yet) knows to clean up
    // after itself once it resolves, instead of resurfacing.
    freshStartRef.current++;
    if (missionId) {
      await api.deleteMission(missionId).catch(() => {});
      clearDraft();
      setD(freshDraft());
      setStep(0);
      setMaxReached(0);
      setPromotedId(null);
      navigate("/missions/new", { replace: true });
      return;
    }
    if (promotedId) await api.deleteMission(promotedId).catch(() => {});
    setPromotedId(null);
    clearDraft();
    setD(freshDraft());
    setStep(0);
    setMaxReached(0);
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
  // warning-only nudge.
  const withinAudienceCount = liveCount === 0 || d.reward.participants <= liveCount;
  const todayStr = new Date().toISOString().slice(0, 10);
  const fieldsValid = (step !== 0 || (d.title.trim() && d.desc.trim() && d.cat && d.deadline && d.deadline >= todayStr))
    && (step !== 1 || !!d.ptype)
    && (step !== 2 || (d.tasks && d.tasks.length > 0 && d.tasks.every(tk =>
      tk.steps?.length > 0 && tk.steps.every(s => s.trim()) &&
      tk.questions?.length > 0 && tk.questions.every(q => q.text?.trim())
    )))
    && (step !== 3 || Object.values(d.filters).some(s => s.size > 0) || Object.values(d.otherEntries || {}).some(e => e?.length > 0))
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
  // to a real backend draft once it has content worth not losing — same
  // threshold as the Dashboard's "unsaved mission" banner. One-shot: once
  // promotedId is set, this effect stops firing and the update effect below
  // takes over keeping that same row current.
  useEffect(() => {
    if (missionId || promotedId || published) return;
    const hasContent = d.title?.trim() || d.desc?.trim() || d.deadline || d.tasks?.length > 0;
    if (!hasContent) return;
    const startGen = freshStartRef.current;
    const timer = setTimeout(() => {
      setSaveStatus("saving");
      api.createMission(buildMissionPayload("draft")).then(({ mission }) => {
        // "Start fresh" ran while this request was already in flight — the
        // wizard has moved on, so this mission was never actually seen by
        // the user and would otherwise sit orphaned forever. Clean it up
        // instead of re-attaching it to the reset wizard as promotedId.
        if (freshStartRef.current !== startGen) { api.deleteMission(mission.id).catch(() => {}); return; }
        localStorage.setItem(DRAFT_KEY + "_promotedId", String(mission.id));
        setPromotedId(mission.id);
        setSaveStatus("saved");
      }).catch(() => setSaveStatus("idle") /* stays localStorage-only; retries on the next content change */);
    }, 2000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d, missionId, promotedId, published]);

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
    if (!id || loadingMission || published || wasActive) return;
    const timer = setTimeout(() => {
      setSaveStatus("saving");
      api.updateMission(id, buildMissionPayload("draft"))
        .then(() => setSaveStatus("saved"))
        .catch(() => setSaveStatus("idle"));
    }, 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d, missionId, promotedId, loadingMission, published, wasActive]);

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
      clearDraft();
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
    <StepReward d={d} set={set} rewards={rewards} showErrors={showErrors} builder={builder} liveCount={liveCount} locked={fieldsLocked} />,
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

      {showExitWarning && (
        <Modal title={t("createMission.unsavedChangesTitle", null, "Unsaved Changes")} onClose={() => setShowExitWarning(false)} width={440} hideCloseIcon>
          <div style={{ padding: 20 }}>
            <p style={{ margin: "0 0 14px", fontSize: 14 }}>
              {t("createMission.unsavedChangesBodyNew", null, "You have unsaved mission progress. Would you like to save it as a draft to continue later, or discard your progress entirely? Note: if you chose save to drafts nothing will happen to existed draft only it will be updated")}
            </p>
            <div className="row gap-2" style={{ marginTop: 24, justifyContent: "flex-end" }}>
              <button className="btn outline" onClick={async () => {
                if (missionId) await api.deleteMission(missionId).catch(() => {});
                else if (promotedId) await api.deleteMission(promotedId).catch(() => {});
                clearDraft();
                navigate("/");
              }}>{t("createMission.discardProgress", null, "Discard Progress")}</button>
              <button className="btn btn-primary" onClick={() => {
                toast.success(t("dashboard.draftSavedBackNav", null, "Your mission draft was saved — find it under Missions → Draft."), { position: "top-center" });
                navigate("/");
              }}>{t("createMission.saveToDrafts", null, "Save to drafts")}</button>
            </div>
          </div>
        </Modal>
      )}

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
