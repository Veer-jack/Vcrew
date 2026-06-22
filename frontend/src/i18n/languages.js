// Language metadata for the top 10 languages by global speakers.
// Code follows BCP 47 / ISO 639-1.

export const LANGUAGES = {
  en: { name: "English",    nativeName: "English",    dir: "ltr", flag: "🇬🇧" },
  hi: { name: "Hindi",      nativeName: "हिन्दी",       dir: "ltr", flag: "🇮🇳" },
  zh: { name: "Mandarin",   nativeName: "中文",         dir: "ltr", flag: "🇨🇳" },
  es: { name: "Spanish",    nativeName: "Español",     dir: "ltr", flag: "🇪🇸" },
  ar: { name: "Arabic",     nativeName: "العربية",      dir: "rtl", flag: "🇸🇦" },
  fr: { name: "French",     nativeName: "Français",    dir: "ltr", flag: "🇫🇷" },
  bn: { name: "Bengali",    nativeName: "বাংলা",        dir: "ltr", flag: "🇧🇩" },
  pt: { name: "Portuguese", nativeName: "Português",   dir: "ltr", flag: "🇧🇷" },
  ru: { name: "Russian",    nativeName: "Русский",     dir: "ltr", flag: "🇷🇺" },
  ur: { name: "Urdu",       nativeName: "اردو",         dir: "rtl", flag: "🇵🇰" },
};

export const DEFAULT_LANG = "en";

// Map phone country codes (+XX) to a default language.
// Users can always override this in their profile settings.
export const COUNTRY_CODE_TO_LANG = {
  "+91":  "hi", // India → Hindi
  "+92":  "ur", // Pakistan → Urdu
  "+86":  "zh", // China → Mandarin
  "+886": "zh", // Taiwan → Mandarin
  "+852": "zh", // Hong Kong → Mandarin
  "+34":  "es", // Spain → Spanish
  "+52":  "es", // Mexico → Spanish
  "+54":  "es", // Argentina → Spanish
  "+57":  "es", // Colombia → Spanish
  "+58":  "es", // Venezuela → Spanish
  "+51":  "es", // Peru → Spanish
  "+56":  "es", // Chile → Spanish
  "+966": "ar", // Saudi Arabia → Arabic
  "+971": "ar", // UAE → Arabic
  "+20":  "ar", // Egypt → Arabic
  "+962": "ar", // Jordan → Arabic
  "+965": "ar", // Kuwait → Arabic
  "+213": "ar", // Algeria → Arabic
  "+216": "ar", // Tunisia → Arabic
  "+33":  "fr", // France → French
  "+32":  "fr", // Belgium → French
  "+41":  "fr", // Switzerland → French (approx)
  "+225": "fr", // Ivory Coast → French
  "+880": "bn", // Bangladesh → Bengali
  "+55":  "pt", // Brazil → Portuguese
  "+351": "pt", // Portugal → Portuguese
  "+7":   "ru", // Russia → Russian
  "+380": "ru", // Ukraine → Russian (approx)
  "+92":  "ur", // Pakistan → Urdu
};

export function detectLangFromCountryCode(cc) {
  return COUNTRY_CODE_TO_LANG[cc] || DEFAULT_LANG;
}

export function detectLangFromBrowser() {
  const nav = navigator?.language || navigator?.userLanguage || "en";
  const code = nav.split("-")[0].toLowerCase();
  return LANGUAGES[code] ? code : DEFAULT_LANG;
}
