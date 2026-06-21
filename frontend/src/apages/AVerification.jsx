import { useEffect, useState } from "react";
import { Empty } from "../components/ui";
import Icon from "../components/Icon";
import { aapi } from "../aapi/client";

const KIND_LABELS = {
  website: { label: "Website", icon: "browser" },
  linkedin: { label: "LinkedIn", icon: "link" },
  registry: { label: "Business registry", icon: "fileText" },
  academic: { label: "Scholarly profile", icon: "flask" },
};

export default function AVerification() {
  const [items, setItems] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => { aapi.verifications("pending").then(d => setItems(d.verifications)); }, []);
  if (items === null) return <div className="page rise"><div className="muted">Loading…</div></div>;

  const decide = async (item, status) => {
    setBusyId(item.id); setError("");
    try {
      await aapi.updateVerification(item.id, status);
      setItems(list => list.filter(x => x.id !== item.id));
    } catch (err) {
      setError(err.message || "Couldn't update");
    } finally { setBusyId(null); }
  };

  return (
    <div className="page rise">
      <div className="ph">
        <div><span className="eyebrow">Operations</span><h1>Verification queue</h1>
          <p className="lead">
            Claims submitted during onboarding (website, LinkedIn, business registry, scholarly profile)
            wait here for manual review before they're marked verified — nothing is auto-approved.
          </p>
        </div>
      </div>

      {error && <div className="err-banner rise" style={{ marginBottom: 18 }}>{error}</div>}

      {items.length === 0 ? (
        <div className="card rise-2"><Empty icon="shield" title="Queue is empty">Submitted verification claims will appear here for review.</Empty></div>
      ) : (
        <div className="col gap-3 rise-2">
          {items.map(item => {
            const kind = KIND_LABELS[item.kind] || { label: item.kind, icon: "fileText" };
            return (
              <div key={item.id} className="card" style={{ padding: 16, display: "flex", gap: 14, alignItems: "flex-start" }}>
                <span className="intent-ic" style={{ background: "var(--accent-weak)", color: "var(--accent)", flex: "none" }}>
                  <Icon name={kind.icon} size={17} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row between" style={{ alignItems: "flex-start" }}>
                    <div>
                      <b style={{ fontSize: 14 }}>{item.builderName}</b>
                      <span className="faint" style={{ fontSize: 12.5, marginLeft: 8 }}>{item.org} · {item.persona}</span>
                    </div>
                    <span className="pill" style={{ fontSize: 11 }}>{kind.label}</span>
                  </div>
                  <p className="mono" style={{ fontSize: 12.5, margin: "6px 0 4px", wordBreak: "break-all" }}>{item.subject}</p>
                  <p className="faint" style={{ fontSize: 11.5, margin: 0 }}>{item.email} · submitted {new Date(item.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
                </div>
                <div className="row gap-2" style={{ flex: "none" }}>
                  <button className="btn btn-ghost" style={{ fontSize: 12.5 }} disabled={busyId === item.id} onClick={() => decide(item, "rejected")}>Reject</button>
                  <button className="btn btn-primary" style={{ fontSize: 12.5 }} disabled={busyId === item.id} onClick={() => decide(item, "approved")}>Approve</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
