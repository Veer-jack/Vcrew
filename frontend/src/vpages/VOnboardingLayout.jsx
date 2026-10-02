import React from "react";
import Icon from "../components/Icon";
import { BrandLogoFull } from "../components/BrandMark";

export function VTopProgressBar({ steps, current, maxReached, onJump, color }) {
  const pct = steps.length > 0 ? Math.round((current / steps.length) * 100) : 0;
  
  return (
    <div style={{ display: "flex", alignItems: "center", flex: 1, margin: "0 32px", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", flex: 1, gap: 12 }}>
        {steps.map((s, i) => {
          const state = i < current ? "done" : i === current ? "current" : "upcoming";
          const reachable = i <= maxReached;
          const isCompletedOrActive = i <= current;
          
          return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
              <div
                style={{
                  height: 3,
                  borderRadius: 2,
                  background: isCompletedOrActive ? color : "var(--border)",
                  width: "100%",
                  transition: "background 0.2s ease"
                }}
              />
              <button
                type="button"
                disabled={!reachable}
                onClick={() => reachable && onJump(i)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  cursor: reachable ? "pointer" : "default",
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  color: state === "upcoming" ? "var(--text-muted)" : "var(--text)",
                  fontWeight: state === "current" ? 700 : state === "done" ? 600 : 500,
                  fontSize: 13,
                  whiteSpace: "nowrap",
                  textAlign: "left"
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    background: state === "done" ? color : state === "current" ? color : "#F1F5F9",
                    color: state === "upcoming" ? "var(--text-muted)" : "#ffffff",
                    fontSize: 12,
                    fontWeight: 700
                  }}
                >
                  {state === "done" ? <Icon name="check" size={12} strokeWidth={2.6} /> : i + 1}
                </div>
                <span>{s}</span>
              </button>
            </div>
          );
        })}
      </div>
      <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text)", minWidth: 36, textAlign: "right" }}>
        {pct}%
      </div>
    </div>
  );
}

export function VProfileStrengthCard({ steps, current, color, memberType = "Basic Member" }) {
  const displaySteps = steps.length > 0 ? steps : [
    "Personal details",
    "Experience verified",
    "Testing experience",
    "Testing areas",
    "Professional info",
    "Devices added",
    "Interests",
    "Reward set"
  ];
  
  const completedItems = steps.length > 0 ? current : 0;
  const pct = displaySteps.length > 0 ? Math.round((completedItems / displaySteps.length) * 100) : 0;
  
  const radius = 42;
  const stroke = 8;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  return (
    <div style={{ background: "var(--panel)", borderRadius: 16, border: "1px solid var(--border)", width: 320, alignSelf: "flex-start", padding: "32px 24px", position: "sticky", top: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 28 }}>
        <div style={{ position: "relative", width: 84, height: 84, display: "grid", placeItems: "center", flexShrink: 0 }}>
          <svg height={84} width={84} style={{ position: "absolute", top: 0, left: 0, transform: "rotate(-90deg)" }}>
            <circle
              stroke="var(--panel-inset)"
              fill="transparent"
              strokeWidth={stroke}
              r={normalizedRadius}
              cx={42}
              cy={42}
            />
            <circle
              stroke={color}
              fill="transparent"
              strokeWidth={stroke}
              strokeDasharray={circumference + " " + circumference}
              style={{ strokeDashoffset, transition: "stroke-dashoffset 0.5s ease" }}
              strokeLinecap="round"
              r={normalizedRadius}
              cx={42}
              cy={42}
            />
          </svg>
          <div style={{ textAlign: "center", marginTop: -2 }}>
            <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1 }}>{pct}</div>
            <div style={{ fontSize: 10, color: "var(--text-faint)", fontWeight: 600, marginTop: 4 }}>/100</div>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".08em", color: "var(--text-faint)", textTransform: "uppercase", marginBottom: 6 }}>PROFILE STRENGTH</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#059669" }}>{memberType}</div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {displaySteps.map((s, i) => {
          const isDone = i < completedItems;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: i < displaySteps.length - 1 ? "1px solid var(--border)" : "none" }}>
              <div style={{ width: 22, height: 22, borderRadius: "50%", border: isDone ? "none" : "1px solid #cbd5e1", background: isDone ? "#059669" : "transparent", color: isDone ? "#fff" : "#94a3b8", display: "grid", placeItems: "center", flexShrink: 0 }}>
                <Icon name="check" size={12} strokeWidth={isDone ? 3 : 2.5} />
              </div>
              <span style={{ fontSize: 14, fontWeight: isDone ? 700 : 600, color: isDone ? "var(--text)" : "var(--text-muted)" }}>{s}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function VOnboardingLayout({ roleName, color, steps, currentStep, maxReached, onJump, onBack, onSkip, onNext, formId, nextDisabled, nextLabel, children }) {
  let memberType = "Basic Member";
  if (roleName === "Tester" || roleName === "Verified Tester") memberType = "Elite Tester";
  else if (roleName === "Validator") memberType = "Expert Validator";
  else if (roleName === "User") memberType = "Power Contributor";

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "#f8fafc", "--accent": color, "--primary": color, "--primary-weak": color + "1a", "--primary-dark": color }}>
      <header style={{ padding: "0 24px", height: 64, borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", background: "#fff", position: "sticky", top: 0, zIndex: 10 }}>
        <BrandLogoFull height={28} />
        <span style={{ color: "var(--border)", margin: "0 16px", fontSize: 18, fontWeight: 300 }}>|</span>
        <div style={{ fontSize: 16, fontWeight: 700, whiteSpace: "nowrap" }}>{roleName} setup</div>
        
        <VTopProgressBar steps={steps} current={currentStep} maxReached={maxReached} onJump={onJump} color={color} />
        
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 18px", borderRadius: 50, background: "#fff", color: "#1e293b", fontWeight: 700, fontSize: 14, whiteSpace: "nowrap", border: "1px solid #e2e8f0" }}>
            <div style={{ width: 24, height: 24, borderRadius: "50%", background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon name="star" size={13} fill={color} style={{ color }} />
            </div>
            {memberType}
          </div>
          <div style={{ width: 44, height: 3, borderRadius: 2, background: color }} />
        </div>
      </header>

      <div style={{ flex: 1, padding: "40px 24px", maxWidth: 1200, margin: "0 auto", width: "100%", display: "flex", gap: 40, paddingBottom: 100 }}>
        <div style={{ flex: 1, maxWidth: 720 }}>
          {children}
        </div>
        
        <VProfileStrengthCard steps={steps} current={currentStep} color={color} memberType={memberType} />
      </div>

      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#fff", borderTop: "1px solid var(--border)", zIndex: 40 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", width: "100%", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button type="button" onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "1px solid var(--border)", color: "var(--text)", padding: "10px 16px", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: 14 }}>
              <Icon name="arrowLeft" size={16} /> {currentStep === 0 ? "Roles" : "Back"}
            </button>
            <button type="button" onClick={onSkip} style={{ background: "transparent", border: "none", color: "var(--text-muted)", fontWeight: 600, padding: "10px 16px", cursor: "pointer", fontSize: 14 }}>
              Skip
            </button>
          </div>
          {formId ? (
            <button type="submit" form={formId} style={{ background: color, color: "#fff", border: "none", padding: "12px 24px", borderRadius: 8, fontWeight: 600, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 12px " + color + "40" }}>
              {nextLabel || "Continue"} <Icon name="arrowRight" size={16} />
            </button>
          ) : (
            <button type="button" onClick={onNext} disabled={nextDisabled} style={{ background: color, color: "#fff", border: "none", padding: "12px 24px", borderRadius: 8, fontWeight: 600, fontSize: 15, cursor: nextDisabled ? "not-allowed" : "pointer", opacity: nextDisabled ? 0.5 : 1, display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 12px " + color + "40" }}>
              {nextLabel || "Continue"} <Icon name="arrowRight" size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
