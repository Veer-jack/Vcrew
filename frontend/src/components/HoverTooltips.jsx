import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// A plain CSS ::after tooltip on [data-tooltip] elements risks getting
// clipped by any scrollable ancestor (overflow-y:auto forces overflow-x to
// clip too, per spec, once either axis is non-visible) — it can silently
// stop rendering past that ancestor's edge. This delegates hover on
// data-tooltip descendants of `containerRef` (or the whole document, if
// omitted — mount one instance at the app root to cover every page) and
// renders one portaled, position:fixed tooltip instead, placed from the
// hovered element's real bounding box so it always floats above the page.
export default function HoverTooltips({ containerRef }) {
  const [tip, setTip] = useState(null);

  useEffect(() => {
    const root = containerRef?.current || document;
    const onOver = (e) => {
      const el = e.target.closest("[data-tooltip]");
      if (!el || !el.dataset.tooltip) return;
      const r = el.getBoundingClientRect();
      setTip({ label: el.dataset.tooltip, top: r.top + r.height / 2, left: r.right + 10 });
    };
    const onOut = (e) => {
      if (e.target.closest("[data-tooltip]")) setTip(null);
    };
    // A click that removes the hovered element (Delete Task, a step-rail
    // jump that unmounts the current step, etc.) never fires a real mouseout
    // — the element's just gone, no pointer movement happened — leaving the
    // tooltip floating with nothing under it. Any mousedown anywhere is a
    // reliable enough signal that the hover context is over.
    const onDown = () => setTip(null);
    root.addEventListener("mouseover", onOver);
    root.addEventListener("mouseout", onOut);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("scroll", onDown, { capture: true, passive: true });
    document.addEventListener("wheel", onDown, { capture: true, passive: true });
    return () => {
      root.removeEventListener("mouseover", onOver);
      root.removeEventListener("mouseout", onOut);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("scroll", onDown, { capture: true });
      document.removeEventListener("wheel", onDown, { capture: true });
    };
  }, [containerRef]);

  if (!tip) return null;
  return createPortal(
    <div className="side-tooltip-portal" style={{ top: tip.top, left: tip.left }}>{tip.label}</div>,
    document.body
  );
}
