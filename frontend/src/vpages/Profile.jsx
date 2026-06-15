import { useEffect, useState } from "react";
import Icon from "../components/Icon";
import PhoneSetup from "../components/PhoneSetup";
import { ScoreRing, StatTile, VAvatar, VStars } from "../vcomponents/vui";
import { vapi } from "../vapi/client";

export default function Profile() {
  const [data, setData] = useState(null);
  useEffect(() => { vapi.profile().then(setData); }, []);
  if (!data) return <div className="page rise"><div className="muted">Loading…</div></div>;

  return (
    <div className="page">
      <div className="rise" style={{ marginBottom: 22 }}>
        <div className="card" style={{ padding: "var(--pad-card)", display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 20, alignItems: "center" }}>
          <VAvatar name={data.name} size={84} ring />
          <div style={{ minWidth: 0 }}>
            <div className="row gap-2 wrap" style={{ alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: "-.02em" }}>{data.name}</h2>
              <span className="tag" style={{ background: "var(--accent-weak)", color: "var(--accent)" }}><Icon name="award" size={13} />Lvl {data.level} · {data.levelName}</span>
            </div>
            <p className="muted" style={{ margin: "5px 0 0", fontSize: 14 }}>{data.handle} · {data.specialties.join(" · ")}</p>
            <div className="row gap-3 wrap" style={{ marginTop: 12 }}>
              <span className="pill"><Icon name="star" size={14} style={{ color: "var(--warning)" }} />{data.rating} · {data.ratingCount} reviews</span>
              <span className="pill"><Icon name="shield" size={14} style={{ color: "var(--success)" }} />{data.accuracy}% accuracy</span>
              <span className="pill"><Icon name="flame" size={14} style={{ color: "var(--vt-proto)" }} />{data.streak}-day streak</span>
            </div>
          </div>
          <button className="btn btn-ghost"><Icon name="edit" />Edit profile</button>
        </div>
      </div>

      <div className="rise-2" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 22 }}>
        <div className="card" style={{ padding: "var(--pad-card)", display: "flex", alignItems: "center", gap: 14 }}>
          <ScoreRing value={94} size={56} />
          <div style={{ minWidth: 0 }}><span className="eyebrow">Trust Score</span><div className="faint" style={{ fontSize: 12, marginTop: 4 }}>Top 5% on platform</div></div>
        </div>
        <div className="card" style={{ padding: "var(--pad-card)", display: "flex", alignItems: "center", gap: 14 }}>
          <ScoreRing value={91} size={56} />
          <div style={{ minWidth: 0 }}><span className="eyebrow">Expertise</span><div className="faint" style={{ fontSize: 12, marginTop: 4 }}>Across {data.expertise.length} niches</div></div>
        </div>
        <StatTile label="Completion rate" value={`${data.acceptRate}%`} sub="Started → submitted" accent="var(--accent)" icon="check" />
        <StatTile label="Missions completed" value={data.completed} sub={`₹${data.lifetime.toLocaleString("en-IN")} lifetime`} accent="var(--warning)" icon="bolt" />
      </div>

      <div className="split" style={{ gridTemplateColumns: "minmax(0,1fr) 340px" }}>
        <div className="col gap-5 rise-3">
          <div className="card" style={{ padding: "var(--pad-card)" }}>
            <div className="row between" style={{ marginBottom: 4 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>Reputation ladder</h3>
              {data.nextLevel && <span className="faint" style={{ fontSize: 12.5 }}>{Math.max(0, data.nextLevel.min - data.completed)} validations to {data.nextLevel.name}</span>}
            </div>
            <div className="lvl-meter" style={{ margin: "12px 0 18px" }}><i style={{ width: data.levelPct + "%" }} /></div>
            <div style={{ display: "grid", gap: 4 }}>
              {data.levels.map(l => {
                const state = l.n < data.level ? "done" : l.n === data.level ? "cur" : "up";
                return (
                  <div key={l.n} className="row gap-3" style={{ padding: "10px 0", borderTop: l.n > 1 ? "var(--hairline) solid var(--border)" : "none", opacity: state === "up" ? .55 : 1 }}>
                    <span style={{ width: 30, height: 30, borderRadius: "50%", flex: "none", display: "grid", placeItems: "center", fontFamily: "var(--mono)", fontWeight: 600, fontSize: 12,
                      background: state === "done" ? "var(--success)" : state === "cur" ? "var(--accent)" : "var(--panel-inset)",
                      color: state === "up" ? "var(--text-faint)" : "#fff",
                      boxShadow: state === "cur" ? "0 0 0 4px var(--accent-weak)" : "none" }}>
                      {state === "done" ? <Icon name="check" size={14} /> : l.n}
                    </span>
                    <div style={{ flex: 1 }}><b style={{ fontSize: 14 }}>{l.name}</b> <span className="faint" style={{ fontSize: 12.5 }}>· {l.perks}</span></div>
                    {state === "cur" && <span className="tag" style={{ background: "var(--accent-weak)", color: "var(--accent)" }}>You</span>}
                    <span className="mono faint" style={{ fontSize: 11.5 }}>{l.min}+</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card" style={{ padding: "var(--pad-card)" }}>
            <h3 style={{ margin: "0 0 14px", fontSize: 17, fontWeight: 800 }}>Expertise scores</h3>
            <div style={{ display: "grid", gap: 12 }}>
              {data.expertise.map((e, i) => (
                <div key={i} className="row gap-3" style={{ fontSize: 13.5 }}>
                  <span style={{ width: 130, flex: "none", fontWeight: 600 }}>{e.l}</span>
                  <span style={{ flex: 1, height: 9, borderRadius: 20, background: "var(--panel-inset)", overflow: "hidden" }}><i style={{ display: "block", height: "100%", width: e.v + "%", borderRadius: 20, background: "linear-gradient(90deg, var(--accent), var(--accent-2))" }} /></span>
                  <span className="mono" style={{ width: 36, textAlign: "right", fontWeight: 600, fontSize: 12.5 }}>{e.v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="col gap-5 rise-3">
          <PhoneSetup client={vapi} phone={data.phone} phoneVerified={data.phoneVerified}
            onUpdate={(phone) => setData(d => ({ ...d, phone, phoneVerified: !!phone }))} />
          <div className="card" style={{ padding: "var(--pad-card)" }}>
            <h3 style={{ margin: "0 0 14px", fontSize: 17, fontWeight: 800 }}>Verification badges</h3>
            <div style={{ display: "grid", gap: 10 }}>
              {data.badges.map((b, i) => (
                <div key={i} className="row gap-3" style={{ opacity: b.got ? 1 : .5 }}>
                  <span style={{ width: 38, height: 38, borderRadius: 11, flex: "none", display: "grid", placeItems: "center",
                    background: b.got ? "var(--success-weak)" : "var(--panel-inset)", color: b.got ? "var(--success)" : "var(--text-faint)" }}>
                    <Icon name={b.icon} size={18} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 700, fontSize: 13.5 }}>{b.label}</div><div className="faint" style={{ fontSize: 12 }}>{b.desc}</div></div>
                  {b.got && <Icon name="check" size={16} style={{ color: "var(--success)", flex: "none" }} />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
