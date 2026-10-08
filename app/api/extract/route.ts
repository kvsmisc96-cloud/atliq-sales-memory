import { NextResponse } from "next/server";
import { AiError, aiEnabled, extractFromText } from "@/lib/ai";
import { crm } from "@/lib/data";
import { domainOf } from "@/lib/crm";
import { quoteInText } from "@/lib/verify";

export const dynamic = "force-dynamic";
const MAX_CHARS = 20_000;

export async function POST(req: Request) {
  if (!aiEnabled()) {
    return NextResponse.json({ error: "Live AI is off: set ANTHROPIC_API_KEY to turn it on. The rest of the app runs on the saved snapshot." }, { status: 503 });
  }
  const { text } = (await req.json().catch(() => ({}))) as { text?: string };
  if (!text || text.trim().length < 20) return NextResponse.json({ error: "Paste an email or note first." }, { status: 400 });
  if (text.length > MAX_CHARS) return NextResponse.json({ error: `Please keep it under ${MAX_CHARS.toLocaleString()} characters.` }, { status: 400 });

  // Send only the CRM rows whose email domain appears in the text (narrow context, less data shared).
  const domains = new Set((text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/g) ?? []).map((e) => domainOf(e)).filter(Boolean));
  const rows = crm.filter((r) => domains.has(domainOf(r.contact_email)));
  const crmContext = rows.map((r) => `${r.lead_id} | ${r.company} | ${r.contact_name} | ${r.contact_email} | status ${r.status || "blank"} | value ${r.est_value_usd || "blank"} | owner ${r.owner || "blank"}`).join("\n");

  try {
    const { items, usage } = await extractFromText(text, crmContext);
    const checked = items.map((it) => {
      const quotes = it.quotes.map((q) => ({ quote: q, verified: quoteInText(q, text) }));
      return { ...it, quotes, shown: quotes.some((q) => q.verified) };
    });
    return NextResponse.json({ items: checked, matched: rows.map((r) => r.lead_id), usage });
  } catch (e) {
    const message = e instanceof AiError ? e.message : "The AI call failed. Check the API key and try again.";
    console.error(e);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
