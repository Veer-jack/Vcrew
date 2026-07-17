import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { Avatar, Btn, PasswordInput } from "../components/ui";
import PhoneSetup from "../components/PhoneSetup";

export default function Settings() {
  const { builder, setBuilder } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(builder?.name || "");
  const [designation, setDesignation] = useState(builder?.designation || "");
  const [org, setOrg] = useState(builder?.org || "");
  const [website, setWebsite] = useState(builder?.website || "");
  const [email, setEmail] = useState(builder?.email || "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [pwdCurrent, setPwdCurrent] = useState("");
  const [pwdNew, setPwdNew] = useState("");
  const [pwdConfirm, setPwdConfirm] = useState("");
  const [pwdBusy, setPwdBusy] = useState(false);
  const [pwdError, setPwdError] = useState("");
  const [pwdSuccess, setPwdSuccess] = useState("");

  const savePassword = async (e) => {
    e.preventDefault();
    setPwdError(""); setPwdSuccess("");
    if (pwdNew !== pwdConfirm) {
      return setPwdError("New passwords do not match.");
    }
    if (pwdNew.length < 8) {
      return setPwdError("New password must be at least 8 characters.");
    }
    setPwdBusy(true);
    try {
      await api.changePassword(pwdCurrent, pwdNew);
      setPwdSuccess("Password updated successfully.");
      setPwdCurrent(""); setPwdNew(""); setPwdConfirm("");
    } catch (err) {
      setPwdError(err.message || "Failed to change password.");
    } finally {
      setPwdBusy(false);
    }
  };

  const startEdit = () => {
    setName(builder?.name || ""); 
    setDesignation(builder?.designation || "");
    setOrg(builder?.org || ""); 
    setWebsite(builder?.website || "");
    setEmail(builder?.email || "");
    setError(""); setEditing(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const res = await api.updateProfile({ name, org, email, website, designation });
      setBuilder(res.builder);
      setEditing(false);
    } catch (err) {
      setError(err.message || "Couldn't save changes");
    } finally { setBusy(false); }
  };

  return (
    <div className="page rise">
      <div className="ph">
        <div><span className="eyebrow">Account</span><h1>Settings</h1><p className="lead">Manage your workspace, sign-in and security options.</p></div>
      </div>

      <div className="col gap-5" style={{ maxWidth: 640 }}>
        <div className="card" style={{ padding: "var(--pad-card)" }}>
          {!editing ? (
            <div className="row between" style={{ alignItems: "center" }}>
              <div className="row gap-4" style={{ alignItems: "center" }}>
                <Avatar name={builder?.name || ""} size={52} color={builder?.color} />
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>{builder?.name}</div>
                  <div className="faint" style={{ fontSize: 13 }}>{builder?.email} · {builder?.org}</div>
                </div>
              </div>
              <Btn variant="ghost" icon="edit" onClick={startEdit}>Edit profile</Btn>
            </div>
          ) : (
            <form onSubmit={save} className="col gap-4">
              {error && <div className="err-banner">{error}</div>}
              <div className="row gap-3 wrap">
                <div className="fld" style={{ flex: 1, minWidth: 180 }}>
                  <label>Your name</label>
                  <input className="fin" value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <div className="fld" style={{ flex: 1, minWidth: 180 }}>
                  <label>Designation</label>
                  <input className="fin" placeholder="e.g. Founder, Product Manager" value={designation} onChange={e => setDesignation(e.target.value)} />
                </div>
              </div>
              <div className="row gap-3 wrap">
                <div className="fld" style={{ flex: 1, minWidth: 180 }}>
                  <label>Workspace name</label>
                  <input className="fin" value={org} onChange={e => setOrg(e.target.value)} required />
                </div>
                <div className="fld" style={{ flex: 1, minWidth: 180 }}>
                  <label>Company Website</label>
                  <input className="fin" type="url" placeholder="https://..." value={website} onChange={e => setWebsite(e.target.value)} />
                </div>
              </div>
              <div className="fld">
                <label>Email</label>
                <input className="fin" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div className="row gap-2">
                <Btn variant="primary" type="submit" disabled={busy}>{busy ? "Saving…" : "Save changes"}</Btn>
                <Btn variant="quiet" type="button" onClick={() => { setEditing(false); setError(""); }}>Cancel</Btn>
              </div>
            </form>
          )}
        </div>

        <PhoneSetup client={api} phone={builder?.phone} phoneVerified={builder?.phoneVerified}
          onUpdate={(phone) => setBuilder(b => ({ ...b, phone, phoneVerified: !!phone }))} />

        {!builder?.oauthProvider && (
          <div className="card" style={{ padding: "var(--pad-card)" }}>
            <h2 style={{ fontSize: 18, marginBottom: 8 }}>Security</h2>
            <p className="faint mb-5">Change your password to keep your account secure.</p>
            <form onSubmit={savePassword} className="col gap-4">
              {pwdError && <div className="err-banner">{pwdError}</div>}
              {pwdSuccess && <div className="banner success">{pwdSuccess}</div>}
              <div className="fld">
                <label>Current Password</label>
                <PasswordInput className="fin" value={pwdCurrent} onChange={e => setPwdCurrent(e.target.value)} required />
              </div>
              <div className="row gap-3 wrap">
                <div className="fld" style={{ flex: 1, minWidth: 180 }}>
                  <label>New Password</label>
                  <PasswordInput className="fin" value={pwdNew} onChange={e => setPwdNew(e.target.value)} required />
                </div>
                <div className="fld" style={{ flex: 1, minWidth: 180 }}>
                  <label>Confirm New Password</label>
                  <PasswordInput className="fin" value={pwdConfirm} onChange={e => setPwdConfirm(e.target.value)} required />
                </div>
              </div>
              <div>
                <Btn variant="primary" type="submit" disabled={pwdBusy}>{pwdBusy ? "Saving…" : "Update password"}</Btn>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
