import { Router } from "express";
import { authMiddleware } from "../auth.js";
import { HELP_ARTICLES } from "../meta.js";
import { getTickets, createTicket, getTicketConversations } from "../freshdesk.js";

// Shared by both the builder (/api/support) and validator (/api/v/support) mounts —
// the two sides only differ in auth middleware, which req.<userKey> to read, and the
// help-article set.
export function buildSupportRouter({ authMiddleware, userKey, helpArticles, isValidator }) {
  const router = Router();
  router.use(authMiddleware);

  router.get("/", async (req, res) => {
    const user = req[userKey];
    const tickets = await getTickets(user.email);
    res.json({ helpArticles, tickets });
  });

  router.get("/tickets/:id", async (req, res) => {
    const convos = await getTicketConversations(req.params.id);
    res.json({ conversations: convos });
  });

  // POST /tickets { category, subject, details }
  router.post("/tickets", async (req, res) => {
    const { subject, details } = req.body || {};
    if (!subject || !subject.trim()) return res.status(400).json({ error: "subject is required" });

    const user = req[userKey];
    try {
      const ticket = await createTicket({
        email: user.email,
        name: user.name,
        subject: subject.trim(),
        description: details || "",
        isValidator,
      });
      res.status(201).json({ ticket });
    } catch (err) {
      res.status(500).json({ error: "Failed to create support ticket" });
    }
  });

  return router;
}

export const router = buildSupportRouter({ authMiddleware, userKey: "builder", helpArticles: HELP_ARTICLES, isValidator: false });
