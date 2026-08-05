import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import Icon from "./Icon";

export function Modal({ title, children, onClose, width = 500, hideHeader = false, align = "center" }) {
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  // align="top" anchors near the top of the viewport instead of dead-center — opt-in,
  // so every other modal in the app keeps its existing centered position by default.
  const position = align === "top"
    ? { top: 80, left: "50%", transform: "translateX(-50%)" }
    : { top: "50%", left: "50%", transform: "translate(-50%,-50%)" };

  return createPortal(
    <div style={{ display: "contents" }}>
      <div className="notif-overlay" onClick={onClose} style={{ zIndex: 60 }} />
      <div style={{ position: "fixed", ...position, width: width, maxWidth: "92vw", zIndex: 61, maxHeight: "85vh", display: "flex", flexDirection: "column" }}>
        <div className="rise" style={{ background: "var(--panel)", border: "var(--hairline) solid var(--border)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-lg)", width: "100%", maxHeight: "100%", display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
          {!hideHeader && (
            <div className="row between" style={{ padding: "16px 20px", borderBottom: "var(--hairline) solid var(--border)", flexShrink: 0 }}>
              <b style={{ fontSize: 16 }}>{title}</b>
              <button className="icon-btn" aria-label="Close" style={{ width: 30, height: 30 }} onClick={onClose}><Icon name="x" size={15} /></button>
            </div>
          )}
          {hideHeader ? (
            children
          ) : (
            <div style={{ paddingTop: 16, overflowY: "auto", flex: 1 }}>
              {children}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
