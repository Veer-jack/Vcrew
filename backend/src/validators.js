// Shared input-format checks used across builder/validator/admin auth routes.
export const isValidEmail = (email) => !!email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
export const isValidPassword = (pw) => !!pw && String(pw).trim().length >= 8;
export const isSixDigitCode = (code) => /^\d{6}$/.test(String(code || "").trim());
