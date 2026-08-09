import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASSWORD,
  },
  // Reuse connections instead of a fresh TCP+TLS+AUTH handshake per email —
  // that handshake was most of the per-send latency.
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
});
console.log("[GMAIL_CONFIG] GMAIL_USER:", process.env.GMAIL_USER ? "SET" : "NOT SET");
console.log("[GMAIL_CONFIG] GMAIL_PASSWORD:", process.env.GMAIL_PASSWORD ? "SET" : "NOT SET");
async function send({ from, to, subject, html, text }) {
  try {
    const result = await transporter.sendMail({
      from: from || process.env.GMAIL_USER,
      to,
      subject,
      html,
      text,
    });
    console.log(`[email SENT] ${subject} → ${to}`);
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
  return send({ to: email, subject: "Reset your ValidationCrew password", html });
}

export async function sendBuilderWelcome({ name, email }) {
  const html = `<h1>Welcome!</h1><p>Hi ${name.split(" ")[0]}, welcome to ValidationCrew!</p>`;
  return send({ to: email, subject: "Welcome to ValidationCrew", html });
}

export async function sendMissionPublished({ builderName, builderEmail, missionName, missionId }) {
  const APP_URL = process.env.APP_URL || "https://www.validationcrew.com";
  const html = `<h1>Mission Live</h1><p>Hi ${builderName.split(" ")[0]}, your mission is live. <a href="${APP_URL}/missions/${missionId}">View here</a></p>`;
  return send({ to: builderEmail, subject: `Your mission "${missionName}" is live`, html });
}

export async function sendWithdrawalUpdate({ validatorName, validatorEmail, amount, status, failureReason }) {
  const amountStr = `₹${(amount / 100).toLocaleString("en-IN")}`;
  const approved = status === "processed";
  const html = `
    <h1>Withdrawal ${approved ? "processed ✅" : "update"}</h1>
    <p>Hi ${validatorName.split(" ")[0]}, your withdrawal request for <strong>${amountStr}</strong> has been ${approved ? "processed and is on its way to your account." : `updated to: <strong>${status}</strong>.`}</p>
    ${failureReason ? `<p>Reason: ${failureReason}</p>` : ""}
  `;
  return send({ to: validatorEmail, subject: approved ? `Withdrawal of ${amountStr} processed` : `Withdrawal update — ${status}`, html });
}

export async function sendValidatorWelcome({ name, email }) {
  const html = `
    <h1>Welcome to the Crew!</h1>
    <p>Hi ${name.split(" ")[0]}, welcome to ValidationCrew as a Validator!</p>
  `;
  return send({ to: email, subject: `Welcome to the Crew, ${name.split(" ")[0]}`, html });
}
