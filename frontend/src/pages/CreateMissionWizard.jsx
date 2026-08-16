import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import Icon from "../components/Icon";
import { BrandMark } from "../components/BrandMark";
import React from 'react';
import { Btn, inr } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { useMeta } from "../context/MetaContext";
import { api } from "../api/client";
import StepTestCases from "../components/StepTestCases";
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



function StepInfo({ d, set, categories, showErrors }) {
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
      <div className="fsec"><b>{t("createMission.missionCategoryLabel", null, "Mission Category")} <span className="req-star" aria-hidden="true">*</span></b><span className="line" /><span className="cnt">{t("createMission.pickOne", null, "Pick one")}</span></div>
      <div className="optcards">
        {categories.map(c => (
          <button key={c.id} className={`optcard ${d.cat === c.id ? "on" : ""}`} style={{ "--tc": `var(--t-${c.id})` }} onClick={() => set({ cat: c.id })}>
            <span className="oc-tick"><Icon name="check" size={12} /></span>
            <span className="oc-ic"><Icon name={c.icon} size={20} /></span>
            <b>{categoryLabel(t, c)}</b><p>{categoryDesc(t, c)}</p>
          </button>
        ))}
      </div>
      <div className={`fld ${showErrors && (!d.deadline || d.deadline < todayStr) ? "fld-invalid" : ""}`} style={{ marginTop: 24, maxWidth: 280 }}>
        <label>{t("createMission.deadlineLabel", null, "Mission deadline")} <span className="req-star" aria-hidden="true">*</span></label>
        <input className="fin" type="date" min={todayStr} value={d.deadline} onChange={e => set({ deadline: e.target.value < todayStr ? todayStr : e.target.value })} onClick={e => e.currentTarget.showPicker?.()} />
        <p className="fhint">{t("createMission.deadlineHint", null, "The last day this mission accepts new participants.")}</p>
        {showErrors && d.deadline && d.deadline < todayStr && <p className="ferr">{t("createMission.deadlineInPast", null, "Deadline can't be in the past")}</p>}
      </div>
    </div>
  );
}

export function FilterGroup({ title, options, sel, toggle, otherText, onOtherTextChange, onSelectAll, initialExpanded = true, externalQuery, impliedAll = false }) {
  const { t } = useTranslation();
  const [q, setQ] = React.useState("");
  const [expanded, setExpanded] = React.useState(initialExpanded);
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
  const showOtherInput = onOtherTextChange && sel.has("Other");
  // Scoped to this group's own options — `sel` is shared across sibling
  // subgroups (e.g. all of Geography's regions share one Set), so counting
  // sel.size directly would show the whole category's total on every
  // subgroup instead of just what's actually selected here.
  const ownSelectedCount = impliedAll ? options.length : options.reduce((n, o) => n + (sel.has(o) ? 1 : 0), 0);
  const allSelected = options.length > 0 && options.every(o => sel.has(o));
  return (
    <div className="fsec" style={{ display: "block", margin: "22px 0 10px" }}>
      <div className="row between" style={{ marginBottom: 10, cursor: "pointer" }} onClick={() => setExpanded(v => !v)}>
        <div className="row gap-2" style={{ alignItems: "center" }}>
          <Icon name={isOpen ? "chevronDown" : "chevronRight"} size={14} style={{ color: "var(--text-faint)" }} />
          <b style={{ fontSize: 12.5 }}>{trFilterLabel(t, title)}</b>
        </div>
        <div className="row gap-3" style={{ alignItems: "center" }}>
          {ownSelectedCount > 0 && <span className="cnt mono" style={{ color: "var(--accent)" }}>{impliedAll ? t("createMission.includedViaWorldwide", null, "Included via Worldwide") : t("createMission.selectedCount", { count: ownSelectedCount }, `${ownSelectedCount} selected`)}</span>}
          {onSelectAll && !impliedAll && (
            <button className="backlink" style={{ margin: 0, fontSize: 12 }} onClick={e => { e.stopPropagation(); onSelectAll(options); }}>
              {allSelected ? t("createMission.clearAll", null, "Clear all") : t("createMission.selectAll", null, "Select all")}
            </button>
          )}
        </div>
      </div>
      {isOpen && (
        <>
          {showSearch && !impliedAll && (
            <input
              className="fin"
              style={{ marginBottom: 10, fontSize: 13 }}
              placeholder={t("createMission.searchGroupPlaceholder", { group: title.toLowerCase() }, `Search ${title.toLowerCase()}…`)}
              value={q}
              onChange={e => setQ(e.target.value)}
            />
          )}
          <div className="chips">
            {filtered.map(o => {
              // Worldwide itself must stay clickable even while impliedAll is
              // active — it's the only way to turn "everything included" back off.
              const lockedByImpliedAll = impliedAll && o !== WORLDWIDE;
              return (
                <button key={o} className={`chip ${(impliedAll || sel.has(o)) ? "on" : ""}`} disabled={lockedByImpliedAll}
                  style={lockedByImpliedAll ? { cursor: "default", opacity: 0.85 } : undefined}
                  onClick={() => toggle(title, o)}>
                  <span className="ck"><Icon name="check" size={10} /></span>{trFilterLabel(t, o)}
                </button>
              );
            })}
            {filtered.length === 0 && <span className="muted" style={{ fontSize: 12 }}>{t("createMission.noMatchesFor", { q: activeQuery }, `No matches for "${activeQuery}"`)}</span>}
          </div>
          {showOtherInput && (
            <input
              className="fin"
              style={{ marginTop: 10, fontSize: 13, maxWidth: 320 }}
              placeholder={t("createMission.otherGeoPlaceholder", null, "e.g. Nepal, Sri Lanka…")}
              value={otherText}
              onChange={e => onOtherTextChange(e.target.value)}
            />
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
            <div className="r-num" key={count}>{count.toLocaleString("en-IN")} <span style={{ fontSize: 14, color: "var(--text-muted)", fontWeight: 600 }}>{t("createMission.matchingMembers", null, "matching members")}</span></div>
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
      {Object.entries(filters).map(([g, opts]) => (
        // Every top-level category gets the same bordered card, whether it's a
        // flat option list (Professional, ValidationCrew Role) or a grouped one
        // (Geography, Interests) — previously only grouped categories had the
        // wrapper, so flat ones looked like loose, unrelated sections by contrast.
        <div key={g} style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "16px 16px 4px", margin: "22px 0" }}>
          {!Array.isArray(opts) && (
            <div className="row between" style={{ marginBottom: 2 }}>
              <b style={{ fontSize: 13.5 }}>{trFilterLabel(t, g)}</b>
              {d.filters[g].size > 0 && <span className="cnt mono" style={{ color: "var(--accent)" }}>{t("createMission.selectedCount", { count: d.filters[g].size }, `${d.filters[g].size} selected`)}</span>}
            </div>
          )}
          {Array.isArray(opts) ? (
            <FilterGroup
              title={g} options={opts} sel={d.filters[g]} toggle={toggle}
              otherText={g === "Geography" ? (d.otherGeoText || "") : undefined}
              onOtherTextChange={g === "Geography" ? (v) => set({ otherGeoText: v, audienceTouched: true }) : undefined}
              onSelectAll={opts => selectAllInGroup(g, opts)}
            />
          ) : (
            Object.entries(opts).map(([sub, subOpts]) => (
              <FilterGroup key={g + sub} title={sub} options={subOpts} sel={d.filters[g]} toggle={(_, o) => toggle(g, o)}
                otherText={subOpts.includes("Other") ? (d.otherGeoText || "") : undefined}
                onOtherTextChange={subOpts.includes("Other") ? (v) => set({ otherGeoText: v, audienceTouched: true }) : undefined}
                onSelectAll={subOpts => selectAllInGroup(g, subOpts)}
                impliedAll={g === GEO_GROUP && d.filters[GEO_GROUP]?.has(WORLDWIDE)}
              />
            ))
          )}
        </div>
      ))}
    </div>
  );
}

function StepParticipation({ d, set, ptypes }) {
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
      <div className="optcards">
        {ptypes.map(p => (
          <button key={p.id} className={`optcard ${d.ptype === p.id ? "on" : ""}`} onClick={() => set({ ptype: p.id })}>
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

function StepReward({ d, set, rewards, showErrors, builder, liveCount }) {
  const { t } = useTranslation();
  const rw = rewards.find(r => r.id === d.reward.type);
  const needsAmt = rw?.needsAmt;
  const overUnverifiedCap = !builder?.verified && d.reward.participants > UNVERIFIED_PARTICIPANT_LIMIT;
  const overAudienceCount = liveCount > 0 && d.reward.participants > liveCount;
  return (
    <div className="rise">
      <div className="fsec"><b>{t("createMission.rewardTypeLabel", null, "Reward Type")} <span className="req-star" aria-hidden="true">*</span></b><span className="line" /></div>
      <div className="optcards c2" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        {rewards.map(r => (
          <button key={r.id} className={`optcard ${d.reward.type === r.id ? "on" : ""}`} onClick={() => set({ reward: { ...d.reward, type: r.id } })}>
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
              <input className="fin" type="number" min="1" value={d.reward.amount} onChange={e => set({ reward: { ...d.reward, amount: +e.target.value } })} />
            </div>
          </div>
        )}
        <div className={`fld ${showErrors && overUnverifiedCap ? "fld-invalid" : ""}`}>
          <label>{t("createMission.numberOfParticipantsLabel", null, "Number of Participants")} <span className="req-star" aria-hidden="true">*</span></label>
          <input className="fin" type="number" min="1" max="500" value={d.reward.participants} onChange={e => set({ reward: { ...d.reward, participants: Math.min(500, Math.max(1, +e.target.value)) } })} />
          <p className="fhint">
            {!builder?.verified
              ? t("createMission.participantsHintUnverified", { limit: UNVERIFIED_PARTICIPANT_LIMIT }, `Unverified accounts are limited to ${UNVERIFIED_PARTICIPANT_LIMIT} participants per mission. Verify your website to unlock up to 500.`)
              : t("createMission.participantsHint", null, "We recommend 80–150 for statistically useful feedback. Maximum 500 participants.")}
          </p>
          {overAudienceCount && (
            <p className="fhint" style={{ color: "var(--danger)" }}>
              <Icon name="alertTriangle" size={12} style={{ verticalAlign: -1, marginRight: 4 }} />
              {t("createMission.participantsExceedAudience", { count: liveCount }, `Only ${liveCount.toLocaleString("en-IN")} validators match your selected audience — lower this or widen your audience filters in step 4.`)}
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

function BalanceCard({ balance }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const low = (balance ?? 0) < 500;
  return (
    <div className="estcard accent">
      <span className="eyebrow">{t("createMission.walletBalance", null, "Wallet balance")}</span>
      <div className="est-num" style={{ margin: "8px 0 14px" }}>{inr(balance)}</div>
      {low ? (
        <>
          <div className="row gap-2" style={{ fontSize: 12.5, color: "var(--danger)", alignItems: "flex-start" }}>
            <Icon name="alertTriangle" size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{t("createMission.lowBalanceWarning", null, "Your balance is low — top up your wallet before publishing to avoid interruptions.")}</span>
          </div>
          <Btn variant="primary" icon="plus" block onClick={() => navigate("/wallet")} style={{ marginTop: 14 }}>
            {t("actions.addFunds", null, "Add funds")}
          </Btn>
        </>
      ) : (
        <div className="row gap-2" style={{ fontSize: 12, color: "var(--text-faint)" }}>
          <Icon name="shield" size={14} /><span>{t("createMission.escrowNote", null, "Held in escrow · released only on approved submissions")}</span>
        </div>
      )}
    </div>
  );
}

// Nudges an incomplete profile without blocking the wizard — Save as Draft and every
// step stay usable; only actually publishing is gated (see goNext), matching the same
// completeness check as the Dashboard banner (builder.profile null = incomplete).
function ProfileNudgeCard({ builder }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const hasRole = !!builder?.persona;
  const dest = hasRole ? `/signup?role=${builder.persona}` : "/get-started/feedback";
  return (
    <div className="estcard accent" style={{ marginTop: 14 }}>
      <div className="row gap-2" style={{ alignItems: "flex-start" }}>
        <Icon name="alertTriangle" size={16} style={{ color: "var(--danger)", flexShrink: 0, marginTop: 1 }} />
        <div>
          <b style={{ fontSize: 13.5 }}>{t("createMission.completeProfileTitle", null, "Complete your profile to publish")}</b>
          <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.5 }}>
            {hasRole
              ? t("createMission.completeProfileBodyResume", null, "You can keep building this mission, but you'll need to finish setting up your profile before it can go live.")
              : t("createMission.completeProfileBodyNoRole", null, "You can keep building this mission, but you'll need to select your role and finish setup before it can go live.")}
          </p>
        </div>
      </div>
      <Btn variant="ghost" icon="user" block onClick={() => navigate(dest)} style={{ marginTop: 12 }}>
        {t("actions.completeProfile", null, "Complete Profile")}
      </Btn>
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
function StepReview({ d, categories, ptypes, rewards, liveCount, onEditStep }) {
  const { t } = useTranslation();
  const [descExpanded, setDescExpanded] = React.useState(false);
  const cat = categories.find(c => c.id === d.cat) || categories[0];
  const pt = ptypes.find(p => p.id === d.ptype);
  const rw = rewards.find(r => r.id === d.reward.type);
  const count = liveCount;
  const allFilters = Object.entries(d.filters).flatMap(([g, s]) =>
    [...s].map(v => (g === "Geography" && v === "Other" && d.otherGeoText?.trim()) ? d.otherGeoText.trim() : v)
  );
  const descLong = d.desc && d.desc.length > 160;
  return (
    <div className="rise">
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

// The backend already free-text substring-matches Geography (see
// getRealMatchCount in backend/src/routes/audience.js), so the "Other"
// chip's typed value can be sent straight through as its own entry —
// no need to swap it in for the literal "Other" marker (the backend treats
// "Other" itself as a no-op, same as "Worldwide"/"Remote").
function buildAudiencePayload(d) {
  const audience = Object.fromEntries(Object.entries(d.filters).map(([k, v]) => [k, [...v]]));
  const otherGeo = (d.otherGeoText || "").trim();
  if (otherGeo && audience.Geography?.includes("Other")) audience.Geography = [...audience.Geography, otherGeo];
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
    // Resuming a saved/draft mission means its audience was already set at
    // some point (even if that set is empty) — not the untouched default a
    // brand-new freshDraft() starts with, so the Step 4 gate shouldn't ask
    // this user to re-touch it just because they reopened the wizard.
    audienceTouched: true,
    genFor: null,
    durationDays: mission.durationDays || 7,
    deadline: mission.deadline ? mission.deadline.slice(0, 10) : "",
    tasks: mission.tasks || [],
  };
  for (const g of Object.keys(emptyF)) {
    const vals = audience[g];
    if (!Array.isArray(vals)) continue;
    if (g === GEO_GROUP) {
      const known = new Set(flatOptions(filters[GEO_GROUP]));
      const sel = new Set();
      let otherText = "";
      for (const v of vals) {
        if (known.has(v)) sel.add(v);
        else { sel.add("Other"); otherText = v; }
      }
      draft.filters[g] = sel;
      if (otherText) draft.otherGeoText = otherText;
    } else {
      draft.filters[g] = new Set(vals);
    }
  }
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
  } catch { /* ignore */ }
}

export default function CreateMissionWizard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id: missionId } = useParams();
  const { builder, refreshBuilder } = useAuth();
  const { categories, ptypes, rewards, filters, platformFeePct } = useMeta();
  const WZ_STEPS = wzSteps(t);
  const lastStep = WZ_STEPS.length - 1;

  // Scoped per-builder so switching accounts on the same browser never shows
  // one builder's in-progress mission draft to another.
  const DRAFT_KEY = `vcrew_mission_draft_${builder?.id || "anon"}`;
  clearDraftIfFreshReload(DRAFT_KEY);

  // Resuming an existing draft opens straight on Review, with every step
  // already unlocked via the rail/Edit links — the scratch localStorage draft
  // (for an in-progress *new* mission) plays no part in this flow.
  const [step, setStep] = useState(() => missionId ? lastStep : parseInt(localStorage.getItem(DRAFT_KEY + "_step") || "0", 10));
  const [maxReached, setMaxReached] = useState(() => missionId ? lastStep : Math.max(step, parseInt(localStorage.getItem(DRAFT_KEY + "_maxReached") || "0", 10)));
  const [busy, setBusy] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [error, setError] = useState("");
  const [published, setPublished] = useState(false);
  const [showExitWarning, setShowExitWarning] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [loadingMission, setLoadingMission] = useState(!!missionId);

  const freshDraft = () => ({
    title: "", desc: "", cat: categories[0]?.id || "feedback",
    // Preselecting "Validator" gives the live match-count something sensible to
    // show immediately, but it must not count as the user having reviewed their
    // audience — audienceTouched stays false until they actually interact with
    // a filter, so the Step 4 "must pick an audience" gate isn't satisfied by
    // a default nobody looked at.
    filters: { ...emptyFilters(filters), "ValidationCrew Role": new Set(["Validator"]) },
    audienceTouched: false,
    ptype: ptypes[0]?.id || "ptest",
    reward: { type: "fixed", amount: 250, participants: 120 },
    genFor: null,
    durationDays: 7,
    deadline: "",
  });

  const [d, setD] = useState(() => {
    if (missionId) return freshDraft(); // placeholder until the fetch below lands
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
      const parsed = deserializeDraft(saved, emptyFilters(filters));
      if (parsed) return parsed;
    }
    return freshDraft();
  });

  useEffect(() => {
    if (!missionId) return;
    let cancelled = false;
    api.mission(missionId)
      .then(({ mission }) => {
        if (cancelled) return;
        // Only drafts are editable through this full wizard — an already-
        // published mission lands here only via a stale/hand-typed URL.
        if (mission.status !== "draft") { navigate(`/missions/${missionId}`, { replace: true }); return; }
        setD(missionToDraft(mission, filters, categories, ptypes));
        setLoadingMission(false);
      })
      .catch(() => navigate("/missions", { replace: true }));
    return () => { cancelled = true; };
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
  }, [d.filters, d.otherGeoText]);

  // Auto-save to localStorage — survives reload/tab-close by design, so the
  // exit-warning copy ("your progress has been auto-saved") stays true.
  // Skipped entirely while resuming an existing draft: that content is
  // already safely persisted server-side, and writing it into the "new
  // mission" scratch slot would make the next "Create Mission" click
  // confusingly resume this same draft's content.
  useEffect(() => {
    if (!published && !missionId) {
      localStorage.setItem(DRAFT_KEY, serializeDraft(d));
      localStorage.setItem(DRAFT_KEY + "_step", step);
      localStorage.setItem(DRAFT_KEY + "_maxReached", maxReached);
    }
  }, [d, step, maxReached, published, missionId]);

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

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    localStorage.removeItem(DRAFT_KEY + "_step");
    localStorage.removeItem(DRAFT_KEY + "_maxReached");
  };

  const startFresh = () => {
    if (!window.confirm(t("createMission.startFreshConfirm", null, "Start a new mission from scratch? This discards your current draft."))) return;
    clearDraft();
    setD(freshDraft());
    setStep(0);
    setMaxReached(0);
  };

  const set = (patch) => setD(p => ({ ...p, ...patch }));
  const toggle = (group, opt) => setD(p => {
    if (group === GEO_GROUP) {
      if (opt === WORLDWIDE) {
        // Worldwide must stay a standalone "no restriction" marker — the backend
        // (getRealMatchCount) treats a bare Worldwide/Remote-only selection as
        // "matches everyone", but expanding it into every individual city/country
        // instead makes the backend build a restrictive OR-list of ~40 place-name
        // substrings, which can match FEWER validators than true "no restriction"
        // (anyone whose location doesn't cleanly match a known place name is excluded).
        const s = p.filters[GEO_GROUP].has(WORLDWIDE) ? new Set() : new Set([WORLDWIDE]);
        return { ...p, filters: { ...p.filters, [GEO_GROUP]: s }, audienceTouched: true };
      }
      const s = new Set(p.filters[GEO_GROUP]);
      s.has(opt) ? s.delete(opt) : s.add(opt);
      s.delete(WORLDWIDE);
      return { ...p, filters: { ...p.filters, [GEO_GROUP]: s }, audienceTouched: true };
    }
    const s = new Set(p.filters[group]); s.has(opt) ? s.delete(opt) : s.add(opt);
    return { ...p, filters: { ...p.filters, [group]: s }, audienceTouched: true };
  });
  // Select-all / clear-all for one category or subcategory's own option list —
  // toggles based on whether every option in it is already selected, so the
  // button reads "Select all" until fully checked, then flips to "Clear all".
  const selectAllInGroup = (group, opts) => setD(p => {
    const s = new Set(p.filters[group]);
    const allIn = opts.every(o => s.has(o));
    if (allIn) opts.forEach(o => s.delete(o)); else opts.forEach(o => s.add(o));
    return { ...p, filters: { ...p.filters, [group]: s }, audienceTouched: true };
  });

  const cost = computeCost(d, rewards, platformFeePct);
  const last = step === lastStep;
  const insufficientFunds = (step === 4 || last) && cost.total > (builder?.balance ?? 0);
  const selectedReward = rewards.find(r => r.id === d.reward.type);
  const rewardAmountOk = !selectedReward?.needsAmt || d.reward.amount > 0;
  const participantsOk = builder?.verified || d.reward.participants <= UNVERIFIED_PARTICIPANT_LIMIT;
  // Mirrors StepReward's own overAudienceCount warning — requesting more
  // participants than the selected audience can actually supply isn't just
  // a bad estimate, it's a mission that can never fully fill, so it blocks
  // the same way rewardAmountOk/participantsOk do rather than staying a
  // warning-only nudge.
  const withinAudienceCount = liveCount === 0 || d.reward.participants <= liveCount;
  // Missing required fields keep Continue clickable (so clicking it can
  // explain what's missing via showErrors) — only insufficientFunds hard-
  // disables it, since that one already has its own hover tooltip.
  const todayStr = new Date().toISOString().slice(0, 10);
  const fieldsValid = (step !== 0 || (d.title.trim() && d.desc.trim() && d.cat && d.deadline && d.deadline >= todayStr))
    && (step !== 2 || (d.tasks && d.tasks.length > 0 && d.tasks.every(tk =>
      tk.steps?.length > 0 && tk.steps.every(s => s.trim()) &&
      tk.questions?.length > 0 && tk.questions.every(q => q.text?.trim())
    )))
    && (step !== 3 || (d.audienceTouched && Object.values(d.filters).some(s => s.size > 0)))
    && (step !== 4 || (rewardAmountOk && participantsOk && withinAudienceCount));
  const canNext = fieldsValid && !insufficientFunds;

  const buildMissionPayload = (status) => {
    const audience = buildAudiencePayload(d);
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
      durationDays: d.durationDays,
      deadline: d.deadline || null,
    };
  };

  // Autosave while resuming an existing draft: edits are already backed by a
  // real row (unlike a brand-new mission's localStorage scratch draft), so
  // there's no separate "Save as Draft" click to hang them on — debounce and
  // PATCH the draft in place instead. Silently ignored on failure, same as
  // any other autosave; the next successful edit/publish will catch it up.
  useEffect(() => {
    if (!missionId || loadingMission || published) return;
    const timer = setTimeout(() => {
      api.updateMission(missionId, buildMissionPayload("draft")).catch(() => {});
    }, 800);
    return () => clearTimeout(timer);
  }, [d, missionId, loadingMission, published]);

  const publish = async () => {
    setBusy(true); setError("");
    try {
      const payload = buildMissionPayload("active");
      const { mission } = missionId ? await api.updateMission(missionId, payload) : await api.createMission(payload);
      setPublished(true);
      clearDraft();
      await refreshBuilder();
      toast.success(t("createMission.publishSuccess", null, "Mission published successfully"));
      navigate(`/missions/${mission.id}`);
    } catch (err) {
      setError(err.message || t("createMission.publishError", null, "Couldn't publish this mission"));
    } finally {
      setBusy(false);
    }
  };

  // Only reachable for a brand-new mission (hidden once resuming an existing
  // draft — that draft is already safely persisted, so there's nothing new
  // to save until the user actually publishes or edits it again).
  const saveDraft = async () => {
    setSavingDraft(true); setError("");
    try {
      await api.createMission(buildMissionPayload("draft"));
      setPublished(true); // stops the scratch-draft autosave/beforeunload — this is now safely persisted
      clearDraft();
      navigate("/missions?tab=draft", { state: { toast: t("missions.draftSaved", null, "Mission saved to draft") } });
    } catch (err) {
      setError(err.message || t("createMission.saveDraftError", null, "Couldn't save this draft"));
    } finally {
      setSavingDraft(false);
    }
  };

  const goNext = () => {
    if (!fieldsValid) {
      setShowErrors(true);
      setError(t("onboarding.fillRequiredFields", null, "Please fill in the required fields before continuing."));
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setShowErrors(false); setError("");
    if (last && !builder?.profile) {
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
  const editStep = (i) => { setShowErrors(false); setError(""); setStep(i); };
  const goBack = () => { setShowErrors(false); setError(""); setStep(s => s - 1); };

  const StepBody = [
    <StepInfo d={d} set={set} categories={categories} showErrors={showErrors} />,
    <StepParticipation d={d} set={set} ptypes={ptypes} />,
    <StepTestCases d={d} set={set} />,
    <StepAudience d={d} set={set} toggle={toggle} selectAllInGroup={selectAllInGroup} filters={filters} liveCount={liveCount} isFetchingCount={isFetchingCount} basePool={basePool} />,
    <StepReward d={d} set={set} rewards={rewards} showErrors={showErrors} builder={builder} liveCount={liveCount} />,
    <StepReview d={d} categories={categories} ptypes={ptypes} rewards={rewards} liveCount={liveCount} onEditStep={editStep} />,
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
      <aside className="wz-rail">
        <div className="wz-brand" style={{ position: "relative" }}>
          <BrandMark size={52} />
          <div><div className="brand-name">Validation<span style={{ color: "var(--text-faint)" }}>Crew</span></div><div className="brand-sub">{missionId ? t("createMission.editDraft", null, "Edit draft") : t("createMission.newMission", null, "New mission")}</div></div>
          <button
            type="button"
            aria-label={t("createMission.exitToDashboard", null, "Exit to dashboard")}
            title={t("createMission.exitToDashboard", null, "Exit to dashboard")}
            onClick={() => setShowExitWarning(true)}
            style={{ position: "absolute", top: 0, right: 0, background: "none", border: "none", cursor: "pointer", padding: 6, color: "var(--text-faint)", display: "flex" }}
          >
            <Icon name="x" size={18} />
          </button>
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
          {!missionId && <button className="backlink" onClick={startFresh}><Icon name="refresh" size={16} /> {t("createMission.startFresh", null, "Start fresh")}</button>}
          <button className="backlink" onClick={() => setShowExitWarning(true)}><Icon name="arrowLeft" size={16} /> {t("createMission.exitToDashboard", null, "Exit to dashboard")}</button>
        </div>
      </aside>

      <div className="wz-main">
        <div className={`wz-content ${step === 2 || last ? "wide" : step === 0 ? "wide-lg" : ""}`}>
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
          ) : step === 0 ? (
            <div className="split-slim">
              <div>{StepBody}</div>
              <div className="sticky-side">
                <BalanceCard balance={builder?.balance} />
                {!builder?.profile && <ProfileNudgeCard builder={builder} />}
              </div>
            </div>
          ) : StepBody}
        </div>
      </div>

      <div className="wz-foot">
        <div className="wz-foot-inner">
          {step > 0 && <button className="backlink" style={{ margin: 0 }} onClick={goBack}><Icon name="arrowLeft" size={16} /> {t("createMission.back", null, "Back")}</button>}
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
              {!missionId && (
                <Btn variant="ghost" icon="bookmark" disabled={busy || savingDraft} onClick={saveDraft}>
                  {savingDraft ? t("createMission.savingDraft", null, "Saving…") : t("createMission.saveAsDraft", null, "Save as Draft")}
                </Btn>
              )}
              <span
                onClick={() => !fieldsValid && (setShowErrors(true), window.scrollTo({ top: 0, behavior: "smooth" }))}
                style={{ display: "inline-block" }}
                title={insufficientFunds ? t("createMission.insufficientBalanceHint", null, "Your wallet balance isn't enough to cover this reward setup — top up your wallet or lower the cost to continue.")
                  : !fieldsValid ? t("onboarding.fillRequiredFields", null, "Please fill in the required fields before continuing.") : undefined}
              >
                <Btn
                  variant="primary"
                  iconRight="bolt"
                  disabled={insufficientFunds || busy || savingDraft || !fieldsValid}
                  onClick={goNext}
                  style={!fieldsValid ? { opacity: 0.5, pointerEvents: "none" } : undefined}
                >
                  {busy ? t("createMission.publishing", null, "Publishing…") : t("createMission.publishMission", null, "Publish Mission")}
                </Btn>
              </span>
            </div>
          ) : (
            <span
              onClick={() => !fieldsValid && setShowErrors(true)}
              style={{ display: "inline-block" }}
              title={insufficientFunds ? t("createMission.insufficientBalanceHint", null, "Your wallet balance isn't enough to cover this reward setup — top up your wallet or lower the cost to continue.")
                : !fieldsValid ? t("onboarding.fillRequiredFields", null, "Please fill in the required fields before continuing.") : undefined}
            >
              <Btn
                variant="primary"
                iconRight="arrowRight"
                disabled={insufficientFunds || busy || !fieldsValid}
                onClick={goNext}
                style={!fieldsValid ? { opacity: 0.5, pointerEvents: "none" } : undefined}
              >
                {t("createMission.continue", null, "Continue")}
              </Btn>
            </span>
          )}
        </div>
      </div>

      {showExitWarning && (
        <div style={{ display: "contents" }}>
          <div className="notif-overlay" onClick={() => setShowExitWarning(false)} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 400, maxWidth: "92vw", zIndex: 61,
            background: "var(--panel)", border: "var(--hairline) solid var(--border)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-lg)" }} className="rise">
            <div className="row between" style={{ padding: "16px 20px", borderBottom: "var(--hairline) solid var(--border)" }}>
              <b style={{ fontSize: 15 }}>{t("createMission.unsavedChangesTitle", null, "Unsaved Changes")}</b>
            </div>
            <div style={{ padding: 20 }}>
              <p style={{ margin: "0 0 14px", fontSize: 14 }}>{t("createMission.unsavedChangesBody", null, "Are you sure you want to leave? Your progress is saved in this browser and will be restored if you come back — but it won't appear in your Drafts list or count until you use \"Save as Draft\".")}</p>
              <div className="row gap-2" style={{ marginTop: 24, justifyContent: "flex-end" }}>
                <button className="btn outline" onClick={() => navigate("/")}>{t("createMission.leavePage", null, "Leave Page")}</button>
                <button className="btn btn-primary" onClick={() => setShowExitWarning(false)}>{t("createMission.stayOnPage", null, "Stay on Page")}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
