import { NextResponse } from "next/server";
import { AiError, aiEnabled, draftReply } from "@/lib/ai";
import { buildItems } from "@/lib/brief";
import { sourceText } from "@/lib/data";
import { quoteInText } from "@/lib/verify";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!aiEnabled()) {
    return NextResponse.json({ error: "Live AI is off: set ANTHROPIC_API_KEY to regenerate drafts. The saved draft is shown instead." }, { status: 503 });
  }
  const { id } = (await req.json().catch(() => ({}))) as { id?: string };
  const item = buildItems().items.find((i) => i.id === id);
  if (!item) return NextResponse.json({ error: "Unknown item." }, { status: 404 });

  const files = [...new Set(item.evidence.map((e) => e.file))];
  const sources = files.map((f) => `--- ${f} ---\n${sourceText(f) ?? ""}`).join("\n\n");
  const lead = item.lead;
  const crmRecord = lead ? Object.entries(lead).map(([k, v]) => `${k}: ${v || "(blank)"}`).join("\n") : "";

  try {
    const { draft, usage } = await draftReply({
      owner: item.owner, to: item.contact_email ?? "(email not stated)", action: item.action, sources, crmRecord,
    });
    const all = files.map((f) => sourceText(f) ?? "").join("\n");
    const facts = draft.facts_used.map((q) => ({ quote: q, verified: quoteInText(q, all) }));
    return NextResponse.json({ draft: { to: item.contact_email ?? "", subject: draft.subject, body: draft.body }, facts, usage });
  } catch (e) {
    const message = e instanceof AiError ? e.message : "The AI call failed. Check the API key and try again.";
    console.error(e);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
