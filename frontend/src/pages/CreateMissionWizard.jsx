import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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



function StepInfo({ d, set, categories }) {
  const { t } = useTranslation();
  return (
    <div className="rise">
      <div className="fld" style={{ marginBottom: 18 }}>
        <label>{t("createMission.missionTitleLabel", null, "Mission Title")}</label>
        <input className="fin" placeholder={t("createMission.missionTitlePlaceholder", null, "e.g. Cold Brew Can — Taste Panel")} value={d.title} onChange={e => set({ title: e.target.value })} />
        <p className="fhint">{t("createMission.missionTitleHint", null, "Members see this first — make it specific and inviting.")}</p>
      </div>
      <div className="fld" style={{ marginBottom: 24 }}>
        <label>{t("createMission.descriptionLabel", null, "Description")}</label>
        <textarea className="field" placeholder={t("createMission.descriptionPlaceholder", null, "Describe what you're validating, what participants will do, and what a great submission looks like.")} value={d.desc} onChange={e => set({ desc: e.target.value })} />
      </div>
      <div className="fsec"><b>{t("createMission.missionCategoryLabel", null, "Mission Category")}</b><span className="line" /><span className="cnt">{t("createMission.pickOne", null, "Pick one")}</span></div>
      <div className="optcards">
        {categories.map(c => (
          <button key={c.id} className={`optcard ${d.cat === c.id ? "on" : ""}`} style={{ "--tc": `var(--t-${c.id})` }} onClick={() => set({ cat: c.id })}>
            <span className="oc-tick"><Icon name="check" size={12} /></span>
            <span className="oc-ic"><Icon name={c.icon} size={20} /></span>
            <b>{categoryLabel(t, c)}</b><p>{categoryDesc(t, c)}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function FilterGroup({ title, options, sel, toggle }) {
  const { t } = useTranslation();
  const [q, setQ] = React.useState("");
  const showSearch = options.length > 8;
  const filtered = q.trim() ? options.filter(o => o.toLowerCase().includes(q.toLowerCase())) : options;
  return (
    <div className="fsec" style={{ display: "block", margin: "22px 0 10px" }}>
      <div className="row between" style={{ marginBottom: 10 }}>
        <b style={{ fontSize: 12.5 }}>{trFilterLabel(t, title)}</b>
        {sel.size > 0 && <span className="cnt mono" style={{ color: "var(--accent)" }}>{t("createMission.selectedCount", { count: sel.size }, `${sel.size} selected`)}</span>}
      </div>
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
          <button key={o} className={`chip ${sel.has(o) ? "on" : ""}`} onClick={() => toggle(title, o)}>
            <span className="ck"><Icon name="check" size={10} /></span>{trFilterLabel(t, o)}
          </button>
        ))}
        {filtered.length === 0 && <span className="muted" style={{ fontSize: 12 }}>{t("createMission.noMatchesFor", { q }, `No matches for "${q}"`)}</span>}
      </div>
    </div>
  );
}
function StepAudience({ d, toggle, filters, liveCount, isFetchingCount }) {
  const { t } = useTranslation();
  const count = liveCount;
  const pct = Math.min(100, Math.round((count / 1284000) * 100));
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
        <FilterGroup key={g} title={g} options={Array.isArray(opts) ? opts : Object.values(opts).flat()} sel={d.filters[g]} toggle={toggle} />
      ))}
    </div>
  );
}

function StepParticipation({ d, set, ptypes }) {
  const { t } = useTranslation();
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
        <div className="fld" style={{ marginTop: 24, maxWidth: 280 }}>
          <label>{t("createMission.trialDurationLabel", null, "How many days should this trial run?")}</label>
          <input
            className="fin"
            type="number"
            min="2"
            max="30"
            value={d.durationDays}
            onChange={e => set({ durationDays: Math.min(30, Math.max(2, +e.target.value || 7)) })}
          />
          <p className="fhint">{t("createMission.trialDurationHint", null, "Validators check in once per day, then submit their final review at the end.")}</p>
        </div>
      )}
    </div>
  );
}

function StepReward({ d, set, rewards }) {
  const { t } = useTranslation();
  const rw = rewards.find(r => r.id === d.reward.type);
  const needsAmt = rw?.needsAmt;
  return (
    <div className="rise">
      <div className="fsec"><b>{t("createMission.rewardTypeLabel", null, "Reward Type")}</b><span className="line" /></div>
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
          <div className="fld">
            <label>{t("createMission.rewardAmountLabel", null, "Reward Amount")} <span className="opt">{t("createMission.perParticipant", null, "per participant")}</span></label>
            <div className="inw has-pre">
              <span className="pre">₹</span>
              <input className="fin" type="number" min="0" value={d.reward.amount} onChange={e => set({ reward: { ...d.reward, amount: +e.target.value } })} />
            </div>
          </div>
        )}
        <div className="fld">
          <label>{t("createMission.numberOfParticipantsLabel", null, "Number of Participants")}</label>
          <input className="fin" type="number" min="1" max="500" value={d.reward.participants} onChange={e => set({ reward: { ...d.reward, participants: Math.min(500, Math.max(1, +e.target.value)) } })} />
          <p className="fhint">{t("createMission.participantsHint", null, "We recommend 80–150 for statistically useful feedback. Maximum 500 participants.")}</p>
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
  const subtotal = per * n;
  const fee = Math.round(subtotal * platformFeePct);
  const fulfil = d.reward.type === "sample" ? n * 60 : 0;
  const total = subtotal + fee + fulfil;
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

function ReviewRow({ icon, label, children }) {
  return (
    <div className="row gap-3" style={{ padding: "13px 0", borderTop: "1px solid var(--border)", alignItems: "flex-start" }}>
      <span className="feed-ic accent" style={{ width: 30, height: 30 }}><Icon name={icon} size={15} /></span>
      <div style={{ flex: 1 }}><div className="faint" style={{ fontSize: 12 }}>{label}</div><div style={{ fontWeight: 600, fontSize: 14, marginTop: 2 }}>{children}</div></div>
    </div>
  );
}
function StepReview({ d, categories, ptypes, rewards, liveCount }) {
  const { t } = useTranslation();
  const cat = categories.find(c => c.id === d.cat) || categories[0];
  const pt = ptypes.find(p => p.id === d.ptype);
  const rw = rewards.find(r => r.id === d.reward.type);
  const count = liveCount;
  const allFilters = Object.values(d.filters).flatMap(s => [...s]);
  return (
    <div className="rise">
      <div className="card" style={{ padding: "4px 20px 14px" }}>
        <ReviewRow icon="edit" label={t("createMission.missionTitleReviewLabel", null, "Mission title")}>{d.title || <span className="faint">{t("createMission.untitledMission", null, "Untitled mission")}</span>}</ReviewRow>
        <ReviewRow icon={cat?.icon || "layers"} label={t("createMission.categoryLabel", null, "Category")}>{cat && categoryLabel(t, cat)}</ReviewRow>
        <ReviewRow icon="users" label={t("createMission.audienceLabel", null, "Audience")}>{count.toLocaleString("en-IN")} {t("createMission.audienceFiltersSummary", { count: allFilters.length || "no" }, `matching members · ${allFilters.length || "no"} filters`)}</ReviewRow>
        <ReviewRow icon={pt?.icon || "list"} label={t("createMission.participationTypeLabel", null, "Participation type")}>{pt && ptypeLabel(t, pt)} · ~{pt?.est}</ReviewRow>
        <ReviewRow icon={rw?.icon || "coins"} label={t("createMission.rewardLabel", null, "Reward")}>{rw?.needsAmt ? t("createMission.amountEach", { amount: inr(d.reward.amount) }, `${inr(d.reward.amount)} each`) : (rw && rewardLabel(t, rw))} · {t("createMission.participantsSuffix", { n: d.reward.participants }, `${d.reward.participants} participants`)}</ReviewRow>
      </div>
      {d.desc && <div className="card" style={{ padding: 18, marginTop: 14 }}><span className="eyebrow">{t("createMission.descriptionEyebrow", null, "Description")}</span><p style={{ margin: "8px 0 0", fontSize: 14, lineHeight: 1.6 }}>{d.desc}</p></div>}
      {allFilters.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <span className="eyebrow">{t("createMission.audienceFiltersEyebrow", null, "Audience filters")}</span>
          <div className="chips" style={{ marginTop: 10 }}>{allFilters.map(f => <span key={f} className="chip on" style={{ pointerEvents: "none" }}>{f}</span>)}</div>
        </div>
      )}
    </div>
  );
}

function emptyFilters(filters) {
  return Object.fromEntries(Object.keys(filters).map(k => [k, new Set()]));
}

const DRAFT_KEY = "vcrew_mission_draft";

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

export default function CreateMissionWizard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { builder, refreshBuilder } = useAuth();
  const { categories, ptypes, rewards, filters, platformFeePct } = useMeta();
  const WZ_STEPS = wzSteps(t);

  const [step, setStep] = useState(() => parseInt(localStorage.getItem(DRAFT_KEY + "_step") || "0", 10));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [published, setPublished] = useState(false);
  const [showExitWarning, setShowExitWarning] = useState(false);

  const [d, setD] = useState(() => {
    const saved = localStorage.getItem(DRAFT_KEY);
    const emptyF = emptyFilters(filters);
    if (saved) {
      const parsed = deserializeDraft(saved, emptyF);
      if (parsed) return parsed;
    }
    return {
      title: "", desc: "", cat: categories[0]?.id || "feedback",
      filters: { ...emptyF, "ValidationCrew Role": new Set(["Validator"]) },
      ptype: ptypes[0]?.id || "ptest",
      reward: { type: "fixed", amount: 250, participants: 120 },
      genFor: null,
      durationDays: 7,
    };
  });

  const [liveCount, setLiveCount] = useState(1284000);
  const [isFetchingCount, setIsFetchingCount] = useState(false);

  useEffect(() => {
    setTimeout(() => setIsFetchingCount(true), 0);
    const audience = Object.fromEntries(Object.entries(d.filters).map(([k, v]) => [k, [...v]]));
    api.audienceMatchCount(audience)
      .then(res => setLiveCount(res.count))
      .catch(() => {})
      .finally(() => setIsFetchingCount(false));
  }, [d.filters]);

  // Auto-save to localStorage
  useEffect(() => {
    if (!published) {
      localStorage.setItem(DRAFT_KEY, serializeDraft(d));
      localStorage.setItem(DRAFT_KEY + "_step", step);
    }
  }, [d, step, published]);

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

  // Clear draft on hard reload or tab close
  useEffect(() => {
    const handleUnload = () => {
      localStorage.removeItem(DRAFT_KEY);
      localStorage.removeItem(DRAFT_KEY + "_step");
    };
    window.addEventListener("unload", handleUnload);
    return () => window.removeEventListener("unload", handleUnload);
  }, []);



  const set = (patch) => setD(p => ({ ...p, ...patch }));
  const toggle = (group, opt) => setD(p => {
    const s = new Set(p.filters[group]); s.has(opt) ? s.delete(opt) : s.add(opt);
    return { ...p, filters: { ...p.filters, [group]: s } };
  });


  const canNext = step !== 0 || (d.title.trim() && d.cat);
  const last = step === WZ_STEPS.length - 1;

  const publish = async () => {
    setBusy(true); setError("");
    try {
      const audience = Object.fromEntries(Object.entries(d.filters).map(([k, v]) => [k, [...v]]));
      const geo = [...d.filters.Geography];
      const { mission } = await api.createMission({
        name: d.title || t("createMission.untitledMission", null, "Untitled mission"),
        description: d.desc,
        category: d.cat,
        ptype: d.ptype,
        status: "active",
        target: d.reward.participants,
        reward: { type: d.reward.type, amount: d.reward.amount },
        region: geo.length ? geo.join(", ") : "Worldwide",
        audience,
        tasks: d.tasks,
        durationDays: d.durationDays,
      });
      setPublished(true);
      localStorage.removeItem(DRAFT_KEY);
      localStorage.removeItem(DRAFT_KEY + "_step");
      await refreshBuilder();
      navigate(`/missions/${mission.id}`);
    } catch (err) {
      setError(err.message || t("createMission.publishError", null, "Couldn't publish this mission"));
    } finally {
      setBusy(false);
    }
  };

  const goNext = () => last ? publish() : setStep(s => s + 1);
  const goBack = () => step === 0 ? setShowExitWarning(true) : setStep(s => s - 1);

  const StepBody = [
    <StepInfo d={d} set={set} categories={categories} />,
    <StepParticipation d={d} set={set} ptypes={ptypes} />,
    <StepTestCases d={d} set={set} />,
    <StepAudience d={d} toggle={toggle} filters={filters} liveCount={liveCount} isFetchingCount={isFetchingCount} />,
    <StepReward d={d} set={set} rewards={rewards} />,
    <StepReview d={d} categories={categories} ptypes={ptypes} rewards={rewards} liveCount={liveCount} />,
  ][step];

  return (
    <div className="wz" data-layout="rail">
      <aside className="wz-rail">
        <div className="wz-brand">
          <BrandMark size={52} />
          <div><div className="brand-name">Validation<span style={{ color: "var(--text-faint)" }}>Crew</span></div><div className="brand-sub">{t("createMission.newMission", null, "New mission")}</div></div>
        </div>
        <div className="wz-steps">
          {WZ_STEPS.map((s, i) => (
            <button key={i} className={`wz-step ${i === step ? "cur" : i < step ? "done" : "up"}`} onClick={() => i < step && setStep(i)}>
              <span className="sd">{i < step ? <Icon name="check" size={14} /> : i + 1}</span>
              <span className="sm"><b>{s.t}</b><p>{s.s}</p></span>
            </button>
          ))}
        </div>
        <div className="wz-rail-foot">
          <button className="backlink" onClick={() => setShowExitWarning(true)}><Icon name="arrowLeft" size={16} /> {t("createMission.exitToDashboard", null, "Exit to dashboard")}</button>
        </div>
      </aside>

      <div className="wz-main">
        <div className="wz-content">
          <div className="wz-head">
            <span className="step-of">{t("createMission.stepOfTotal", { current: step + 1, total: WZ_STEPS.length }, `Step ${step + 1} of ${WZ_STEPS.length}`)}</span>
            <h2>{WZ_STEPS[step].t}</h2>
            <p>{WZ_STEPS[step].hint}</p>
          </div>
          {error && <div className="err-banner" style={{ marginBottom: 16 }}>{error}</div>}
          {last ? (
            <div className="split">
              <div>{StepBody}</div>
              <div className="sticky-side"><CostCard d={d} rewards={rewards} balance={builder?.balance} platformFeePct={platformFeePct} /></div>
            </div>
          ) : StepBody}
        </div>
      </div>

      <div className="wz-foot">
        <div className="wz-foot-inner">
          <button className="backlink" style={{ margin: 0 }} onClick={goBack}><Icon name="arrowLeft" size={16} /> {t("createMission.back", null, "Back")}</button>
          <span className="fprog">{t("createMission.stepLabel", null, "Step")} <b>{step + 1}</b> / {WZ_STEPS.length}</span>
          <span className="grow" />
          {step === 3 && <span className="muted" style={{ fontSize: 12.5, marginRight: 4, opacity: isFetchingCount ? 0.5 : 1, transition: "opacity 0.2s" }}>{t("createMission.membersCount", { count: liveCount.toLocaleString("en-IN") }, `${liveCount.toLocaleString("en-IN")} members`)}</span>}
          {step === 4 && <span className="muted mono" style={{ fontSize: 12.5, marginRight: 4 }}>{t("createMission.estCost", { amount: inr((rewards.find(r => r.id === d.reward.type)?.needsAmt ? d.reward.amount : 0) * d.reward.participants) }, `${inr((rewards.find(r => r.id === d.reward.type)?.needsAmt ? d.reward.amount : 0) * d.reward.participants)} est.`)}</span>}
          <Btn variant="primary" iconRight={last ? "bolt" : "arrowRight"} disabled={!canNext || busy} onClick={goNext}>
            {busy ? t("createMission.publishing", null, "Publishing…") : last ? t("createMission.publishMission", null, "Publish Mission") : t("createMission.continue", null, "Continue")}
          </Btn>
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
              <p style={{ margin: "0 0 14px", fontSize: 14 }}>{t("createMission.unsavedChangesBody", null, "Are you sure you want to leave? Your progress has been auto-saved as a draft, but the mission hasn't been created yet.")}</p>
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
