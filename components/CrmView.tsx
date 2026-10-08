"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { CrmChange, CrmRow } from "@/lib/types";
import { audit, getState, setState } from "@/lib/store";

const GROUPS: { kind: CrmChange["kind"]; title: string; blurb: string }[] = [
  { kind: "new_lead", title: "Leads missing from the CRM", blurb: "Found in email or notes but never entered." },
  { kind: "duplicate", title: "Duplicate records", blurb: "The same company entered twice, often by two owners." },
  { kind: "update", title: "Out-of-date fields", blurb: "What the CRM says versus what the emails say." },
  { kind: "rule", title: "Last-contact dates behind the inbox", blurb: "Plain rule: newer activity exists than the CRM shows." },
];

const COLS: (keyof CrmRow)[] = ["lead_id", "company", "contact_name", "contact_email", "status", "est_value_usd", "owner", "last_contact_date", "next_followup_date", "notes"];

export default function CrmView({ changes, crm }: { changes: CrmChange[]; crm: CrmRow[] }) {
  const [state, setLocal] = useState<Record<string, string>>({});
  const [actor, setActor] = useState("Jay");
  useEffect(() => setLocal(getState()), []);

  const decide = (c: CrmChange, d: "approved" | "rejected" | null) => {
    setState("crm:" + c.id, d);
    setLocal(getState());
    audit({ actor, action: d ? `${d} CRM change` : "undid CRM decision", target: `${c.lead_id ?? "new"} ${c.company}`, detail: `${c.field}: ${c.new_value}` });
  };

  const table = useMemo(() => {
    const rows: (CrmRow & { _changed?: boolean })[] = crm.map((r) => ({ ...r }));
    for (const c of changes) {
      if (state["crm:" + c.id] !== "approved") continue;
      if (c.kind === "new_lead") {
        const [name, email, source, owner] = c.new_value.split(" · ");
        rows.push({ lead_id: `NEW-${rows.length + 1}`, company: c.company, contact_name: name, contact_email: email, source, service_interest: "",
          status: "New", est_value_usd: "", owner: owner.replace("owner ", ""), created_date: "2026-07-10", last_contact_date: "", next_followup_date: "", notes: c.reason, _changed: true });
      } else if (c.kind === "duplicate") {
        const ids = (c.lead_id ?? "").split(" + ");
        const keep = rows.find((r) => r.lead_id === ids[0]);
        ids.slice(1).forEach((id) => {
          const dup = rows.find((r) => r.lead_id === id);
          if (dup && keep) { keep.notes = `${keep.notes} [merged ${id}]`.trim(); keep._changed = true; rows.splice(rows.indexOf(dup), 1); }
        });
      } else {
        const r = rows.find((x) => x.lead_id === c.lead_id);
        if (r && c.field in r) { (r as unknown as Record<string, string>)[c.field] = c.new_value; r._changed = true; }
      }
    }
    return rows;
  }, [changes, crm, state]);

  const exportCsv = () => {
    const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    const head = Object.keys(crm[0]) as (keyof CrmRow)[];
    const csv = [head.join(","), ...table.map((r) => head.map((h) => esc(String(r[h] ?? ""))).join(","))].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "crm_export_updated.csv";
    a.click();
    audit({ actor, action: "exported updated CRM CSV", target: `${table.length} records` });
  };

  const approvedCount = changes.filter((c) => state["crm:" + c.id] === "approved").length;

  return (
    <>
      <div className="row">
        <label className="small">Approving as&nbsp;</label>
        <select value={actor} onChange={(e) => setActor(e.target.value)} style={{ width: "auto" }}>
          {["Jay", "Bhavin", "Dhaval", "Karandeep"].map((p) => <option key={p}>{p}</option>)}
        </select>
        <span className="note">{approvedCount} approved so far</span>
      </div>

      {GROUPS.map((g) => {
        const list = changes.filter((c) => c.kind === g.kind);
        if (!list.length) return null;
        return (
          <section key={g.kind}>
            <h2>{g.title} ({list.length})</h2>
            <p className="muted small">{g.blurb}</p>
            {list.map((c) => {
              const d = state["crm:" + c.id];
              return (
                <div key={c.id} className="card">
                  <div className="row" style={{ marginTop: 0, justifyContent: "space-between" }}>
                    <div className="grow">
                      <b>{c.company}</b> <span className="chip">{c.lead_id ?? "new record"}</span>{c.field !== "new record" && <> <span className="chip blue">{c.field}</span></>}
                      {d && <span className={"chip " + (d === "approved" ? "green" : "red")} style={{ marginLeft: 6 }}>{d}</span>}
                      <p className="small">
                        {c.old_value && <><span className="muted">Now:</span> {c.old_value} <br /></>}
                        <span className="muted">{c.kind === "new_lead" ? "Add:" : "Change to:"}</span> <b>{c.new_value}</b>
                      </p>
                      <p className="small muted">{c.reason}</p>
                      {c.evidence.map((e, i) => (
                        <div key={i} className={"quote " + (e.verified ? "ok" : "bad")}>
                          &ldquo;{e.quote}&rdquo;
                          <div className="src">{e.verified ? "✓ " : "✗ "}<Link href={`/sources#${encodeURIComponent(e.file)}`}>{e.file}</Link></div>
                        </div>
                      ))}
                    </div>
                    <div className="row" style={{ marginTop: 0 }}>
                      {d ? <button onClick={() => decide(c, null)}>Undo</button> : (
                        <>
                          <button className="good" disabled={c.evidence.length > 0 && !c.evidence.some((e) => e.verified)} onClick={() => decide(c, "approved")}>Approve</button>
                          <button className="warn" onClick={() => decide(c, "rejected")}>Reject</button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </section>
        );
      })}

      <h2>CRM after approved changes</h2>
      <div className="row"><button className="primary" onClick={exportCsv}>Export as CSV</button><span className="note">Green rows changed. This prototype does not write to a live CRM.</span></div>
      <div className="table-wrap" style={{ marginTop: 10 }}>
        <table>
          <thead><tr>{COLS.map((c) => <th key={c}>{c}</th>)}</tr></thead>
          <tbody>
            {table.map((r) => (
              <tr key={r.lead_id} className={r._changed ? "changed" : ""}>
                {COLS.map((c) => <td key={c}>{String(r[c] ?? "") || <span className="muted">blank</span>}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
