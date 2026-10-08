import { buildItems } from "@/lib/brief";
import ItemCard from "@/components/ItemCard";

export default function Opportunities() {
  const { items } = buildItems();
  const cross = items.filter((i) => i.type === "cross_sell" && i.status === "open");
  const revisit = items.filter((i) => i.type === "revisit" && i.status === "open");
  const reopened = items.filter((i) => i.lead?.status === "Lost" && i.status === "open" && i.type !== "revisit");
  return (
    <>
      <h1>Opportunities</h1>
      <p className="lede">New needs from happy clients, and lost or quiet deals with a reason to get back in touch. These also appear in each owner&apos;s brief.</p>
      <h2>Cross-sell from existing clients ({cross.length})</h2>
      {cross.map((i) => <ItemCard key={i.id} item={i} actor="viewer" aiOn={false} readOnly />)}
      <h2>Lost deals that came back ({reopened.length})</h2>
      <p className="muted small">The CRM still marks these as Lost, but the client has re-opened the conversation.</p>
      {reopened.map((i) => <ItemCard key={i.id} item={i} actor="viewer" aiOn={false} readOnly />)}
      <h2>Revisit and nudge ({revisit.length})</h2>
      {revisit.map((i) => <ItemCard key={i.id} item={i} actor="viewer" aiOn={false} readOnly />)}
    </>
  );
}
