"use client";
import { useState } from "react";
import { useAiStatus } from "@/components/useAiStatus";

const SAMPLE = `From: Karl Nilsen <karl@oceanfreight.no>
To: Jay <jay@atliq.com>
Date: 2026-07-10
Subject: Before our call on the 14th

Hi Jay,

Looking forward to Tuesday. Could you send a one-page overview of a typical data pipeline engagement before then, ideally by Monday? Our CFO will join the call, so a rough price range would help too.

Also, a colleague at Nordhavn Shipping is interested in the same thing. I'll ask her to email you directly.

Karl`;

interface Q { quote: string; verified: boolean }
interface Item {
  type: string; status: string; company: string; contact_name: string | null; contact_email: string | null; owner: string;
  summary: string; action: string; due_date: string | null; due_basis: string; value_usd: number | null; quotes: Q[]; shown: boolean;
}

export default function TryIt() {
  const aiOn = useAiStatus();
  const [text, setText] = useState(SAMPLE);
  const [items, setItems] = useState<Item[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true); setErr(null); setItems(null);
    try {
      const res = await fetch("/api/extract", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setItems(data.items);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <h1>Try it live</h1>
      <p className="lede">
        Paste any sales email or meeting note. Claude Haiku 5.5 pulls out leads, promises, questions and dates, each with a quote.
        The same guardrail then checks every quote against your text and hides anything it can&apos;t find.
      </p>
      {!aiOn && (
        <div className="card" style={{ background: "#fffbe6" }}>
          Live AI is off on this deployment (no <code>ANTHROPIC_API_KEY</code>). Everything else in the app runs on the saved snapshot.
          To turn this on, add the key in Vercel → Project → Settings → Environment Variables and redeploy.
        </div>
      )}
      <textarea value={text} onChange={(e) => setText(e.target.value)} style={{ minHeight: 260 }} aria-label="Email or note" />
      <div className="row">
        <button className="primary" onClick={run} disabled={busy || !aiOn}>{busy ? "Reading…" : "Extract with AI"}</button>
        <button onClick={() => setText(SAMPLE)}>Load sample email</button>
        <span className="note">Only this text and any CRM rows with a matching email domain are sent to the model.</span>
      </div>
      {err && <p className="fail">{err}</p>}
      {items && (
        <>
          <h2>Found {items.filter((i) => i.shown).length} item(s); held back {items.filter((i) => !i.shown).length}</h2>
          {items.map((i, n) => (
            <div key={n} className="card" style={{ opacity: i.shown ? 1 : 0.6 }}>
              <div className="row" style={{ marginTop: 0 }}>
                <span className="chip blue">{i.type.replace(/_/g, " ")}</span>
                <span className={"chip " + (i.shown ? "green" : "red")}>{i.shown ? "Shown: quote verified" : "Held back: no verified quote"}</span>
              </div>
              <h3 style={{ marginTop: 8 }}>{i.company}</h3>
              <p>{i.summary}</p>
              <p><b>Next step:</b> {i.action}</p>
              <div className="meta">
                <span>Owner: <b>{i.owner}</b></span>
                <span>Due: <b>{i.due_date ?? "not stated"}</b>{i.due_basis === "inferred" ? " (guess)" : ""}</span>
                <span>Value: <b>{i.value_usd ? "USD " + i.value_usd.toLocaleString() : "Not stated"}</b></span>
                <span>Contact: <b>{i.contact_name ?? "Not stated"}</b></span>
              </div>
              {i.quotes.map((q, k) => (
                <div key={k} className={"quote " + (q.verified ? "ok" : "bad")}>&ldquo;{q.quote}&rdquo;<div className="src">{q.verified ? "✓ found in your text" : "✗ not found in your text"}</div></div>
              ))}
            </div>
          ))}
        </>
      )}
    </>
  );
}
