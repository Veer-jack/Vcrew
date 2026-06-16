// Lightweight wrapper around the GA4 gtag.js snippet loaded in index.html.
// Centralized here so all three apps (builder, validator, admin) report
// pageviews consistently as the SPA's client-side router changes routes.

export const GA_MEASUREMENT_ID = "G-CD8VXJHL8J";

export function trackPageview(path) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", "page_view", {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  });
}

export function trackEvent(name, params = {}) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", name, params);
}
