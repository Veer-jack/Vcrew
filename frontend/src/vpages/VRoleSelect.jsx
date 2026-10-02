import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Cpu, Star, Users, ArrowRight, Sparkles } from 'lucide-react';
import { BrandLogoFull } from '../components/BrandMark';
import LanguageSwitcher from '../components/LanguageSwitcher';
import './VOnboarding.css';

const ROLES = [
  {
    key: "tester", name: "Tester", icon: Cpu,
    desc: "Run structured QA, mobile, web, SaaS, AI and beta tests — get paid for your testing expertise.",
    examples: ["QA Engineer", "Beta Tester", "Mobile Tester", "UX Tester"],
    cta: "Continue as Tester", palette: ["#7c3aed", "#9d6bff", "#f1ebfe"],
  },
  {
    key: "validator", name: "Validator", icon: Star,
    desc: "Bring your professional judgment — review products in your domain and earn for high-signal feedback.",
    examples: ["Domain Expert", "Product Manager", "Designer", "Professional"],
    cta: "Continue as Validator", palette: ["#c81e78", "#e84aa0", "#fce8f2"],
  },
  {
    key: "user", name: "User", icon: Users,
    desc: "Share your honest opinion as a real consumer, discover new products, and earn rewards.",
    examples: ["Consumer", "Student", "Shopper", "Everyday User"],
    cta: "Continue as User", palette: ["#0f9d6b", "#12b886", "#e6f6ef"],
  },
];

export default function VRoleSelect() {
  const navigate = useNavigate();

  const handlePick = (roleKey) => {
    navigate(`/validator/onboarding?role=${roleKey}`);
  };

  return (
    <div className="roleview">
      <header className="roleview-top">
        <BrandLogoFull />
        <LanguageSwitcher />
      </header>
      
      <div className="roleview-body">
        <div className="roleview-inner rise">
          <h1 className="role-h">Pick your role</h1>
          <p className="role-sub">Choose the description that fits you best — we'll tailor every step that follows.</p>
          
          <div className={`rolegrid cols-${ROLES.length}`}>
            {ROLES.map((r) => {
              const Icon = r.icon;
              return (
                <button 
                  key={r.key} 
                  type="button" 
                  className="rcard"
                  style={{ "--rc": r.palette[0], "--rc2": r.palette[1], "--rc-weak": r.palette[2] }}
                  onClick={() => handlePick(r.key)}
                >
                  <div className="rcard-top">
                    <span className="r-ic"><Icon size={20} /></span>
                    <h3>{r.name}</h3>
                  </div>
                  <p className="r-desc">{r.desc}</p>
                  <div className="r-examples">
                    {r.examples.map((e) => (
                      <span key={e} className="r-ex">{e}</span>
                    ))}
                  </div>
                  <span className="r-cta">
                    {r.cta}
                    <ArrowRight size={16} />
                  </span>
                </button>
              );
            })}
          </div>
          
          <p className="role-foot">Already a member? <a href="/validator/login" style={{ color: '#4f46e5', fontWeight: 600 }}>Sign in</a></p>
        </div>
      </div>
    </div>
  );
}
