import { runEvals } from "@/lib/evals";

export default function Evals() {
  const results = runEvals();
  const passed = results.filter((r) => r.pass).length;
  return (
    <>
      <h1>Evals</h1>
      <p className="lede">
        Known answers hidden in the dataset (PRD Section 11). These checks run against the live pipeline every time this page loads,
        so a bad change to prompts or rules shows up here.
      </p>
      <div className="grid">
        <div className="stat"><div className="n">{passed}/{results.length}</div><div className="l">checks passing</div></div>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Result</th><th>Check</th><th>Feature</th><th>Expected</th><th>Actual</th></tr></thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.name}>
                <td className={r.pass ? "pass" : "fail"}>{r.pass ? "PASS" : "FAIL"}</td>
                <td>{r.name}</td><td>{r.feature}</td><td>{r.expected}</td><td>{r.actual}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2>Guardrails built into the design</h2>
      <div className="guard">
        <div><b>Human sends.</b> There is no send endpoint. Drafts can only be copied or opened in your own email app.</div>
        <div><b>Cite the source.</b> Facts without a word-for-word quote are held back before anyone sees them.</div>
        <div><b>&quot;Not stated&quot; instead of guessing.</b> Values come from a quoted sentence or the CRM; otherwise &quot;Not stated&quot;.</div>
        <div><b>No CRM writes without approval.</b> Every change waits for Approve on the CRM fixes page.</div>
        <div><b>Narrow access.</b> Live calls send only the pasted text and matching CRM rows.</div>
        <div><b>Audit trail.</b> Every approve, reject, copy and regenerate is logged on the Audit log page.</div>
      </div>
    </>
  );
}
