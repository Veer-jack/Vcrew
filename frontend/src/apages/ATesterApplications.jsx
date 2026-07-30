import { useEffect, useState } from "react";
import { Empty } from "../components/ui";
import Icon from "../components/Icon";
import { aapi } from "../aapi/client";

export default function ATesterApplications() {
  const [items, setItems] = useState(null);
  const [tier, setTier] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [visibleCount, setVisibleCount] = useState(20);

  useEffect(() => { aapi.testerApplications().then(d => setItems(d.applications)); }, []);
  if (items === null) return <div className="page rise"><div className="muted">Loading…</div></div>;

  const decide = async (item, status) => {
    const body = { status };
    if (status === "approved") {
      body.tier = tier[item.id] || "junior";
    }
    setBusyId(item.id); setError("");
    try {
      await aapi.updateTesterApplication(item.id, body);
      setItems(list => list.filter(x => x.id !== item.id));
    } catch (err) {
      setError(err.message || "Couldn't update");
    } finally { setBusyId(null); }
  };

  return (
    <div className="page rise">
      <div className="ph">
        <div><span className="eyebrow">Operations</span><h1>Tester applications</h1>
          <p className="lead">
            Validators who applied for Verified Tester status wait here for manual review —
            they keep full Validator access until you approve or reject their proof.
          </p>
        </div>
      </div>

      {error && <div className="err-banner rise" style={{ marginBottom: 18 }}>{error}</div>}

      {items.length === 0 ? (
        <div className="card rise-2"><Empty icon="star" title="Queue is empty">Tester applications will appear here for review.</Empty></div>
      ) : (
        <div className="col gap-3 rise-2">
          {items.slice(0, visibleCount).map(item => (
            <div key={item.id} className="card" style={{ padding: 18 }}>
              <div className="row between" style={{ alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <b style={{ fontSize: 15 }}>{item.name}</b>
                  <span className="faint" style={{ fontSize: 12.5, marginLeft: 8 }}>{item.email} · {item.city}</span>
                  <p className="faint" style={{ fontSize: 11.5, margin: "4px 0 0" }}>
                    Applied {new Date(item.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </p>
                </div>
              </div>

              <div className="row gap-3 wrap" style={{ fontSize: 13, marginBottom: 12 }}>
                <span><b>Role:</b> {item.occupation || "—"}</span>
                <span><b>Experience:</b> {item.experience || "—"}</span>
                <span><b>Company:</b> {item.company || "—"}</span>
                <span><b>Industry:</b> {item.industry.join(", ") || "—"}</span>
              </div>

              {item.testingBio && (
                <div className="card" style={{ padding: 12, background: "var(--panel-inset)", marginBottom: 12 }}>
                  <p className="muted" style={{ margin: 0, fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{item.testingBio}</p>
                </div>
              )}

              <div className="row gap-3 wrap" style={{ marginBottom: 14 }}>
                {item.linkedinUrl && (
                  <a href={item.linkedinUrl} target="_blank" rel="noreferrer" className="btn btn-quiet" style={{ fontSize: 12.5 }}>
                    <Icon name="link" size={13} /> LinkedIn
                  </a>
                )}
                {item.portfolioUrl && (
                  <a href={item.portfolioUrl} target="_blank" rel="noreferrer" className="btn btn-quiet" style={{ fontSize: 12.5 }}>
                    <Icon name="link" size={13} /> Portfolio
                  </a>
                )}
                {item.resumeUrl ? (
                  <a href={item.resumeUrl} target="_blank" rel="noreferrer" className="btn btn-quiet" style={{ fontSize: 12.5 }}>
                    <Icon name="fileText" size={13} /> {item.resumeFilename || "Resume"}
                  </a>
                ) : (
                  <span className="faint" style={{ fontSize: 12.5 }}>No resume uploaded</span>
                )}
              </div>

              <div className="row gap-2" style={{ alignItems: "center" }}>
                <select className="fin" style={{ width: 130, fontSize: 13 }} value={tier[item.id] || "junior"}
                  onChange={e => setTier(t => ({ ...t, [item.id]: e.target.value }))}>
                  <option value="junior">Junior tier</option>
                  <option value="senior">Senior tier</option>
                </select>
                <span className="grow" />
                <button className="btn btn-ghost" style={{ fontSize: 12.5 }} disabled={busyId === item.id} onClick={() => decide(item, "rejected")}>Reject</button>
                <button className="btn btn-primary" style={{ fontSize: 12.5 }} disabled={busyId === item.id} onClick={() => decide(item, "approved")}>Approve</button>
              </div>
            </div>
          ))}
          {visibleCount < items.length && (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <button className="btn btn-outline" onClick={() => setVisibleCount(c => c + 20)}>Load more applications</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
