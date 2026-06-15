import Icon from "./Icon";

const AV_COLORS = ["#4f46e5","#0ea5a4","#d6336c","#c2410c","#2563eb","#7c3aed","#16a34a","#0891b2","#b45309","#db2777"];
export const avColor = (s = "") => AV_COLORS[(s.charCodeAt(0) + s.length) % AV_COLORS.length];
export const initials = (n = "") => n.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();

export const inr = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");
export const inrK = (n) => {
  n = Number(n || 0);
  if (n >= 100000) return "₹" + (n / 100000).toFixed(n % 100000 ? 1 : 0) + "L";
  if (n >= 1000) return "₹" + (n / 1000).toFixed(n % 1000 ? 1 : 0) + "k";
  return "₹" + n;
};

export function Btn({ children, variant = "ghost", size, icon, iconRight, block, onClick, disabled, style, title, type }) {
  const cls = ["btn", `btn-${variant}`, size === "lg" && "btn-lg", size === "sm" && "btn-sm"].filter(Boolean).join(" ");
  return (
    <button type={type || "button"} className={cls} onClick={onClick} disabled={disabled} title={title}
      style={{ width: block ? "100%" : undefined, padding: size === "sm" ? "7px 12px" : undefined, fontSize: size === "sm" ? 13 : undefined, ...style }}>
      {icon && <Icon name={icon} size={size === "sm" ? 15 : 17} />}
      {children}
      {iconRight && <Icon name={iconRight} size={size === "sm" ? 15 : 17} />}
    </button>
  );
}

export function Avatar({ name, size = 34, color }) {
  return (
    <div className="avatar" style={{ width: size, height: size, fontSize: size * 0.38, background: color || avColor(name) }}>
      {initials(name)}
    </div>
  );
}

export function StatusTag({ status }) {
  const label = { active: "Active", draft: "Draft", closed: "Closed", completed: "Completed", paused: "Paused", archived: "Archived" }[status] || status;
  return <span className={`st st-${status}`}><span className="d" />{label}</span>;
}

export function TypeTag({ cat, categories }) {
  const c = categories.find(c => c.id === cat) || categories[0] || { label: cat };
  return <span className="ttag" style={{ "--tc": `var(--t-${cat})` }}><span className="dot" />{c.label}</span>;
}

export function MissionLogo({ name, cat, size = 40 }) {
  const letter = (name || "M").replace(/[^A-Za-z]/g, "")[0] || "M";
  return <div className="mlogo" style={{ "--tc": `var(--t-${cat})`, width: size, height: size, fontSize: size * 0.4 }}>{letter.toUpperCase()}</div>;
}

export function PBar({ value, green }) {
  return <div className={`pbar ${green ? "green" : ""}`}><i style={{ width: Math.min(100, value) + "%" }} /></div>;
}
export function PBarRow({ value, green }) {
  return <div className="pbar-row"><PBar value={value} green={green} /><span className="pct">{value}%</span></div>;
}

export function Stars({ value, size = 15 }) {
  return (
    <span className="stars">
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} viewBox="0 0 24 24" width={size} height={size} className={i <= value ? "" : "off"}
          fill={i <= value ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
          <path d="M12 2 15.1 8.3 22 9.3l-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1L12 2Z" />
        </svg>
      ))}
    </span>
  );
}

export function MatchRing({ value }) {
  return <div className="ring" style={{ "--p": value }}><span>{value}<i>%</i></span></div>;
}

export function Donut({ data, centerVal, centerLabel, size = 150 }) {
  const total = data.reduce((s, d) => s + d.v, 0) || 1;
  let acc = 0;
  const stops = data.map(d => {
    const start = (acc / total) * 360; acc += d.v;
    const end = (acc / total) * 360;
    return `${d.c} ${start}deg ${end}deg`;
  }).join(", ");
  return (
    <div className="row gap-5" style={{ alignItems: "center", flexWrap: "wrap" }}>
      <div className="donut" style={{ width: size, height: size, background: `conic-gradient(${stops})` }}>
        <div className="hole"><b>{centerVal}</b><span>{centerLabel}</span></div>
      </div>
      <div className="legend">
        {data.map((d, i) => (
          <div className="lr" key={i}><span className="sw" style={{ background: d.c }} />{d.l}<span className="lv">{d.v}%</span></div>
        ))}
      </div>
    </div>
  );
}

export function Trend({ data, height = 200 }) {
  if (!data || data.length < 2) return <div className="muted" style={{ padding: 24, textAlign: "center" }}>Not enough data yet</div>;
  const w = 600, h = height, pad = 8;
  const max = Math.max(...data) * 1.1 || 1, min = Math.min(...data) * 0.6;
  const x = i => pad + (i / (data.length - 1)) * (w - pad * 2);
  const y = v => h - pad - ((v - min) / (max - min || 1)) * (h - pad * 2 - 14);
  const pts = data.map((v, i) => [x(i), y(v)]);
  const line = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const area = `${line} L ${x(data.length - 1).toFixed(1)} ${h - pad} L ${x(0).toFixed(1)} ${h - pad} Z`;
  return (
    <svg className="trend" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ height, width: "100%" }}>
      <defs>
        <linearGradient id="trendgrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map(g => <line key={g} className="grid-l" x1="0" x2={w} y1={h * g} y2={h * g} />)}
      <path className="area" d={area} fill="url(#trendgrad)" />
      <path className="ln" d={line} fill="none" />
      {pts.map((p, i) => <circle key={i} className="dot" cx={p[0]} cy={p[1]} r={i === pts.length - 1 ? 4 : 0} />)}
    </svg>
  );
}

export function Empty({ icon = "inbox", title, children, action }) {
  return (
    <div className="empty rise">
      <div className="empty-ill"><Icon name={icon} size={44} strokeWidth={1.6} /></div>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function KpiCard({ label, value, unit, icon, tone, delta, spark, footer, onClick }) {
  return (
    <div className={`kpi ${onClick ? "click" : ""}`} onClick={onClick}>
      <div className="kpi-top">
        <span className="kpi-label">{label}</span>
        <span className={`kpi-ic ${tone || ""}`}><Icon name={icon} size={16} /></span>
      </div>
      <div className="kpi-val">{value}{unit && <span className="u">{unit}</span>}</div>
      <div className="kpi-foot">
        {delta != null && (
          <span className={`delta ${delta >= 0 ? "up" : "down"}`}>
            <Icon name={delta >= 0 ? "trendingUp" : "trendingDown"} size={13} />{Math.abs(delta)}%
          </span>
        )}
        {spark
          ? <span className="spark">{spark.map((v, i) => <i key={i} className={i === spark.length - 1 ? "hot" : ""} style={{ height: `${(v / Math.max(...spark)) * 100}%` }} />)}</span>
          : footer !== undefined ? <span>{footer}</span> : <span>vs last month</span>}
      </div>
    </div>
  );
}
