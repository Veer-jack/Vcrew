import { useEffect, useState } from "react";
import Icon from "../components/Icon";
import PhoneSetup from "../components/PhoneSetup";
import PayoutSetup from "../components/PayoutSetup";
import { ScoreRing, StatTile, VAvatar, VStars } from "../vcomponents/vui";
import { vapi } from "../vapi/client";

export default function Profile() {
  const [data, setData] = useState(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [occupation, setOccupation] = useState("");
  const [industry, setIndustry] = useState("");
  const [location, setLocation] = useState("");
  const [address, setAddress] = useState({ line1: "", line2: "", city: "", state: "", postalCode: "", country: "" });
  const [bio, setBio] = useState("");
  const [specialties, setSpecialties] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { vapi.profile().then(setData).catch(() => setData({})); }, []);
  if (!data) return <div className="page rise"><div className="muted">Loading…</div></div>;
  if (!data.name && Object.keys(data).length === 0) return <div className="page rise"><div className="muted">Couldn't load profile. Please refresh.</div></div>;

  const startEdit = () => {
    setName(data.name); 
    setHandle((data.handle || "").replace(/^@/, "")); 
    setOccupation(data.occupation || "");
    setIndustry(data.industry || "");
    setLocation(data.location || "");
    setAddress({ ...{ line1: "", line2: "", city: "", state: "", postalCode: "", country: "" }, ...(data.address || {}) });
    setBio(data.bio || "");
    setSpecialties([...(data.specialties || [])]);
    setTagInput(""); setError(""); setEditing(true);
  };

  const addTag = (e) => {
    e.preventDefault();
    const tag = tagInput.trim();
    if (tag && !specialties.includes(tag) && specialties.length < 6) setSpecialties(s => [...s, tag]);
    setTagInput("");
  };

  const removeTag = (tag) => setSpecialties(s => s.filter(t => t !== tag));

  const save = async (e) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const res = await vapi.updateProfile({ name, handle, occupation, industry, location, bio, specialties, address });
      setData(d => ({ ...d, name: res.name, handle: res.handle, occupation: res.occupation, industry: res.industry, location: res.location, bio: res.bio, specialties: res.specialties, address: res.address }));
      setEditing(false);
    } catch (err) {
      setError(err.message || "Couldn't save changes");
    } finally { setBusy(false); }
  };

  const trustScore = data.completed > 0 ? Math.round(((data.rating || 5) / 5) * 50 + ((data.accuracy || 100) / 100) * 50) : 0;
  const avgExpertise = data.expertise?.length ? Math.round(data.expertise.reduce((acc, curr) => acc + curr.v, 0) / data.expertise.length) : 0;

  return (
    <div className="page">
      <div className="rise" style={{ marginBottom: 22 }}>
        <div className="card" style={{ padding: "var(--pad-card)" }}>
          {!editing ? (
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 20, alignItems: "center" }}>
              <VAvatar name={data.name} size={84} ring />
              <div style={{ minWidth: 0 }}>
                <div className="row gap-2 wrap" style={{ alignItems: "center" }}>
                  <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: "-.02em" }}>{data.name}</h2>
                  <span className="tag" style={{ background: "var(--accent-weak)", color: "var(--accent)" }}><Icon name="award" size={13} />Lvl {data.level || 1} · {data.levelName || "Trial"}</span>
                  <span className="tag" style={{ background: data.role === "Validator" ? "var(--purple-weak)" : data.role === "Tester" ? "var(--success-weak)" : "var(--border-color)", color: data.role === "Validator" ? "var(--purple)" : data.role === "Tester" ? "var(--success)" : "var(--text-muted)" }}>
                    <Icon name={data.role === "Validator" ? "shield" : data.role === "Tester" ? "checkSquare" : "user"} size={13} />
                    {data.role || "User"}
                  </span>
                </div>
                <p className="muted" style={{ margin: "5px 0 0", fontSize: 14 }}>{data.handle} · {data.occupation || "Unspecified"} · {(data.specialties || []).join(" · ")}</p>
                {data.location && <p className="muted" style={{ margin: "3px 0 0", fontSize: 13 }}><Icon name="mapPin" size={12} /> {data.location}</p>}
                {data.bio && <p style={{ margin: "8px 0 0", fontSize: 14, lineHeight: 1.4 }}>{data.bio}</p>}
                <div className="row gap-3 wrap" style={{ marginTop: 12 }}>
                  <span className="pill"><Icon name="star" size={14} style={{ color: "var(--warning)" }} />{data.rating || 0} · {data.ratingCount || 0} reviews</span>
                  <span className="pill"><Icon name="shield" size={14} style={{ color: "var(--success)" }} />{data.accuracy || 0}% accuracy</span>
                  <span className="pill"><Icon name="flame" size={14} style={{ color: "var(--vt-proto)" }} />{data.streak || 0}-day streak</span>
                </div>
              </div>
              <button className="btn btn-ghost" onClick={startEdit}><Icon name="edit" />Edit profile</button>
            </div>
          ) : (
            <form onSubmit={save} className="col gap-4">
              {error && <div className="err-banner">{error}</div>}
              <div className="row gap-3 wrap">
                <div className="fld" style={{ flex: 1, minWidth: 180 }}>
                  <label>Name</label>
                  <input className="fin" value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <div className="fld" style={{ flex: 1, minWidth: 180 }}>
                  <label>Handle</label>
                  <div className="inw has-pre"><span className="pre">@</span><input className="fin" value={handle} onChange={e => setHandle(e.target.value.replace(/^@/, ""))} placeholder="yourhandle" /></div>
                </div>
              </div>
              <div className="row gap-3 wrap">
                <div className="fld" style={{ flex: 1, minWidth: 180 }}>
                  <label>Occupation</label>
                  <input className="fin" value={occupation} onChange={e => setOccupation(e.target.value)} placeholder="e.g. Software Engineer" />
                </div>
                <div className="fld" style={{ flex: 1, minWidth: 180 }}>
                  <label>Industry</label>
                  <input className="fin" value={industry} onChange={e => setIndustry(e.target.value)} placeholder="e.g. Technology" />
                </div>
              </div>
              <div className="row gap-3 wrap">
                <div className="fld" style={{ flex: 1, minWidth: 180 }}>
                  <label>Location (City)</label>
                  <input className="fin" value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Bengaluru" />
                </div>
              </div>
              <div className="fld">
                <label>Shipping address <span className="opt">optional — needed only for Sample Distribution missions</span></label>
                <div className="col gap-3" style={{ marginTop: 6 }}>
                  <input className="fin" value={address.line1} onChange={e => setAddress(a => ({ ...a, line1: e.target.value }))} placeholder="Address line 1" />
                  <input className="fin" value={address.line2} onChange={e => setAddress(a => ({ ...a, line2: e.target.value }))} placeholder="Address line 2 (optional)" />
                  <div className="row gap-3 wrap">
                    <input className="fin" style={{ flex: 1, minWidth: 140 }} value={address.city} onChange={e => setAddress(a => ({ ...a, city: e.target.value }))} placeholder="City" />
                    <input className="fin" style={{ flex: 1, minWidth: 140 }} value={address.state} onChange={e => setAddress(a => ({ ...a, state: e.target.value }))} placeholder="State" />
                  </div>
                  <div className="row gap-3 wrap">
                    <input className="fin" style={{ flex: 1, minWidth: 140 }} value={address.postalCode} onChange={e => setAddress(a => ({ ...a, postalCode: e.target.value }))} placeholder="Postal code" />
                    <input className="fin" style={{ flex: 1, minWidth: 140 }} value={address.country} onChange={e => setAddress(a => ({ ...a, country: e.target.value }))} placeholder="Country" />
                  </div>
                </div>
              </div>
              <div className="fld">
                <label>Bio</label>
                <textarea className="fin" rows={3} value={bio} onChange={e => setBio(e.target.value)} placeholder="A short bio about yourself..." />
              </div>
              <div className="fld">
                <label>Specialties (up to 6)</label>
                <div className="row gap-2 wrap" style={{ marginBottom: specialties.length ? 8 : 0 }}>
                  {specialties.map(tag => (
                    <span key={tag} className="pill" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)} style={{ display: "flex", border: "none", background: "none", cursor: "pointer", padding: 0, color: "var(--text-muted)" }}><Icon name="x" size={12} /></button>
                    </span>
                  ))}
                </div>
                {specialties.length < 6 && (
                  <div className="row gap-2">
                    <input className="fin" value={tagInput} onChange={e => setTagInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") addTag(e); }} placeholder="Add a specialty and press Enter" />
                    <button type="button" className="btn btn-quiet" onClick={addTag}>Add</button>
                  </div>
                )}
              </div>
              <div className="row gap-2">
                <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? "Saving…" : "Save changes"}</button>
                <button type="button" className="btn btn-quiet" onClick={() => { setEditing(false); setError(""); }}>Cancel</button>
              </div>
            </form>
          )}
        </div>
      </div>

      <div className="rise-2" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 22 }}>
        <div className="card" style={{ padding: "var(--pad-card)", display: "flex", alignItems: "center", gap: 14 }}>
          <ScoreRing value={trustScore} size={56} />
          <div style={{ minWidth: 0 }}><span className="eyebrow">Trust Score</span><div className="faint" style={{ fontSize: 12, marginTop: 4 }}>Top 5% on platform</div></div>
        </div>
        <div className="card" style={{ padding: "var(--pad-card)", display: "flex", alignItems: "center", gap: 14 }}>
          <ScoreRing value={avgExpertise} size={56} />
          <div style={{ minWidth: 0 }}><span className="eyebrow">Expertise</span><div className="faint" style={{ fontSize: 12, marginTop: 4 }}>Across {(data.expertise || []).length} niches</div></div>
        </div>
        <StatTile label="Completion rate" value={`${data.acceptRate || 0}%`} sub="Started → submitted" accent="var(--accent)" icon="check" />
        <StatTile label="Missions completed" value={data.completed || 0} sub={`₹${(data.lifetime || 0).toLocaleString("en-IN")} lifetime`} accent="var(--warning)" icon="bolt" />
      </div>

      <div className="split" style={{ gridTemplateColumns: "minmax(0,1fr) 340px" }}>
        <div className="col gap-5 rise-3">
          <div className="card" style={{ padding: "var(--pad-card)" }}>
            <div className="row between" style={{ marginBottom: 4 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>Reputation ladder</h3>
              {data.nextLevel && <span className="faint" style={{ fontSize: 12.5 }}>{Math.max(0, data.nextLevel.min - (data.completed || 0))} validations to {data.nextLevel.name}</span>}
            </div>
            <div className="lvl-meter" style={{ margin: "12px 0 18px" }}><i style={{ width: (data.levelPct || 0) + "%" }} /></div>
            <div style={{ display: "grid", gap: 4 }}>
              {(data.levels || []).map(l => {
                const state = l.n < (data.level || 1) ? "done" : l.n === (data.level || 1) ? "cur" : "up";
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
              {(data.expertise || []).map((e, i) => (
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
          <PayoutSetup client={vapi} vpa={data.payoutVpa}
            onUpdate={(payoutVpa) => setData(d => ({ ...d, payoutVpa }))} />
          <div className="card" style={{ padding: "var(--pad-card)" }}>
            <h3 style={{ margin: "0 0 14px", fontSize: 17, fontWeight: 800 }}>Verification badges</h3>
            <div style={{ display: "grid", gap: 10 }}>
              {(data.badges || []).map((b, i) => (
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
