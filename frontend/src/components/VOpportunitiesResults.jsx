import Icon from './Icon';
import { BrandLogoFull } from './BrandMark';

const MOCK_OPPORTUNITIES = [
  { id: 1, title: "Onboarding test — fintech app", type: "App testing", tags: ["Fintech", "Mobile"], reward: "₹800", match: 96, icon: "box", color: "#4f46e5" },
  { id: 2, title: "Review an AI writing assistant", type: "Product review", tags: ["AI", "SaaS"], reward: "₹600", match: 94, icon: "box", color: "#059669" },
  { id: 3, title: "Usability testing for e-commerce", type: "Usability", tags: ["E-commerce", "UX"], reward: "₹1,200", match: 92, icon: "box", color: "#d97706" },
  { id: 4, title: "Beta test a SaaS analytics dashboard", type: "Beta testing", tags: ["SaaS", "Beta"], reward: "₹1,000", match: 92, icon: "box", color: "#db2777" },
  { id: 5, title: "Expert opinion — telehealth product", type: "Expert opinion", tags: ["Healthcare", "Expert"], reward: "₹2,500", match: 90, icon: "box", color: "#2563eb" },
  { id: 6, title: "Focus group — new beverage launch", type: "Focus group", tags: ["FMCG", "Panel"], reward: "₹1,500", match: 86, icon: "box", color: "#8b5cf6" },
];

export default function VOpportunitiesResults({ roleName, color, memberType, strengthPct = 85, onComplete, onSkip }) {
  // SVG circular gauge logic
  const radius = 24;
  const stroke = 4.5;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (strengthPct / 100) * circumference;

  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Top Navbar */}
      <div style={{ position: "sticky", top: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 32px", background: "rgba(248, 250, 252, 0.85)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <BrandLogoFull height={28} />
          {roleName && (
            <div style={{ background: "#ffffff", border: "1px solid var(--border)", fontWeight: 700, fontSize: 14, color: "var(--text)", padding: "6px 14px", borderRadius: 20, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block" }} />
              {roleName}
            </div>
          )}
        </div>
        <button type="button" onClick={onSkip} style={{ background: "#ffffff", border: "1px solid var(--border)", color: "var(--text-strong)", fontWeight: 600, padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 14 }}>
          Skip for now
        </button>
      </div>

      <div style={{ flex: 1, padding: "48px 24px", maxWidth: 860, margin: "0 auto", width: "100%" }}>
        
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#dcfce7", color: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
            <Icon name="check" size={24} strokeWidth={3} />
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 800, margin: "0 0 16px 0", color: "#0f172a", letterSpacing: "-0.02em" }}>
            You match <span style={{ color }}>47</span> open opportunities
          </h1>
          <p style={{ fontSize: 16, color: "#64748b", maxWidth: 640, margin: "0 auto", lineHeight: 1.5 }}>
            Based on your profile, here's a preview of what's waiting — and what you could earn. New opportunities arrive every week.
          </p>
        </div>

        {/* 2-column Stat Cards */}
        <div style={{ display: "flex", gap: 24, marginBottom: 48 }}>
          
          <div style={{ flex: 1, background: `${color}08`, border: `1px solid ${color}20`, borderRadius: 16, padding: 24, display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: `0 4px 12px ${color}40` }}>
              <Icon name="zap" size={28} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 24, fontWeight: 800, color: "#0f172a" }}>₹8,150<span style={{ fontSize: 16, color: "#64748b", fontWeight: 700 }}>+</span></span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#64748b" }}>/ mo</span>
              </div>
              <div style={{ fontSize: 14, color: "#64748b", fontWeight: 500 }}>Projected earning potential</div>
            </div>
          </div>

          <div style={{ flex: 1, background: "#ffffff", border: "1px solid var(--border)", borderRadius: 16, padding: 24, display: "flex", alignItems: "center", gap: 20, boxShadow: "0 4px 20px rgba(0,0,0,0.02)" }}>
            <div style={{ position: "relative", width: 64, height: 64, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="64" height="64" viewBox="0 0 48 48" style={{ transform: "rotate(-90deg)" }}>
                <circle cx="24" cy="24" r={normalizedRadius} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
                <circle cx="24" cy="24" r={normalizedRadius} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s ease-out" }} />
              </svg>
              <div style={{ position: "absolute", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>{strengthPct}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#64748b", marginTop: 2 }}>/ 100</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 13, color: "#64748b", fontWeight: 500, marginBottom: 4 }}>Profile strength</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#16a34a" }}>{memberType}</div>
            </div>
          </div>
          
        </div>

        {/* Opportunities List */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", margin: 0 }}>Top matched opportunities</h3>
            <div style={{ fontSize: 12, fontWeight: 700, color: color, background: `${color}15`, padding: "4px 12px", borderRadius: 12 }}>
              6 <span style={{ color: "#64748b", margin: "0 2px" }}>of</span> 47
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {MOCK_OPPORTUNITIES.map(opp => (
              <div key={opp.id} style={{ background: "#ffffff", border: "1px solid var(--border)", borderRadius: 16, padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 4px 20px rgba(0,0,0,0.02)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: opp.color, color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon name={opp.icon} size={24} />
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>{opp.title}</div>
                    <div style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>{opp.type}</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {opp.tags.map(tag => (
                        <span key={tag} style={{ fontSize: 11, fontWeight: 600, color: "#475569", background: "#f1f5f9", padding: "4px 10px", borderRadius: 12 }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#16a34a" }}>{opp.reward}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: color, background: `${color}15`, padding: "4px 10px", borderRadius: 12 }}>
                    {opp.match}% match
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ marginTop: 48, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <button 
            onClick={onComplete}
            style={{ width: "100%", maxWidth: 400, background: color, color: "#fff", border: "none", padding: "16px 24px", borderRadius: 12, fontWeight: 700, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, boxShadow: `0 8px 24px ${color}40` }}
          >
            Go to my dashboard <Icon name="arrowRight" size={18} />
          </button>
          
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#64748b", fontSize: 13, fontWeight: 500 }}>
            <Icon name="shieldCheck" size={14} style={{ color: "#94a3b8" }} />
            Your profile is live. Companies can now invite you to matched opportunities.
          </div>
        </div>
        
      </div>
    </div>
  );
}
