import { useEffect, useState } from "react";
import { Empty, inr } from "../components/ui";
import { aapi } from "../aapi/client";

const STATUS_STYLES = {
  processed: { c: "var(--success)", bg: "var(--success-weak)" },
  failed: { c: "var(--danger)", bg: "var(--danger-weak)" },
  rejected: { c: "var(--danger)", bg: "var(--danger-weak)" },
  reversed: { c: "var(--danger)", bg: "var(--danger-weak)" },
  queued: { c: "var(--warning)", bg: "var(--warning-weak)" },
  processing: { c: "var(--warning)", bg: "var(--warning-weak)" },
};

const NEXT_STATUSES = ["queued", "processing", "processed", "failed", "rejected", "reversed"];

export default function AWithdrawals() {
  const [withdrawals, setWithdrawals] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => { aapi.withdrawals().then(d => setWithdrawals(d.withdrawals)); }, []);
  if (withdrawals === null) return <div className="page rise"><div className="muted">Loading…</div></div>;

  const setStatus = async (w, status) => {
    setBusyId(w.id); setError("");
    try {
      await aapi.updateWithdrawal(w.id, { status });
      setWithdrawals(ws => ws.map(x => x.id === w.id ? { ...x, status } : x));
    } catch (err) {
      setError(err.message || "Couldn't update");
    } finally { setBusyId(null); }
  };

  return (
    <div className="page rise">
      <div className="ph">
        <div><span className="eyebrow">Operations</span><h1>Withdrawals</h1><p className="lead">Track and update the status of validator payouts. Marking a withdrawal as failed, rejected, or reversed returns the funds to the validator's balance.</p></div>
      </div>

      {error && <div className="err-banner rise" style={{ marginBottom: 18 }}>{error}</div>}

      {withdrawals.length === 0 ? <div className="card rise-2"><Empty icon="wallet" title="No withdrawals yet">Validator withdrawal requests will appear here.</Empty></div> : (
        <div className="tbl-wrap rise-2">
          <table className="tbl">
            <thead><tr><th>Validator</th><th>UPI ID</th><th style={{ textAlign: "right" }}>Amount</th><th>Status</th><th>Date</th><th style={{ width: 220 }}></th></tr></thead>
            <tbody>
              {withdrawals.map(w => {
                const st = STATUS_STYLES[w.status] || STATUS_STYLES.queued;
                return (
                  <tr key={w.id}>
                    <td style={{ fontWeight: 600 }}>{w.validatorName}<div className="faint" style={{ fontSize: 12 }}>{w.validatorEmail}</div></td>
                    <td className="mono" style={{ fontSize: 12.5 }}>{w.vpa || "—"}</td>
                    <td className="num">{inr(w.amount)}</td>
                    <td><span className="tag" style={{ background: st.bg, color: st.c }}>{w.status}</span></td>
                    <td className="muted" style={{ fontSize: 12.5 }}>{new Date(w.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</td>
                    <td>
                      <select className="fin" style={{ fontSize: 12.5, padding: "6px 8px" }} value={w.status} disabled={busyId === w.id}
                        onChange={e => setStatus(w, e.target.value)}>
                        {NEXT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
