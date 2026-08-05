import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function useUnsavedChangesWarning(isDirty, message = "You have unsaved changes. Are you sure you want to leave?") {
  const location = useLocation();

  useEffect(() => {
    if (!isDirty) return;

    // 1. Intercept refresh or closing the tab
    const handleBeforeUnload = (e) => {
      if (window.__bypassUnload) return;
      e.preventDefault();
      e.returnValue = message;
      return message;
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    // 2. Intercept browser back button
    // Push a dummy state so the first 'back' click pops this instead of leaving the page
    // We use a flag (vcBypass) to ensure we don't push multiple dummy states in React Strict Mode
    if (!window.history.state || !window.history.state.vcBypass) {
      window.history.pushState({ ...window.history.state, vcBypass: true }, null, window.location.href);
    }

    const handlePopState = () => {
      if (window.__bypassUnload) {
        window.removeEventListener("popstate", handlePopState);
        return window.history.back();
      }
      if (window.confirm(message)) {
        // User confirmed: remove the listener so we don't trap them again, and go back
        window.removeEventListener("popstate", handlePopState);
        window.history.back();
      } else {
        // User canceled: push the dummy state again to re-trap the back button
        window.history.pushState({ ...window.history.state, vcBypass: true }, null, window.location.href);
      }
    };
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isDirty, message, location.href]);
}
