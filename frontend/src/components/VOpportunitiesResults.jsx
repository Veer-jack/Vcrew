import { useEffect, useState } from 'react';
import Icon from './Icon';
import { BrandLogoFull } from './BrandMark';
import { vapi } from '../vapi/client';
import { TYPES } from '../vpages/VOnboarding.jsx';

export default function VOpportunitiesResults({ roleName, color, memberType, strengthPct = 85, onComplete, onSkip }) {
  const [tasks, setTasks] = useState([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    vapi.marketplace({ sort: "match" })
      .then(d => {
        setTasks((d.tasks || []).slice(0, 6));
        setTotal(d.total || 0);
      })
      .catch(e => console.error("Failed to load opportunities:", e));
  }, [roleName]);

  // SVG circular gauge logic
  const size = 64;
  const stroke = 6;
  const normalizedRadius = (size / 2) - (stroke / 2);
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
            You match <span style={{ color }}>{total}</span> open opportunities
          </h1>
          <p style={{ fontSize: 16, color: "#64748b", maxWidth: 640, margin: "0 auto", lineHeight: 1.5 }}>
            Based on your profile, here's a preview of what's waiting — and what you could earn. New opportunities arrive every week.
          </p>
        </div>

        {/* 2-column Stat Cards */}
        <div style={{ display: "flex", gap: 24, marginBottom: 48 }}>
          
          <div style={{ flex: 1, background: `linear-gradient(90deg, ${color}15 0%, #ffffff 100%)`, border: `1px solid ${color}20`, borderRadius: 16, padding: 24, display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: `0 4px 12px ${color}40` }}>
              <Icon name="zap" size={28} fill="#ffffff" />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.5px" }}>₹8,150<span style={{ fontSize: 20, color: "#0f172a" }}>+</span></span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#64748b" }}>/ mo</span>
              </div>
              <div style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>Projected earning potential</div>
            </div>
          </div>

          <div style={{ flex: 1, background: "#ffffff", border: "1px solid var(--border)", borderRadius: 16, padding: 24, display: "flex", alignItems: "center", gap: 20, boxShadow: "0 4px 20px rgba(0,0,0,0.02)" }}>
            <div style={{ position: "relative", width: 64, height: 64, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="64" height="64" viewBox="0 0 64 64" style={{ transform: "rotate(-90deg)" }}>
                <circle cx="32" cy="32" r={normalizedRadius} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
                <circle cx="32" cy="32" r={normalizedRadius} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s ease-out" }} />
              </svg>
              <div style={{ position: "absolute", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>
                <span style={{ fontSize: 24, fontWeight: 800, color: "#0f172a" }}>{strengthPct}</span>
                <span style={{ fontSize: 10, fontWeight: 500, color: "var(--text-faint)", marginTop: 2 }}>/100</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--text-faint)", fontWeight: 500, marginBottom: 4 }}>Profile strength</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#16a34a" }}>{memberType}</div>
            </div>
          </div>
          
        </div>

        {/* Opportunities List */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: 0 }}>Top matched opportunities</h3>
            <div style={{ fontSize: 11, fontWeight: 600, color: color, background: `${color}15`, padding: "4px 10px", borderRadius: 12 }}>
              {tasks.length} <span style={{ margin: "0 2px" }}>of</span> {total}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {tasks.map(opp => (
              <div key={opp.id} style={{ background: "#ffffff", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: color, color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon name="box" size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", marginBottom: 2 }}>{opp.product || opp.company || opp.title}</div>
                    <div style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 8 }}>{opp.type}</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {opp.category && (
                        <span style={{ fontSize: 10, fontWeight: 600, color: "#475569", background: "#f1f5f9", padding: "4px 8px", borderRadius: 10 }}>
                          {opp.category}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#16a34a" }}>₹{opp.reward}</div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: color, background: `${color}15`, padding: "4px 8px", borderRadius: 10 }}>
                    {opp.match}% match
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ marginTop: 48, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <button 
            onClick={onComplete}
            style={{ background: color, color: "#fff", border: "none", padding: "12px 32px", borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            Go to my dashboard <Icon name="arrowRight" size={14} />
          </button>
          
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-faint)", fontSize: 12, fontWeight: 400 }}>
            <Icon name="shieldCheck" size={12} style={{ color: "var(--text-faint)" }} />
            Your profile is live. Companies can now invite you to matched opportunities.
          </div>
        </div>
        
      </div>
    </div>
  );
}
