// Shared input-format checks used across builder/validator/admin auth forms.
// Mirrors backend/src/validators.js — keep the two in sync.
export const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export const isEmailValid = (email) => !!email && EMAIL_RE.test(email);
export const isPasswordValid = (pw) => !!pw && pw.trim().length >= 8;
