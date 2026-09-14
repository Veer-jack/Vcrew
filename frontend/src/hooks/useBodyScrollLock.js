import { useEffect } from "react";

// A fixed, full-viewport overlay (drawer/modal) doesn't stop the page
// underneath from scrolling on its own — wheel/touch events over the
// backdrop still reach the document, so you get two independent
// scrollbars fighting each other. Locking body scroll while the overlay
// is mounted is the standard fix.
export default function useBodyScrollLock() {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);
}
