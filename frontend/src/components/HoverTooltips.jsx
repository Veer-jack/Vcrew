import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// A plain CSS ::after tooltip on [data-tooltip] elements gets clipped by the
// sidebar's own overflow-y:auto (which forces overflow-x to clip too, per
// spec, once either axis is non-visible) — it can never render past the
// sidebar's right edge. This delegates hover on data-tooltip descendants of
// `containerRef` and renders one portaled, position:fixed tooltip instead,
// placed from the hovered element's real bounding box so it floats above
// the page like ChatGPT's, not clipped behind it.
export default function HoverTooltips({ containerRef }) {
  const [tip, setTip] = useState(null);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const onOver = (e) => {
      const el = e.target.closest("[data-tooltip]");
      if (!el || !el.dataset.tooltip) return;
      const r = el.getBoundingClientRect();
      setTip({ label: el.dataset.tooltip, top: r.top + r.height / 2, left: r.right + 10 });
    };
    const onOut = (e) => {
      if (e.target.closest("[data-tooltip]")) setTip(null);
    };
    root.addEventListener("mouseover", onOver);
    root.addEventListener("mouseout", onOut);
    return () => {
      root.removeEventListener("mouseover", onOver);
      root.removeEventListener("mouseout", onOut);
    };
  }, [containerRef]);

  if (!tip) return null;
  return createPortal(
    <div className="side-tooltip-portal" style={{ top: tip.top, left: tip.left }}>{tip.label}</div>,
    document.body
  );
}
