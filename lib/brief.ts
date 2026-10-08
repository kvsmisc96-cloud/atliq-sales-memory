// The rules engine: turns verified AI items into a ranked daily brief.
// Ranking and due dates are plain rules (not AI) so anyone can see why an item is on top.
import { addDays, addWorkingDays, daysBetween, pretty } from "./dates";
import { crm, snapshot, sourceText, TODAY, PEOPLE } from "./data";
import { matchLead, findDuplicates, money } from "./crm";
import { verifyEvidence, valueTextGrounded } from "./verify";
import type { BriefItem, CrmChange, ExtractedItem } from "./types";

export const BRIEF_CAP = 7;
export const REPLY_SLA_WORKING_DAYS = 2;

const TYPE_WEIGHT: Record<string, number> = {
  waiting_on_us: 12, promise: 10, deadline: 10, meeting: 6, new_lead: 8, cross_sell: 4, revisit: 3, internal: 3,
};

export const TYPE_LABEL: Record<string, string> = {
  waiting_on_us: "Client waiting on us",
  promise: "Our promise",
  deadline: "Deadline",
  meeting: "Upcoming meeting",
  cross_sell: "Cross-sell",
  revisit: "Revisit",
  new_lead: "New lead",
  internal: "Internal task",
};

function dueFor(item: ExtractedItem): { due: string | null; rule: string } {
  if (item.due_date) {
    return { due: item.due_date, rule: item.due_basis === "explicit" ? `Date stated: "${item.due_text ?? pretty(item.due_date)}"` : `Proposed date (guess) from: "${item.due_text ?? ""}"` };
  }
  if (!item.asked_on) return { due: null, rule: "No date stated" };
  switch (item.type) {
    case "waiting_on_us":
    case "new_lead":
      return { due: addWorkingDays(item.asked_on, REPLY_SLA_WORKING_DAYS), rule: `Rule: reply within ${REPLY_SLA_WORKING_DAYS} working days of ${pretty(item.asked_on)}` };
    case "promise":
    case "internal":
      return { due: addWorkingDays(item.asked_on, 5), rule: "Rule: no date given, so 5 working days" };
    case "revisit":
      return { due: addDays(item.asked_on, 14), rule: "Rule: nudge after 2 weeks without a reply" };
    default:
      return { due: addWorkingDays(item.asked_on, 5), rule: "Rule: 5 working days" };
  }
}

function dueLabel(due: string | null, status: string): string {
  if (status === "done") return "Done";
  if (!due) return "No date";
  const d = daysBetween(TODAY, due);
  if (d < 0) return `Overdue by ${-d} day${d === -1 ? "" : "s"}`;
  if (d === 0) return "Due today";
  return `Due in ${d} day${d === 1 ? "" : "s"}`;
}

export function buildItems(): { items: BriefItem[]; rejected: BriefItem[] } {
  const all: BriefItem[] = snapshot.items.map((raw) => {
    const evidence = verifyEvidence(raw.evidence, sourceText);
    const lead = matchLead(crm, raw.company, raw.contact_email);
    const { due, rule } = dueFor(raw);
    const daysOverdue = due && raw.status === "open" ? Math.max(0, daysBetween(due, TODAY)) : 0;
    const waiting = raw.type === "waiting_on_us" && raw.asked_on ? daysBetween(raw.asked_on, TODAY) : null;

    // Value: only a number that is stated in a source or recorded in the CRM. Never guessed.
    const evidenceTexts = raw.evidence.map((e) => sourceText(e.file) ?? "");
    let value: number | null = null;
    let valueSource: BriefItem["value_source"] = "not stated";
    if (raw.value_usd !== null && raw.value_text && valueTextGrounded(raw.value_text, evidenceTexts)) {
      value = raw.value_usd; valueSource = "stated";
    } else if (lead?.est_value_usd) {
      value = Number(lead.est_value_usd); valueSource = "crm";
    }

    const reasons: string[] = [];
    let priority = TYPE_WEIGHT[raw.type] ?? 0;
    if (waiting !== null) { reasons.push(`Client waiting ${waiting} days`); }
    if (daysOverdue > 0) { priority += Math.min(daysOverdue, 45); if (waiting === null) reasons.push(`${daysOverdue} days overdue`); }
    if (due) {
      const ahead = daysBetween(TODAY, due);
      if (ahead >= 0 && ahead <= 3) { priority += 25; reasons.push(ahead === 0 ? "Due today" : `Due in ${ahead} day${ahead === 1 ? "" : "s"}`); }
      else if (ahead > 3 && ahead <= 7) priority += 10;
      else if (ahead > 14) priority -= 25;
    }
    if (raw.client_deadline) {
      const ahead = daysBetween(TODAY, raw.client_deadline);
      if (ahead <= 7) { priority += 20; reasons.push(ahead < 0 ? `Client deadline passed ${-ahead} days ago` : `Client deadline ${pretty(raw.client_deadline)}`); }
    }
    if (value) { priority += Math.min(value / 2500, 40); reasons.push(`${money(value)} (${valueSource === "crm" ? "CRM" : "stated in source"})`); }
    if (!lead && raw.type !== "internal") reasons.push("Not in the CRM");

    return {
      ...raw, evidence, lead, effective_due: due, due_rule: rule, due_label: dueLabel(due, raw.status),
      days_overdue: daysOverdue, waiting_days: waiting, value, value_source: valueSource,
      priority: Math.round(priority), reasons,
    };
  });
  // Guardrail: an item with no verified quote never reaches anyone.
  const items = all.filter((i) => i.evidence.some((e) => e.verified));
  const rejected = all.filter((i) => !i.evidence.some((e) => e.verified));
  return { items, rejected };
}

export function ownerOf(i: BriefItem): string {
  return (PEOPLE as readonly string[]).includes(i.owner) ? i.owner : "Jay"; // unassigned items go to Jay's triage
}

export function buildBrief() {
  const { items, rejected } = buildItems();
  const open = items.filter((i) => i.status === "open" && ["waiting_on_us", "promise", "deadline", "meeting", "new_lead", "internal", "revisit", "cross_sell"].includes(i.type));
  const perPerson: Record<string, { top: BriefItem[]; rest: BriefItem[] }> = {};
  for (const p of PEOPLE) {
    const mine = open.filter((i) => ownerOf(i) === p).sort((a, b) => b.priority - a.priority);
    perPerson[p] = { top: mine.slice(0, BRIEF_CAP), rest: mine.slice(BRIEF_CAP) };
  }
  return { perPerson, items, rejected };
}

/** Suggested CRM changes: from the AI (with quotes) plus plain rules (duplicates, stale dates, missing owners). */
export function buildCrmChanges(): CrmChange[] {
  const changes: CrmChange[] = [];
  for (const [n, u] of snapshot.crm_updates.entries()) {
    const lead = matchLead(crm, u.company);
    changes.push({
      id: `u${n}`, kind: "update", lead_id: lead?.lead_id ?? null, company: lead?.company ?? u.company, field: u.field,
      old_value: lead ? (lead as unknown as Record<string, string>)[u.field] ?? "" : "", new_value: u.new_value,
      reason: u.reason, evidence: verifyEvidence(u.evidence, sourceText),
    });
  }
  for (const [n, l] of snapshot.new_leads.entries()) {
    const existing = matchLead(crm, l.company, l.contact_email.includes("@") ? l.contact_email : null);
    if (existing) continue; // only propose leads the CRM really lacks
    changes.push({
      id: `n${n}`, kind: "new_lead", lead_id: null, company: l.company, field: "new record", old_value: "",
      new_value: `${l.contact_name} · ${l.contact_email} · ${l.source} · owner ${l.owner}`,
      reason: l.notes, evidence: verifyEvidence(l.evidence, sourceText),
    });
  }
  for (const [n, g] of findDuplicates(crm).entries()) {
    changes.push({
      id: `d${n}`, kind: "duplicate", lead_id: g.rows.map((r) => r.lead_id).join(" + "), company: g.rows[0].company,
      field: "merge records", old_value: g.rows.map((r) => `${r.lead_id} ${r.company} (${r.owner || "no owner"})`).join(" / "),
      new_value: `Keep ${g.rows[0].lead_id}, merge the others into it`, reason: g.reason, evidence: [],
    });
  }
  // Rule: CRM last_contact_date older than the latest dated activity we can see.
  const { items } = buildItems();
  const latest = new Map<string, { date: string; item: BriefItem }>();
  for (const i of items) {
    if (!i.lead || !i.asked_on) continue;
    const cur = latest.get(i.lead.lead_id);
    if (!cur || i.asked_on > cur.date) latest.set(i.lead.lead_id, { date: i.asked_on, item: i });
  }
  for (const [leadId, { date, item }] of latest) {
    const lead = crm.find((r) => r.lead_id === leadId)!;
    if (!lead.last_contact_date || lead.last_contact_date < date) {
      changes.push({
        id: `r-${leadId}`, kind: "rule", lead_id: leadId, company: lead.company, field: "last_contact_date",
        old_value: lead.last_contact_date || "(blank)", new_value: date,
        reason: "Newer activity found in email or notes.", evidence: item.evidence.filter((e) => e.verified).slice(0, 1),
      });
    }
  }
  return changes;
}
