const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const SYSTEM_PROMPT = `You are a friendly, helpful assistant built into RentTrack — a rental property management platform for Arnold Ventures WV.

You help both renters and property admins. Here's what you know about the platform:

RENTER SIDE:
- Renters log in with a 4-digit PIN to view their portal
- They can see their rent amount, due date (monthly or weekly), and how much they've paid
- They can see their "Paid Through" date — how far their rent is covered
- They can see a breakdown of where their rent goes (mortgage, insurance, repairs, etc.)
- They can view and mark bills as paid (with a confirmation number)
- They can see payment methods — Zelle, Apple Pay, Cash App, Chime, SoFi, PayPal
- They can edit their profile (name, email, phone, photo)
- They can chat with other house participants in the House Chat

ADMIN SIDE:
- Admins manage properties, renters, payments, bills, fund allocations, and pay methods
- Admins can log payments and set "Paid Through" dates
- Admins can post messages to renters via House Chat

Be concise, warm, and helpful. If asked something outside the scope of rental management, answer naturally but keep it brief. Never make up specific details about someone's account — direct them to check their portal.`;

function readBody(req) {
  return new Promise(resolve => {
    let body = "";
    req.on("data", c => { body += c; });
    req.on("end", () => resolve(body ? JSON.parse(body) : {}));
  });
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") { res.writeHead(204, CORS); res.end(); return; }
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method !== "POST") { res.writeHead(405); res.end("Method not allowed"); return; }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) { res.writeHead(500, { "Content-Type": "application/json" }); res.end(JSON.stringify({ error: "OpenAI API key not configured." })); return; }

  try {
    const { messages = [] } = await readBody(req);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages.slice(-20), // last 20 messages max
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      res.writeHead(response.status, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err }));
      return;
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content ?? "Sorry, I couldn't get a response.";
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ reply }));
  } catch (err) {
    console.error("[AI Chat Error]", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: err.message }));
  }
}
