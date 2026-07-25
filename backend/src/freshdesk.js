export async function getTickets(email) {
  const domain = process.env.FRESHDESK_DOMAIN;
  const apiKey = process.env.FRESHDESK_API_KEY;
  if (!domain || !apiKey) return [];

  try {
    const auth = Buffer.from(`${apiKey}:X`).toString("base64");
    // Get tickets filtered by email
    const res = await fetch(`https://${domain}/api/v2/tickets?email=${encodeURIComponent(email)}`, {
      headers: { "Authorization": `Basic ${auth}`, "Content-Type": "application/json" }
    });
    
    if (!res.ok) {
      console.error("Freshdesk API Error:", await res.text());
      return [];
    }
    
    const data = await res.json();
    return data.map(t => ({
      id: "TKT-" + t.id,
      subject: t.subject,
      cat: "Support",
      status: t.status === 2 || t.status === 3 ? "open" : "closed", // 2=Open, 3=Pending, 4=Resolved, 5=Closed
      priority: t.priority === 4 ? "urgent" : "normal",
      updated_label: new Date(t.updated_at).toLocaleDateString(),
      reply: "" // In a full implementation, you would fetch conversations
    }));
  } catch (err) {
    console.error("Freshdesk fetch error:", err);
    return [];
  }
}

export async function createTicket({ email, name, subject, description, isValidator }) {
  const domain = process.env.FRESHDESK_DOMAIN;
  const apiKey = process.env.FRESHDESK_API_KEY;
  
  if (!domain || !apiKey) {
    // Fallback if env vars aren't set
    return { id: "TKT-LOCAL", subject, cat: "Support", status: "open", priority: "normal", updated: "Just now" };
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
      throw new Error("Failed to create ticket");
    }
    
    const t = await res.json();
    return { id: "TKT-" + t.id, subject: t.subject, cat: "Support", status: "open", priority: "normal", updated: "Just now" };
  } catch (err) {
    console.error("Freshdesk create error:", err);
    throw err;
  }
}

export async function getTicketConversations(ticketId) {
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
