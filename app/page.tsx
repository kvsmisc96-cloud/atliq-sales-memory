import BriefView from "@/components/BriefView";
import { BRIEF_CAP, buildBrief } from "@/lib/brief";
import { PEOPLE, snapshot } from "@/lib/data";

export default function Home() {
  const { perPerson, items, rejected } = buildBrief();
  return (
    <>
      <h1>Today&apos;s brief</h1>
      <p className="lede">
        What needs each person today, ranked by plain rules (how overdue, how long the client has waited, deal size, deadlines).
        Every fact links to the sentence it came from. Pick a person to see their list.
      </p>
      <BriefView people={[...PEOPLE]} perPerson={perPerson} cap={BRIEF_CAP} />
      <p className="note" style={{ marginTop: 24 }}>
        Read from {items.length} items found across the dataset; {rejected.length} held back because their quotes could not be verified.
        Unassigned items go to Jay&apos;s list for triage. Source of items: {snapshot.generated_by}
      </p>
    </>
  );
}
