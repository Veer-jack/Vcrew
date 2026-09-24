import crypto from "node:crypto";
// Server-side Cashfree integration — replaces razorpayClient.js.
// Two separate Cashfree products, same as before (Razorpay + RazorpayX):
//   1. Payment Gateway (PG)  — Builder wallet top-ups (collections)
//   2. Payouts v2            — Validator withdrawals (payouts)
//
// ENV VARS NEEDED:
//   CASHFREE_ENV                  "sandbox" or "production" (default: sandbox)
//   CASHFREE_CLIENT_ID             PG app id
//   CASHFREE_CLIENT_SECRET         PG secret key
//   CASHFREE_PAYOUT_CLIENT_ID      Payouts app id (separate product/dashboard)
//   CASHFREE_PAYOUT_CLIENT_SECRET  Payouts secret key
//
// API version pinned explicitly (rather than "latest") so a Cashfree-side
// version bump doesn't silently change response shapes under us. Bump this
// deliberately, read the changelog, and update parsing code to match.
const PG_API_VERSION = "2023-08-01";
const PAYOUT_API_VERSION = "2024-01-01";

const ENV = (process.env.CASHFREE_ENV || "sandbox").toLowerCase();
const PG_BASE = ENV === "production" ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg";
const PAYOUT_BASE = ENV === "production" ? "https://api.cashfree.com/payout" : "https://sandbox.cashfree.com/payout";

/* ============================== Payment Gateway (collections) ============================== */

const CLIENT_ID = process.env.CASHFREE_CLIENT_ID;
const CLIENT_SECRET = process.env.CASHFREE_CLIENT_SECRET;

export function isCashfreeConfigured() {
  return !!(CLIENT_ID && CLIENT_SECRET);
}

function pgHeaders() {
  return {
    "Content-Type": "application/json",
    "x-api-version": PG_API_VERSION,
    "x-client-id": CLIENT_ID,
    "x-client-secret": CLIENT_SECRET,
  };
}

// amountRupees is in rupees (matches the old razorpayClient signature).
// customer is required by Cashfree (unlike Razorpay) — pass at least an id + phone.
// Returns { order_id, payment_session_id, cf_order_id, ... } — the frontend
// uses payment_session_id to open Cashfree's hosted checkout (different from
// Razorpay, which used the raw order id directly).
export async function createOrder(amountRupees, receipt, customer = {}) {
  if (!isCashfreeConfigured()) throw new Error("Card payments aren't configured on this server yet");

  const orderId = receipt || `order_${Date.now()}`;

  const res = await fetch(`${PG_BASE}/orders`, {
    method: "POST",
    headers: pgHeaders(),
    body: JSON.stringify({
      order_id: orderId,
      order_amount: Number(amountRupees.toFixed(2)),
      order_currency: "INR",
      customer_details: {
        customer_id: customer.id || orderId,
        customer_name: customer.name || "ValidationCrew Builder",
        customer_email: customer.email || "no-reply@validationcrew.com",
        customer_phone: customer.phone || "9999999999",
      },
    }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || `Failed to create order (${res.status})`);
  return data; // { cf_order_id, order_id, payment_session_id, ... }
}

// Verifies a webhook payload's authenticity using the signature + timestamp
// headers Cashfree sends. rawBody must be the UNPARSED request body string
// (signature is computed over the exact bytes sent) — see server.js note below.
export function verifyWebhookSignature({ rawBody, signature, timestamp }) {
  if (!rawBody || !signature || !timestamp) return false;
  const expected = crypto
    .createHmac("sha256", CLIENT_SECRET)
    .update(timestamp + rawBody)
    .digest("base64");
  return expected === signature;
}

// Fetches order status directly from Cashfree — use as the source of truth
// after a webhook fires or when polling from the return_url redirect, since
// the frontend redirect alone is not proof of payment.
export async function getOrder(orderId) {
  if (!isCashfreeConfigured()) throw new Error("Card payments aren't configured on this server yet");
  const res = await fetch(`${PG_BASE}/orders/${orderId}`, {
    method: "GET",
    headers: pgHeaders(),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || `Failed to fetch order (${res.status})`);
  return data; // includes order_status: "PAID" | "ACTIVE" | "EXPIRED" | "TERMINATED"
}

/* ============================== Payouts v2 (Validator withdrawals) ============================== */
// Separate product/dashboard from PG above — its own credentials.

const PAYOUT_CLIENT_ID = process.env.CASHFREE_PAYOUT_CLIENT_ID;
const PAYOUT_CLIENT_SECRET = process.env.CASHFREE_PAYOUT_CLIENT_SECRET;

export function isCashfreePayoutsConfigured() {
  return !!(PAYOUT_CLIENT_ID && PAYOUT_CLIENT_SECRET);
}

function payoutHeaders() {
  return {
    "Content-Type": "application/json",
    "x-api-version": PAYOUT_API_VERSION,
    "x-client-id": PAYOUT_CLIENT_ID,
    "x-client-secret": PAYOUT_CLIENT_SECRET,
  };
}

async function payoutRequest(method, path, body) {
  if (!isCashfreePayoutsConfigured()) throw new Error("Payouts aren't configured on this server yet");
  const res = await fetch(`${PAYOUT_BASE}${path}`, {
    method,
    headers: payoutHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || `Payout request failed (${res.status})`);
  return data;
}

// Creates (or re-uses, if beneficiary_id already exists) a beneficiary
// representing the validator. Cashfree combines what RazorpayX split into
// createContact + createFundAccount into this one call.
// beneficiaryId should be stable/deterministic per validator (e.g. `val_<id>`)
// so repeat calls are idempotent — cache it on the validator record like the
// old contactId/fundAccountId were cached.
export function createBeneficiary({ beneficiaryId, name, email, phone, vpa }) {
  return payoutRequest("POST", "/beneficiary", {
    beneficiary_id: beneficiaryId,
    beneficiary_name: name,
    beneficiary_instrument_details: { vpa },
    beneficiary_contact_details: {
      beneficiary_email: email,
      beneficiary_phone: phone,
      beneficiary_country_code: "+91",
    },
  });
}

// Initiates a payout to a previously-created beneficiary. amountRupees is in rupees.
// transferId must be unique per attempt — on retry, generate a NEW transferId,
// never reuse a failed one (matches Cashfree's documented retry guidance).
export function createTransfer({ beneficiaryId, amountRupees, transferId, remarks }) {
  return payoutRequest("POST", "/transfers", {
    transfer_id: transferId,
    transfer_amount: Number(amountRupees.toFixed(2)),
    transfer_mode: "upi",
    beneficiary_details: { beneficiary_id: beneficiaryId },
    transfer_remarks: remarks || "ValidationCrew earnings withdrawal",
  });
}

// Polls transfer status — response includes a terminal status
// (SUCCESS / FAILED / REVERSED) or "RECEIVED"/"PENDING" if still processing.
// Do not treat "RECEIVED" as success — poll again or wait for the webhook.
export function getTransferStatus(transferId) {
  return payoutRequest("GET", `/transfers?transfer_id=${encodeURIComponent(transferId)}`);
}
