// Server-side Stripe integration for Builder wallet top-ups via Checkout.
// Needs STRIPE_SECRET_KEY (test mode: starts with sk_test_).

import Stripe from "stripe";

const SECRET_KEY = process.env.STRIPE_SECRET_KEY;
let client = null;

export function isStripeConfigured() {
  return !!SECRET_KEY;
}

export function getStripe() {
  if (!isStripeConfigured()) throw new Error("Card payments aren't configured on this server yet");
  if (!client) client = new Stripe(SECRET_KEY);
  return client;
}
