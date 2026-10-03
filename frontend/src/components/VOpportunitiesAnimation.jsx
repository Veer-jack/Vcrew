import { useState, useEffect } from 'react';
import Icon from './Icon';
import { BrandLogoFull } from './BrandMark';

const SCAN_DOTS = [
  { tx: 0, ty: -140, color: "#6366f1", delay: 0.2 },
  { tx: 100, ty: -100, color: "#10b981", delay: 0.5 },
  { tx: 140, ty: 0, color: "#d97706", delay: 0.8 },
  { tx: 100, ty: 100, color: "#e11d48", delay: 1.1 },
  { tx: 0, ty: 140, color: "#2563eb", delay: 1.4 },
  { tx: -100, ty: 100, color: "#8b5cf6", delay: 1.7 },
  { tx: -140, ty: 0, color: "#059669", delay: 2.0 },
  { tx: -100, ty: -100, color: "#db2777", delay: 2.3 },
];

export default function VOpportunitiesAnimation({ roleName, color, onFinish, onSkip, onBack }) {
  const [phase, setPhase] = useState("scanning"); // scanning -> ranking
  
  useEffect(() => {
    const t1 = setTimeout(() => setPhase("ranking"), 1500);
    const t2 = setTimeout(() => onFinish(), 3500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onFinish]);

  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <style>{`
        @keyframes pulseRingOp {
          0% { transform: scale(0.8); opacity: 0.5; }
          100% { transform: scale(1.3); opacity: 0; }
        }
        @keyframes sweepOp {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes popInOp {
          0% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; }
          80% { transform: translate(var(--tx), var(--ty)) scale(1.1); opacity: 1; }
          100% { transform: translate(var(--tx), var(--ty)) scale(1); opacity: 1; }
        }
      `}</style>
      
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

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        
        {/* Back Button positioned left center (as in mockup) */}
        <button 
          onClick={onBack}
          style={{ position: 'absolute', left: 40, top: '50%', transform: 'translateY(-50%)', width: 48, height: 48, borderRadius: '50%', background: '#1e293b', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
        >
          <Icon name="arrowLeft" size={24} />
        </button>

        <div style={{ position: 'relative', width: 400, height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* Concentric rings */}
          <div style={{ position: 'absolute', width: 140, height: 140, borderRadius: '50%', border: '1px solid rgba(0,0,0,0.04)' }} />
          <div style={{ position: 'absolute', width: 240, height: 240, borderRadius: '50%', border: '1px solid rgba(0,0,0,0.04)' }} />
          <div style={{ position: 'absolute', width: 340, height: 340, borderRadius: '50%', border: '1px solid rgba(0,0,0,0.04)' }} />
          
          {/* Radar Sweep */}
          <div style={{ position: 'absolute', width: 140, height: 140, borderRadius: '50%', background: `conic-gradient(from 0deg, transparent 70%, ${color} 100%)`, opacity: 0.15, animation: 'sweepOp 1.5s linear infinite' }} />

          {/* Animated Box Dots */}
          {SCAN_DOTS.map((dot, i) => (
            <div key={i} style={{
              "--tx": dot.tx + "px", "--ty": dot.ty + "px",
              position: 'absolute', top: '50%', left: '50%', width: 56, height: 56, marginLeft: -28, marginTop: -28,
              borderRadius: '50%', background: dot.color, color: '#ffffff', border: 'none', 
              boxShadow: `0 8px 16px ${dot.color}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: `popInOp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) ${dot.delay}s both`
            }}>
              <Icon name="box" size={28} strokeWidth={2.5} />
            </div>
          ))}
          
          {/* Center Target */}
          <div style={{ position: 'relative', zIndex: 10, width: 56, height: 56, borderRadius: '50%', background: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 8px 24px ${color}50` }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: color, animation: 'pulseRingOp 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
            <div style={{ position: 'absolute', inset: -24, borderRadius: '50%', background: color, opacity: 0.08 }} />
            <Icon name="zap" size={28} fill="#ffffff" strokeWidth={1} />
          </div>
        </div>
        
        <div style={{ marginTop: 40, textAlign: 'center' }}>
          <p style={{ color: '#475569', fontSize: 16, fontWeight: 500 }}>
            {phase === "scanning" && "Scanning 12,400 live opportunities..."}
            {phase === "ranking" && "Ranking by fit & reward..."}
          </p>
        </div>
      </div>
    </div>
  );
}
