import { createContext, useContext, useEffect, useState } from "react";
import { LANGUAGES, DEFAULT_LANG, detectLangFromBrowser } from "./languages.js";

// Lazy-load translation files to keep the initial bundle small
const LOADERS = {
  en: () => import("./en.js").then(m => m.default),
  hi: () => import("./hi.js").then(m => m.default),
  zh: () => import("./zh.js").then(m => m.default),
  es: () => import("./es.js").then(m => m.default),
  ar: () => import("./ar.js").then(m => m.default),
  fr: () => import("./fr.js").then(m => m.default),
  bn: () => import("./bn.js").then(m => m.default),
  pt: () => import("./pt.js").then(m => m.default),
  ru: () => import("./ru.js").then(m => m.default),
  ur: () => import("./ur.js").then(m => m.default),
};

const STORAGE_KEY = "vc_lang";

// Resolve a dot-notated key path through a nested object
function resolve(obj, path) {
  return path.split(".").reduce((cur, k) => (cur && cur[k] !== undefined ? cur[k] : null), obj);
}

// Replace {{variable}} placeholders with values from params object
function interpolate(str, params) {
  if (!params || typeof str !== "string") return str;
  return str.replace(/\{\{(\w+)\}\}/g, (_, k) => (params[k] !== undefined ? params[k] : `{{${k}}}`));
}

export const I18nContext = createContext(null);

export function I18nProvider({ children, initialLang }) {
  const stored = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
  const startLang = (stored && LANGUAGES[stored]) ? stored : (initialLang || detectLangFromBrowser());

  const [lang, setLangState] = useState(startLang);
  const [strings, setStrings] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadStrings = async (code) => {
    setLoading(true);
    try {
      const loader = LOADERS[code] || LOADERS[DEFAULT_LANG];
      const data = await loader();
      setStrings(data);
      setLangState(code);
      if (typeof localStorage !== "undefined") localStorage.setItem(STORAGE_KEY, code);
      // Apply text direction to the document
      const dir = LANGUAGES[code]?.dir || "ltr";
      document.documentElement.setAttribute("dir", dir);
      document.documentElement.setAttribute("lang", code);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStrings(startLang); }, []);

  const setLang = (code) => {
    if (!LANGUAGES[code]) return;
    loadStrings(code);
  };

  // t(key, params?) — translate a dot-notated key with optional interpolation
  // e.g. t("auth.welcomeBack") or t("auth.resetLinkSent", { email: "x@y.com" })
  const t = (key, params) => {
    if (!strings) return ""; // loading
    const val = resolve(strings, key);
    if (val === null) {
      console.warn(`[i18n] Missing key: ${key} (lang: ${lang})`);
      return key; // return the key path as fallback so it's visible in UI
    }
    return interpolate(val, params);
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t, strings, loading, dir: LANGUAGES[lang]?.dir || "ltr" }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useTranslation must be used inside I18nProvider");
  return ctx;
}

// Convenience re-export so components can do: import { t } from "../i18n"
// Note: this is a static reference — always use the hook in components for reactivity.
export { LANGUAGES };
