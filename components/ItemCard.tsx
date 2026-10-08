"use client";
import { useState } from "react";
import Link from "next/link";
import type { BriefItem } from "@/lib/types";
import { audit } from "@/lib/store";

const TYPE_LABEL: Record<string, string> = {
  waiting_on_us: "Client waiting on us", promise: "Our promise", deadline: "Deadline", meeting: "Upcoming meeting",
  cross_sell: "Cross-sell", revisit: "Revisit", new_lead: "New lead", internal: "Internal task",
};

function dueClass(label: string) {
  if (label.startsWith("Overdue")) return "chip red";
  if (label === "Due today" || /^Due in [1-3] day/.test(label)) return "chip amber";
  if (label === "Done") return "chip green";
  return "chip";
}

function fmtDate(iso: string | null) {
  if (!iso) return "not stated";
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

export function money(n: number | null) {
  return n === null ? "Not stated" : "USD " + n.toLocaleString("en-US");
}

interface Props {
  item: BriefItem;
  rank?: number;
  actor: string;
  aiOn: boolean;
  onDecision?: (id: string, decision: string) => void;
  readOnly?: boolean;
}

export default function ItemCard({ item, rank, actor, aiOn, onDecision, readOnly }: Props) {
  const [draft, setDraft] = useState(item.draft);
  const [body, setBody] = useState(item.draft?.body ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [facts, setFacts] = useState<{ quote: string; verified: boolean }[] | null>(null);

  const decide = (decision: string, detail?: string) => {
    audit({ actor, action: decision, target: `${item.company}: ${item.action}`, detail });
    onDecision?.(item.id, decision);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`Subject: ${draft?.subject}\n\n${body}`);
      setMsg("Copied. Paste it into your email and send it yourself.");
    } catch {
      setMsg("Couldn't copy automatically; select the text and copy it.");
    }
    audit({ actor, action: "copied draft", target: item.company, detail: draft?.subject });
  };

  const regenerate = async () => {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/draft", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: item.id }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDraft(data.draft); setBody(data.draft.body); setFacts(data.facts);
      audit({ actor, action: "regenerated draft (live AI)", target: item.company });
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const mailto = draft ? `mailto:${encodeURIComponent(draft.to)}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(body)}` : "#";

  return (
    <div className="card">
      <div className="card-head">
        {rank !== undefined && <div className="rank">{rank}</div>}
        <div className="grow">
          <div className="row" style={{ marginTop: 0 }}>
            <span className="chip blue">{TYPE_LABEL[item.type]}</span>
            <span className={dueClass(item.due_label)} title={item.due_rule}>{item.due_label}</span>
            {!item.lead && item.type !== "internal" && <span className="chip amber">Not in CRM</span>}
          </div>
          <h3 style={{ marginTop: 8 }}>{item.company}</h3>
          <p>{item.summary}</p>
          <p className="next"><b>Next step:</b> {item.action}</p>
          <div className="meta">
            <span>Value: <b>{money(item.value)}</b>{item.value !== null && <> ({item.value_source === "crm" ? "from CRM" : "stated in source"})</>}</span>
            <span>Contact: <b>{item.contact_name ?? "Not stated"}</b>{item.contact_email ? ` · ${item.contact_email}` : ""}</span>
            <span>CRM: <b>{item.lead ? `${item.lead.lead_id} · ${item.lead.status || "no status"}` : "no record"}</b></span>
            <span title={item.due_rule}>Due: <b>{fmtDate(item.effective_due)}</b>{item.due_basis === "inferred" ? " (guess)" : ""}</span>
            {item.client_deadline && <span>Client deadline: <b>{fmtDate(item.client_deadline)}</b></span>}
          </div>
          {item.reasons.length > 0 && <div className="reasons">Why it&apos;s here: {item.reasons.join(" · ")}</div>}

          <details>
            <summary>Sources ({item.evidence.length} quote{item.evidence.length === 1 ? "" : "s"}, {item.evidence.filter((e) => e.verified).length} verified)</summary>
            {item.evidence.map((e, i) => (
              <div key={i} className={"quote " + (e.verified ? "ok" : "bad")}>
                &ldquo;{e.quote}&rdquo;
                <div className="src">{e.verified ? "✓ found word-for-word in " : "✗ not found in "}<Link href={`/sources#${encodeURIComponent(e.file)}`}>{e.file}</Link></div>
              </div>
            ))}
            <p className="note">Due date rule: {item.due_rule}</p>
          </details>

          {draft && !readOnly && (
            <div className="draft">
              <label>Draft reply · to {draft.to || "not stated"} · subject &ldquo;{draft.subject}&rdquo;</label>
              <textarea value={body} onChange={(e) => setBody(e.target.value)} aria-label="Draft reply" />
              <div className="row">
                <button onClick={copy}>Copy draft</button>
                <a className="btn" href={mailto} onClick={() => audit({ actor, action: "opened draft in own email app", target: item.company })}>Open in my email app</a>
                <button onClick={regenerate} disabled={!aiOn || busy} title={aiOn ? "Write a fresh draft with Claude Sonnet 5.5" : "Live AI is off (no API key)"}>
                  {busy ? "Writing…" : "Regenerate with AI"}
                </button>
              </div>
              <p className="note">The assistant never sends email. Fill any [brackets], then send it yourself.</p>
              {facts && (
                <div className="note">Facts the new draft relied on: {facts.map((f) => (f.verified ? "✓ " : "✗ ") + f.quote).join(" | ") || "none listed"}</div>
              )}
            </div>
          )}
          {msg && <p className="note">{msg}</p>}

          {!readOnly && onDecision && (
            <div className="row">
              <button className="good" onClick={() => decide("done")}>Mark done</button>
              <button onClick={() => decide("snoozed")}>Snooze to tomorrow</button>
              <button className="warn" onClick={() => {
                const why = window.prompt("Why isn't this useful? (helps tune the assistant)") ?? "";
                decide("rejected", why);
              }}>Not useful</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
