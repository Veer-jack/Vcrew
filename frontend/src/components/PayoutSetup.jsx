import { useEffect, useState } from "react";
import Icon from "./Icon";

// `client` is vapi — exposes payoutsConfig()/setPayoutVpa(vpa)/removePayoutVpa().
export default function PayoutSetup({ client, vpa, onUpdate }) {
  const [ready, setReady] = useState(true);
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    client.payoutsConfig().then(c => setReady(!!c.configured)).catch(() => setReady(false));
  }, [client]);

  const save = async (e) => {
    e.preventDefault();
    setError(""); setBusy(true);
    try {
      const res = await client.setPayoutVpa(input.trim());
      onUpdate?.(res.vpa);
      setEditing(false); setInput("");
    } catch (err) {
      setError(err.message || "Couldn't save UPI ID");
    } finally { setBusy(false); }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await client.removePayoutVpa();
      onUpdate?.(null);
    } finally { setBusy(false); }
  };

  if (!ready && !vpa) return null;

  return (
    <div className="card" style={{ padding: "var(--pad-card)" }}>
      <div className="row between" style={{ marginBottom: vpa || editing ? 14 : 0 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Payout UPI ID</h3>
          <p className="faint" style={{ margin: "4px 0 0", fontSize: 12.5 }}>
            {vpa ? "Withdrawals are sent to this UPI ID." : "Add a UPI ID to receive withdrawals."}
          </p>
        </div>
        {vpa && !editing && (
          <div className="row gap-2">
            <span className="tag" style={{ background: "var(--success-weak)", color: "var(--success)" }}><Icon name="check" size={12} />{vpa}</span>
            <button className="btn btn-quiet" onClick={() => { setEditing(true); setInput(vpa); }} disabled={busy}>Change</button>
          </div>
        )}
        {!vpa && !editing && ready && (
          <button className="btn btn-ghost" onClick={() => setEditing(true)}><Icon name="plus" size={15} />Add UPI ID</button>
        )}
      </div>

      {editing && (
        <form onSubmit={save} className="rise" style={{ marginTop: 4 }}>
          {error && <div className="err-banner" style={{ marginBottom: 12 }}>{error}</div>}
          <div className="row gap-2" style={{ alignItems: "flex-end" }}>
            <div className="fld" style={{ flex: 1 }}>
              <label>UPI ID</label>
              <input className="fin" type="text" placeholder="yourname@upi" value={input} onChange={e => setInput(e.target.value)} required />
            </div>
            <button className="btn btn-primary" disabled={busy} type="submit">{busy ? "Saving…" : "Save"}</button>
            <button className="btn btn-quiet" type="button" onClick={() => { setEditing(false); setError(""); }}>Cancel</button>
          </div>
          {vpa && (
            <button className="backlink" type="button" onClick={remove} disabled={busy} style={{ marginTop: 8 }}>Remove UPI ID</button>
          )}
        </form>
      )}
    </div>
  );
}
