import { useState } from "react";
import { useVAuth } from "../vcontext/VAuthContext";
import { vapi } from "../vapi/client";
import { Btn, PasswordInput } from "../components/ui";
import Icon from "../components/Icon";

export default function VSettings() {
  const { validator, refresh, logout } = useVAuth();
  const [name, setName] = useState(validator?.name || "");
  const [email, setEmail] = useState(validator?.email || "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

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
      await vapi.changePassword(pwdCurrent, pwdNew);
      setPwdSuccess("Password updated successfully.");
      setPwdCurrent(""); setPwdNew(""); setPwdConfirm("");
    } catch (err) {
      setPwdError(err.message || "Failed to change password.");
    } finally {
      setPwdBusy(false);
    }
  };

  const save = async () => {
    setBusy(true); setError(""); setSaved(false);
    try {
      await vapi.updateProfile({ name, email });
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
    <div className="page rise">
      <div className="ph" style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Settings</h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: 24, maxWidth: 1000 }}>
        {/* Left Column */}
        <div className="col gap-4">
          {/* Profile Card */}
          <div className="card" style={{ padding: 24 }}>
            <div className="row gap-3" style={{ alignItems: "center", marginBottom: 24 }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary)" }}>
                <Icon name="user" size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Profile Information</h3>
                <p className="faint" style={{ margin: "4px 0 0", fontSize: 13 }}>Update your personal details and email address.</p>
              </div>
            </div>
            
            <div className="col gap-4">
              <div className="fld">
                <label style={{ fontSize: 13, fontWeight: 600 }}>Full Name</label>
                <input className="fin" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="fld">
                <label style={{ fontSize: 13, fontWeight: 600 }}>Email Address</label>
                <input className="fin" type="email" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              {error && <p style={{ color: "var(--danger)", fontSize: 13, margin: "4px 0 8px" }}>{error}</p>}
              {saved && <p style={{ color: "var(--success)", fontSize: 13, margin: "4px 0 8px" }}>✓ Changes saved</p>}
              <div>
                <Btn variant="primary" onClick={save} disabled={busy}>
                  {busy ? "Saving…" : "Save Changes"}
                </Btn>
              </div>
            </div>
          </div>

          {/* Account Card */}
          <div className="card" style={{ padding: 24 }}>
            <div className="row gap-3" style={{ alignItems: "center", marginBottom: 24 }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary)" }}>
                <Icon name="id-card" size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Account Information</h3>
                <p className="faint" style={{ margin: "4px 0 0", fontSize: 13 }}>View your account details and unique identifiers.</p>
              </div>
            </div>
            
            <div className="col gap-3">
              <div className="fld">
                <label style={{ fontSize: 13, fontWeight: 600 }}>Validator ID</label>
                <input className="fin" value={`#${validator?.id}`} disabled style={{ background: "var(--surface-1)", cursor: "not-allowed" }} />
              </div>
              <div className="fld">
                <label style={{ fontSize: 13, fontWeight: 600 }}>Handle</label>
                <input className="fin" value={`@${validator?.handle}`} disabled style={{ background: "var(--surface-1)", cursor: "not-allowed" }} />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="col gap-4">
          {/* Security Card */}
          {!validator?.oauthProvider && (
            <div className="card" style={{ padding: 24 }}>
              <div className="row gap-3" style={{ alignItems: "center", marginBottom: 24 }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary)" }}>
                  <Icon name="shield" size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Security</h3>
                  <p className="faint" style={{ margin: "4px 0 0", fontSize: 13 }}>Change your password to keep your account secure.</p>
                </div>
              </div>
              
              <form onSubmit={savePassword} className="col gap-4">
                {pwdError && <div className="err-banner" style={{ margin: 0 }}>{pwdError}</div>}
                {pwdSuccess && <div className="banner success" style={{ margin: 0 }}>{pwdSuccess}</div>}
                <div className="fld">
                  <label style={{ fontSize: 13, fontWeight: 600 }}>Current Password</label>
                  <PasswordInput className="fin" placeholder="Enter current password" value={pwdCurrent} onChange={e => setPwdCurrent(e.target.value)} required />
                </div>
                <div className="row gap-3 wrap">
                  <div className="fld" style={{ flex: 1, minWidth: 160 }}>
                    <label style={{ fontSize: 13, fontWeight: 600 }}>New Password</label>
                    <PasswordInput className="fin" placeholder="Enter new password" value={pwdNew} onChange={e => setPwdNew(e.target.value)} required />
                  </div>
                  <div className="fld" style={{ flex: 1, minWidth: 160 }}>
                    <label style={{ fontSize: 13, fontWeight: 600 }}>Confirm New Password</label>
                    <PasswordInput className="fin" placeholder="Confirm new password" value={pwdConfirm} onChange={e => setPwdConfirm(e.target.value)} required />
                  </div>
                </div>
                <div>
                  <Btn variant="primary" type="submit" disabled={pwdBusy}>{pwdBusy ? "Saving…" : "Update Password"}</Btn>
                </div>
              </form>
            </div>
          )}

          {/* More Settings Coming Soon */}
          <div className="card" style={{ padding: 24, background: "var(--surface-1)", border: "1px dashed var(--border)" }}>
            <div className="row gap-3" style={{ alignItems: "center" }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary)" }}>
                <Icon name="sparkles" size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>More settings coming soon</h3>
                <p className="faint" style={{ margin: "4px 0 0", fontSize: 13 }}>We're working on new preferences and customizations for your account.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sign Out */}
      <div className="card row between wrap" style={{ marginTop: 24, padding: 24, background: "color-mix(in srgb, var(--danger) 5%, transparent)", border: "1px solid color-mix(in srgb, var(--danger) 20%, transparent)", maxWidth: 1000, alignItems: "center", gap: 16 }}>
        <div className="row gap-4" style={{ alignItems: "center" }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "color-mix(in srgb, var(--danger) 10%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--danger)" }}>
            <Icon name="logout" size={24} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "var(--danger)" }}>Sign Out</h3>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-muted)" }}>You'll need to sign back in to access your missions and earnings.</p>
          </div>
        </div>
        <button className="btn btn-outline" style={{ color: "var(--danger)", borderColor: "var(--danger)", background: "transparent" }} onClick={logout}>
          Sign out
        </button>
      </div>
    </div>
  );
}
