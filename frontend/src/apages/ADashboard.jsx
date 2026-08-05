import { useEffect, useState } from "react";
import { KpiCard, inr, inrK } from "../components/ui";
import { aapi } from "../aapi/client";
import { useTranslation } from "../i18n/index.jsx";

export default function ADashboard() {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  useEffect(() => { aapi.dashboard().then(setData); }, []);
  if (!data) return <div className="page rise"><div className="muted">{t("actions.loading", null, "Loading…")}</div></div>;

  return (
    <div className="page rise">
      <div className="ph">
        <div><span className="eyebrow">{t("admin.platformOverview", null, "Platform overview")}</span><h1>{t("admin.controlcenter", null, "Control center")}</h1><p className="lead">{t("admin.dashboardLead", null, "A real-time snapshot of ValidationCrew's marketplace.")}</p></div>
      </div>

      <div className="rise-2 m2" style={{ gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 26 }}>
        <KpiCard label={t("admin.totalMembers", null, "Total members")} value={data.totalUsers.toLocaleString("en-IN")} icon="users" footer="" />
        <KpiCard label={t("admin.builders", null, "Builders")} value={data.builders.toLocaleString("en-IN")} icon="briefcase" footer="" />
        <KpiCard label={t("admin.validators", null, "Validators")} value={data.validators.toLocaleString("en-IN")} icon="userplus" footer="" />
        <KpiCard label={t("admin.activeMissions", null, "Active missions")} value={`${data.activeMissions} / ${data.totalMissions}`} icon="layers" footer="" />
      </div>

      <div className="rise-3 m2" style={{ gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 26 }}>
        <KpiCard label={t("admin.walletTopUps", null, "Wallet top-ups (all-time)")} value={inrK(data.gmv)} icon="wallet" footer="" />
        <KpiCard label={t("admin.missionSpend", null, "Mission spend (all-time)")} value={inrK(data.spend)} icon="trendingUp" footer="" />
        <KpiCard label={t("admin.openSupportTickets", null, "Open support tickets")} value={data.openTickets} icon="life" tone={data.openTickets > 0 ? "amber" : undefined} footer="" />
      </div>

      <div className="rise-3 m2" style={{ gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
        <KpiCard label={t("admin.withdrawalQueue", null, "Withdrawal queue")} value={data.withdrawalQueue} unit={data.withdrawalQueue ? ` (${inr(data.withdrawalQueueAmount)})` : ""} icon="wallet" tone={data.withdrawalQueue > 0 ? "amber" : undefined} footer="" />
        <KpiCard label={t("admin.suspendedAccounts", null, "Suspended accounts")} value={data.suspended} icon="shield" tone={data.suspended > 0 ? "danger" : undefined} footer="" />
      </div>
    </div>
  );
}
