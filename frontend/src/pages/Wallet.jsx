import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import StepUpModal from "../components/StepUpModal";
import { Btn, KpiCard, inr, inrK } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";

const TABS = [
  { k: "transactions", l: "Transaction history", ic: "list" },
  { k: "invoices", l: "Invoices", ic: "fileText" },
  { k: "methods", l: "Payment methods", ic: "creditCard" },
];

export default function Wallet() {
  const navigate = useNavigate();
  const { builder, refreshBuilder } = useAuth();
  const [tab, setTab] = useState("transactions");
  const [data, setData] = useState(null);
  const [adding, setAdding] = useState(false);
  const [amount, setAmount] = useState(10000);
  const [busy, setBusy] = useState(false);
  const [stepUp, setStepUp] = useState(false);
  const [error, setError] = useState("");

  const load = () => api.wallet().then(setData);
  useEffect(() => { load(); }, []);

  if (!data) return <div className="page rise"><div className="muted">Loading…</div></div>;

  const addFunds = async (stepUpToken) => {
    setBusy(true); setError("");
    try {
      await api.topup(Number(amount), stepUpToken);
      await Promise.all([load(), refreshBuilder()]);
      setAdding(false); setStepUp(false);
    } catch (err) {
      if (err.code === "STEP_UP_REQUIRED") { setStepUp(true); return; }
      setError(err.message || "Couldn't add funds");
      setStepUp(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page rise">
      <div className="ph">
        <div><span className="eyebrow">Wallet &amp; billing</span><h1>Wallet</h1><p className="lead">Top up, track mission spend and manage how {builder?.org} pays.</p></div>
        <div className="ph-actions"><Btn variant="ghost" icon="download">Statement</Btn><Btn variant="primary" icon="plus" onClick={() => setAdding(true)}>Add funds</Btn></div>
      </div>

      {adding && (
        <div className="card rise" style={{ padding: 18, marginBottom: 18 }}>
          {error && <div className="err-banner" style={{ marginBottom: 12 }}>{error}</div>}
          <div className="row gap-3 wrap" style={{ alignItems: "flex-end" }}>
            <div className="fld" style={{ flex: 1, minWidth: 180 }}>
              <label>Amount to add</label>
              <div className="inw has-pre"><span className="pre">₹</span><input className="fin" type="number" min="100" step="100" value={amount} onChange={e => setAmount(e.target.value)} /></div>
            </div>
            <Btn variant="primary" icon="plus" disabled={busy} onClick={() => addFunds()}>{busy ? "Adding…" : "Add to wallet"}</Btn>
            <Btn variant="quiet" onClick={() => { setAdding(false); setError(""); }}>Cancel</Btn>
          </div>
        </div>
      )}
      {stepUp && (
        <StepUpModal client={api} phone={builder?.phone} title="Verify wallet top-up"
          onVerified={(token) => addFunds(token)}
          onClose={() => { setStepUp(false); setBusy(false); }} />
      )}

      <div className="wallet-hero sec">
        <div className="balance-card">
          <div className="bc-ring" />
          <div className="bc-lab">Available balance</div>
          <div className="bc-num">{inr(data.balance)}</div>
          <div className="bc-grid">
            <div><div className="l">In escrow</div><div className="v">{inr(data.pending)}</div></div>
            <div><div className="l">This month</div><div className="v">{inr(data.monthSpend)}</div></div>
          </div>
        </div>
        <KpiCard label="Total spend (all time)" value={inrK(data.transactions.filter(t => t.type === "debit").reduce((s, t) => s + t.amount, 0))} icon="wallet" />
        <KpiCard label="Pending charges" value={inr(data.pending)} icon="clock" tone="amber" />
      </div>

      <div className="utabs sec">
        {TABS.map(t => <button key={t.k} className={tab === t.k ? "on" : ""} onClick={() => setTab(t.k)}><Icon name={t.ic} size={15} />{t.l}</button>)}
      </div>

      {tab === "transactions" && (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Date</th><th>Description</th><th>Type</th><th style={{ textAlign: "right" }}>Amount</th></tr></thead>
            <tbody>
              {data.transactions.map((t) => (
                <tr key={t.id} className={t.missionId ? "click" : ""} onClick={() => t.missionId && navigate(`/missions/${t.missionId}`)}>
                  <td className="mono" style={{ color: "var(--text-muted)", fontSize: 12.5 }}>{t.date}</td>
                  <td style={{ fontWeight: 600 }}>{t.description}</td>
                  <td><span className={`st ${t.type === "credit" ? "st-active" : "st-draft"}`}><span className="d" />{t.type === "credit" ? "Credit" : "Debit"}</span></td>
                  <td className="num" style={{ color: t.type === "credit" ? "var(--success)" : "var(--text)" }}>{t.type === "credit" ? "+" : "–"}{inr(t.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "invoices" && (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Invoice</th><th>Date</th><th>Status</th><th style={{ textAlign: "right" }}>Amount</th><th style={{ width: 60 }}></th></tr></thead>
            <tbody>
              {data.invoices.map((v) => (
                <tr key={v.id}>
                  <td className="mono" style={{ fontWeight: 700 }}>{v.id}</td>
                  <td className="muted">{v.date}</td>
                  <td><span className="st st-active"><span className="d" />{v.status}</span></td>
                  <td className="num">{inr(v.amount)}</td>
                  <td><button className="icon-btn" style={{ width: 32, height: 32 }} title="Download"><Icon name="download" size={15} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "methods" && (
        <div className="split">
          <div className="card" style={{ padding: "6px 20px 14px" }}>
            {data.paymentMethods.map((p) => (
              <div className="pm-row" key={p.id}>
                <span className="pm-ic">{p.brand}</span>
                <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 14 }}>{p.brand === "UPI" ? p.last4 : `•••• ${p.last4}`}</div><div className="faint" style={{ fontSize: 12 }}>{p.exp !== "—" ? `Expires ${p.exp}` : "UPI handle"}</div></div>
                {p.primary && <span className="st st-completed"><span className="d" />Primary</span>}
              </div>
            ))}
            <Btn variant="ghost" size="sm" icon="plus" style={{ marginTop: 14 }}>Add payment method</Btn>
          </div>
          <div className="sticky-side">
            <div className="estcard accent">
              <span className="eyebrow">Billing summary</span>
              <div className="est-num" style={{ margin: "8px 0 14px" }}>{inr(data.monthSpend)}</div>
              <div className="est-row"><span className="lab">Plan</span><span className="v">{builder?.plan}</span></div>
              <div className="est-row"><span className="lab">Billing cycle</span><span className="v">Monthly</span></div>
              <div className="est-row"><span className="lab">Next invoice</span><span className="v">1 Jul</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
