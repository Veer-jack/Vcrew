import Icon from "./Icon";

export function Field({ label, optional, span, children }) {
  return (
    <div className={`fld${span ? " fld-span" : ""}`}>
      <label>{label} {optional && <span className="faint">(optional)</span>}</label>
      {children}
    </div>
  );
}

export function TextInput({ value, onChange, placeholder, type = "text" }) {
  return <input className="fin" type={type} value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />;
}

export function Textarea({ value, onChange, placeholder }) {
  return <textarea className="fin" rows={3} value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />;
}

export function SelectInput({ value, onChange, options, placeholder }) {
  return (
    <select className="fin" value={value || ""} onChange={(e) => onChange(e.target.value)}>
      <option value="" disabled>{placeholder || "Select…"}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

export function FSection({ label, count }) {
  return (
    <div className="row between" style={{ margin: "18px 0 10px" }}>
      <div className="eyebrow" style={{ fontSize: 12 }}>{label}</div>
      {count && <span className="faint" style={{ fontSize: 12 }}>{count}</span>}
    </div>
  );
}

// Single or multi-select pill chips, used for plain string option lists.
export function Chips({ options, value, onChange, multi = true }) {
  const sel = value || (multi ? [] : "");
  const isOn = (o) => (multi ? sel.includes(o) : sel === o);
  const toggle = (o) => {
    if (!multi) { onChange(sel === o ? "" : o); return; }
    onChange(sel.includes(o) ? sel.filter((x) => x !== o) : [...sel, o]);
  };
  return (
    <div className="row gap-2" style={{ flexWrap: "wrap" }}>
      {options.map((o) => (
        <button key={o} type="button" className={`pill chip-btn${isOn(o) ? " chip-on" : ""}`} onClick={() => toggle(o)}>
          {o}
        </button>
      ))}
    </div>
  );
}

// Card-style options with title + description, single or multi-select.
export function SelCards({ options, value, onChange, multi = false, cols = 2 }) {
  const sel = value || (multi ? [] : "");
  const isOn = (v) => (multi ? sel.includes(v) : sel === v);
  const toggle = (v) => {
    if (!multi) { onChange(v); return; }
    onChange(sel.includes(v) ? sel.filter((x) => x !== v) : [...sel, v]);
  };
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 10 }} className="selcard-grid">
      {options.map((o) => (
        <button key={o.v} type="button" className={`card selcard${isOn(o.v) ? " selcard-on" : ""}`}
          style={{ textAlign: "left", padding: 14, cursor: "pointer" }} onClick={() => toggle(o.v)}>
          <b style={{ fontSize: 13.5 }}>{o.t}</b>
          <p className="faint" style={{ fontSize: 12, margin: "3px 0 0" }}>{o.d}</p>
        </button>
      ))}
    </div>
  );
}

export function ReachMeter({ reach, base }) {
  const pct = Math.max(4, Math.min(100, Math.round((reach / base) * 100)));
  return (
    <div className="card" style={{ padding: 16, marginBottom: 6 }}>
      <div className="row between" style={{ alignItems: "center" }}>
        <div className="row gap-2" style={{ alignItems: "center" }}>
          <Icon name="users" size={16} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, fontFamily: "var(--mono)" }}>{reach.toLocaleString("en-US")}</div>
            <div className="faint" style={{ fontSize: 11.5 }}>people match right now</div>
          </div>
        </div>
      </div>
      <div style={{ height: 6, borderRadius: 6, background: "var(--border)", marginTop: 10, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: "var(--accent)", borderRadius: 6, transition: "width .25s" }} />
      </div>
    </div>
  );
}

export function LocationFields({ region, d, set, withCity }) {
  return (
    <div className="fgrid c2">
      <Field label="Country">
        <TextInput value={d.country} onChange={(v) => set("country", v)} placeholder={region === "india" ? "India" : "United States"} />
      </Field>
      <Field label="State / Region" optional>
        <TextInput value={d.state} onChange={(v) => set("state", v)} placeholder="Karnataka" />
      </Field>
      {withCity && (
        <Field label="City" optional>
          <TextInput value={d.district} onChange={(v) => set("district", v)} placeholder="Bengaluru" />
        </Field>
      )}
    </div>
  );
}

export function DemographicsRow({ d, set }) {
  return (
    <div className="fgrid c2">
      <Field label="Age">
        <Chips options={["18–24", "25–34", "35–44", "45–54", "55+"]} value={d.ageBands} onChange={(v) => set("ageBands", v)} />
      </Field>
      <Field label="Gender">
        <Chips options={["Any", "Female", "Male", "Non-binary"]} value={d.genders} onChange={(v) => set("genders", v)} />
      </Field>
    </div>
  );
}

export function ProfileChips({ d, set, region, show = {}, occOptions }) {
  return (
    <div className="col gap-3">
      {show.occupation && (
        <Field label="Occupation">
          <Chips options={occOptions || ["Student", "Working Professional", "Entrepreneur", "Homemaker", "Retired", "Any"]} value={d.occupations} onChange={(v) => set("occupations", v)} />
        </Field>
      )}
      {show.education && (
        <Field label="Education">
          <Chips options={["High school", "Diploma", "Undergraduate", "Postgraduate", "PhD / Doctorate"]} value={d.educations} onChange={(v) => set("educations", v)} />
        </Field>
      )}
      {show.income && (
        <Field label="Income band" optional>
          <Chips options={region === "india" ? ["< ₹3L", "₹3–6L", "₹6–12L", "₹12–25L", "₹25L–1Cr", "₹1Cr+"] : ["< $25k", "$25–50k", "$50–100k", "$100–200k", "$200k+"]} value={d.incomeBands} onChange={(v) => set("incomeBands", v)} />
        </Field>
      )}
      {show.languages && (
        <Field label="Languages" optional>
          <Chips options={region === "india" ? ["Hindi", "English", "Tamil", "Telugu", "Kannada", "Bengali", "Marathi", "Gujarati", "Malayalam", "Punjabi"] : ["English", "Spanish", "French", "German", "Mandarin", "Arabic", "Portuguese", "Japanese"]} value={d.languages} onChange={(v) => set("languages", v)} />
        </Field>
      )}
      {show.interests && (
        <Field label="Interests" optional>
          <Chips options={["AI", "Startups", "Fitness", "Healthcare", "Education", "Finance", "Gaming", "Parenting", "Travel", "Fashion", "Food", "Sustainability"]} value={d.interests} onChange={(v) => set("interests", v)} />
        </Field>
      )}
    </div>
  );
}

// "Verify" steps store a claim for manual review — there is no automated
// DNS/domain-ownership or document verification pipeline today, so this
// records intent rather than pretending to confirm it instantly.
export function VerifyRow({ icon, title, desc, placeholder, value, onChange, verified, onVerify, optional }) {
  return (
    <div className="card" style={{ padding: 14, marginBottom: 10, display: "flex", gap: 12, alignItems: "flex-start" }}>
      <span className="intent-ic" style={{ background: "var(--accent-weak)", color: "var(--accent)", flex: "none" }}>
        <Icon name={icon} size={16} />
      </span>
      <div style={{ flex: 1 }}>
        <div className="row between" style={{ alignItems: "center" }}>
          <b style={{ fontSize: 13.5 }}>{title} {optional && <span className="faint" style={{ fontWeight: 400 }}>(optional)</span>}</b>
          {verified && <span className="pill" style={{ color: "var(--success)", fontSize: 11 }}><Icon name="check" size={12} /> Submitted</span>}
        </div>
        <p className="faint" style={{ fontSize: 12, margin: "2px 0 8px" }}>{desc}</p>
        {!verified && (
          <div className="row gap-2">
            <input className="fin" style={{ flex: 1 }} value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
            <button type="button" className="btn btn-ghost" style={{ fontSize: 12.5 }} disabled={!value} onClick={onVerify}>Submit</button>
          </div>
        )}
      </div>
    </div>
  );
}

export function PersonalFields({ d, set, roleField }) {
  return (
    <div className="fgrid c2">
      <Field label="Full name">
        <TextInput value={d.fullName} onChange={(v) => set("fullName", v)} placeholder="Aarav Mehta" />
      </Field>
      <Field label="Email">
        <TextInput type="email" value={d.email} onChange={(v) => set("email", v)} placeholder="you@company.com" />
      </Field>
      <Field label="Mobile number">
        <TextInput value={d.mobile} onChange={(v) => set("mobile", v)} placeholder="+91 98765 43210" />
      </Field>
      <Field label={roleField ? roleField.label : "Job title"}>
        {roleField?.free
          ? <TextInput value={d[roleField.key]} onChange={(v) => set(roleField.key, v)} placeholder={roleField.placeholder} />
          : <SelectInput value={d.designation} onChange={(v) => set("designation", v)} options={["Founder & CEO", "Co-founder", "Product Manager", "Head of Product", "Growth / Marketing", "Design Lead", "Engineering Lead", "Operations", "Other"]} placeholder="Select role" />}
      </Field>
      <Field label="Password" span>
        <TextInput type="password" value={d.password} onChange={(v) => set("password", v)} placeholder="At least 8 characters" />
      </Field>
    </div>
  );
}
