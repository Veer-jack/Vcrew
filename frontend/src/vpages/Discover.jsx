import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import { VEmpty, VReward, VTypeTag } from "../vcomponents/vui";
import { useVMeta } from "../vcontext/VMetaContext";
import { vapi } from "../vapi/client";
import { deadlineLabel, deadlineHours } from "../vutil";

function RadioRow({ on, onClick, label }) {
  return (
    <button onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", background: "none", border: "none", cursor: "pointer", padding: "2px 0", textAlign: "left", fontSize: 13.5, fontWeight: 600, color: on ? "var(--text)" : "var(--text-muted)" }}>
      <span style={{ width: 17, height: 17, borderRadius: "50%", flex: "none", border: "2px solid " + (on ? "var(--accent)" : "var(--border-strong)"), display: "grid", placeItems: "center" }}>
        {on && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)" }} />}
      </span>
      {label}
    </button>
  );
}

function MktCard({ task, vtypes, onSave, onOpen }) {
  const t = vtypes[task.type];
  const spotPct = (task.spotsLeft / task.spotsTotal) * 100;
  const urgent = deadlineHours(task.deadline) <= 12;
  return (
    <div className="card mkt-cardhover" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 11, cursor: "pointer" }} onClick={() => onOpen(task)}>
      <div className="row between" style={{ alignItems: "flex-start" }}>
        <div className="row gap-2 wrap">
          <VTypeTag type={task.type} vtypes={vtypes} />
          <span className="tag" style={{ background: "var(--accent-weak)", color: "var(--accent)" }}><Icon name="target" size={11} />{task.match}%</span>
          {task.hot && <span className="tag" style={{ background: "var(--warning-weak)", color: "var(--warning)" }}><Icon name="bolt" size={11} />Hot</span>}
        </div>
        <button className={`mkt-save ${task.saved ? "on" : ""}`} onClick={e => { e.stopPropagation(); onSave(task); }} title={task.saved ? "Saved" : "Save"} style={{ width: 32, height: 32 }}>
          <Icon name="bookmark" size={16} style={{ fill: task.saved ? "currentColor" : "none" }} />
        </button>
      </div>
      <div>
        <div className="row gap-2" style={{ alignItems: "center" }}>
          <span style={{ width: 30, height: 30, borderRadius: 8, flex: "none", display: "grid", placeItems: "center", background: `color-mix(in srgb, var(${t.accentVar}) 13%, transparent)`, color: `var(${t.accentVar})` }}><Icon name={t.icon} size={16} /></span>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, letterSpacing: "-.02em" }}>{task.product}</h3>
          {task.verified && <span className="verif" title="Verified builder"><Icon name="shield" size={12} /></span>}
        </div>
        <div className="faint" style={{ fontSize: 12.5, marginTop: 3 }}>{task.tagline} · {task.company}</div>
      </div>
      <p className="muted" style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{task.brief}</p>
      <div className="row gap-3 wrap faint" style={{ fontSize: 12 }}>
        <span className="row gap-2"><Icon name="clock" size={13} />~{task.minutes}m</span>
        <span className="row gap-2"><Icon name="users" size={13} />{task.spotsLeft} left</span>
        <span className="row gap-2" style={{ color: urgent ? "var(--danger)" : "inherit", fontWeight: urgent ? 700 : 400 }}><Icon name="clock" size={13} />{deadlineLabel(task.deadline)}</span>
      </div>
      <div style={{ height: 5, borderRadius: 20, background: "var(--panel-inset)", overflow: "hidden" }}>
        <i style={{ display: "block", height: "100%", width: (100 - spotPct) + "%", borderRadius: 20, background: spotPct < 25 ? "var(--danger)" : `var(${t.accentVar})` }} />
      </div>
      <div className="row between" style={{ marginTop: 2, paddingTop: 11, borderTop: "1px solid var(--border)" }}>
        <div><VReward amount={task.reward} /><span className="faint" style={{ fontSize: 11 }}> on approval</span></div>
        <button className="btn btn-primary" style={{ padding: "8px 14px" }} onClick={e => { e.stopPropagation(); onOpen(task); }}>View<Icon name="arrowRight" size={15} /></button>
      </div>
    </div>
  );
}

function FeaturedMission({ task, vtypes, onSave, onOpen }) {
  const t = vtypes[task.type];
  return (
    <div className="card rise-2" onClick={() => onOpen(task)} style={{ padding: 0, overflow: "hidden", cursor: "pointer",
      background: `linear-gradient(120deg, color-mix(in srgb, var(${t.accentVar}) 13%, var(--panel)), var(--panel) 62%)` }}>
      <div style={{ padding: "22px 24px" }}>
        <div className="row between wrap gap-3" style={{ alignItems: "flex-start" }}>
          <div className="row gap-2 wrap" style={{ marginBottom: 4 }}>
            <span className="tag" style={{ background: `var(${t.accentVar})`, color: "#fff" }}><Icon name="bolt" size={12} />Featured</span>
            <VTypeTag type={task.type} vtypes={vtypes} />
            <span className="tag" style={{ background: "var(--accent-weak)", color: "var(--accent)" }}><Icon name="target" size={12} />{task.match}% match</span>
            {task.verified && <span className="verif"><Icon name="shield" size={12} />Verified builder</span>}
          </div>
          <button className={`mkt-save ${task.saved ? "on" : ""}`} onClick={e => { e.stopPropagation(); onSave(task); }} style={{ width: 32, height: 32 }}>
            <Icon name="bookmark" size={16} style={{ fill: task.saved ? "currentColor" : "none" }} />
          </button>
        </div>
        <div className="row gap-3" style={{ alignItems: "center", marginTop: 8 }}>
          <span style={{ width: 52, height: 52, borderRadius: 14, flex: "none", display: "grid", placeItems: "center", background: `var(${t.accentVar})`, color: "#fff" }}><Icon name={t.icon} size={26} /></span>
          <div><h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: "-.025em" }}>{task.product}</h2><div className="muted" style={{ fontSize: 14.5 }}>{task.tagline} · {task.company}</div></div>
        </div>
        <p className="muted" style={{ margin: "14px 0 0", fontSize: 14.5, lineHeight: 1.55, maxWidth: "70ch" }}>{task.brief}</p>
        <div className="row between wrap gap-3" style={{ marginTop: 18 }}>
          <div className="row gap-4 wrap faint" style={{ fontSize: 13 }}>
            <span className="row gap-2"><Icon name="clock" size={14} />~{task.minutes} min</span>
            <span className="row gap-2"><Icon name="users" size={14} />{task.spotsLeft} of {task.spotsTotal} spots left</span>
            <span className="row gap-2" style={{ color: "var(--danger)", fontWeight: 700 }}><Icon name="bolt" size={14} />{deadlineLabel(task.deadline)}</span>
          </div>
          <div className="row gap-3" style={{ alignItems: "center" }}>
            <div style={{ textAlign: "right" }}><VReward amount={task.reward} big /><div className="faint" style={{ fontSize: 11 }}>on approval</div></div>
            <button className="btn btn-primary btn-lg" onClick={e => { e.stopPropagation(); onOpen(task); }}>Start validating <Icon name="arrowRight" /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Discover() {
  const navigate = useNavigate();
  const { vtypes, typeOrder, rewardBands, timeBands, sorts } = useVMeta();
  const [q, setQ] = useState("");
  const [types, setTypes] = useState(new Set());
  const [reward, setReward] = useState("any");
  const [time, setTime] = useState("any");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [minMatch, setMinMatch] = useState(0);
  const [sort, setSort] = useState("match");
  const [showFilters, setShowFilters] = useState(false);
  const [data, setData] = useState(null);

  const toggleType = (k) => setTypes(s => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const clearAll = () => { setQ(""); setTypes(new Set()); setReward("any"); setTime("any"); setVerifiedOnly(false); setMinMatch(0); };

  useEffect(() => {
    // Prevent back-button going to login
    window.history.pushState(null, "", window.location.href);
    const onPop = () => window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    vapi.marketplace({ q, types: [...types].join(","), reward, time, verified: verifiedOnly, minMatch, sort })
      .then(setData)
      .catch(() => {});
  }, [q, types, reward, time, verifiedOnly, minMatch, sort]);

  const onOpen = (task) => navigate(`/validator/missions/${task.id}`);
  const onSave = async (task) => {
    const next = !task.saved;
    setData(d => ({ ...d, tasks: d.tasks.map(t => t.id === task.id ? { ...t, saved: next } : t), featured: d.featured && d.featured.id === task.id ? { ...d.featured, saved: next } : d.featured }));
    try { await vapi.saveTask(task.id, next); } catch { /* best effort */ }
  };

  if (!data) return <div className="page rise"><div className="muted">Loading…</div></div>;

  const filtersActive = q || types.size || reward !== "any" || time !== "any" || verifiedOnly || minMatch > 0;
  const showFeatured = !filtersActive && sort === "match" && data.featured;

  return (
    <div className="page">
      <div className="rise" style={{ marginBottom: 18 }}>
        <div className="eyebrow" style={{ marginBottom: 6 }}>Mission marketplace</div>
        <h2 style={{ margin: "0 0 4px", fontSize: 28, fontWeight: 800, letterSpacing: "-.03em" }}>Find your next mission</h2>
        <p className="muted" style={{ margin: "0 0 16px", fontSize: 15 }}>{data.total} open missions matched to your expertise · paid on approval.</p>
        <div className="mkt-searchbar">
          <Icon name="search" size={18} style={{ color: "var(--text-faint)", flex: "none" }} />
          <input placeholder="Search products, companies, or what you'll validate…" value={q} onChange={e => setQ(e.target.value)} />
          {q && <button className="mkt-save" style={{ width: 30, height: 30 }} onClick={() => setQ("")}><Icon name="x" size={15} /></button>}
        </div>
      </div>

      <div className="rise-2" style={{ marginBottom: 22 }}>
        <div className="mkt-cats">
          {data.categories.map(c => (
            <button key={c.key} className={`mkt-cat ${types.has(c.key) ? "on" : ""}`} style={{ "--c": `var(${vtypes[c.key].accentVar})` }} onClick={() => toggleType(c.key)}>
              <span className="ci"><Icon name={vtypes[c.key].icon} size={18} /></span>
              <span className="cl">{c.label}</span>
              <span className="cc">{c.count} open</span>
            </button>
          ))}
        </div>
      </div>

      {showFeatured && <FeaturedMission task={data.featured} vtypes={vtypes} onSave={onSave} onOpen={onOpen} />}

      <div className="row between wrap gap-3 rise-2" style={{ margin: showFeatured ? "24px 0 16px" : "0 0 16px" }}>
        <div className="row gap-2" style={{ alignItems: "baseline" }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: "-.02em" }}>{filtersActive ? "Results" : "All missions"}</h3>
          <span className="muted mono" style={{ fontSize: 13 }}>{data.tasks.length}</span>
        </div>
        <div className="row gap-2">
          <button className="pill" onClick={() => setShowFilters(f => !f)} style={{ cursor: "pointer" }}><Icon name="filter" size={14} />Filters{filtersActive ? " ·" : ""}</button>
          <label className="pill" style={{ gap: 8, cursor: "pointer" }}>
            <span className="faint" style={{ fontSize: 12 }}>Sort</span>
            <select value={sort} onChange={e => setSort(e.target.value)} style={{ border: "none", background: "none", fontFamily: "inherit", fontWeight: 700, fontSize: 13, color: "var(--text)", outline: "none", cursor: "pointer" }}>
              {sorts.map(s => <option key={s.k} value={s.k}>{s.l}</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className={`mkt-layout ${showFilters ? "show-filters" : ""}`}>
        <aside className="mkt-side rise-2">
          <div className="card" style={{ padding: 18 }}>
            <div className="row between" style={{ marginBottom: 14 }}>
              <b style={{ fontSize: 14, fontWeight: 800 }}>Filters</b>
              {filtersActive && <button className="backlink" style={{ margin: 0, fontSize: 12 }} onClick={clearAll}>Clear all</button>}
            </div>
            <div className="mkt-fgroup">
              <span className="lbl">Validation type</span>
              {typeOrder.map(k => (
                <button key={k} className={`mkt-check ${types.has(k) ? "on" : ""}`} style={{ "--c": `var(${vtypes[k].accentVar})`, width: "100%" }} onClick={() => toggleType(k)}>
                  <span className="bx">{types.has(k) && <Icon name="check" size={12} />}</span>
                  {vtypes[k].label}<span className="cnt">{data.categories.find(c => c.key === k)?.count ?? 0}</span>
                </button>
              ))}
            </div>
            <div className="mkt-fgroup">
              <span className="lbl">Reward</span>
              <div className="col gap-2">{rewardBands.map(b => <RadioRow key={b.k} on={reward === b.k} onClick={() => setReward(b.k)} label={b.l} />)}</div>
            </div>
            <div className="mkt-fgroup">
              <span className="lbl">Time required</span>
              <div className="col gap-2">{timeBands.map(b => <RadioRow key={b.k} on={time === b.k} onClick={() => setTime(b.k)} label={b.l} />)}</div>
            </div>
            <div className="mkt-fgroup">
              <span className="lbl">Minimum match · {minMatch}%</span>
              <input type="range" min="0" max="95" step="5" value={minMatch} onChange={e => setMinMatch(+e.target.value)} style={{ width: "100%", accentColor: "var(--accent)" }} />
            </div>
            <div className="mkt-fgroup">
              <button className={`mkt-check ${verifiedOnly ? "on" : ""}`} style={{ width: "100%" }} onClick={() => setVerifiedOnly(v => !v)}>
                <span className="bx">{verifiedOnly && <Icon name="check" size={12} />}</span>
                Verified builders only
              </button>
            </div>
          </div>
        </aside>
        <div style={{ minWidth: 0 }}>
          {data.tasks.length === 0
            ? <div className="card"><VEmpty icon="search" title="No missions match" body="Try widening your filters or clearing your search — new missions are posted throughout the day." cta={<button className="btn btn-primary" onClick={clearAll}>Clear filters</button>} /></div>
            : <div className="mkt-grid rise-3">{data.tasks.map(t => <MktCard key={t.id} task={t} vtypes={vtypes} onSave={onSave} onOpen={onOpen} />)}</div>}
        </div>
      </div>
    </div>
  );
}
