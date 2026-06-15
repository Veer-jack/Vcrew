// Server-side Razorpay integration for Builder wallet top-ups.
// Needs RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET (test mode: rzp_test_...).
// Talks to Razorpay's REST API directly — no SDK needed.

import crypto from "node:crypto";

const KEY_ID = process.env.RAZORPAY_KEY_ID;
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

export function isRazorpayConfigured() {
  return !!(KEY_ID && KEY_SECRET);
}

export function razorpayKeyId() {
  return KEY_ID;
}

function authHeader() {
  return "Basic " + Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString("base64");
}

// amount is in rupees; Razorpay expects paise.
export async function createOrder(amountRupees, receipt) {
  if (!isRazorpayConfigured()) throw new Error("Card payments aren't configured on this server yet");

  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: Math.round(amountRupees * 100),
      currency: "INR",
      receipt,
    }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error?.description || `Failed to create order (${res.status})`);
  return data; // { id, amount, currency, ... }
}

// Verifies the signature Razorpay's checkout returns after a successful payment.
export function verifySignature({ orderId, paymentId, signature }) {
  if (!orderId || !paymentId || !signature) return false;
  const expected = crypto.createHmac("sha256", KEY_SECRET).update(`${orderId}|${paymentId}`).digest("hex");
  return expected === signature;
}

/* ============ RazorpayX Payouts (Validator withdrawals) ============ */
// Separate product/dashboard from the Payments gateway above. Needs its own
// RAZORPAYX_KEY_ID / RAZORPAYX_KEY_SECRET / RAZORPAYX_ACCOUNT_NUMBER (the
// business account payouts are made from).

const X_KEY_ID = process.env.RAZORPAYX_KEY_ID;
const X_KEY_SECRET = process.env.RAZORPAYX_KEY_SECRET;
const X_ACCOUNT_NUMBER = process.env.RAZORPAYX_ACCOUNT_NUMBER;

export function isRazorpayXConfigured() {
  return !!(X_KEY_ID && X_KEY_SECRET && X_ACCOUNT_NUMBER);
}

function xAuthHeader() {
  return "Basic " + Buffer.from(`${X_KEY_ID}:${X_KEY_SECRET}`).toString("base64");
}

async function xRequest(path, body) {
  if (!isRazorpayXConfigured()) throw new Error("Payouts aren't configured on this server yet");
  const res = await fetch(`https://api.razorpay.com/v1/${path}`, {
    method: "POST",
    headers: { Authorization: xAuthHeader(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error?.description || `Request failed (${res.status})`);
  return data;
}

// Creates a RazorpayX Contact representing the validator (one-time, cached on the validator record).
export function createContact({ name, email, reference_id }) {
  return xRequest("contacts", { name, email, type: "vendor", reference_id });
}

// Creates a Fund Account (UPI VPA) for a Contact (one-time, cached on the validator record).
export function createFundAccount({ contactId, vpa }) {
  return xRequest("fund_accounts", {
    contact_id: contactId,
    account_type: "vpa",
    vpa: { address: vpa },
  });
}

// Initiates a payout to a Fund Account. amountRupees is in rupees.
export function createPayout({ fundAccountId, amountRupees, referenceId, narration }) {
  return xRequest("payouts", {
    account_number: X_ACCOUNT_NUMBER,
    fund_account_id: fundAccountId,
    amount: Math.round(amountRupees * 100),
    currency: "INR",
    mode: "UPI",
    purpose: "payout",
    queue_if_low_balance: true,
    reference_id: referenceId,
    narration: narration || "ValidationCrew earnings withdrawal",
  });
}
