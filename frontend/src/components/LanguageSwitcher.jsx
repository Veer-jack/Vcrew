import { useState } from "react";
import { useTranslation, LANGUAGES } from "../i18n/index.jsx";
import Icon from "./Icon";

/**
 * LanguageSwitcher — dropdown to change the UI language.
 * Saves the preference to localStorage immediately (for instant feedback)
 * and optionally calls onSave(langCode) to persist to the server.
 */
export default function LanguageSwitcher({ onSave, style }) {
  const { lang, setLang, t } = useTranslation();
  const [open, setOpen] = useState(false);

  const select = (code) => {
    setLang(code);
    setOpen(false);
    if (onSave) onSave(code);
  };

  const current = LANGUAGES[lang] || LANGUAGES.en;

  return (
    <div style={{ position: "relative", ...style }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="btn btn-ghost"
        style={{ gap: 7, fontSize: 13.5 }}
        aria-label={t("settings.language")}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span>{current.flag}</span>
        <span>{current.nativeName}</span>
        <Icon name="chevronDown" size={13} />
      </button>

      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 49 }} onClick={() => setOpen(false)} />
          <div
            role="listbox"
            aria-label="Select language"
            style={{
              position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 50,
              background: "var(--bg)", border: "1px solid var(--border)",
              borderRadius: "var(--radius)", boxShadow: "var(--shadow-md)",
              minWidth: 200, padding: "6px 0", maxHeight: 320, overflowY: "auto",
            }}
          >
            {Object.entries(LANGUAGES).map(([code, meta]) => (
              <button
                key={code}
                role="option"
                aria-selected={code === lang}
                type="button"
                onClick={() => select(code)}
                style={{
                  display: "flex", alignItems: "center", gap: 10, width: "100%",
                  padding: "9px 14px", background: code === lang ? "var(--accent-weak)" : "none",
                  border: "none", cursor: "pointer", textAlign: "left",
                  color: code === lang ? "var(--accent)" : "var(--text)",
                  fontSize: 13.5, fontFamily: "inherit",
                }}
              >
                <span style={{ fontSize: 18 }}>{meta.flag}</span>
                <div>
                  <div style={{ fontWeight: code === lang ? 700 : 500 }}>{meta.nativeName}</div>
                  <div style={{ fontSize: 11, color: "var(--text-faint)" }}>{meta.name}</div>
                </div>
                {code === lang && <Icon name="check" size={14} style={{ marginLeft: "auto", color: "var(--accent)" }} />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
