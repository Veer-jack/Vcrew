import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import { Avatar, Btn, Empty, KpiCard, MatchRing } from "../components/ui";
import { api } from "../api/client";

const EMPTY_SEL = (filters) => Object.fromEntries(Object.keys(filters).map(k => [k, new Set()]));

export default function AudienceExplorer() {
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [filters, setFilters] = useState({});
  const [sel, setSel] = useState({});
  const [closed, setClosed] = useState(new Set());
  const [q, setQ] = useState("");

  useEffect(() => {
    api.audience().then(d => { setMembers(d.members); setFilters(d.filters); setSel(EMPTY_SEL(d.filters)); });
  }, []);

  const toggle = (g, o) => setSel(p => { const s = new Set(p[g]); s.has(o) ? s.delete(o) : s.add(o); return { ...p, [g]: s }; });
  const toggleGroup = (g) => setClosed(p => { const s = new Set(p); s.has(g) ? s.delete(g) : s.add(g); return s; });
  const activeFilters = Object.values(sel).reduce((a, s) => a + (s?.size || 0), 0);

  const results = useMemo(() => {
    if (!sel.Geography) return members;
    return members.filter(m => {
      const geo = sel.Geography.size === 0 || sel.Geography.has(m.city);
      const role = sel["ValidationCrew Role"].size === 0 || sel["ValidationCrew Role"].has(m.role);
      const int = sel.Interests.size === 0 || m.expertise.some(e => sel.Interests.has(e)) || [...sel.Interests].some(i => m.industry === i);
      const qq = !q || (m.name + m.occ + m.city).toLowerCase().includes(q.toLowerCase());
      return geo && role && int && qq;
    }).sort((a, b) => b.match - a.match);
  }, [members, sel, q]);

  const verifiedPct = members.length ? Math.round((members.filter(a => a.verified).length / members.length) * 100) : 0;

  return (
    <div className="page rise">
      <div className="ph">
        <div>
          <span className="eyebrow">Discovery</span>
          <h1>Audience Explorer</h1>
          <p className="lead">Search verified members and layer filters to find exactly who should validate your product.</p>
        </div>
        <div className="ph-actions"><Btn variant="primary" icon="plus" onClick={() => navigate("/missions/new")}>Create Mission</Btn></div>
      </div>

      <div className="kpis sec" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        <KpiCard label="Matching members" value={results.length} icon="users" />
        <KpiCard label="Verified" value={verifiedPct} unit="%" icon="shield" tone="green" />
        <KpiCard label="Avg trust score" value="88" icon="award" />
        <KpiCard label="Active this week" value="71%" icon="bolt" tone="amber" />
      </div>

      <div className="aud">
        <div className="filter-panel">
          <div className="row between" style={{ marginBottom: 6 }}>
            <b style={{ fontSize: 13 }}>Filters</b>
            {activeFilters > 0 && <button className="backlink" style={{ margin: 0, fontSize: 12 }} onClick={() => setSel(EMPTY_SEL(filters))}>Clear all</button>}
          </div>
          {Object.entries(filters).map(([g, opts]) => (
            <div key={g} className={`fgroup ${closed.has(g) ? "closed" : ""}`}>
              <button className="fgroup-h" onClick={() => toggleGroup(g)}>{g}<Icon name="chevronDown" size={15} /></button>
              <div className="fgroup-body">
                {opts.map(o => {
                  const on = sel[g]?.has(o);
                  return (
                    <button key={o} className={`fcheck ${on ? "on" : ""}`} onClick={() => toggle(g, o)}>
                      <span className="box">{on && <Icon name="check" size={11} />}</span>{o}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div>
          <div className="toolbar">
            <div className="seg-search"><Icon name="search" size={16} /><input placeholder="Search by name, role, city…" value={q} onChange={e => setQ(e.target.value)} /></div>
            <span className="muted" style={{ fontSize: 13 }}>{results.length} shown · sorted by match</span>
            <span className="grow" />
            <Btn variant="ghost" size="sm" icon="download">Export list</Btn>
          </div>
          {results.length === 0 ? (
            <Empty icon="users" title="No members match these filters" action={<Btn variant="ghost" icon="refresh" onClick={() => { setSel(EMPTY_SEL(filters)); setQ(""); }}>Reset filters</Btn>}>Try widening your geography or removing an interest to grow the pool.</Empty>
          ) : (
            <div className="col gap-3">
              {results.map((m) => (
                <div className="aud-card" key={m.id}>
                  <Avatar name={m.name} size={46} />
                  <div className="aud-meta">
                    <div className="aud-name">{m.name} {m.verified && <span className="verif"><Icon name="checkCircle" size={14} /> Verified</span>}</div>
                    <div className="aud-sub">{m.occ} · {m.city} · <span className="mono">{m.role}</span></div>
                    <div className="aud-tags">{m.expertise.map(e => <span key={e} className="mtag">{e}</span>)}</div>
                  </div>
                  <div className="aud-right">
                    <MatchRing value={m.match} />
                    <span className="mtag" style={{ background: "var(--success-weak)", color: "var(--success)", border: "none" }}><Icon name="award" size={11} style={{ verticalAlign: -2, marginRight: 3 }} />Trust 90+</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
