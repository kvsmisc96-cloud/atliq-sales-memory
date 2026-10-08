import type { ReactNode } from "react";
import { snapshot, sources } from "@/lib/data";

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Builds a pattern that matches the quote despite markdown asterisks, curly quotes and line breaks. */
function quotePattern(quote: string) {
  const parts = quote.replace(/\*/g, "").trim().split(/\s+/).map((w) =>
    escapeRe(w).replace(/'/g, "['‘’]").replace(/"/g, '["“”]'));
  return parts.join("[\\s*]+");
}

function highlight(text: string, quotes: string[]): ReactNode[] {
  if (!quotes.length) return [text];
  const re = new RegExp("(" + quotes.map(quotePattern).join("|") + ")", "gi");
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(re)) {
    const i = m.index ?? 0;
    if (i > last) out.push(text.slice(last, i));
    out.push(<mark key={i}>{m[0]}</mark>);
    last = i + m[0].length;
  }
  out.push(text.slice(last));
  return out;
}

export default function Sources() {
  const quotesByFile = new Map<string, string[]>();
  const add = (file: string, q: string) => quotesByFile.set(file, [...(quotesByFile.get(file) ?? []), q]);
  for (const i of snapshot.items) i.evidence.forEach((e) => add(e.file, e.quote));
  for (const u of snapshot.crm_updates) u.evidence.forEach((e) => add(e.file, e.quote));
  for (const l of snapshot.new_leads) l.evidence.forEach((e) => add(e.file, e.quote));
  const used = sources.filter((s) => quotesByFile.has(s.file)).length;

  return (
    <>
      <h1>Sources</h1>
      <p className="lede">
        The {sources.length} emails and meeting notes the assistant read ({used} contain quoted facts). Highlighted text is exactly what a
        brief item or CRM fix quotes. Lines in italics in brackets are mailbox notes from the dataset describing what happened afterwards.
      </p>
      {sources.map((s) => (
        <section key={s.file} id={s.file} style={{ scrollMarginTop: 16 }}>
          <h2>{s.title}</h2>
          <p className="muted small">{s.kind === "email" ? "Email" : "Meeting note"} · {s.file}</p>
          <div className="doc">{highlight(s.text, quotesByFile.get(s.file) ?? [])}</div>
        </section>
      ))}
    </>
  );
}
