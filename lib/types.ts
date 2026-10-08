export type ItemType =
  | "waiting_on_us"
  | "promise"
  | "deadline"
  | "meeting"
  | "cross_sell"
  | "revisit"
  | "new_lead"
  | "internal";

export interface Evidence {
  file: string;
  quote: string;
}

export interface Draft {
  to: string;
  subject: string;
  body: string;
}

/** One fact the AI pulled out of an email or note (see lib/prompts.mjs). */
export interface ExtractedItem {
  id: string;
  type: ItemType;
  status: "open" | "done";
  company: string;
  contact_name: string | null;
  contact_email: string | null;
  owner: string;
  summary: string;
  action: string;
  asked_on: string | null;
  due_date: string | null;
  due_basis: "explicit" | "inferred" | "default";
  due_text: string | null;
  client_deadline: string | null;
  client_deadline_text: string | null;
  value_usd: number | null;
  value_text: string | null;
  evidence: Evidence[];
  draft: Draft | null;
}

export interface CrmUpdate {
  company: string;
  lead_hint: string | null;
  field: string;
  new_value: string;
  reason: string;
  evidence: Evidence[];
}

export interface NewLead {
  company: string;
  contact_name: string;
  contact_email: string;
  source: string;
  service_interest: string;
  owner: string;
  notes: string;
  evidence: Evidence[];
}

export interface Snapshot {
  generated_by: string;
  today: string;
  items: ExtractedItem[];
  crm_updates: CrmUpdate[];
  new_leads: NewLead[];
}

export interface SourceDoc {
  file: string;
  date: string;
  title: string;
  kind: "email" | "note";
  text: string;
}

export interface CrmRow {
  lead_id: string;
  company: string;
  contact_name: string;
  contact_email: string;
  source: string;
  service_interest: string;
  status: string;
  est_value_usd: string;
  owner: string;
  created_date: string;
  last_contact_date: string;
  next_followup_date: string;
  notes: string;
}

export interface VerifiedEvidence extends Evidence {
  verified: boolean;
}

/** An item after the guardrail check and the rules engine. */
export interface BriefItem extends Omit<ExtractedItem, "evidence"> {
  evidence: VerifiedEvidence[];
  lead: CrmRow | null;
  effective_due: string | null;
  due_label: string;
  due_rule: string;
  days_overdue: number;
  waiting_days: number | null;
  value: number | null;
  value_source: "stated" | "crm" | "not stated";
  priority: number;
  reasons: string[];
}

export interface CrmChange {
  id: string;
  kind: "update" | "new_lead" | "duplicate" | "rule";
  lead_id: string | null;
  company: string;
  field: string;
  old_value: string;
  new_value: string;
  reason: string;
  evidence: VerifiedEvidence[];
}
