import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { Avatar, Btn } from "../components/ui";
import PhoneSetup from "../components/PhoneSetup";

export default function Settings() {
  const { builder, setBuilder } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(builder?.name || "");
  const [org, setOrg] = useState(builder?.org || "");
  const [email, setEmail] = useState(builder?.email || "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const startEdit = () => {
    setName(builder?.name || ""); setOrg(builder?.org || ""); setEmail(builder?.email || "");
    setError(""); setEditing(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const res = await api.updateProfile({ name, org, email });
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
                  <label>Workspace name</label>
                  <input className="fin" value={org} onChange={e => setOrg(e.target.value)} required />
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
      </div>
    </div>
  );
}
