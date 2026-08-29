import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import Icon from "../components/Icon";
import StepUpModal from "../components/StepUpModal";
import { Btn, KpiCard, UpdatingBadge, inr, inrK } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { exportCSV } from "../exportUtils";
import { useTranslation } from "../i18n/index.jsx";

// TABS defined in component

const CASHFREE_SCRIPT_URL = "https://sdk.cashfree.com/js/v3/cashfree.js";
const CASHFREE_MODE = "sandbox"; // flip to "production" at go-live

function loadCashfreeScript(t) {
  return new Promise((resolve, reject) => {
    if (window.Cashfree) return resolve();
    const existing = document.querySelector(`script[src="${CASHFREE_SCRIPT_URL}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error(t("wallet.errPaymentWidget", null, "Couldn't load payment widget"))));
      return;
    }
    const script = document.createElement("script");
    script.src = CASHFREE_SCRIPT_URL;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(t("wallet.errPaymentWidget", null, "Couldn't load payment widget")));
    document.body.appendChild(script);
  });
}


export default function Wallet() {
  const { t, dataVersion } = useTranslation();
  const TABS = [
    { k: "transactions", l: t("wallet.tabTransactions", null, "Transaction history"), ic: "list" },
    { k: "invoices", l: t("wallet.tabInvoices", null, "Invoices"), ic: "fileText" },
    { k: "methods", l: t("wallet.tabMethods", null, "Payment methods"), ic: "creditCard" },
  ];
  const navigate = useNavigate();
  const { builder, refreshBuilder } = useAuth();
  const [tab, setTab] = useState("transactions");
  const [data, setData] = useState(null);
  const [adding, setAdding] = useState(false);
  const [amount, setAmount] = useState(10000);
  const [busy, setBusy] = useState(false);
  const [stepUp, setStepUp] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [cardsReady, setCardsReady] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [visibleCount, setVisibleCount] = useState(20);
  const [refetching, setRefetching] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisibleCount(20), 0);
    return () => clearTimeout(t);
  }, [tab]);

  const load = () => {
    setLoadError("");
    setRefetching(true);
    return api.wallet().then(setData).catch(err => setLoadError(err.message || t("wallet.errLoadWallet", null, "Couldn't load your wallet"))).finally(() => setRefetching(false));
  };
  useEffect(() => {
    const t = setTimeout(() => load(), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataVersion]);
  useEffect(() => { api.paymentsConfig().then(d => setCardsReady(!!d.configured)).catch(() => {}); }, []);

  if (loadError) return (
    <div className="page rise">
      <div className="err-banner" style={{ marginBottom: 12 }}>{loadError}</div>
      <Btn variant="ghost" onClick={load}>{t("actions.retry", null, "Retry")}</Btn>
    </div>
  );
  if (!data) return <div className="page rise"><div className="muted">{t("actions.loading", null, "Loading…")}</div></div>;

  const payWithCard = async () => {
    setBusy(true); setError(""); setInfo("");
    try {
      const order = await api.createOrder(Number(amount));
      await loadCashfreeScript(t);

      const cashfree = window.Cashfree({ mode: CASHFREE_MODE });

      const result = await cashfree.checkout({
        paymentSessionId: order.paymentSessionId,
        redirectTarget: "_modal",
      });

      if (result.error) {
        setError(result.error.message || t("wallet.errVerifyPayment", null, "Couldn't verify payment"));
        setBusy(false);
        return;
      }

      if (!result.paymentDetails) {
        setBusy(false);
        return;
      }

      try {
        await api.verifyPayment({
          orderId: order.orderId,
          amount: order.amount,
        });
        setInfo(t("wallet.paymentReceived", null, "Payment received — your wallet has been topped up."));
        setAdding(false);
        await Promise.all([load(), refreshBuilder()]);
      } catch (err) {
        setError(err.message || t("wallet.errVerifyPayment", null, "Couldn't verify payment"));
      } finally {
        setBusy(false);
      }
    } catch (err) {
      setError(err.message || t("wallet.errStartCheckout", null, "Couldn't start checkout"));
      setBusy(false);
    }
  };

  const exportStatement = () => {
    exportCSV(
      "wallet_statement.csv",
      [t("wallet.thDate", null, "Date"), t("wallet.thDescription", null, "Description"), t("wallet.thType", null, "Type"), t("wallet.thAmountInr", null, "Amount (INR)")],
      data.transactions.map(txn => [txn.date, txn.description, txn.type, txn.amount])
    );
  };

  const downloadInvoice = (inv) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("ValidationCrew", 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text(t("wallet.thInvoice", null, "Invoice"), 14, 30);
    doc.setTextColor(20, 20, 20);
    doc.setFontSize(13);
    const rows = [
      [t("wallet.thInvoice", null, "Invoice"), inv.id],
      [t("wallet.thDate", null, "Date"), inv.date],
      [t("wallet.invoiceStatus", null, "Status"), inv.status],
      [t("wallet.billedTo", null, "Billed to"), builder?.org || "—"],
      [t("wallet.thAmount", null, "Amount"), inr(inv.amount)],
    ];
    let y = 46;
    for (const [label, value] of rows) {
      doc.setFont(undefined, "bold"); doc.text(`${label}:`, 14, y);
      doc.setFont(undefined, "normal"); doc.text(String(value), 60, y);
      y += 9;
    }
    doc.save(`${inv.id}.pdf`);
  };

  const addFunds = async (stepUpToken) => {
    setBusy(true); setError("");
    try {
      await api.topup(Number(amount), stepUpToken);
      await Promise.all([load(), refreshBuilder()]);
      setAdding(false); setStepUp(false);
    } catch (err) {
      if (err.code === "STEP_UP_REQUIRED") { setStepUp(true); return; }
      setError(err.message || t("wallet.errAddFunds", null, "Couldn't add funds"));
      setStepUp(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page rise">
      <div className="ph">
        <div><span className="eyebrow">{t("wallet.walletAndBilling", null, "Wallet & billing")}</span><h1>{t("wallet.title", null, "Wallet")}</h1><p className="lead">{t("wallet.lead", { org: builder?.org }, `Top up, track mission spend and manage how ${builder?.org} pays.`)}</p></div>
        <div className="ph-actions" style={{ alignItems: "center", gap: 12 }}><UpdatingBadge show={refetching} /><Btn variant="ghost" icon="download" onClick={exportStatement}>{t("actions.statement", null, "Statement")}</Btn><Btn variant="primary" icon="plus" onClick={() => setAdding(true)}>{t("actions.addFunds", null, "Add funds")}</Btn></div>
      </div>

      {error && !adding && (
        <div className="err-banner rise" style={{ marginBottom: 18 }}>{error}</div>
      )}

      {info && !adding && (
        <div className="card rise" style={{ padding: "12px 16px", marginBottom: 18, color: "var(--success)", background: "var(--success-weak)", border: "none" }}>
          {info}
        </div>
      )}

      {adding && (
        <div className="card rise" style={{ padding: 18, marginBottom: 18 }}>
          {error && <div className="err-banner" style={{ marginBottom: 12 }}>{error}</div>}
          <div className="row gap-3 wrap" style={{ alignItems: "flex-end" }}>
            <div className="fld" style={{ flex: 1, minWidth: 180 }}>
              <label>{t("wallet.amountToAdd", null, "Amount to add")}</label>
              <div className="inw has-pre"><span className="pre">₹</span><input className="fin" type="number" min="100" step="100" value={amount} onChange={e => setAmount(e.target.value)} /></div>
            </div>
            {cardsReady ? (
              <Btn variant="primary" icon="creditCard" disabled={busy} onClick={payWithCard}>{busy ? t("actions.opening", null, "Opening…") : t("actions.payWithCardUpi", null, "Pay with card / UPI")}</Btn>
            ) : (
              <Btn variant="primary" icon="plus" disabled={busy} onClick={() => addFunds()}>{busy ? t("actions.adding", null, "Adding…") : t("actions.addToWallet", null, "Add to wallet")}</Btn>
            )}
            <Btn variant="quiet" onClick={() => { setAdding(false); setError(""); }}>{t("actions.cancel", null, "Cancel")}</Btn>
          </div>
          {!cardsReady && <p className="faint" style={{ fontSize: 12, margin: "8px 0 0" }}>{t("wallet.onlinePaymentsNotSetup", null, "Online payments aren't set up yet — this adds funds directly for testing.")}</p>}
        </div>
      )}
      {stepUp && (
        <StepUpModal client={api} phone={builder?.phone} title={t("wallet.verifyWalletTopup", null, "Verify wallet top-up")}
          onVerified={(token) => addFunds(token)}
          onClose={() => { setStepUp(false); setBusy(false); }} />
      )}

      <div className="wallet-hero sec">
        <div className="balance-card">
          <div className="bc-ring" />
          <div className="bc-lab">{t("wallet.availableBalance", null, "Available balance")}</div>
          <div className="bc-num">{inr(data.balance)}</div>
          <div className="bc-grid">
            <div><div className="l">{t("wallet.inEscrow", null, "In escrow")}</div><div className="v">{inr(data.pending)}</div></div>
            <div><div className="l">{t("wallet.thisMonth", null, "This month")}</div><div className="v">{inr(data.monthSpend)}</div></div>
          </div>
        </div>
        <KpiCard label={t("wallet.totalSpendAllTime", null, "Total spend (all time)")} value={inrK(data.transactions.filter(t => t.type === "debit").reduce((s, t) => s + t.amount, 0))} icon="wallet" />
        <KpiCard label={t("wallet.pendingCharges", null, "Pending charges")} value={inr(data.pending)} icon="clock" tone="amber" />
      </div>

      <div className="utabs sec">
        {TABS.map(tab => <button key={tab.k} className={tab === tab.k ? "on" : ""} onClick={() => setTab(tab.k)}><Icon name={tab.ic} size={15} />{tab.l}</button>)}
      </div>

      {tab === "transactions" && (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>{t("wallet.thDate", null, "Date")}</th><th>{t("wallet.thDescription", null, "Description")}</th><th>{t("wallet.thType", null, "Type")}</th><th style={{ textAlign: "right" }}>{t("wallet.thAmount", null, "Amount")}</th></tr></thead>
            <tbody>
              {data.transactions.slice(0, visibleCount).map((txn) => (
                <tr key={txn.id} className={txn.missionId ? "click" : ""} onClick={() => txn.missionId && navigate(`/missions/${txn.missionId}`)}>
                  <td className="mono" style={{ color: "var(--text-muted)", fontSize: 12.5 }}>{txn.date}</td>
                  <td style={{ fontWeight: 600 }}>{txn.description}</td>
                  <td><span className={`st ${txn.type === "credit" ? "st-active" : "st-draft"}`}><span className="d" />{txn.type === "credit" ? t("wallet.credit", null, "Credit") : t("wallet.debit", null, "Debit")}</span></td>
                  <td className="num" style={{ color: txn.type === "credit" ? "var(--success)" : "var(--text)" }}>{txn.type === "credit" ? "+" : "–"}{inr(txn.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {visibleCount < data.transactions.length && (
            <div style={{ textAlign: "center", padding: 16 }}>
              <Btn variant="outline" onClick={() => setVisibleCount(c => c + 20)}>{t("actions.loadMoreTransactions", null, "Load more transactions")}</Btn>
            </div>
          )}
        </div>
      )}

      {tab === "invoices" && (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>{t("wallet.thInvoice", null, "Invoice")}</th><th>{t("wallet.thDate", null, "Date")}</th><th>{t("wallet.invoiceStatus", null, "Status")}</th><th style={{ textAlign: "right" }}>{t("wallet.thAmount", null, "Amount")}</th><th style={{ width: 60 }}></th></tr></thead>
            <tbody>
              {data.invoices.slice(0, visibleCount).map((v) => (
                <tr key={v.id}>
                  <td className="mono" style={{ fontWeight: 700 }}>{v.id}</td>
                  <td className="muted">{v.date}</td>
                  <td><span className="st st-active"><span className="d" />{v.status}</span></td>
                  <td className="num">{inr(v.amount)}</td>
                  <td><button className="icon-btn" style={{ width: 32, height: 32 }} title={t("actions.download", null, "Download")} onClick={() => downloadInvoice(v)}><Icon name="download" size={15} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {visibleCount < data.invoices.length && (
            <div style={{ textAlign: "center", padding: 16 }}>
              <Btn variant="outline" onClick={() => setVisibleCount(c => c + 20)}>{t("actions.loadMoreInvoices", null, "Load more invoices")}</Btn>
            </div>
          )}
        </div>
      )}

      {tab === "methods" && (
        <div className="split">
          <div className="card" style={{ padding: "6px 20px 14px" }}>
            {data.paymentMethods.map((p) => (
              <div className="pm-row" key={p.id}>
                <span className="pm-ic">{p.brand}</span>
                <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 14 }}>{p.brand === "UPI" ? p.last4 : `•••• ${p.last4}`}</div><div className="faint" style={{ fontSize: 12 }}>{p.exp !== "—" ? t("wallet.expires", { exp: p.exp }, `Expires ${p.exp}`) : t("wallet.upiHandle", null, "UPI handle")}</div></div>
                {p.primary && <span className="st st-completed"><span className="d" />{t("wallet.primary", null, "Primary")}</span>}
              </div>
            ))}
            <Btn variant="ghost" size="sm" icon="plus" style={{ marginTop: 14 }}>{t("actions.addPaymentMethod", null, "Add payment method")}</Btn>
          </div>
          <div className="sticky-side">
            <div className="estcard accent">
              <span className="eyebrow">{t("wallet.billingSummary", null, "Billing summary")}</span>
              <div className="est-num" style={{ margin: "8px 0 14px" }}>{inr(data.monthSpend)}</div>
              <div className="est-row"><span className="lab">{t("wallet.plan", null, "Plan")}</span><span className="v">{builder?.plan}</span></div>
              <div className="est-row"><span className="lab">{t("wallet.billingCycle", null, "Billing cycle")}</span><span className="v">{t("wallet.monthly", null, "Monthly")}</span></div>
              <div className="est-row"><span className="lab">{t("wallet.nextInvoice", null, "Next invoice")}</span><span className="v">{t("wallet.nextInvoiceDate", null, "1 Jul")}</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
