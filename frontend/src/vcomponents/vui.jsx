import Icon from "../components/Icon";
import { avColor, initials } from "../components/ui";
import { useTranslation } from "../i18n/index.jsx";
import { vtLabel } from "../vi18n";

export function VAvatar({ name, size = 38, ring }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.32, flex: "none",
      display: "grid", placeItems: "center", fontWeight: 800, fontSize: size * 0.38,
      color: "#fff", background: "linear-gradient(140deg, var(--accent), var(--accent-2))",
      boxShadow: ring ? "0 0 0 3px var(--panel), 0 0 0 4px var(--border)" : "none",
      letterSpacing: "-.02em",
    }}>{initials(name)}</div>
  );
}

export function ScoreRing({ value, max = 100, size = 56, stroke = 6, label = "" }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / max));
  const col = pct >= 0.75 ? "var(--success)" : pct >= 0.5 ? "var(--warning)" : "var(--danger)";
  return (
    <span className="ring-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={col} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)} transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset .6s cubic-bezier(.2,.7,.2,1)" }} />
      </svg>
      <span className="ring-num" style={{ fontSize: size * 0.3, color: col }}>{Math.round(value)}{label}</span>
    </span>
  );
}

export function VStars({ value, size = 14 }) {
  return (
    <span style={{ display: "inline-flex", gap: 1, color: "var(--warning)" }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Icon key={i} name="star" size={size} strokeWidth={1.6}
          style={{ opacity: i <= Math.round(value) ? 1 : 0.22, fill: i <= Math.round(value) ? "currentColor" : "none" }} />
      ))}
    </span>
  );
}

export function StatTile({ label, value, sub, accent, icon }) {
  return (
    <div className="card" style={{ padding: "var(--pad-card)", display: "flex", flexDirection: "column", gap: 6 }}>
      <div className="row between" style={{ alignItems: "flex-start" }}>
        <span className="eyebrow">{label}</span>
        {icon && <Icon name={icon} size={16} style={{ color: accent || "var(--text-faint)" }} />}
      </div>
      <div className="stat-num" style={{ fontSize: 26, color: accent || "var(--text)" }}>{value}</div>
      {sub && <div className="faint" style={{ fontSize: 12.5 }}>{sub}</div>}
    </div>
  );
}

export function VReward({ amount, big, type }) {
  const { t } = useTranslation();
  const style = { fontWeight: 600, fontSize: big ? 22 : 15, color: "var(--success)", letterSpacing: "-.02em" };
  // A "sample"/"free" mission genuinely pays ₹0 in cash — showing that bare
  // number with no context read as "this mission has no reward at all",
  // when what's actually true is the reward isn't money. Anything else
  // (missing type included, for callers not yet passing it) keeps showing
  // the amount exactly as before.
  if (type === "sample") return <span className="mono" style={style}>{t("missions.rewardSample", null, "Product sample")}</span>;
  if (type === "free") return <span className="mono" style={style}>{t("missions.rewardFree", null, "Community")}</span>;
  return <span className="mono" style={style}>₹{amount}</span>;
}

export function VTypeTag({ type, vtypes, size }) {
  const { t } = useTranslation();
  const vt = vtypes[type];
  if (!vt) return null;
  return (
    <span className="tag" style={{ background: `color-mix(in srgb, var(${vt.accentVar}) 13%, transparent)`, color: `var(${vt.accentVar})` }}>
      <Icon name={vt.icon} size={size === "sm" ? 12 : 14} />
      {vtLabel(t, vt)}
    </span>
  );
}

export function VEmpty({ icon, title, body, cta }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "52px 24px" }}>
      <span style={{ width: 84, height: 84, borderRadius: 22, display: "grid", placeItems: "center", marginBottom: 18, background: "var(--accent-weak)", color: "var(--accent)" }}>
        <Icon name={icon || "inbox"} size={38} strokeWidth={1.6} />
      </span>
      <h3 style={{ margin: "0 0 7px", fontSize: 19, fontWeight: 800, letterSpacing: "-.02em" }}>{title}</h3>
      {body && <p className="muted" style={{ margin: "0 0 18px", fontSize: 14, maxWidth: "40ch" }}>{body}</p>}
      {cta}
    </div>
  );
}

export { avColor };
