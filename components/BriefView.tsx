"use client";
import { useEffect, useState } from "react";
import type { BriefItem } from "@/lib/types";
import ItemCard, { money } from "./ItemCard";
import { getState, setState, audit } from "@/lib/store";
import { useAiStatus } from "./useAiStatus";

interface Props {
  people: string[];
  perPerson: Record<string, { top: BriefItem[]; rest: BriefItem[] }>;
  cap: number;
}

export default function BriefView({ people, perPerson, cap }: Props) {
  const [who, setWho] = useState(people[0]);
  const [decisions, setDecisions] = useState<Record<string, string>>({});
  const aiOn = useAiStatus();

  useEffect(() => {
    setDecisions(getState());
    try {
      const saved = window.localStorage.getItem("atliq-who");
      if (saved && people.includes(saved)) setWho(saved);
    } catch { /* ignore */ }
  }, [people]);

  const choose = (p: string) => {
    setWho(p);
    try { window.localStorage.setItem("atliq-who", p); } catch { /* ignore */ }
  };

  const onDecision = (id: string, d: string) => {
    setState(id, d);
    setDecisions(getState());
  };
  const undo = (id: string, company: string) => {
    setState(id, null);
    setDecisions(getState());
    audit({ actor: who, action: "undid decision", target: company });
  };

  const mine = perPerson[who];
  const all = [...mine.top, ...mine.rest];
  const active = all.filter((i) => !decisions[i.id]);
  const top = active.slice(0, cap);
  const later = active.slice(cap);
  const handled = all.filter((i) => decisions[i.id]);
  const overdue = active.filter((i) => i.days_overdue > 0).length;
  const atStake = top.reduce((s, i) => s + (i.value ?? 0), 0);

  return (
    <>
      <div className="tabs" role="tablist">
        {people.map((p) => {
          const n = [...perPerson[p].top, ...perPerson[p].rest].filter((i) => !decisions[i.id]).length;
          return (
            <button key={p} className={"tab" + (p === who ? " active" : "")} onClick={() => choose(p)} role="tab" aria-selected={p === who}>
              {p}<span className="count">{Math.min(n, cap)}</span>
            </button>
          );
        })}
      </div>

      <div className="grid">
        <div className="stat"><div className="n">{top.length}</div><div className="l">items in today&apos;s brief (max {cap})</div></div>
        <div className="stat"><div className="n">{overdue}</div><div className="l">overdue</div></div>
        <div className="stat"><div className="n">{money(atStake)}</div><div className="l">value in these items (stated or CRM)</div></div>
        <div className="stat"><div className="n">{handled.length}</div><div className="l">handled today</div></div>
      </div>

      {top.length === 0 && <div className="card">Nothing needs you today. 🎉</div>}
      {top.map((item, i) => (
        <ItemCard key={item.id} item={item} rank={i + 1} actor={who} aiOn={aiOn} onDecision={onDecision} />
      ))}

      {later.length > 0 && (
        <details>
          <summary>See all: {later.length} lower-priority item{later.length === 1 ? "" : "s"}</summary>
          {later.map((item) => <ItemCard key={item.id} item={item} actor={who} aiOn={aiOn} onDecision={onDecision} />)}
        </details>
      )}

      {handled.length > 0 && (
        <details>
          <summary>Handled today ({handled.length})</summary>
          {handled.map((i) => (
            <div key={i.id} className="card row" style={{ justifyContent: "space-between" }}>
              <span><b>{i.company}</b> · {i.action} <span className="chip">{decisions[i.id]}</span></span>
              <button onClick={() => undo(i.id, i.company)}>Undo</button>
            </div>
          ))}
        </details>
      )}
    </>
  );
}
