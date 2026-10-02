// Zero-dependency CSV/Excel export helpers, shared by any page that exports a table.
// "Excel" export uses an HTML table saved with an .xls extension — Excel opens this
// natively as real columns, avoiding CSV's delimiter/locale ambiguity, with no new
// library (jsPDF + jspdf-autotable, already a dependency, covers the PDF case per-page).

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportCSV(filename, headers, rows) {
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [headers.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
  // UTF-8 BOM so Excel/LibreOffice open it correctly.
  triggerDownload(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" }), filename);
}

export function exportXls(filename, headers, rows) {
  const esc = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const html =
    `<table><thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead>` +
    `<tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  triggerDownload(new Blob([html], { type: "application/vnd.ms-excel" }), filename);
}
