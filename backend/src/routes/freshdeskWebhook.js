import { Router } from "express";
import { db } from "../db.js";

// Receives a callback from a Freshdesk Automation/Workflow "Webhook" action when an
// agent replies to a ticket, so the builder/validator gets notified in-app instead of
// only finding out by reopening the ticket. See server.js for how this is mounted, and
// the setup note in the PR/README for the Freshdesk-side configuration required.
export const router = Router();

router.post("/", async (req, res) => {
  const secret = process.env.FRESHDESK_WEBHOOK_SECRET;
  if (!secret) return res.status(500).json({ error: "FRESHDESK_WEBHOOK_SECRET not configured" });

  const auth = req.headers.authorization;
  if (auth !== `Bearer ${secret}`) return res.status(401).json({ error: "Unauthorized" });

  const ticketId = req.body?.ticketId != null ? String(req.body.ticketId) : null;
  if (!ticketId) return res.status(400).json({ error: "ticketId is required" });

  const ticket = await db.prepare(`SELECT * FROM support_tickets WHERE freshdesk_id = ? ORDER BY id DESC LIMIT 1`).get(ticketId);
  if (!ticket) return res.status(404).json({ error: "No local ticket found for this Freshdesk ticket id" });

  if (ticket.role === "builder") {
    const b = await db.prepare(`SELECT id FROM builders WHERE email = ?`).get(ticket.email);
    if (b) {
      await db.prepare(`
        INSERT INTO notifications (builder_id, cat, type, icon, tone, title, body, time_label, unread)
        VALUES (?, 'system', 'ticket_reply', 'messageCircle', 'primary', 'Support Reply', ?, 'Just now', 1)
      `).run(b.id, `You have a new reply on your support ticket: "${ticket.subject}"`);
    }
  } else {
    const v = await db.prepare(`SELECT id FROM validators WHERE email = ?`).get(ticket.email);
    if (v) {
      await db.prepare(`
        INSERT INTO v_notifications (validator_id, cat, type, icon, tone, title, body, time_label, unread)
        VALUES (?, 'system', 'ticket_reply', 'messageCircle', 'primary', 'Support Reply', ?, 'Just now', 1)
      `).run(v.id, `You have a new reply on your support ticket: "${ticket.subject}"`);
    }
  }

  res.json({ ok: true });
});
