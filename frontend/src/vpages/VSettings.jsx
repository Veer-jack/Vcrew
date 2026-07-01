import { useState } from "react";
import { useVAuth } from "../vcontext/VAuthContext";
import { vapi } from "../vapi/client";
import { Btn } from "../components/ui";
import Icon from "../components/Icon";

export default function VSettings() {
  const { validator, refresh, logout } = useVAuth();
  const [name, setName] = useState(validator?.name || "");
  const [email, setEmail] = useState(validator?.email || "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    setBusy(true); setError(""); setSaved(false);
    try {
      await vapi.patch("/v/profile", { name, email });
      await refresh();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.message || "Couldn't save changes");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page rise" style={{ maxWidth: 560 }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 24px" }}>Settings</h2>

      {/* Profile */}
      <div className="card" style={{ padding: 22, marginBottom: 16 }}>
        <div className="eyebrow" style={{ marginBottom: 16 }}>Profile</div>
        <div className="fld">
          <label>Full name</label>
          <input className="fin" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="fld">
          <label>Email address</label>
          <input className="fin" type="email" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        {error && <p style={{ color: "var(--danger)", fontSize: 13, margin: "4px 0 8px" }}>{error}</p>}
        {saved && <p style={{ color: "var(--success)", fontSize: 13, margin: "4px 0 8px" }}>✓ Changes saved</p>}
        <Btn variant="primary" onClick={save} disabled={busy}>
          {busy ? "Saving…" : "Save changes"}
        </Btn>
      </div>

      {/* Account */}
      <div className="card" style={{ padding: 22, marginBottom: 16 }}>
        <div className="eyebrow" style={{ marginBottom: 16 }}>Account</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Validator ID</div>
            <div style={{ fontSize: 12, color: "var(--text-faint)", fontFamily: "var(--mono)" }}>#{validator?.id}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0" }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Handle</div>
            <div style={{ fontSize: 12, color: "var(--text-faint)" }}>@{validator?.handle}</div>
          </div>
        </div>
      </div>

      {/* Danger zone */}
      <div className="card" style={{ padding: 22, border: "1px solid color-mix(in srgb, var(--danger) 25%, transparent)" }}>
        <div className="eyebrow" style={{ marginBottom: 16, color: "var(--danger)" }}>Sign out</div>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 14px" }}>You'll need to sign back in to access your missions and earnings.</p>
        <button className="btn btn-danger" onClick={logout} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <Icon name="logout" size={15} /> Sign out
        </button>
      </div>
    </div>
  );
}
