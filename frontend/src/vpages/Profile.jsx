import { useEffect, useState } from "react";
import Icon from "../components/Icon";
import PhoneSetup from "../components/PhoneSetup";
import PayoutSetup from "../components/PayoutSetup";
import { ScoreRing, StatTile, VAvatar, VStars } from "../vcomponents/vui";
import { vapi } from "../vapi/client";
import { useTranslation } from "../i18n/index.jsx";
import { levelName, levelPerks, badgeLabel, badgeDesc, expertiseLabel } from "../vi18n";
import { ROLES, INDUSTRIES, CountryStateFields, resolveOnboardingOther } from "./VOnboarding";

export default function Profile() {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [occupation, setOccupation] = useState("");
  const [industry, setIndustry] = useState("");
  const [location, setLocation] = useState("");
  const [address, setAddress] = useState({ line1: "", line2: "", city: "", cityOther: "", state: "", stateOther: "", postalCode: "", country: "", countryOther: "" });
  const [bio, setBio] = useState("");
  const [specialties, setSpecialties] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { vapi.profile().then(setData).catch(() => setData({})); }, []);
  if (!data) return <div className="page rise"><div className="muted">{t("actions.loading", null, "Loading…")}</div></div>;
  if (!data.name && Object.keys(data).length === 0) return <div className="page rise"><div className="muted">{t("profile.loadError", null, "Couldn't load profile. Please refresh.")}</div></div>;

  const startEdit = () => {
    setName(data.name); 
    setHandle((data.handle || "").replace(/^@/, "")); 
    setOccupation(data.occupation || "");
    setIndustry(data.industry || "");
    setLocation(data.location || "");
    setAddress({ ...{ line1: "", line2: "", city: "", cityOther: "", state: "", stateOther: "", postalCode: "", country: "", countryOther: "" }, ...(data.address || {}) });
    setBio(data.bio || "");
    setSpecialties([...(data.specialties || [])]);
    setTagInput(""); setError(""); setEditing(true);
  };

  const addTag = (e) => {
    e.preventDefault();
    const tag = tagInput.trim();
    if (tag && !specialties.includes(tag)) setSpecialties(s => [...s, tag]);
    setTagInput("");
  };

  const removeTag = (tag) => setSpecialties(s => s.filter(t => t !== tag));

  const save = async (e) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const resolvedAddress = resolveOnboardingOther(address, t);
      const res = await vapi.updateProfile({ name, handle, occupation, industry, location, bio, specialties, address: resolvedAddress });
      setData(d => ({ ...d, name: res.name, handle: res.handle, occupation: res.occupation, industry: res.industry, location: res.location, bio: res.bio, specialties: res.specialties, address: res.address }));
      setEditing(false);
    } catch (err) {
      setError(err.message || t("profile.saveError", null, "Couldn't save changes"));
    } finally { setBusy(false); }
  };

  const trustScore = data.completed > 0 ? Math.round(((data.rating || 5) / 5) * 50 + ((data.accuracy || 100) / 100) * 50) : 0;
  const avgExpertise = data.expertise?.length ? Math.round(data.expertise.reduce((acc, curr) => acc + curr.v, 0) / data.expertise.length) : 0;

  return (
    <div className="page">
      <div className="rise" style={{ marginBottom: 22 }}>
        <div className="card" style={{ padding: "var(--pad-card)" }}>
          {!editing ? (
            <>
            <div className="row between" style={{ alignItems: "flex-start" }}>
              <div className="row gap-4" style={{ alignItems: "flex-start" }}>
                <VAvatar name={data.name} size={84} ring />
                <div style={{ minWidth: 0 }}>
                  <div className="row gap-2 wrap" style={{ alignItems: "center" }}>
                    <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: "-.02em" }}>{data.name}</h2>
                    <span className="tag" style={{ background: "var(--accent-weak)", color: "var(--accent)" }}><Icon name="award" size={13} />{t("profile.lvlPrefix", null, "Lvl")} {data.level || 1} · {data.levelName ? levelName(t, data.level, data.levelName) : t("profile.trial", null, "Trial")}</span>
                    <span className="tag" style={{ background: data.role === "Validator" ? "var(--purple-weak)" : data.role === "Tester" ? "var(--success-weak)" : "var(--border-color)", color: data.role === "Validator" ? "var(--purple)" : data.role === "Tester" ? "var(--success)" : "var(--text-muted)" }}>
                      <Icon name={data.role === "Validator" ? "shield" : data.role === "Tester" ? "checkSquare" : "user"} size={13} />
                      {data.role || t("profile.user", null, "User")}
                    </span>
                  </div>
                  <p className="muted" style={{ margin: "5px 0 0", fontSize: 14 }}>
                    {data.handle} · {data.occupation || t("profile.unspecified", null, "Unspecified")}{data.industry ? ` · ${data.industry}` : ""}
                  </p>
                  {/* Was folded onto the same line as handle/occupation/
                      industry, crowding it -- its own line, matching how the
                      edit form already separates Industry from Specialties. */}
                  {(data.specialties || []).length > 0 && (
                    <p className="muted" style={{ margin: "3px 0 0", fontSize: 14 }}>{data.specialties.join(" · ")}</p>
                  )}
                  {data.location && <p className="muted" style={{ margin: "3px 0 0", fontSize: 13 }}><Icon name="mapPin" size={12} /> {data.location}</p>}
                </div>
              </div>
              <button className="btn btn-ghost" onClick={startEdit}><Icon name="edit" />{t("actions.editProfile", null, "Edit profile")}</button>
            </div>
            <div style={{ marginTop: 14 }}>
              {data.bio && <p style={{ margin: 0, fontSize: 14, lineHeight: 1.4 }}>{data.bio}</p>}
              <div className="row gap-3 wrap" style={{ marginTop: 12 }}>
                <span className="pill"><Icon name="star" size={14} style={{ color: "var(--warning)" }} />{data.rating || 0} · {data.ratingCount || 0} {t("profile.reviewsSuffix", null, "reviews")}</span>
                <span className="pill"><Icon name="shield" size={14} style={{ color: "var(--success)" }} />{data.accuracy || 0}{t("profile.accuracySuffix", null, "% accuracy")}</span>
                <span className="pill"><Icon name="flame" size={14} style={{ color: "var(--vt-proto)" }} />{data.streak || 0}{t("profile.streakSuffix", null, "-day streak")}</span>
              </div>
            </div>

            <div style={{ borderTop: "1px solid var(--border)", margin: "16px 0" }} />
            <PhoneSetup bare client={vapi} phone={data.phone} phoneVerified={data.phoneVerified}
              onUpdate={(phone) => setData(d => ({ ...d, phone, phoneVerified: !!phone }))} />
            </>
          ) : (
            <form onSubmit={save} className="col gap-4">
              {error && <div className="err-banner">{error}</div>}
              <div className="row gap-3 wrap">
                <div className="fld" style={{ flex: 1, minWidth: 180 }}>
                  <label>{t("profile.name", null, "Name")}</label>
                  <input className="fin" value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <div className="fld" style={{ flex: 1, minWidth: 180 }}>
                  <label>{t("profile.handle", null, "Handle")}</label>
                  <div className="inw has-pre"><span className="pre">@</span><input className="fin" value={handle} onChange={e => setHandle(e.target.value.replace(/^@/, ""))} placeholder={t("profile.yourhandle", null, "yourhandle")} /></div>
                </div>
              </div>
              <div className="row gap-3 wrap">
                <div className="fld" style={{ flex: 1, minWidth: 180 }}>
                  <label>{t("profile.occupation", null, "Occupation")}</label>
                  <select className="fin" style={{ backgroundColor: "var(--panel)" }} value={occupation} onChange={e => setOccupation(e.target.value)}>
                    <option value="">{t("profile.selectOccupation", null, "Select occupation")}</option>
                    {/* A value saved before this became a fixed list (free text back then)
                        won't match any option below -- keep it selectable instead of the
                        select silently falling back to blank and losing it on save. */}
                    {occupation && !ROLES.includes(occupation) && <option value={occupation}>{occupation}</option>}
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="fld" style={{ flex: 1, minWidth: 180 }}>
                  <label>{t("profile.industry", null, "Industry")}</label>
                  <select className="fin" style={{ backgroundColor: "var(--panel)" }} value={industry} onChange={e => setIndustry(e.target.value)}>
                    <option value="">{t("profile.selectIndustry", null, "Select industry")}</option>
                    {industry && !INDUSTRIES.includes(industry) && <option value={industry}>{industry}</option>}
                    {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
              </div>
              <div className="row gap-3 wrap">
                <div className="fld" style={{ flex: 1, minWidth: 180 }}>
                  <label>{t("profile.location", null, "Location (City)")}</label>
                  <input className="fin" value={location} onChange={e => setLocation(e.target.value)} placeholder={t("profile.egBengaluru", null, "e.g. Bengaluru")} />
                </div>
              </div>
              <div className="fld">
                <label>{t("profile.shippingAddress", null, "Shipping address")} <span className="opt">{t("profile.optionalShipping", null, "optional — needed only for Sample Distribution missions")}</span></label>
                <div className="col gap-3" style={{ marginTop: 6 }}>
                  <input className="fin" value={address.line1} onChange={e => setAddress(a => ({ ...a, line1: e.target.value }))} placeholder={t("profile.address1", null, "Address line 1")} />
                  <input className="fin" value={address.line2} onChange={e => setAddress(a => ({ ...a, line2: e.target.value }))} placeholder={t("profile.address2", null, "Address line 2 (optional)")} />
                  {/* State first, then Country -- picking a state directly
                      resolves its country automatically; picking a country
                      first instead scopes the state dropdown to it -- shown
                      Country-first here per request, State can still be
                      picked on its own further down if Country is left
                      blank. City follows, fetched from the backend once
                      both are known (routes/geo.js) -- falls back to free
                      text on its own if that state isn't covered, same as
                      State does when a country has no known regions.
                      Wrapped in a flex-wrap row (.addr-row, see theme.css)
                      so these pair up 2-per-row like the rest of the form
                      instead of each stacking full-width. */}
                  <div className="row gap-3 wrap addr-row">
                    <CountryStateFields
                      withCity
                      d={{ country: address.country, countryOther: address.countryOther, state: address.state, stateOther: address.stateOther, city: address.city, cityOther: address.cityOther }}
                      set={(key, value) => setAddress(a => ({ ...a, [key]: value }))}
                    />
                    <div className="fld" style={{ flex: "1 1 180px", minWidth: 180 }}>
                      <input className="fin" value={address.postalCode} onChange={e => setAddress(a => ({ ...a, postalCode: e.target.value }))} placeholder={t("profile.postalCode", null, "Postal code")} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="fld">
                <label>{t("profile.bio", null, "Bio")}</label>
                <textarea className="fin" rows={3} value={bio} onChange={e => setBio(e.target.value)} placeholder={t("profile.bioPlaceholder", null, "A short bio about yourself...")} />
                {/* No live count anywhere before this -- easy to type way past
                    a reasonable length (see the repeated-text bug this was
                    reported alongside) with no feedback at all. */}
                <p className="fhint">{t("profile.bioWordCount", { count: bio.trim() ? bio.trim().split(/\s+/).length : 0 }, `${bio.trim() ? bio.trim().split(/\s+/).length : 0} words`)}</p>
              </div>
              <div className="fld">
                <label>{t("profile.specialties", null, "Specialties")}</label>
                <div className="row gap-2 wrap" style={{ marginBottom: specialties.length ? 8 : 0 }}>
                  {specialties.map(tag => (
                    <span key={tag} className="pill" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)} style={{ display: "flex", border: "none", background: "none", cursor: "pointer", padding: 0, color: "var(--text-muted)" }}><Icon name="x" size={12} /></button>
                    </span>
                  ))}
                </div>
                <div className="row gap-2">
                  <input className="fin" value={tagInput} onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") addTag(e); }} placeholder={t("profile.addSpecialty", null, "Add a specialty and press Enter")} />
                  <button type="button" className="btn btn-quiet" onClick={addTag}>{t("actions.add", null, "Add")}</button>
                </div>
              </div>
              <div className="row gap-2">
                <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? t("actions.saving", null, "Saving…") : t("actions.saveChanges", null, "Save changes")}</button>
                <button type="button" className="btn btn-quiet" onClick={() => { setEditing(false); setError(""); }}>{t("actions.cancel", null, "Cancel")}</button>
              </div>
            </form>
          )}
        </div>
      </div>

      <div className="rise-2" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 22 }}>
        <div className="card" style={{ padding: "var(--pad-card)", display: "flex", alignItems: "center", gap: 16 }}>
          <ScoreRing value={trustScore} size={60} />
          <div style={{ minWidth: 0 }}><span className="eyebrow">{t("profile.trustScore", null, "Trust Score")}</span><div className="faint" style={{ fontSize: 12, marginTop: 4 }}>{t("profile.top5", null, "Top 5% on platform")}</div></div>
        </div>
        <div className="card" style={{ padding: "var(--pad-card)", display: "flex", alignItems: "center", gap: 16 }}>
          <ScoreRing value={avgExpertise} size={60} />
          <div style={{ minWidth: 0 }}><span className="eyebrow">{t("profile.expertise", null, "Expertise")}</span><div className="faint" style={{ fontSize: 12, marginTop: 4 }}>{t("profile.across", null, "Across")} {(data.expertise || []).length} {t("profile.niches", null, "niches")}</div></div>
        </div>
        <StatTile label={t("profile.missionsCompleted", null, "Missions completed")} value={data.completed || 0} sub={`₹${(data.lifetime || 0).toLocaleString("en-IN")} ${t("profile.lifetime", null, "lifetime")}`} accent="var(--warning)" icon="bolt" />
      </div>

      {/* Private logistics data, not identity -- only needed for Sample
          Distribution missions, so it gets its own small card instead of
          crowding the public-facing overview card above. Hidden entirely
          until something's actually been saved. */}
      {(data.address?.line1 || data.address?.city || data.address?.country) && (
        <div className="card rise-2" style={{ padding: "var(--pad-card)", marginBottom: 22 }}>
          <span className="eyebrow">{t("profile.shippingAddress", null, "Shipping address")}</span>
          <p className="faint" style={{ fontSize: 14, margin: "8px 0 0", lineHeight: 1.6 }}>
            {[data.address.line1, data.address.line2].filter(Boolean).join(", ")}
            {(data.address.line1 || data.address.line2) && (data.address.city || data.address.state || data.address.postalCode || data.address.country) && <br />}
            {[data.address.city, data.address.state, data.address.postalCode].filter(Boolean).join(", ")}
            {(data.address.city || data.address.state || data.address.postalCode) && data.address.country && ", "}
            {data.address.country}
          </p>
        </div>
      )}

      <div className="col gap-5">
        <div className="card rise-3" style={{ padding: "var(--pad-card)" }}>
          <h3 style={{ margin: "0 0 14px", fontSize: 17, fontWeight: 800 }}>{t("profile.expertiseScores", null, "Expertise scores")}</h3>
          <div style={{ display: "grid", gap: 12 }}>
            {(data.expertise || []).map((e, i) => (
              <div key={i} className="row gap-3" style={{ fontSize: 13.5 }}>
                <span style={{ width: 130, flex: "none", fontWeight: 600 }}>{expertiseLabel(t, e.l)}</span>
                <span style={{ flex: 1, height: 9, borderRadius: 20, background: "var(--panel-inset)", overflow: "hidden" }}><i style={{ display: "block", height: "100%", width: e.v + "%", borderRadius: 20, background: "linear-gradient(90deg, var(--accent), var(--accent-2))" }} /></span>
                <span className="mono" style={{ width: 36, textAlign: "right", fontWeight: 600, fontSize: 12.5 }}>{e.v}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="split" style={{ gridTemplateColumns: "minmax(0,1fr) 340px" }}>
          <div className="col gap-5 rise-3">
            <div className="card" style={{ padding: "var(--pad-card)" }}>
              <div className="row between" style={{ marginBottom: 4 }}>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>{t("profile.reputationLadder", null, "Reputation ladder")}</h3>
                {data.nextLevel && <span className="faint" style={{ fontSize: 12.5 }}>{Math.max(0, data.nextLevel.min - (data.completed || 0))} {t("profile.validationsTo", null, "validations to")} {levelName(t, data.nextLevel.n, data.nextLevel.name)}</span>}
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
                      <div style={{ flex: 1 }}><b style={{ fontSize: 14 }}>{levelName(t, l.n, l.name)}</b> <span className="faint" style={{ fontSize: 12.5 }}>· {levelPerks(t, l.n, l.perks)}</span></div>
                      {state === "cur" && <span className="tag" style={{ background: "var(--accent-weak)", color: "var(--accent)" }}>{t("profile.you", null, "You")}</span>}
                      <span className="mono faint" style={{ fontSize: 11.5 }}>{l.min}+</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="col gap-5 rise-3">
            <PayoutSetup client={vapi} vpa={data.payoutVpa}
              onUpdate={(payoutVpa) => setData(d => ({ ...d, payoutVpa }))} />
            <div className="card" style={{ padding: "var(--pad-card)" }}>
              <h3 style={{ margin: "0 0 14px", fontSize: 17, fontWeight: 800 }}>{t("profile.verificationBadges", null, "Verification badges")}</h3>
              <div style={{ display: "grid", gap: 10 }}>
                {(data.badges || []).map((b, i) => (
                  <div key={i} className="row gap-3" style={{ opacity: b.got ? 1 : .5 }}>
                    <span style={{ width: 38, height: 38, borderRadius: 11, flex: "none", display: "grid", placeItems: "center",
                      background: b.got ? "var(--success-weak)" : "var(--panel-inset)", color: b.got ? "var(--success)" : "var(--text-faint)" }}>
                      <Icon name={b.icon} size={18} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 700, fontSize: 13.5 }}>{badgeLabel(t, b.label)}</div><div className="faint" style={{ fontSize: 12 }}>{badgeDesc(t, b.label, b.desc)}</div></div>
                    {b.got && <Icon name="check" size={16} style={{ color: "var(--success)", flex: "none" }} />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
