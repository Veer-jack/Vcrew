import { useEffect, useState } from "react";
import Icon from "../components/Icon";
import StepUpModal from "../components/StepUpModal";
import { VAvatar, VStars, VTypeTag } from "../vcomponents/vui";
import { useVMeta } from "../vcontext/VMetaContext";
import { vapi } from "../vapi/client";

export default function Earnings() {
  const { vtypes } = useVMeta();
  const [data, setData] = useState(null);
  const [withdrawing, setWithdrawing] = useState(false);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [stepUp, setStepUp] = useState(false);

  const load = () => vapi.earnings().then(setData);
  useEffect(() => { load(); }, []);
  if (!data) return <div className="page rise"><div className="muted">Loading…</div></div>;

  const weekPct = Math.round((data.weekEarnings / data.weekTarget) * 100);

  const doWithdraw = async (stepUpToken) => {
    setBusy(true); setError("");
    try {
      await vapi.withdraw(Number(amount), stepUpToken);
      await load();
      setWithdrawing(false); setAmount(""); setStepUp(false);
    } catch (err) {
      if (err.code === "STEP_UP_REQUIRED") { setStepUp(true); return; }
      setError(err.message || "Couldn't withdraw");
      setStepUp(false);
    } finally { setBusy(false); }
  };

  const withdraw = () => doWithdraw();

  return (
    <div className="page">
      <div className="rise" style={{ marginBottom: 22 }}>
        <div className="eyebrow" style={{ marginBottom: 6 }}>Earnings &amp; reputation</div>
        <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: "-.03em" }}>You've earned ₹{data.lifetime.toLocaleString("en-IN")} all-time</h2>
      </div>

      <div className="rise-2 m2" style={{ gridTemplateColumns: "1.4fr 1fr", gap: 14, marginBottom: 26 }}>
        <div className="card" style={{ padding: 22 }}>
          <div className="row between" style={{ marginBottom: 16 }}>
            <div><div className="eyebrow">This week</div><div className="mono" style={{ fontSize: 30, fontWeight: 600, marginTop: 4 }}>₹{data.weekEarnings.toLocaleString("en-IN")}</div></div>
            <div style={{ textAlign: "right" }}><div className="faint" style={{ fontSize: 12 }}>Goal</div><div className="mono" style={{ fontSize: 16 }}>₹{data.weekTarget.toLocaleString("en-IN")}</div></div>
          </div>
          <div className="lvl-meter" style={{ height: 10 }}><i style={{ width: `${weekPct}%` }} /></div>
          <div className="row between faint" style={{ fontSize: 12, marginTop: 8 }}><span>{weekPct}% of weekly goal</span><span>₹{Math.max(0, data.weekTarget - data.weekEarnings).toLocaleString("en-IN")} to go</span></div>
          <hr className="divider" style={{ margin: "18px 0" }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
            <div><div className="faint" style={{ fontSize: 12 }}>Pending</div><div className="mono" style={{ fontSize: 18, color: "var(--warning)" }}>₹{data.pending}</div></div>
            <div><div className="faint" style={{ fontSize: 12 }}>Available</div><div className="mono" style={{ fontSize: 18, color: "var(--success)" }}>₹{data.available.toLocaleString("en-IN")}</div></div>
            <div className="row" style={{ alignItems: "flex-end" }}><button className="btn btn-primary" style={{ width: "100%" }} onClick={() => setWithdrawing(true)}>Withdraw</button></div>
          </div>
          {withdrawing && (
            <div className="rise" style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
              {error && <div className="err-banner" style={{ marginBottom: 10 }}>{error}</div>}
              <div className="row gap-3 wrap" style={{ alignItems: "flex-end" }}>
                <div className="fld" style={{ flex: 1, minWidth: 160 }}>
                  <label>Amount to withdraw</label>
                  <div className="inw has-pre"><span className="pre">₹</span><input className="fin" type="number" min="200" max={data.available} value={amount} onChange={e => setAmount(e.target.value)} placeholder={`Up to ${data.available}`} /></div>
                </div>
                <button className="btn btn-primary" disabled={busy} onClick={withdraw}>{busy ? "Processing…" : "Confirm withdrawal"}</button>
                <button className="btn btn-quiet" onClick={() => { setWithdrawing(false); setError(""); }}>Cancel</button>
              </div>
              <p className="faint" style={{ fontSize: 12, margin: "8px 0 0" }}>Minimum withdrawal is ₹200. Funds land in your linked UPI/bank within 24h.</p>
            </div>
          )}
          {stepUp && (
            <StepUpModal client={vapi} phone={data.phone} title="Verify withdrawal"
              onVerified={(token) => doWithdraw(token)}
              onClose={() => { setStepUp(false); setBusy(false); }} />
          )}
        </div>

        <div className="card" style={{ padding: 22 }}>
          <div className="row between" style={{ marginBottom: 14 }}>
            <div className="eyebrow">Reputation</div>
            <span className="tag" style={{ background: "var(--accent-weak)", color: "var(--accent)" }}><Icon name="shield" size={12} />Level {data.level} · {data.levelName}</span>
          </div>
          <div className="row gap-4">
            <VAvatar name={data.name} size={52} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 16 }}>{data.name}</div>
              <div className="row gap-2 faint" style={{ fontSize: 13 }}><VStars value={data.rating} /> {data.rating} · {data.accuracy}% accuracy</div>
            </div>
          </div>
          <hr className="divider" style={{ margin: "16px 0" }} />
          {data.nextLevelName && <div className="faint" style={{ fontSize: 12, marginBottom: 8 }}>{data.toNextLevel} validations to <b style={{ color: "var(--text)" }}>Level {data.level + 1} · {data.nextLevelName}</b></div>}
          <div className="lvl-meter"><i style={{ width: data.levelPct + "%" }} /></div>
          <div className="row gap-2 wrap" style={{ marginTop: 14 }}>
            {data.specialties.map(s => <span key={s} className="pill" style={{ fontSize: 12 }}>{s}</span>)}
          </div>
        </div>
      </div>

      <div className="rise-3">
        <div className="eyebrow" style={{ marginBottom: 12 }}>Recent validations</div>
        <div className="card" style={{ overflow: "hidden" }}>
          {data.history.length === 0 ? <div className="muted" style={{ padding: 24 }}>No validations yet.</div> : data.history.map((h, i) => (
            <div key={h.id} className="row between" style={{ padding: "14px 18px", borderTop: i ? "var(--hairline) solid var(--border)" : "none" }}>
              <div className="row gap-3" style={{ minWidth: 0 }}>
                <VTypeTag type={h.type} vtypes={vtypes} />
                <span style={{ fontWeight: 700 }}>{h.product}</span>
                <span className="faint" style={{ fontSize: 13 }}>{h.when}</span>
              </div>
              <div className="row gap-4">
                <span className="faint" style={{ fontSize: 12.5 }}>{h.quality}</span>
                <span className="tag" style={{ background: h.status === "Approved" ? "var(--success-weak)" : "var(--warning-weak)", color: h.status === "Approved" ? "var(--success)" : "var(--warning)" }}>{h.status}</span>
                <span className="mono" style={{ fontWeight: 600, fontSize: 15, color: "var(--success)" }}>₹{h.reward}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
