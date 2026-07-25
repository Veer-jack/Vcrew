import { Router } from "express";
import { authMiddleware } from "../auth.js";
import { HELP_ARTICLES } from "../meta.js";
import { getTickets, createTicket, getTicketConversations } from "../freshdesk.js";

export const router = Router();
router.use(authMiddleware);

router.get("/", async (req, res) => {
  const tickets = await getTickets(req.builder.email);
  res.json({
    helpArticles: HELP_ARTICLES,
    tickets
  });
});

router.get("/tickets/:id", async (req, res) => {
  const convos = await getTicketConversations(req.params.id);
  res.json({ conversations: convos });
});

// POST /api/support/tickets { category, subject, details }
router.post("/tickets", async (req, res) => {
  const { category, subject, details } = req.body || {};
  if (!subject || !subject.trim()) return res.status(400).json({ error: "subject is required" });

  try {
    const ticket = await createTicket({
      email: req.builder.email,
      name: req.builder.name,
      subject: subject.trim(),
      description: details || "",
      isValidator: false
    });
    res.status(201).json({ ticket });
  } catch (err) {
    res.status(500).json({ error: "Failed to create support ticket" });
  }
});
