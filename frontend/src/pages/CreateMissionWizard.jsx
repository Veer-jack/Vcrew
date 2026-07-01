import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import { BrandMark } from "../components/BrandMark";
import React from 'react';
import { Btn, inr } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { useMeta } from "../context/MetaContext";
import { api } from "../api/client";
import StepTestCases from "../components/StepTestCases";

const WZ_STEPS = [
  { t: "Mission Information", s: "Name & category", hint: "Give your mission a clear name and pick the kind of validation you need." },
  { t: "Define the test", s: "AI-generated tasks", hint: "Describe your product and let AI generate structured test tasks." },
  { t: "Audience Builder", s: "Who you'll reach", hint: "Layer filters to define exactly who you want to hear from. The count updates live." },
  { t: "Participation Type", s: "How they engage", hint: "Choose how participants will engage with your product." },
  { t: "Reward Setup", s: "What they earn", hint: "Set the incentive and size your panel — costs update as you type." },
  { t: "Review & Publish", s: "Confirm & launch", hint: "One last look before it goes live to your matched audience." },
];

/* simulated live audience pool — narrows as filters are applied */
function matchCount(filters) {
  const POOL = 1284000;
  const groupFactor = (key, weight) => {
    const n = filters[key]?.size || 0;
    if (!n) return 1;
    return Math.min(1, weight * n + 0.06);
  };
  let f = POOL;
  f *= groupFactor("Geography", 0.11);
  f *= groupFactor("Demographics", 0.16);
  f *= groupFactor("Professional", 0.14);
  f *= groupFactor("ValidationCrew Role", 0.34);
  f *= groupFactor("Interests", 0.2);
  return Math.max(45, Math.round(f / 5) * 5);
}

function StepInfo({ d, set, categories }) {
  return (
    <div className="rise">
      <div className="fld" style={{ marginBottom: 18 }}>
        <label>Mission Title</label>
        <input className="fin" placeholder="e.g. Cold Brew Can — Taste Panel" value={d.title} onChange={e => set({ title: e.target.value })} />
        <p className="fhint">Members see this first — make it specific and inviting.</p>
      </div>
      <div className="fld" style={{ marginBottom: 24 }}>
        <label>Description</label>
        <textarea className="field" placeholder="Describe what you're validating, what participants will do, and what a great submission looks like." value={d.desc} onChange={e => set({ desc: e.target.value })} />
      </div>
      <div className="fsec"><b>Mission Category</b><span className="line" /><span className="cnt">Pick one</span></div>
      <div className="optcards">
        {categories.map(c => (
          <button key={c.id} className={`optcard ${d.cat === c.id ? "on" : ""}`} style={{ "--tc": `var(--t-${c.id})` }} onClick={() => set({ cat: c.id })}>
            <span className="oc-tick"><Icon name="check" size={12} /></span>
            <span className="oc-ic"><Icon name={c.icon} size={20} /></span>
            <b>{c.label}</b><p>{c.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function FilterGroup({ title, options, sel, toggle }) {
  const [q, setQ] = React.useState("");
  const showSearch = options.length > 8;
  const filtered = q.trim() ? options.filter(o => o.toLowerCase().includes(q.toLowerCase())) : options;
  return (
    <div className="fsec" style={{ display: "block", margin: "22px 0 10px" }}>
      <div className="row between" style={{ marginBottom: 10 }}>
        <b style={{ fontSize: 12.5 }}>{title}</b>
        {sel.size > 0 && <span className="cnt mono" style={{ color: "var(--accent)" }}>{sel.size} selected</span>}
      </div>
      {showSearch && (
        <input
          className="fin"
          style={{ marginBottom: 10, fontSize: 13 }}
          placeholder={`Search ${title.toLowerCase()}…`}
          value={q}
          onChange={e => setQ(e.target.value)}
        />
      )}
      <div className="chips">
        {filtered.map(o => (
          <button key={o} className={`chip ${sel.has(o) ? "on" : ""}`} onClick={() => toggle(title, o)}>
            <span className="ck"><Icon name="check" size={10} /></span>{o}
          </button>
        ))}
        {filtered.length === 0 && <span className="muted" style={{ fontSize: 12 }}>No matches for "{q}"</span>}
      </div>
    </div>
  );
}
function StepAudience({ d, toggle, filters }) {
  const count = matchCount(d.filters);
  const pct = Math.min(100, Math.round((count / 1284000) * 100));
  return (
    <div className="rise">
      <div className="reach" style={{ marginBottom: 8, position: "sticky", top: 0, zIndex: 5 }}>
        <div className="reach-top">
          <span className="r-ic"><Icon name="users" size={22} /></span>
          <div style={{ flex: 1 }}>
            <div className="r-num" key={count}>{count.toLocaleString("en-IN")} <span style={{ fontSize: 14, color: "var(--text-muted)", fontWeight: 600 }}>matching members</span></div>
            <div className="r-lab">available right now for this audience</div>
          </div>
          <span className="pill" style={{ background: "var(--success-weak)", color: "var(--success)", border: "none" }}><Icon name="bolt" size={13} /> Live</span>
        </div>
        <div className="r-bar"><i style={{ width: Math.max(4, pct) + "%" }} /></div>
        <div className="r-foot"><span>Narrower = higher quality</span><span>{pct}% of total pool</span></div>
      </div>
      {Object.entries(filters).map(([g, opts]) => (
        <FilterGroup key={g} title={g} options={opts} sel={d.filters[g]} toggle={toggle} />
      ))}
    </div>
  );
}

function StepParticipation({ d, set, ptypes }) {
  return (
    <div className="rise">
      <div className="optcards">
        {ptypes.map(p => (
          <button key={p.id} className={`optcard ${d.ptype === p.id ? "on" : ""}`} onClick={() => set({ ptype: p.id })}>
            <span className="oc-tick"><Icon name="check" size={12} /></span>
            <span className="oc-ic"><Icon name={p.icon} size={20} /></span>
            <b>{p.label}</b><p>{p.desc}</p>
            <span className="mtag" style={{ alignSelf: "flex-start", marginTop: 6 }}><Icon name="clock" size={11} style={{ marginRight: 4, verticalAlign: "-2px" }} />{p.est}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function StepReward({ d, set, rewards }) {
  const rw = rewards.find(r => r.id === d.reward.type);
  const needsAmt = rw?.needsAmt;
  return (
    <div className="rise">
      <div className="fsec"><b>Reward Type</b><span className="line" /></div>
      <div className="optcards c2" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        {rewards.map(r => (
          <button key={r.id} className={`optcard ${d.reward.type === r.id ? "on" : ""}`} onClick={() => set({ reward: { ...d.reward, type: r.id } })}>
            <span className="oc-tick"><Icon name="check" size={12} /></span>
            <span className="oc-ic"><Icon name={r.icon} size={20} /></span>
            <b>{r.label}</b><p>{r.desc}</p>
          </button>
        ))}
      </div>

      <div className="fgrid c2" style={{ marginTop: 24 }}>
        {needsAmt && (
          <div className="fld">
            <label>Reward Amount <span className="opt">per participant</span></label>
            <div className="inw has-pre">
              <span className="pre">₹</span>
              <input className="fin" type="number" min="0" value={d.reward.amount} onChange={e => set({ reward: { ...d.reward, amount: +e.target.value } })} />
            </div>
          </div>
        )}
        <div className="fld">
          <label>Number of Participants</label>
          <input className="fin" type="number" min="1" max="500" value={d.reward.participants} onChange={e => set({ reward: { ...d.reward, participants: Math.min(500, Math.max(1, +e.target.value)) } })} />
          <p className="fhint">We recommend 80–150 for statistically useful feedback. Maximum 500 participants.</p>
        </div>
      </div>
    </div>
  );
}

function CostCard({ d, rewards, balance }) {
  const rw = rewards.find(r => r.id === d.reward.type);
  const n = +d.reward.participants || 0;
  const per = rw?.needsAmt ? (+d.reward.amount || 0) : 0;
  const subtotal = per * n;
  const fee = Math.round(subtotal * 0.12);
  const fulfil = d.reward.type === "sample" ? n * 60 : 0;
  const total = subtotal + fee + fulfil;
  return (
    <div className="estcard accent">
      <span className="eyebrow">Live cost estimate</span>
      <div className="est-num" style={{ margin: "8px 0 14px" }}>{inr(total)}</div>
      <div>
        {rw?.needsAmt && <div className="est-row"><span className="lab">{inr(per)} × {n} participants</span><span className="v">{inr(subtotal)}</span></div>}
        {fulfil > 0 && <div className="est-row"><span className="lab">Sample fulfilment × {n}</span><span className="v">{inr(fulfil)}</span></div>}
        <div className="est-row"><span className="lab">Platform fee (12%)</span><span className="v">{inr(fee)}</span></div>
        <div className="est-total"><span className="lab" style={{ fontWeight: 700 }}>Total</span><span className="v">{inr(total)}</span></div>
      </div>
      <div className="row gap-2" style={{ marginTop: 14, fontSize: 12, color: "var(--text-faint)" }}>
        <Icon name="shield" size={14} /><span>Held in escrow · released only on approved submissions</span>
      </div>
      <div className="row between" style={{ marginTop: 12, paddingTop: 12, borderTop: "1px dashed var(--border)", fontSize: 12.5 }}>
        <span className="muted">Wallet balance</span><b className="mono">{inr(balance)}</b>
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
function StepReview({ d, categories, ptypes, rewards }) {
  const cat = categories.find(c => c.id === d.cat) || categories[0];
  const pt = ptypes.find(p => p.id === d.ptype);
  const rw = rewards.find(r => r.id === d.reward.type);
  const count = matchCount(d.filters);
  const allFilters = Object.values(d.filters).flatMap(s => [...s]);
  return (
    <div className="rise">
      <div className="card" style={{ padding: "4px 20px 14px" }}>
        <ReviewRow icon="edit" label="Mission title">{d.title || <span className="faint">Untitled mission</span>}</ReviewRow>
        <ReviewRow icon={cat?.icon || "layers"} label="Category">{cat?.label}</ReviewRow>
        <ReviewRow icon="users" label="Audience">{count.toLocaleString("en-IN")} matching members · {allFilters.length || "no"} filters</ReviewRow>
        <ReviewRow icon={pt?.icon || "list"} label="Participation type">{pt?.label} · ~{pt?.est}</ReviewRow>
        <ReviewRow icon={rw?.icon || "coins"} label="Reward">{rw?.needsAmt ? `${inr(d.reward.amount)} each` : rw?.label} · {d.reward.participants} participants</ReviewRow>
      </div>
      {d.desc && <div className="card" style={{ padding: 18, marginTop: 14 }}><span className="eyebrow">Description</span><p style={{ margin: "8px 0 0", fontSize: 14, lineHeight: 1.6 }}>{d.desc}</p></div>}
      {allFilters.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <span className="eyebrow">Audience filters</span>
          <div className="chips" style={{ marginTop: 10 }}>{allFilters.map(f => <span key={f} className="chip on" style={{ pointerEvents: "none" }}>{f}</span>)}</div>
        </div>
      )}
    </div>
  );
}

function emptyFilters(filters) {
  return Object.fromEntries(Object.keys(filters).map(k => [k, new Set()]));
}

export default function CreateMissionWizard() {
  const navigate = useNavigate();
  const { builder, refreshBuilder } = useAuth();
  const { categories, ptypes, rewards, filters } = useMeta();

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [d, setD] = useState({
    title: "", desc: "", cat: categories[0]?.id || "feedback",
    filters: { ...emptyFilters(filters), "ValidationCrew Role": new Set(["Validator"]) },
    ptype: ptypes[0]?.id || "ptest",
    reward: { type: "fixed", amount: 250, participants: 120 },
  });

  const set = (patch) => setD(p => ({ ...p, ...patch }));
  const toggle = (group, opt) => setD(p => {
    const s = new Set(p.filters[group]); s.has(opt) ? s.delete(opt) : s.add(opt);
    return { ...p, filters: { ...p.filters, [group]: s } };
  });

  const MAX_PARTICIPANTS = 500;
  const participantWarning = d.reward.participants > MAX_PARTICIPANTS;
  const canNext = step !== 0 || (d.title.trim() && d.cat);
  const last = step === WZ_STEPS.length - 1;

  const publish = async () => {
    setBusy(true); setError("");
    try {
      const audience = Object.fromEntries(Object.entries(d.filters).map(([k, v]) => [k, [...v]]));
      const geo = [...d.filters.Geography];
      const { mission } = await api.createMission({
        name: d.title || "Untitled mission",
        description: d.desc,
        category: d.cat,
        ptype: d.ptype,
        status: "active",
        target: d.reward.participants,
        reward: { type: d.reward.type, amount: d.reward.amount },
        region: geo.length ? geo.join(", ") : "Worldwide",
        audience,
      });
      await refreshBuilder();
      navigate(`/missions/${mission.id}`);
    } catch (err) {
      setError(err.message || "Couldn't publish this mission");
    } finally {
      setBusy(false);
    }
  };

  const goNext = () => last ? publish() : setStep(s => s + 1);
  const goBack = () => step === 0 ? navigate("/") : setStep(s => s - 1);

  const StepBody = [
    <StepInfo d={d} set={set} categories={categories} />,
    <StepTestCases d={d} set={set} />,
    <StepAudience d={d} toggle={toggle} filters={filters} />,
    <StepParticipation d={d} set={set} ptypes={ptypes} />,
    <StepReward d={d} set={set} rewards={rewards} />,
    <StepReview d={d} categories={categories} ptypes={ptypes} rewards={rewards} />,
  ][step];

  return (
    <div className="wz" data-layout="rail">
      <aside className="wz-rail">
        <div className="wz-brand">
          <BrandMark size={52} />
          <div><div className="brand-name">Validation<span style={{ color: "var(--text-faint)" }}>Crew</span></div><div className="brand-sub">New mission</div></div>
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
          <button className="backlink" onClick={() => navigate("/")}><Icon name="arrowLeft" size={16} /> Exit to dashboard</button>
        </div>
      </aside>

      <div className="wz-main">
        <div className="wz-content">
          <div className="wz-head">
            <span className="step-of">Step {step + 1} of {WZ_STEPS.length}</span>
            <h2>{WZ_STEPS[step].t}</h2>
            <p>{WZ_STEPS[step].hint}</p>
          </div>
          {error && <div className="err-banner" style={{ marginBottom: 16 }}>{error}</div>}
          {last ? (
            <div className="split">
              <div>{StepBody}</div>
              <div className="sticky-side"><CostCard d={d} rewards={rewards} balance={builder?.balance} /></div>
            </div>
          ) : StepBody}
        </div>
      </div>

      <div className="wz-foot">
        <div className="wz-foot-inner">
          <button className="backlink" style={{ margin: 0 }} onClick={goBack}><Icon name="arrowLeft" size={16} /> Back</button>
          <span className="fprog">Step <b>{step + 1}</b> / {WZ_STEPS.length}</span>
          <span className="grow" />
          {step === 1 && <span className="muted" style={{ fontSize: 12.5, marginRight: 4 }}>{matchCount(d.filters).toLocaleString("en-IN")} members</span>}
          {step === 3 && <span className="muted mono" style={{ fontSize: 12.5, marginRight: 4 }}>{inr((rewards.find(r => r.id === d.reward.type)?.needsAmt ? d.reward.amount : 0) * d.reward.participants)} est.</span>}
          <Btn variant="primary" iconRight={last ? "bolt" : "arrowRight"} disabled={!canNext || busy} onClick={goNext}>
            {busy ? "Publishing…" : last ? "Publish Mission" : "Continue"}
          </Btn>
        </div>
      </div>
    </div>
  );
}
