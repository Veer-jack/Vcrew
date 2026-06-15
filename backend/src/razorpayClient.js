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
