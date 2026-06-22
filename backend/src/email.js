/**
 * email.js — Shared email sending via Resend
 *
 * Gracefully no-ops when RESEND_API_KEY is not set (dev / early deploy).
 * All emails are also logged to console so you can see what would be sent.
 *
 * Setup:
 *   1. Create an account at resend.com
 *   2. Verify your sending domain (validationcrew.app)
 *   3. Add RESEND_API_KEY to Railway environment variables
 */

import { Resend } from "resend";

const FROM_BUILDER = "ValidationCrew <builders@validationcrew.app>";
const FROM_VALIDATOR = "ValidationCrew <crew@validationcrew.app>";
const FROM_NOREPLY = "ValidationCrew <noreply@validationcrew.app>";

const APP_URL = process.env.APP_URL || "https://vcrew-production.up.railway.app";

let resend = null;
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
} else {
  console.warn("[email] RESEND_API_KEY not set — emails will be logged but not sent.");
}

async function send({ from, to, subject, html, text }) {
  const preview = `${subject} → ${to}`;
  if (!resend) {
    console.log(`[email SKIPPED] ${preview}`);
    return { ok: true, skipped: true };
  }
  try {
    const { data, error } = await resend.emails.send({ from, to, subject, html, text });
    if (error) { console.error(`[email ERROR] ${preview}:`, error); return { ok: false, error }; }
    console.log(`[email SENT] ${preview} id=${data.id}`);
    return { ok: true, id: data.id };
  } catch (err) {
    console.error(`[email EXCEPTION] ${preview}:`, err.message);
    return { ok: false, error: err.message };
  }
}

/* ============ Email templates ============ */

function baseLayout(content, footerText = "You're receiving this because you have a ValidationCrew account.") {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f7fb;margin:0;padding:24px}
.card{max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #e5e7eb}
.logo{font-weight:800;font-size:18px;color:#4f46e5;margin-bottom:24px}
h1{font-size:22px;font-weight:700;color:#111827;margin:0 0 10px}
p{font-size:14.5px;line-height:1.6;color:#4b5563;margin:0 0 16px}
.btn{display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;margin:8px 0 16px}
.divider{border:none;border-top:1px solid #e5e7eb;margin:20px 0}
.footer{font-size:12px;color:#9ca3af;margin-top:20px}
.code{font-family:monospace;font-size:20px;font-weight:700;letter-spacing:0.1em;color:#4f46e5;background:#eef0ff;padding:10px 18px;border-radius:6px;display:inline-block}
</style></head><body>
<div class="card">
  <div class="logo">ValidationCrew</div>
  ${content}
  <hr class="divider">
  <div class="footer">${footerText}</div>
</div></body></html>`;
}

/* ---- Welcome emails ---- */

export async function sendBuilderWelcome({ name, email, org }) {
  const html = baseLayout(`
    <h1>Welcome to ValidationCrew, ${name.split(" ")[0]} 👋</h1>
    <p>Your <strong>${org}</strong> workspace is ready. You can now create validation campaigns and get real feedback from vetted validators.</p>
    <a class="btn" href="${APP_URL}/">Go to my dashboard</a>
    <p>Not sure where to start? Try creating your first mission — it takes about 5 minutes.</p>
  `);
  return send({ from: FROM_BUILDER, to: email, subject: `Welcome to ValidationCrew, ${name.split(" ")[0]}`, html });
}

export async function sendValidatorWelcome({ name, email }) {
  const html = baseLayout(`
    <h1>Welcome to the Crew, ${name.split(" ")[0]} 🎉</h1>
    <p>Your validator profile is live. Head to the Discover tab to find missions that match your expertise and start earning.</p>
    <a class="btn" href="${APP_URL}/validator">Explore missions</a>
    <p>The more high-signal reviews you give, the higher-paying the missions you unlock.</p>
  `, "You joined ValidationCrew as a Validator.");
  return send({ from: FROM_VALIDATOR, to: email, subject: `Welcome to the Crew, ${name.split(" ")[0]}`, html });
}

/* ---- Password reset ---- */

export async function sendPasswordReset({ name, email, token, role }) {
  const resetUrl = `${APP_URL}/${role === "validator" ? "validator/" : ""}reset-password?token=${token}`;
  const html = baseLayout(`
    <h1>Reset your password</h1>
    <p>Hi ${name.split(" ")[0]}, we received a request to reset the password for your ValidationCrew account.</p>
    <a class="btn" href="${resetUrl}">Reset password</a>
    <p>This link expires in <strong>1 hour</strong>. If you didn't request a reset, you can safely ignore this email.</p>
    <p style="font-size:12px;color:#9ca3af">Or paste this URL into your browser:<br>${resetUrl}</p>
  `);
  return send({ from: FROM_NOREPLY, to: email, subject: "Reset your ValidationCrew password", html });
}

/* ---- Mission published ---- */

export async function sendMissionPublished({ builderName, builderEmail, missionName, missionId }) {
  const html = baseLayout(`
    <h1>Your mission is live 🚀</h1>
    <p>Hi ${builderName.split(" ")[0]}, <strong>${missionName}</strong> is now published and validators can start applying.</p>
    <a class="btn" href="${APP_URL}/missions/${missionId}">View mission</a>
    <p>You'll receive updates as validators apply and submit their responses.</p>
  `);
  return send({ from: FROM_BUILDER, to: builderEmail, subject: `Your mission "${missionName}" is live`, html });
}

/* ---- Withdrawal status ---- */

export async function sendWithdrawalUpdate({ validatorName, validatorEmail, amount, status, failureReason }) {
  const amountStr = `₹${(amount / 100).toLocaleString("en-IN")}`;
  const approved = status === "processed";
  const html = baseLayout(`
    <h1>Withdrawal ${approved ? "processed ✅" : "update"}</h1>
    <p>Hi ${validatorName.split(" ")[0]}, your withdrawal request for <strong>${amountStr}</strong> has been ${approved ? "processed and is on its way to your account." : `updated to: <strong>${status}</strong>.`}</p>
    ${failureReason ? `<p>Reason: ${failureReason}</p>` : ""}
    <a class="btn" href="${APP_URL}/validator/earnings">View earnings</a>
  `, "You're receiving this because you requested a withdrawal from ValidationCrew.");
  return send({
    from: FROM_VALIDATOR, to: validatorEmail,
    subject: approved ? `Withdrawal of ${amountStr} processed` : `Withdrawal update — ${status}`,
    html
  });
}
