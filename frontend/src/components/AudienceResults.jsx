import { useState, useEffect } from 'react';
import Icon from './Icon';
import { api } from '../api/client';
import { buildAudienceQuery } from '../data/personaConfig';

const SCAN_DOTS = [
  { tx: 0, ty: -120, initials: "AM", color: "#6366f1", delay: 0.2 },
  { tx: 85, ty: -85, initials: "DN", color: "#10b981", delay: 0.4 },
  { tx: 120, ty: 0, initials: "RG", color: "#d97706", delay: 0.6 },
  { tx: 85, ty: 85, initials: "SK", color: "#e11d48", delay: 0.8 },
  { tx: 0, ty: 120, initials: "VR", color: "#2563eb", delay: 1.0 },
  { tx: -85, ty: 85, initials: "AI", color: "#8b5cf6", delay: 1.2 },
  { tx: -120, ty: 0, initials: "KR", color: "#059669", delay: 1.4 },
  { tx: -85, ty: -85, initials: "MJ", color: "#db2777", delay: 1.6 },
];

export default function AudienceResults({ d, reach, onBack, onCreate, busy }) {
  const [phase, setPhase] = useState("filtering"); // filtering -> ranking -> almost -> results
  const [matches, setMatches] = useState([]);
  
  useEffect(() => {
    const q = d ? buildAudienceQuery(d) : {};
    api.audienceMatchPreview(q).then(res => setMatches(res.members)).catch(() => {});

    const t1 = setTimeout(() => setPhase("ranking"), 1000);
    const t2 = setTimeout(() => setPhase("almost"), 2000);
    const t3 = setTimeout(() => setPhase("results"), 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [d]);

  if (phase !== "results") {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 32px' }}>
        <style>{`
          @keyframes pulseRing {
            0% { transform: scale(0.8); opacity: 0.5; }
            100% { transform: scale(1.2); opacity: 0; }
          }
          @keyframes sweep {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes popIn {
            0% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; }
            80% { transform: translate(var(--tx), var(--ty)) scale(1.1); opacity: 1; }
            100% { transform: translate(var(--tx), var(--ty)) scale(1); opacity: 1; }
          }
        `}</style>
        <div style={{ position: 'relative', width: 400, height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* Concentric rings */}
          <div style={{ position: 'absolute', width: 140, height: 140, borderRadius: '50%', border: '1px solid rgba(0,0,0,0.04)' }} />
          <div style={{ position: 'absolute', width: 240, height: 240, borderRadius: '50%', border: '1px solid rgba(0,0,0,0.04)' }} />
          <div style={{ position: 'absolute', width: 340, height: 340, borderRadius: '50%', border: '1px solid rgba(0,0,0,0.04)' }} />
          
          {/* Radar Sweep */}
          <div style={{ position: 'absolute', width: 140, height: 140, borderRadius: '50%', background: 'conic-gradient(from 0deg, transparent 70%, var(--accent) 100%)', opacity: 0.3, animation: 'sweep 1.5s linear infinite' }} />

          {/* Animated Avatar Dots */}
          {SCAN_DOTS.map((dot, i) => (
            <div key={i} style={{
              "--tx": dot.tx + "px", "--ty": dot.ty + "px",
              position: 'absolute', top: '50%', left: '50%', width: 32, height: 32, marginLeft: -16, marginTop: -16,
              borderRadius: '50%', background: dot.color, color: '#fff', fontSize: 12, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: `popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) ${dot.delay}s both`
            }}>
              {dot.initials}
            </div>
          ))}
          
          {/* Center Target */}
          <div style={{ position: 'relative', zIndex: 10, width: 72, height: 72, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'var(--accent)', animation: 'pulseRing 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
            <div style={{ position: 'absolute', inset: -24, borderRadius: '50%', background: 'var(--accent)', opacity: 0.1 }} />
            <Icon name="target" size={32} />
          </div>
        </div>
        
        <div style={{ marginTop: 40, textAlign: 'center' }}>
          <h2 style={{ fontSize: 48, fontWeight: 800, margin: '0 0 12px 0', color: '#0f172a' }}>{reach?.toLocaleString()}</h2>
          <p style={{ color: '#64748b', fontSize: 16 }}>
            {phase === "filtering" && "Filtering by your audience..."}
            {phase === "ranking" && "Ranking by match score..."}
            {phase === "almost" && "Almost there..."}
          </p>
        </div>
      </div>
    );
  }

  // Final Results Phase
  const avgMatch = matches.length > 0 ? Math.round(matches.reduce((sum, m) => sum + m.match, 0) / matches.length) : 0;

  return (
    <div style={{ flex: 1, padding: '48px 32px 64px' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <Icon name="check" size={24} />
          </div>
          <h1 style={{ fontSize: 40, fontWeight: 800, margin: '0 0 16px 0', color: '#0f172a', letterSpacing: '-0.02em' }}>
            We found <span style={{ color: 'var(--accent)' }}>{reach?.toLocaleString()}</span> people who match
          </h1>
          <p style={{ fontSize: 16, color: '#64748b', maxWidth: 640, margin: '0 auto', lineHeight: 1.5 }}>
            Ranked by how well they fit your audience. Here's a preview of who's at the top — your initiative can go to them the moment your workspace is ready.
          </p>
        </div>

        {/* 2-column Layout for results */}
        <div style={{ display: 'flex', gap: 48, alignItems: 'flex-start' }}>
          
          {/* Left Col: Matches list */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: '#0f172a' }}>Top matches</h3>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#b45309', background: '#fef3c7', padding: '4px 12px', borderRadius: 12 }}>Avg match {avgMatch}%</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {matches.map((m, i) => (
                <div key={i} style={{ background: '#ffffff', border: '1px solid #f1f5f9', borderRadius: 16, padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: m.color, color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, flexShrink: 0 }}>
                      {m.initials}
                    </div>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>{m.name}</div>
                      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 10 }}>{m.role}</div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {m.tags.map(t => (
                          <span key={t} style={{ fontSize: 11, fontWeight: 600, color: '#475569', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '2px 8px', borderRadius: 12 }}>{t}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Circular Gauge */}
                  <div style={{ position: 'relative', width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="56" height="56" viewBox="0 0 56 56" style={{ transform: 'rotate(-90deg)' }}>
                      <circle cx="28" cy="28" r="24" fill="none" stroke="#f1f5f9" strokeWidth="5" />
                      <circle cx="28" cy="28" r="24" fill="none" stroke="#b45309" strokeWidth="5" strokeDasharray="150" strokeDashoffset={150 - (150 * m.match / 100)} strokeLinecap="round" />
                    </svg>
                    <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
                      <span style={{ fontSize: 16, fontWeight: 800, color: '#b45309' }}>{m.match}</span>
                      <span style={{ fontSize: 8, fontWeight: 700, color: '#b45309', marginTop: 2 }}>%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Col: Stats & Actions */}
          <div style={{ width: 340, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 24 }}>
            
            {/* Top Locations Card */}
            <div style={{ background: '#ffffff', border: '1px solid #f1f5f9', borderRadius: 16, padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, color: '#0f172a', fontWeight: 600, fontSize: 14 }}>
                <Icon name="mapPin" size={16} style={{ color: '#64748b' }} />
                Top locations
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[ { lbl: "Bengaluru", w: "100%" }, { lbl: "Chennai", w: "45%" }, { lbl: "Pune", w: "40%" }, { lbl: "Hyderabad", w: "40%" } ].map(item => (
                  <div key={item.lbl} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 80, fontSize: 13, color: '#475569' }}>{item.lbl}</div>
                    <div style={{ flex: 1, height: 6, background: '#f1f5f9', borderRadius: 3 }}>
                      <div style={{ width: item.w, height: '100%', background: 'var(--accent)', borderRadius: 3 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Age Spread Card */}
            <div style={{ background: '#ffffff', border: '1px solid #f1f5f9', borderRadius: 16, padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, color: '#0f172a', fontWeight: 600, fontSize: 14 }}>
                <Icon name="users" size={16} style={{ color: '#64748b' }} />
                Age spread
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[ { lbl: "18-24", w: "40%" }, { lbl: "25-34", w: "100%" }, { lbl: "35-44", w: "80%" } ].map(item => (
                  <div key={item.lbl} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, fontSize: 13, color: '#475569' }}>{item.lbl}</div>
                    <div style={{ flex: 1, height: 6, background: '#f1f5f9', borderRadius: 3 }}>
                      <div style={{ width: item.w, height: '100%', background: 'var(--accent)', borderRadius: 3 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
              <button type="button" className="btn btn-primary" disabled={busy} style={{ width: '100%', padding: '14px 16px', fontSize: 15, fontWeight: 600, borderRadius: 8, background: 'var(--accent)', opacity: busy ? 0.7 : 1, cursor: busy ? 'not-allowed' : 'pointer' }} onClick={onCreate}>
                {busy ? "Creating..." : "Create my workspace →"}
              </button>
              <button type="button" className="btn" disabled={busy} style={{ width: '100%', padding: '14px 16px', fontSize: 14, fontWeight: 600, color: '#64748b', background: 'transparent', opacity: busy ? 0.5 : 1 }} onClick={onBack}>
                Refine audience
              </button>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
