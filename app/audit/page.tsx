"use client";
import { useEffect, useState } from "react";
import { readAudit, resetAll, type AuditEntry } from "@/lib/store";

export default function AuditPage() {
  const [log, setLog] = useState<AuditEntry[]>([]);
  useEffect(() => setLog(readAudit()), []);
  return (
    <>
      <h1>Audit log</h1>
      <p className="lede">Every decision people make in the assistant: approvals, rejections, drafts copied or regenerated. In this prototype it is stored in your browser.</p>
      <div className="row">
        <button className="warn" onClick={() => { if (window.confirm("Clear the audit log and all decisions in this browser?")) { resetAll(); setLog([]); } }}>Reset demo</button>
      </div>
      {log.length === 0 ? <p className="muted">Nothing yet. Approve a CRM fix or mark a brief item done, then come back.</p> : (
        <div className="table-wrap" style={{ marginTop: 10 }}>
          <table>
            <thead><tr><th>When</th><th>Who</th><th>Action</th><th>On</th><th>Detail</th></tr></thead>
            <tbody>
              {log.map((e, i) => (
                <tr key={i}><td>{new Date(e.ts).toLocaleString()}</td><td>{e.actor}</td><td>{e.action}</td><td>{e.target}</td><td>{e.detail ?? ""}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
