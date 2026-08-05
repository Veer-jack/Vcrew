import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import { VEmpty, VReward, VTypeTag } from "../vcomponents/vui";
import { useVMeta } from "../vcontext/VMetaContext";
import { vapi } from "../vapi/client";
import { deadlineLabel, deadlineHours } from "../vutil";
import { useTranslation } from "../i18n/index.jsx";

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

function MktCard({ task, vtypes, onSave, onReport, onOpen }) {
  const { t } = useTranslation();
  const vt = vtypes[task.type];
  const spotPct = (task.spotsLeft / task.spotsTotal) * 100;
  const urgent = deadlineHours(task.deadline) <= 12;
  return (
    <div className="card mkt-cardhover" style={{ position: "relative", overflow: "hidden", padding: "38px 18px 18px", display: "flex", flexDirection: "column", gap: 11, cursor: "pointer" }} onClick={() => onOpen(task)}>
      {task.myStatus === "completed" ? <span className="tag" style={{ position: "absolute", top: 0, left: 0, background: "var(--warning)", color: "#fff", padding: "5px 12px", fontWeight: 800, fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase", borderRadius: "0 0 10px 0" }}><Icon name="award" size={11} style={{ marginRight: 4 }} />{t("status.approved", null, "Approved")}</span> :
       task.myStatus === "submitted" ? <span className="tag" style={{ position: "absolute", top: 0, left: 0, background: "var(--accent)", color: "#fff", padding: "5px 12px", fontWeight: 800, fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase", borderRadius: "0 0 10px 0" }}><Icon name="send" size={11} style={{ marginRight: 4 }} />{t("status.submitted", null, "Submitted")}</span> :
       (task.myStatus === "active" || task.myStatus === "applied") ? <span className="tag" style={{ position: "absolute", top: 0, left: 0, background: "var(--success)", color: "#fff", padding: "5px 12px", fontWeight: 800, fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase", borderRadius: "0 0 10px 0" }}><Icon name="checkCircle" size={11} style={{ marginRight: 4 }} />{t("status.accepted", null, "Accepted")}</span> :
       task.myStatus === "rejected" ? <span className="tag" style={{ position: "absolute", top: 0, left: 0, background: "var(--danger)", color: "#fff", padding: "5px 12px", fontWeight: 800, fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase", borderRadius: "0 0 10px 0" }}><Icon name="xCircle" size={11} style={{ marginRight: 4 }} />{t("status.rejected", null, "Rejected")}</span> :
       <span className="tag" style={{ position: "absolute", top: 0, left: 0, background: "var(--text-muted)", color: "#fff", padding: "5px 12px", fontWeight: 800, fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase", borderRadius: "0 0 10px 0" }}><Icon name="zap" size={11} style={{ marginRight: 4 }} />{t("status.open", null, "Open")}</span>}
      <div className="row between" style={{ alignItems: "flex-start" }}>
        <div className="row gap-2 wrap">
          <VTypeTag type={task.type} vtypes={vtypes} />
          <span className="tag" style={{ background: "var(--accent-weak)", color: "var(--accent)" }}><Icon name="target" size={11} />{task.match}%</span>
          {task.hot && <span className="tag" style={{ background: "var(--warning-weak)", color: "var(--warning)" }}><Icon name="bolt" size={11} />{t("status.hot", null, "Hot")}</span>}
        </div>
        <div className="row gap-1">
          <button className={`mkt-save`} onClick={e => { e.stopPropagation(); onReport?.(task); }} title={t("actions.reportMission", null, "Report Mission")} style={{ width: 32, height: 32 }}>
            <Icon name="flag" size={16} />
          </button>
          <button className={`mkt-save ${task.saved ? "on" : ""}`} onClick={e => { e.stopPropagation(); onSave(task); }} title={task.saved ? t("actions.saved", null, "Saved") : t("actions.save", null, "Save")} style={{ width: 32, height: 32 }}>
            <Icon name="bookmark" size={16} style={{ fill: task.saved ? "currentColor" : "none" }} />
          </button>
        </div>
      </div>
      <div>
        <div className="row gap-2" style={{ alignItems: "center" }}>
          <span style={{ width: 30, height: 30, borderRadius: 8, flex: "none", display: "grid", placeItems: "center", background: `color-mix(in srgb, var(${vt.accentVar}) 13%, transparent)`, color: `var(${vt.accentVar})` }}><Icon name={vt.icon} size={16} /></span>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, letterSpacing: "-.02em" }}>{task.product}</h3>
          {task.verified && <span className="verif" title={t("badge.verifiedBuilder", null, "Verified builder")}><Icon name="shield" size={12} /></span>}
        </div>
        <div className="faint" style={{ fontSize: 12.5, marginTop: 3 }}>{task.tagline} · {task.company}</div>
      </div>
      <p className="muted" style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{task.brief}</p>
      <div className="row gap-3 wrap faint" style={{ fontSize: 12 }}>
        <span className="row gap-2"><Icon name="clock" size={13} />~{task.minutes}{t("discover.minutesShort", null, "m")}</span>
        <span className="row gap-2"><Icon name="users" size={13} />{task.spotsLeft} {t("discover.spotsLeft", null, "left")}</span>
        <span className="row gap-2" style={{ color: urgent ? "var(--danger)" : "inherit", fontWeight: urgent ? 700 : 400 }}><Icon name="clock" size={13} />{deadlineLabel(task.deadline)}</span>
      </div>
      <div style={{ height: 5, borderRadius: 20, background: "var(--panel-inset)", overflow: "hidden" }}>
        <i style={{ display: "block", height: "100%", width: (100 - spotPct) + "%", borderRadius: 20, background: spotPct < 25 ? "var(--danger)" : `var(${vt.accentVar})` }} />
      </div>
      <div className="row between" style={{ marginTop: 2, paddingTop: 11, borderTop: "1px solid var(--border)" }}>
        <div><VReward amount={task.reward} /><span className="faint" style={{ fontSize: 11 }}> {t("discover.onApproval", null, "on approval")}</span></div>
        <button className="btn btn-primary" style={{ 
          padding: "8px 14px",
          background: task.myStatus === "completed" ? "var(--warning)" : task.myStatus === "submitted" ? "var(--accent)" : (task.myStatus === "active" || task.myStatus === "applied") ? "var(--success)" : task.myStatus === "rejected" ? "var(--danger)" : undefined,
          borderColor: task.myStatus === "completed" ? "var(--warning)" : task.myStatus === "submitted" ? "var(--accent)" : (task.myStatus === "active" || task.myStatus === "applied") ? "var(--success)" : task.myStatus === "rejected" ? "var(--danger)" : undefined,
          opacity: task.myStatus === "rejected" ? 0.8 : 1
        }} onClick={e => { e.stopPropagation(); onOpen(task); }}>
          {task.myStatus === "completed" ? t("actions.viewResults", null, "View results") : task.myStatus === "submitted" ? t("actions.viewSubmission", null, "View submission") : (task.myStatus === "active" || task.myStatus === "applied") ? t("actions.resume", null, "Resume") : task.myStatus === "rejected" ? t("actions.viewReason", null, "View reason") : t("actions.view", null, "View")}
          <Icon name="arrowRight" size={15} />
        </button>
      </div>
    </div>
  );
}

function FeaturedMission({ task, vtypes, onSave, onReport, onOpen }) {
  const { t } = useTranslation();
  const vt = vtypes[task.type];
  return (
    <div className="card rise-2" onClick={() => onOpen(task)} style={{ padding: 0, overflow: "hidden", cursor: "pointer",
      background: `linear-gradient(120deg, color-mix(in srgb, var(${vt.accentVar}) 13%, var(--panel)), var(--panel) 62%)` }}>
      <div style={{ position: "relative", padding: "42px 24px 22px" }}>
        {task.myStatus === "completed" ? <span className="tag" style={{ position: "absolute", top: 0, left: 0, background: "var(--warning)", color: "#fff", padding: "6px 14px", fontWeight: 800, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", borderRadius: "0 0 10px 0" }}><Icon name="award" size={12} style={{ marginRight: 5 }} />{t("status.approved", null, "Approved")}</span> :
         task.myStatus === "submitted" ? <span className="tag" style={{ position: "absolute", top: 0, left: 0, background: "var(--accent)", color: "#fff", padding: "6px 14px", fontWeight: 800, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", borderRadius: "0 0 10px 0" }}><Icon name="send" size={12} style={{ marginRight: 5 }} />{t("status.submitted", null, "Submitted")}</span> :
         (task.myStatus === "active" || task.myStatus === "applied") ? <span className="tag" style={{ position: "absolute", top: 0, left: 0, background: "var(--success)", color: "#fff", padding: "6px 14px", fontWeight: 800, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", borderRadius: "0 0 10px 0" }}><Icon name="checkCircle" size={12} style={{ marginRight: 5 }} />{t("status.accepted", null, "Accepted")}</span> :
         task.myStatus === "rejected" ? <span className="tag" style={{ position: "absolute", top: 0, left: 0, background: "var(--danger)", color: "#fff", padding: "6px 14px", fontWeight: 800, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", borderRadius: "0 0 10px 0" }}><Icon name="xCircle" size={12} style={{ marginRight: 5 }} />{t("status.rejected", null, "Rejected")}</span> :
         <span className="tag" style={{ position: "absolute", top: 0, left: 0, background: "var(--text-muted)", color: "#fff", padding: "6px 14px", fontWeight: 800, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", borderRadius: "0 0 10px 0" }}><Icon name="zap" size={12} style={{ marginRight: 5 }} />{t("status.open", null, "Open")}</span>}
        <div className="row between wrap gap-3" style={{ alignItems: "flex-start" }}>
          <div className="row gap-2 wrap" style={{ marginBottom: 4 }}>
            <span className="tag" style={{ background: `var(${vt.accentVar})`, color: "#fff" }}><Icon name="bolt" size={12} />{t("status.featured", null, "Featured")}</span>
            <VTypeTag type={task.type} vtypes={vtypes} />
            <span className="tag" style={{ background: "var(--accent-weak)", color: "var(--accent)" }}><Icon name="target" size={12} />{task.match}% {t("discover.match", null, "match")}</span>
            {task.verified && <span className="verif"><Icon name="shield" size={12} />{t("badge.verifiedBuilder", null, "Verified builder")}</span>}
          </div>
          <div className="row gap-1">
            <button className={`mkt-save`} onClick={e => { e.stopPropagation(); onReport?.(task); }} title={t("actions.reportMission", null, "Report Mission")} style={{ width: 32, height: 32 }}>
              <Icon name="flag" size={16} />
            </button>
            <button className={`mkt-save ${task.saved ? "on" : ""}`} onClick={e => { e.stopPropagation(); onSave(task); }} style={{ width: 32, height: 32 }}>
              <Icon name="bookmark" size={16} style={{ fill: task.saved ? "currentColor" : "none" }} />
            </button>
          </div>
        </div>
        <div className="row gap-3" style={{ alignItems: "center", marginTop: 8 }}>
          <span style={{ width: 52, height: 52, borderRadius: 14, flex: "none", display: "grid", placeItems: "center", background: `var(${vt.accentVar})`, color: "#fff" }}><Icon name={vt.icon} size={26} /></span>
          <div><h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: "-.025em" }}>{task.product}</h2><div className="muted" style={{ fontSize: 14.5 }}>{task.tagline} · {task.company}</div></div>
        </div>
        <p className="muted" style={{ margin: "14px 0 0", fontSize: 14.5, lineHeight: 1.55, maxWidth: "70ch" }}>{task.brief}</p>
        <div className="row between wrap gap-3" style={{ marginTop: 18 }}>
          <div className="row gap-4 wrap faint" style={{ fontSize: 13 }}>
            <span className="row gap-2"><Icon name="clock" size={14} />~{task.minutes} {t("discover.minutes", null, "min")}</span>
            <span className="row gap-2"><Icon name="users" size={14} />{task.spotsLeft} {t("discover.of", null, "of")} {task.spotsTotal} {t("discover.spotsLeftFull", null, "spots left")}</span>
            <span className="row gap-2" style={{ color: "var(--danger)", fontWeight: 700 }}><Icon name="bolt" size={14} />{deadlineLabel(task.deadline)}</span>
          </div>
          <div className="row gap-3" style={{ alignItems: "center" }}>
            <div style={{ textAlign: "right" }}><VReward amount={task.reward} big /><div className="faint" style={{ fontSize: 11 }}>{t("discover.onApproval", null, "on approval")}</div></div>
            <button className="btn btn-primary btn-lg" style={{
              background: task.myStatus === "completed" ? "var(--warning)" : task.myStatus === "submitted" ? "var(--accent)" : (task.myStatus === "active" || task.myStatus === "applied") ? "var(--success)" : task.myStatus === "rejected" ? "var(--danger)" : undefined,
              borderColor: task.myStatus === "completed" ? "var(--warning)" : task.myStatus === "submitted" ? "var(--accent)" : (task.myStatus === "active" || task.myStatus === "applied") ? "var(--success)" : task.myStatus === "rejected" ? "var(--danger)" : undefined,
              opacity: task.myStatus === "rejected" ? 0.8 : 1
            }} onClick={e => { e.stopPropagation(); onOpen(task); }}>
              {task.myStatus === "completed" ? t("actions.viewResults", null, "View results") : task.myStatus === "submitted" ? t("actions.viewSubmission", null, "View submission") : (task.myStatus === "active" || task.myStatus === "applied") ? t("actions.resumeMission", null, "Resume mission") : task.myStatus === "rejected" ? t("actions.viewReason", null, "View reason") : t("actions.startValidating", null, "Start validating")} <Icon name="arrowRight" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Discover() {
  const { t } = useTranslation();
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
  const [visibleCount, setVisibleCount] = useState(20);

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
    setTimeout(() => setVisibleCount(20), 0);
    vapi.marketplace({ q, types: [...types].join(","), reward, time, verified: verifiedOnly, minMatch, sort })
      .then(setData)
      .catch(() => {});
  }, [q, types, reward, time, verifiedOnly, minMatch, sort]);

  const onOpen = (task) => {
    if (task.myStatus === "completed") {
      navigate(`/validator/missions/${task.id}/results`);
    } else {
      navigate(`/validator/missions/${task.id}`, { state: { fromDiscover: true } });
    }
  };
  const onSave = async (task) => {
    const next = !task.saved;
    setData(d => ({ ...d, tasks: d.tasks.map(t => t.id === task.id ? { ...t, saved: next } : t), featured: d.featured && d.featured.id === task.id ? { ...d.featured, saved: next } : d.featured }));
    try { await vapi.saveTask(task.id, next); } catch { /* best effort */ }
  };
  const onReport = async (task) => {
    const reason = window.prompt(t("discover.reportPrompt", null, "Report this mission. Please tell us what's wrong:"));
    if (!reason || !reason.trim()) return;
    try {
      await vapi.reportMission(task.id, reason.trim());
      alert(t("discover.reportSuccess", null, "Reported. Our admin team will review it promptly."));
    } catch (e) {
      alert(t("discover.reportFail", null, "Failed to report: ") + (e.message || t("errors.unknown", null, "Unknown error")));
    }
  };

  if (!data) return <div className="page rise"><div className="muted">{t("actions.loading", null, "Loading…")}</div></div>;

  const filtersActive = q || types.size || reward !== "any" || time !== "any" || verifiedOnly || minMatch > 0;
  const showFeatured = !filtersActive && sort === "match" && data.featured;

  return (
    <div className="page">
      <div className="rise" style={{ marginBottom: 18 }}>
        <div className="eyebrow" style={{ marginBottom: 6 }}>{t("discover.eyebrow", null, "Mission marketplace")}</div>
        <h2 style={{ margin: "0 0 4px", fontSize: 28, fontWeight: 800, letterSpacing: "-.03em" }}>{t("discover.headline", null, "Find your next mission")}</h2>
        <p className="muted" style={{ margin: "0 0 16px", fontSize: 15 }}>{data.total} {t("discover.sub1", null, "open missions matched to your expertise · ")} {t("discover.sub2", null, "paid on approval.")}</p>
        <div className="mkt-searchbar">
          <Icon name="search" size={18} style={{ color: "var(--text-faint)", flex: "none" }} />
          <input placeholder={t("discover.searchPlaceholder", null, "Search products, companies, or what you'll validate…")} value={q} onChange={e => setQ(e.target.value)} />
          {q && <button className="mkt-save" style={{ width: 30, height: 30 }} onClick={() => setQ("")}><Icon name="x" size={15} /></button>}
        </div>
      </div>

      <div className="rise-2" style={{ marginBottom: 22 }}>
        <div className="mkt-cats">
          {data.categories.map(c => (
            <button key={c.key} className={`mkt-cat ${types.has(c.key) ? "on" : ""}`} style={{ "--c": `var(${vtypes[c.key].accentVar})` }} onClick={() => toggleType(c.key)}>
              <span className="ci"><Icon name={vtypes[c.key].icon} size={18} /></span>
              <span className="cl">{c.label}</span>
              <span className="cc">{c.count} {t("status.open", null, "open")}</span>
            </button>
          ))}
        </div>
      </div>

      {showFeatured && <FeaturedMission task={data.featured} vtypes={vtypes} onSave={onSave} onReport={onReport} onOpen={onOpen} />}

      <div className="row between wrap gap-3 rise-2" style={{ margin: showFeatured ? "24px 0 16px" : "0 0 16px" }}>
        <div className="row gap-2" style={{ alignItems: "baseline" }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: "-.02em" }}>{filtersActive ? t("discover.results", null, "Results") : t("discover.allMissions", null, "All missions")}</h3>
          <span className="muted mono" style={{ fontSize: 13 }}>{data.tasks.length}</span>
        </div>
        <div className="row gap-2">
          <button className="pill" onClick={() => setShowFilters(f => !f)} style={{ cursor: "pointer" }}><Icon name="filter" size={14} />{t("discover.filters", null, "Filters")}{filtersActive ? " ·" : ""}</button>
          <label className="pill" style={{ gap: 8, cursor: "pointer" }}>
            <span className="faint" style={{ fontSize: 12 }}>{t("discover.sort", null, "Sort")}</span>
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
              <b style={{ fontSize: 14, fontWeight: 800 }}>{t("discover.filters", null, "Filters")}</b>
              {filtersActive && <button className="backlink" style={{ margin: 0, fontSize: 12 }} onClick={clearAll}>{t("actions.clearAll", null, "Clear all")}</button>}
            </div>
            <div className="mkt-fgroup">
              <span className="lbl">{t("discover.validationType", null, "Validation type")}</span>
              {typeOrder.map(k => (
                <button key={k} className={`mkt-check ${types.has(k) ? "on" : ""}`} style={{ "--c": `var(${vtypes[k].accentVar})`, width: "100%" }} onClick={() => toggleType(k)}>
                  <span className="bx">{types.has(k) && <Icon name="check" size={12} />}</span>
                  {vtypes[k].label}<span className="cnt">{data.categories.find(c => c.key === k)?.count ?? 0}</span>
                </button>
              ))}
            </div>
            <div className="mkt-fgroup">
              <span className="lbl">{t("discover.reward", null, "Reward")}</span>
              <div className="col gap-2">{rewardBands.map(b => <RadioRow key={b.k} on={reward === b.k} onClick={() => setReward(b.k)} label={b.l} />)}</div>
            </div>
            <div className="mkt-fgroup">
              <span className="lbl">{t("discover.timeRequired", null, "Time required")}</span>
              <div className="col gap-2">{timeBands.map(b => <RadioRow key={b.k} on={time === b.k} onClick={() => setTime(b.k)} label={b.l} />)}</div>
            </div>
            <div className="mkt-fgroup">
              <span className="lbl">{t("discover.minMatch", null, "Minimum match")} · {minMatch}%</span>
              <input type="range" min="0" max="95" step="5" value={minMatch} onChange={e => setMinMatch(+e.target.value)} style={{ width: "100%", accentColor: "var(--accent)" }} />
            </div>
            <div className="mkt-fgroup">
              <button className={`mkt-check ${verifiedOnly ? "on" : ""}`} style={{ width: "100%" }} onClick={() => setVerifiedOnly(v => !v)}>
                <span className="bx">{verifiedOnly && <Icon name="check" size={12} />}</span>
                {t("discover.verifiedOnly", null, "Verified builders only")}
              </button>
            </div>
          </div>
        </aside>
        <div style={{ minWidth: 0 }}>
          {data.tasks.length === 0
            ? <div className="card"><VEmpty icon="search" title={t("discover.noMatchTitle", null, "No missions match")} body={t("discover.noMatchBody", null, "Try widening your filters or clearing your search — new missions are posted throughout the day.")} cta={<button className="btn btn-primary" onClick={clearAll}>{t("actions.clearFilters", null, "Clear filters")}</button>} /></div>
            : (
              <div>
                <div className="mkt-grid rise-3">{data.tasks.slice(0, visibleCount).map(t => <MktCard key={t.id} task={t} vtypes={vtypes} onSave={onSave} onReport={onReport} onOpen={onOpen} />)}</div>
                {visibleCount < data.tasks.length && (
                  <div style={{ textAlign: "center", marginTop: 24, paddingBottom: 24 }}>
                    <button className="btn btn-outline" onClick={() => setVisibleCount(c => c + 20)}>{t("actions.loadMore", null, "Load more missions")}</button>
                  </div>
                )}
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
