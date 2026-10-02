const fs = require('fs');
let code = fs.readFileSync('frontend/src/vpages/VOnboarding.jsx', 'utf8');

// The lines we want to replace start at: {step === 1 && (<><h2 style={{ fontSize: 22, fontWeight: 800
// and end at: {error && step === 3 && <div className="err-banner" style={{ marginTop: 16 }}>{error}</div>}

const startIndex = code.indexOf('{step === 1 && (<><h2');
const endIndex = code.indexOf('</form>', startIndex);

if (startIndex === -1 || endIndex === -1) {
  console.log("Could not find boundaries");
  process.exit(1);
}

const replacement = `{step === 1 && (
        <>
          <h2 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 12px", color: "var(--text)" }}>Verify your experience</h2>
          <p style={{ color: "var(--text-muted)", fontSize: 15, margin: "0 0 40px", lineHeight: 1.5 }}>
            Add at least one — it's the single biggest boost to your profile strength and the opportunities you'll be offered.
          </p>

          <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text)", marginBottom: 16 }}>Add any one</div>
          
          <div style={{ border: "1px solid var(--border)", borderRadius: 12, padding: "20px 24px", marginBottom: 24, background: "#fff", display: "flex", flexDirection: "column", gap: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text)" }}>LinkedIn profile</div>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div className="inw has-pre" style={{ flex: 1, background: "var(--panel-inset)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
                <span className="pre"><Icon name="link" size={16} style={{ color: "var(--text-faint)" }} /></span>
                <input className="fin" value={d.linkedin_url} onChange={e => set("linkedin_url", e.target.value)} placeholder="linkedin.com/in/..." style={{ background: "transparent", border: "none" }} />
              </div>
              <button type="button" className="btn btn-quiet" style={{ padding: "0 16px", height: 42, background: "transparent", border: "1px solid var(--border)", borderRadius: 8, fontWeight: 700, color: "var(--text)", whiteSpace: "nowrap" }}>
                Submit for review
              </button>
            </div>
            <div style={{ fontSize: 13, color: "var(--text-faint)", marginTop: 4 }}>We confirm your experience from your public profile.</div>
          </div>

          <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text)", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            Resume / CV <span style={{ fontSize: 13, color: "var(--text-faint)", fontWeight: 500 }}>optional</span>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 16, border: "2px dashed #e2e8f0", borderRadius: 12, padding: "24px", cursor: "pointer", background: "#f8fafc", marginBottom: 40, transition: "background 0.2s" }}>
            <input type="file" accept=".pdf,.doc,.docx" style={{ display: "none" }} onChange={e => pickResume(e.target.files[0])} />
            <div style={{ width: 44, height: 44, borderRadius: 8, background: "#fff", display: "grid", placeItems: "center", flexShrink: 0, boxShadow: "0 1px 3px rgba(0,0,0,0.05)", border: "1px solid var(--border)" }}>
              <Icon name="fileText" size={20} style={{ color: "var(--text-faint)" }} />
            </div>
            {resumeUploading ? (
              <div style={{ flex: 1, fontSize: 15, fontWeight: 700 }}>Uploading…</div>
            ) : resumeUploaded ? (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--success)" }}>{resumeFile?.name || d.resume_filename}</div>
                <button type="button" className="btn btn-quiet" onClick={(e) => { e.preventDefault(); setResumeFile(null); setResumeUploaded(false); set("resume_filename", ""); }}>Remove</button>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text)", marginBottom: 4 }}>Drop a file or click to upload</div>
                <div style={{ fontSize: 13, color: "var(--text-faint)" }}>PDF or DOCX up to 10 MB</div>
              </div>
            )}
          </label>
          {resumeError && <div className="err-banner" style={{ marginBottom: 20 }}>{resumeError}</div>}

          <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text)", marginBottom: 16 }}>Optional links</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text)", marginBottom: 10, display: "flex", gap: 8 }}>
                Portfolio website <span style={{ color: "var(--text-faint)", fontWeight: 500 }}>optional</span>
              </div>
              <div className="inw has-pre" style={{ background: "var(--panel-inset)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
                <span className="pre"><Icon name="globe" size={16} style={{ color: "var(--text-faint)" }} /></span>
                <input className="fin" value={d.portfolio_url} onChange={e => set("portfolio_url", e.target.value)} placeholder="yoursite.com" style={{ background: "transparent", border: "none" }} />
              </div>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text)", marginBottom: 10, display: "flex", gap: 8 }}>
                GitHub profile <span style={{ color: "var(--text-faint)", fontWeight: 500 }}>optional</span>
              </div>
              <div className="inw has-pre" style={{ background: "var(--panel-inset)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
                <span className="pre"><span style={{ fontWeight: 600, fontSize: 15, color: "var(--text-faint)" }}>#</span></span>
                <input className="fin" value={d.github_url} onChange={e => set("github_url", e.target.value)} placeholder="github.com/you" style={{ background: "transparent", border: "none" }} />
              </div>
            </div>
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px", background: "#f8fafc", border: "1px solid var(--border)", borderRadius: 12, color: "var(--text-muted)", fontSize: 14, lineHeight: 1.5 }}>
            <Icon name="info" size={20} style={{ color: "var(--text-faint)", flexShrink: 0 }} />
            <span>Add your LinkedIn or a resume to continue — this is how companies trust your test results.</span>
          </div>
          
          {showErrors && !((d.linkedin_url || "").trim() || resumeUploaded) && (
            <div style={{ color: "var(--danger)", fontSize: 13, marginTop: 16, fontWeight: 600 }} className="fld-invalid">
              Please add your LinkedIn profile or upload a resume to continue.
            </div>
          )}
        </>
      )}
      {step === 2 && (
        <>
          <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 8px" }}>Testing experience</h2>
          <Field label="Describe your testing experience" required invalid={showErrors && wordCount < 30} hint={`${wordCount} words (min 30)`}><textarea className="fin" rows={5} value={d.testing_bio} onChange={e => set("testing_bio", e.target.value)} placeholder="Describe products tested, bugs found, and what makes your feedback valuable." /></Field>
          <FilterGroup title="Testing domains" options={TESTER_DOMAINS.filter(o => o !== "Other")} {...filterGroupAdapter(d.domains, "domains", set)} otherEntries={d.domainsOther} trFilterLabel={(_, v) => optLabel(t, "testerDomains")(v, TESTER_DOMAINS.indexOf(v))} initialExpanded />
          <FilterGroup title="Certifications" options={CERT.filter(o => o !== "Other")} {...filterGroupAdapter(d.certifications, "certifications", set)} otherEntries={d.certificationsOther} trFilterLabel={(_, v) => optLabel(t, "certifications")(v, CERT.indexOf(v))} initialExpanded />
        </>
      )}
      {step === 3 && (
        <>
          <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 22px" }}>Professional background</h2>
          <Field label="Role" required invalid={showErrors && !(d.occupation || d.role)}><Chips options={ROLES} value={d.occupation || d.role} onChange={v => set("occupation", v)} multi={false} getLabel={optLabel(t, "roles")} /></Field>
          {(d.occupation || d.role) === "Other" && <Field label="Your role" required invalid={showErrors && !d.occupationOther}><input className="fin" value={d.occupationOther || ""} onChange={e => set("occupationOther", e.target.value)} placeholder="Type your role" /></Field>}
          <Field label="Experience" required invalid={showErrors && !d.experience}><Chips options={EXP} value={d.experience} onChange={v => set("experience", v)} multi={false} getLabel={optLabel(t, "experience")} /></Field>
          <Field label="Current company" required invalid={showErrors && !(d.company || "").trim()} hint="Required for verification"><input className="fin" value={d.company} onChange={e => set("company", e.target.value)} placeholder="e.g. Infosys, Freelance QA" /></Field>
          <div className={showErrors && d.industry.length === 0 ? "fld-invalid" : ""}><FilterGroup title="Industry" required options={INDUSTRIES.filter(o => o !== "Other")} {...filterGroupAdapter(d.industry, "industry", set)} otherEntries={d.industryOther} trFilterLabel={(_, v) => optLabel(t, "industries")(v, INDUSTRIES.indexOf(v))} initialExpanded /></div>
          {showErrors && d.industry.length === 0 && <p style={{ color: "var(--danger)", fontSize: 12, marginTop: 4, fontWeight: 500 }}>Please select at least one industry.</p>}
          <Field label="Tools" action={<SelectAllToggle options={TECH_TOOLS} value={d.tools} onChange={v => set("tools", v)} />}><Chips options={TECH_TOOLS} value={d.tools} onChange={v => set("tools", v)} getLabel={optLabel(t, "techTools")} /></Field>
        </>
      )}
      {step === 4 && (
        <>
          <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 22px" }}>Devices</h2>
          <Field label="Devices" required invalid={showErrors && d.devices.length === 0} action={<SelectAllToggle options={DEVICES} value={d.devices} onChange={v => set("devices", v)} />}><Chips options={DEVICES} value={d.devices} onChange={v => set("devices", v)} getLabel={optLabel(t, "devices")} /></Field>
        </>
      )}
      {step === 5 && (
        <>
          <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 22px" }}>Interests</h2>
          <Field label="Lifestyle interests" action={<SelectAllToggle options={LIFESTYLE} value={d.lifestyle} onChange={v => set("lifestyle", v)} />}><Chips options={LIFESTYLE} value={d.lifestyle} onChange={v => set("lifestyle", v)} getLabel={optLabel(t, "lifestyle")} /></Field>
          <Field label="Food preference"><Chips options={FOOD_PREF} value={d.food_pref} onChange={v => set("food_pref", v)} multi={false} getLabel={optLabel(t, "foodPref")} /></Field>
        </>
      )}
      {step === 6 && (
        <>
          <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 8px" }}>Rewards & Declaration</h2>
          <p style={{ color: "var(--text-muted)", fontSize: 14, margin: "0 0 22px" }}>Admin will review within 72 hours. Until verified you have Validator access.</p>
          <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            {[[t("vOnboarding.declaration.name", null, "Name"),d.name],[t("vOnboarding.fields.handle", null, "Handle"),"@"+d.handle],[t("vOnboarding.fields.role", null, "Role"),d.occupation || d.role],[t("vOnboarding.declaration.linkedin", null, "LinkedIn"),d.linkedin_url],[t("vOnboarding.declaration.resume", null, "Resume"),d.resume_filename]].map(([k,v]) => (<div key={k} style={{ display: "flex", gap: 10, padding: "8px 0", borderTop: "1px solid var(--border)", fontSize: 13.5 }}><span style={{ color: "var(--text-faint)", width: 80, flexShrink: 0 }}>{k}</span><span style={{ fontWeight: 600, wordBreak: "break-all" }}>{v||"-"}</span></div>))}
          </div>
          <div className={showErrors && !d.agreed ? "fld-invalid" : ""} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "14px 16px", background: "var(--panel)", border: showErrors && !d.agreed ? "1px solid var(--danger)" : "1px solid var(--border)", borderRadius: "var(--radius)", cursor: "pointer" }} onClick={() => set("agreed", !d.agreed)}>
            <div style={{ width: 22, height: 22, borderRadius: 7, flexShrink: 0, display: "grid", placeItems: "center", background: d.agreed ? "var(--warning)" : "var(--panel)", border: "1.5px solid " + (d.agreed ? "var(--warning)" : "var(--border-strong)") }}>{d.agreed && <Icon name="check" size={13} style={{ color: "#fff" }} />}</div>
            <div>
              <div style={{ fontSize: 13, color: showErrors && !d.agreed ? "var(--danger)" : "var(--text-muted)" }}>I confirm all information is accurate. False information may result in permanent removal.</div>
              {showErrors && !d.agreed && <div style={{ color: "var(--danger)", fontSize: 12, marginTop: 4, fontWeight: 500 }}>Please agree to the declaration.</div>}
            </div>
          </div>
          {error && step === 6 && <div className="err-banner" style={{ marginTop: 16 }}>{error}</div>}
        </>
      )}
`;

code = code.substring(0, startIndex) + replacement + '\n      ' + code.substring(endIndex);
fs.writeFileSync('frontend/src/vpages/VOnboarding.jsx', code);
console.log("Replaced successfully!");
