import CrmView from "@/components/CrmView";
import { buildCrmChanges } from "@/lib/brief";
import { crm } from "@/lib/data";

export default function CrmPage() {
  const changes = buildCrmChanges();
  const empty = (f: keyof (typeof crm)[number]) => crm.filter((r) => !r[f]).length;
  return (
    <>
      <h1>CRM fixes</h1>
      <p className="lede">
        Suggested changes to the CRM, each with its reason and source. Nothing changes until someone approves it.
        Approved changes show in the table below and can be exported as a CSV for import.
      </p>
      <div className="grid">
        <div className="stat"><div className="n">{empty("next_followup_date")}/{crm.length}</div><div className="l">records with no follow-up date</div></div>
        <div className="stat"><div className="n">{empty("est_value_usd")}</div><div className="l">records with no value</div></div>
        <div className="stat"><div className="n">{empty("owner")}</div><div className="l">records with no owner</div></div>
        <div className="stat"><div className="n">{changes.length}</div><div className="l">suggested fixes</div></div>
      </div>
      <CrmView changes={changes} crm={crm} />
    </>
  );
}
