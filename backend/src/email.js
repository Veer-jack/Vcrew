// nodemailer over Resend's SMTP relay, on its alternate port (2587,
// STARTTLS) instead of the standard 587 — Railway blocks outbound SMTP on
// the standard mail-submission ports (465/587), confirmed against both
// Gmail's SMTP host and this one, but lets 2587 through. Keeps the app on
// nodemailer/SMTP (as originally set up) while still landing on Resend's
// infrastructure for deliverability + the verified validationcrew.com domain.
import nodemailer from "nodemailer";

const FROM_BUILDER = "ValidationCrew <builders@validationcrew.com>";
const FROM_VALIDATOR = "ValidationCrew <crew@validationcrew.com>";
const FROM_NOREPLY = "ValidationCrew <noreply@validationcrew.com>";

const transporter = nodemailer.createTransport({
  host: "smtp.resend.com",
  port: 2587,
  secure: false,
  auth: { user: "resend", pass: process.env.RESEND_API_KEY },
  family: 4,
  connectionTimeout: 10000,
});
console.log("[RESEND_CONFIG] RESEND_API_KEY:", process.env.RESEND_API_KEY ? "SET" : "NOT SET");

async function send({ from, to, subject, html }) {
  try {
    const result = await transporter.sendMail({ from: from || FROM_NOREPLY, to, subject, html });
    console.log(`[email SENT] ${subject} → ${to} id=${result.messageId}`);
    return { ok: true, id: result.messageId };
  } catch (err) {
    console.error(`[email ERROR] ${subject}:`, err.message);
    return { ok: false, error: err.message };
  }
}

export async function sendPasswordReset({ name, email, token, role }) {
  const APP_URL = process.env.APP_URL || "https://www.validationcrew.com";
  const resetUrl = `${APP_URL}/${role === "validator" ? "validator/" : ""}reset-password?token=${token}`;
  const html = `<h1>Reset your password</h1><p>Hi ${name.split(" ")[0]}, click <a href="${resetUrl}">here</a> to reset your password. This link expires in 1 hour.</p>`;
  return send({ from: FROM_NOREPLY, to: email, subject: "Reset your ValidationCrew password", html });
}

export async function sendBuilderWelcome({ name, email }) {
  const html = `<h1>Welcome!</h1><p>Hi ${name.split(" ")[0]}, welcome to ValidationCrew!</p>`;
  return send({ from: FROM_BUILDER, to: email, subject: "Welcome to ValidationCrew", html });
}

export async function sendMissionPublished({ builderName, builderEmail, missionName, missionId }) {
  const APP_URL = process.env.APP_URL || "https://www.validationcrew.com";
  const html = `<h1>Mission Live</h1><p>Hi ${builderName.split(" ")[0]}, your mission is live. <a href="${APP_URL}/missions/${missionId}">View here</a></p>`;
  return send({ from: FROM_BUILDER, to: builderEmail, subject: `Your mission "${missionName}" is live`, html });
}

// Distinct from sendMissionPublished — that one is only for a genuine
// draft-to-active first publish; this covers editing a mission that was
// already live, so the copy doesn't misleadingly read as a brand-new launch.
export async function sendMissionUpdated({ builderName, builderEmail, missionName, missionId }) {
  const APP_URL = process.env.APP_URL || "https://www.validationcrew.com";
  const html = `<h1>Mission Updated</h1><p>Hi ${builderName.split(" ")[0]}, your mission "${missionName}" was updated successfully and it's live now. <a href="${APP_URL}/missions/${missionId}">View here</a></p>`;
  return send({ from: FROM_BUILDER, to: builderEmail, subject: `Your mission "${missionName}" was updated`, html });
}

export async function sendWithdrawalUpdate({ validatorName, validatorEmail, amount, status, failureReason }) {
  const amountStr = `₹${(amount / 100).toLocaleString("en-IN")}`;
  const approved = status === "processed";
  const html = `
    <h1>Withdrawal ${approved ? "processed ✅" : "update"}</h1>
    <p>Hi ${validatorName.split(" ")[0]}, your withdrawal request for <strong>${amountStr}</strong> has been ${approved ? "processed and is on its way to your account." : `updated to: <strong>${status}</strong>.`}</p>
    ${failureReason ? `<p>Reason: ${failureReason}</p>` : ""}
  `;
  return send({ from: FROM_VALIDATOR, to: validatorEmail, subject: approved ? `Withdrawal of ${amountStr} processed` : `Withdrawal update — ${status}`, html });
}

export async function sendValidatorWelcome({ name, email }) {
  const html = `
    <h1>Welcome to the Crew!</h1>
    <p>Hi ${name.split(" ")[0]}, welcome to ValidationCrew as a Validator!</p>
  `;
  return send({ from: FROM_VALIDATOR, to: email, subject: `Welcome to the Crew, ${name.split(" ")[0]}`, html });
}
