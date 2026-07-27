import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Btn, KpiCard, MissionLogo, PBarRow, Trend } from "../components/ui";
import { useMeta } from "../context/MetaContext";
import { api } from "../api/client";
import { exportCSV, exportXls } from "../exportUtils";

export default function Analytics() {
  const navigate = useNavigate();
  const { categories } = useMeta();
  const [data, setData] = useState(null);
  const [missions, setMissions] = useState([]);

  useEffect(() => {
    api.analytics().then(setData);
    api.missions().then(d => setMissions(d.missions.filter(m => m.status !== "draft")));
  }, []);

  if (!data) return <div className="page rise"><div className="muted">Loading…</div></div>;

  const maxSpend = Math.max(...data.categoryBreakdown.map(c => c.spend), 1);
  const maxGeo = Math.max(...data.geo.map(g => g.v), 1);

  const reportHeaders = ["Mission", "Responses", "Avg rating", "Completion %"];
  const reportRows = missions.map(m => [m.name, m.participants.submitted, m.rating || "—", m.completion]);

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("ValidationCrew — Analytics Report", 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on ${new Date().toLocaleDateString()} · ${data.totalResponses} total responses · ${data.completionRate}% completion`, 14, 30);
    autoTable(doc, {
      head: [reportHeaders],
      body: reportRows,
      startY: 36,
      theme: "grid",
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      styles: { fontSize: 10, cellPadding: 4, textColor: [50, 50, 50] },
    });
    doc.save("analytics_report.pdf");
  };

  return (
    <div className="page rise">
      <div className="ph">
        <div><span className="eyebrow">Reports</span><h1>Analytics &amp; Reports</h1><p className="lead">Aggregate insight across every mission you've run.</p></div>
        <div className="ph-actions">
          <Btn variant="ghost" size="sm" icon="fileText" onClick={exportPDF}>PDF</Btn>
          <Btn variant="ghost" size="sm" icon="download" onClick={() => exportXls("analytics_report.xls", reportHeaders, reportRows)}>Excel</Btn>
          <Btn variant="ghost" size="sm" icon="download" onClick={() => exportCSV("analytics_report.csv", reportHeaders, reportRows)}>CSV</Btn>
        </div>
      </div>

      <div className="col gap-5">
        <div className="kpis" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
          <KpiCard label="Total Responses" value={data.totalResponses.toLocaleString("en-IN")} icon="message" />
          <KpiCard label="Completion Rate" value={data.completionRate} unit="%" icon="target" tone="green" />
          <KpiCard label="Average Rating" value={data.avgRating || "—"} unit="/5" icon="star" tone="amber" />
        </div>

        <div className="chart-card">
          <div className="sec-head"><h3 className="h-md">Completion across missions</h3><span className="pill" style={{ fontSize: 11 }}>Chronological</span></div>
          <Trend data={data.trend} />
        </div>

        <div className="m2">
          <div className="chart-card">
            <div className="sec-head"><h3 className="h-md">Spend by category</h3></div>
            {data.categoryBreakdown.length === 0 ? <div className="muted" style={{ padding: "12px 0" }}>No spend recorded yet.</div> : data.categoryBreakdown.map(c => (
              <div className="geo-row" key={c.category}><span className="gn">{c.label}</span><span className="gbar"><i style={{ width: (c.spend / maxSpend) * 100 + "%" }} /></span><span className="gv">₹{c.spend.toLocaleString("en-IN")}</span></div>
            ))}
          </div>
          <div className="chart-card">
            <div className="sec-head"><h3 className="h-md">Audience pool by city</h3></div>
            {data.geo.length === 0 ? (
              <div className="muted" style={{ padding: "12px 0", fontSize: 14 }}>Not enough audience data yet.</div>
            ) : (
              data.geo.map(g => (
                <div className="geo-row" key={g.l}><span className="gn">{g.l}</span><span className="gbar"><i style={{ width: (g.v / maxGeo) * 100 + "%" }} /></span><span className="gv">{g.v}</span></div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="sec" style={{ marginTop: 22 }}>
        <div className="sec-head"><h2 className="h-lg">By mission</h2></div>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Mission</th><th style={{ textAlign: "right" }}>Responses</th><th style={{ textAlign: "right" }}>Avg rating</th><th style={{ width: 150 }}>Completion</th></tr></thead>
            <tbody>
              {missions.map(m => (
                <tr className="click" key={m.id} onClick={() => navigate(`/missions/${m.id}`)}>
                  <td><div className="t-name"><MissionLogo name={m.name} cat={m.category} size={32} /><div>{m.name}</div></div></td>
                  <td className="num">{m.participants.submitted}</td>
                  <td className="num">{m.rating || "—"}</td>
                  <td><PBarRow value={m.completion} green={m.completion >= 90} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
