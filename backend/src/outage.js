/**
 * outage.js — Graceful degradation helpers for third-party service failures.
 *
 * None of these block requests or crash the server. They detect known outage
 * patterns from error messages/codes and return user-friendly messages + an
 * is_outage flag so the frontend can show appropriate UI (e.g. "Payments are
 * temporarily unavailable — your wallet balance is not affected, try again in
 * a few minutes" rather than a generic 500 error).
 */

// Known Razorpay outage / misconfiguration error patterns
const RAZORPAY_OUTAGE_PATTERNS = [
  /network.*error/i,
  /ECONNREFUSED/i,
  /ETIMEDOUT/i,
  /ENOTFOUND/i,
  /502|503|504/,
  /service.*unavailable/i,
  /bad gateway/i,
];

const FIREBASE_OUTAGE_PATTERNS = [
  /NETWORK_ERROR/i,
  /ECONNREFUSED/i,
  /ETIMEDOUT/i,
  /503/,
  /service.*unavailable/i,
];

function isOutage(err, patterns) {
  const msg = err?.message || String(err);
  return patterns.some(p => p.test(msg));
}

export function handleRazorpayError(err, res) {
  if (isOutage(err, RAZORPAY_OUTAGE_PATTERNS)) {
    return res.status(503).json({
      error: "Payments are temporarily unavailable. Your wallet balance is not affected — please try again in a few minutes.",
      is_outage: true,
      provider: "razorpay",
    });
  }
  // Known Razorpay API errors (bad request, invalid params etc.)
  return res.status(400).json({ error: err.message || "Payment request failed" });
}

export function handleFirebaseError(err, res) {
  if (isOutage(err, FIREBASE_OUTAGE_PATTERNS)) {
    return res.status(503).json({
      error: "Phone verification is temporarily unavailable. Please use email/password or try again in a few minutes.",
      is_outage: true,
      provider: "firebase",
    });
  }
  // Firebase token errors (invalid, expired, wrong project etc.)
  const msg = err?.message || "";
  if (msg.includes("ID token") || msg.includes("Firebase") || msg.includes("token")) {
    return res.status(401).json({ error: "Phone verification failed — the code may have expired. Please request a new one." });
  }
  return res.status(400).json({ error: "Phone verification failed" });
}
