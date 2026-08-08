// Sends via the Gmail REST API over HTTPS instead of raw SMTP sockets —
// Railway's containers have no IPv6 egress and silently drop outbound SMTP
// (ports 465/587) over IPv4 too, so nodemailer/SMTP can never work here no
// matter how it's configured. A normal HTTPS POST isn't subject to that.
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;
const GMAIL_USER = process.env.GMAIL_USER;

console.log("[GMAIL_CONFIG] GMAIL_USER:", GMAIL_USER ? "SET" : "NOT SET");
console.log("[GMAIL_CONFIG] GOOGLE_CLIENT_ID:", CLIENT_ID ? "SET" : "NOT SET");
console.log("[GMAIL_CONFIG] GOOGLE_CLIENT_SECRET:", CLIENT_SECRET ? "SET" : "NOT SET");
console.log("[GMAIL_CONFIG] GOOGLE_REFRESH_TOKEN:", REFRESH_TOKEN ? "SET" : "NOT SET");

// Access tokens are short-lived (~1hr); at this send volume it's simpler and
// safe to just fetch a fresh one per send rather than cache/refresh-on-expiry.
async function getAccessToken() {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.error || "Failed to refresh Gmail access token");
  return data.access_token;
}

function base64url(input) {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// RFC 2047-encode the subject so non-ASCII characters (emoji, accents) don't
// get mangled — cheap to always do, and only matters once someone puts one
// in a subject line, by which point a plain string would already be broken.
function buildRawMessage({ from, to, subject, html }) {
  const encodedSubject = `=?UTF-8?B?${Buffer.from(subject, "utf8").toString("base64")}?=`;
  const message = [
    `From: ${from || GMAIL_USER}`,
    `To: ${to}`,
    `Subject: ${encodedSubject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=UTF-8",
    "",
    html,
  ].join("\r\n");
  return base64url(message);
}

async function send({ from, to, subject, html }) {
  try {
    const accessToken = await getAccessToken();
    const raw = buildRawMessage({ from, to, subject, html });
    const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ raw }),
    });
    const data = await res.json();
    if (!res.ok) { console.error(`[email ERROR] ${subject}:`, data.error?.message || res.statusText); return { ok: false, error: data.error?.message }; }
    console.log(`[email SENT] ${subject} → ${to}`);
    return { ok: true, id: data.id };
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
