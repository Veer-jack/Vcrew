import { db } from "./db.js";

function localTicketShape(row) {
  return {
    id: row.freshdesk_id ? "TKT-" + row.freshdesk_id : "TKT-L" + row.id,
    subject: row.subject,
    cat: "Support",
    status: row.status === "open" ? "open" : "closed",
    priority: "normal",
    updated_label: new Date(row.updated_at).toLocaleDateString(),
    reply: "",
  };
}

export async function getTickets(email) {
  const localRows = await db.prepare(`SELECT * FROM support_tickets WHERE email = ? ORDER BY created_at DESC`).all(email);

  const domain = process.env.FRESHDESK_DOMAIN;
  const apiKey = process.env.FRESHDESK_API_KEY;
  if (!domain || !apiKey) return localRows.map(localTicketShape);

  try {
    const auth = Buffer.from(`${apiKey}:X`).toString("base64");
    // Get tickets filtered by email
    const res = await fetch(`https://${domain}/api/v2/tickets?email=${encodeURIComponent(email)}`, {
      headers: { "Authorization": `Basic ${auth}`, "Content-Type": "application/json" }
    });

    if (!res.ok) {
      const body = await res.text();
      // A user who has never raised a ticket has no Freshdesk contact yet, so the
      // email filter 400s -- expected for most users, not a failure worth logging.
      if (!body.includes("no contact matching")) console.error("Freshdesk API Error:", body);
      return localRows.map(localTicketShape);
    }

    const data = await res.json();
    const remote = data.map(t => ({
      id: "TKT-" + t.id,
      subject: t.subject,
      cat: "Support",
      status: t.status === 2 || t.status === 3 ? "open" : "closed", // 2=Open, 3=Pending, 4=Resolved, 5=Closed
      priority: t.priority === 4 ? "urgent" : "normal",
      updated_label: new Date(t.updated_at).toLocaleDateString(),
      reply: "" // In a full implementation, you would fetch conversations
    }));

    // Tickets that never made it to Freshdesk (created during an outage/misconfiguration)
    // won't be in `remote` — surface those from the local mirror so they don't vanish.
    const unsynced = localRows.filter(r => !r.freshdesk_id).map(localTicketShape);
    return [...remote, ...unsynced];
  } catch (err) {
    console.error("Freshdesk fetch error:", err);
    return localRows.map(localTicketShape);
  }
}

export async function createTicket({ email, name, subject, description, isValidator }) {
  const role = isValidator ? "validator" : "builder";
  const localRes = await db.prepare(
    `INSERT INTO support_tickets (role, email, name, subject, description, status) VALUES (?, ?, ?, ?, ?, 'open')`
  ).run(role, email, name, subject, description || "");
  const localId = localRes.lastInsertRowid;

  const domain = process.env.FRESHDESK_DOMAIN;
  const apiKey = process.env.FRESHDESK_API_KEY;

  if (!domain || !apiKey) {
    // Not configured — the local row is the ticket, and it stays visible via getTickets().
    return { id: "TKT-L" + localId, subject, cat: "Support", status: "open", priority: "normal", updated: "Just now" };
  }

  try {
    const auth = Buffer.from(`${apiKey}:X`).toString("base64");

    const res = await fetch(`https://${domain}/api/v2/tickets`, {
      method: "POST",
      headers: { "Authorization": `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        description: description || "No details provided",
        subject: subject,
        email: email,
        name: name,
        status: 2,
        priority: 1,
        tags: isValidator ? ["Validator"] : ["Builder"]
      })
    });

    if (!res.ok) {
      console.error("Freshdesk API Error:", await res.text());
      // Fall through to the local-only ticket below rather than losing it.
    } else {
      const t = await res.json();
      await db.prepare(`UPDATE support_tickets SET freshdesk_id = ? WHERE id = ?`).run(String(t.id), localId);
      return { id: "TKT-" + t.id, subject: t.subject, cat: "Support", status: "open", priority: "normal", updated: "Just now" };
    }
  } catch (err) {
    console.error("Freshdesk create error:", err);
    // Fall through to the local-only ticket below rather than losing it.
  }

  return { id: "TKT-L" + localId, subject, cat: "Support", status: "open", priority: "normal", updated: "Just now" };
}

export async function getTicketConversations(ticketId) {
  if (ticketId.startsWith("TKT-L")) {
    // Local-only ticket, never synced to Freshdesk — nothing to fetch.
    return [];
  }

  const domain = process.env.FRESHDESK_DOMAIN;
  const apiKey = process.env.FRESHDESK_API_KEY;

  if (!domain || !apiKey) return [];

  try {
    const auth = Buffer.from(`${apiKey}:X`).toString("base64");

    // The ticket ID passed in looks like "TKT-123", we need just "123"
    const realId = ticketId.replace("TKT-", "");

    const res = await fetch(`https://${domain}/api/v2/tickets/${realId}/conversations`, {
      headers: { "Authorization": `Basic ${auth}`, "Content-Type": "application/json" }
    });

    if (!res.ok) {
      console.error("Freshdesk API Error (Conversations):", await res.text());
      return [];
    }

    const data = await res.json();

    // Sort oldest first
    const convos = data.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    return convos.map(c => ({
      id: c.id,
      body: c.body_text || c.body, // Text representation if available
      fromAdmin: !c.incoming, // Incoming = from customer
      created_at: new Date(c.created_at).toLocaleString()
    }));
  } catch (err) {
    console.error("Freshdesk conversations fetch error:", err);
    return [];
  }
}
