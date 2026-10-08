// CRM matching and duplicate detection. Plain rules: exact email, then email domain, then company name.
import type { CrmRow } from "./types";

const GENERIC = new Set(["gmail.com", "yahoo.com", "outlook.com", "hotmail.com"]);
const STOP = new Set(["the", "group", "inc", "llc", "ltd", "pvt", "limited", "co", "and", "&"]);

export function domainOf(email: string | null | undefined): string | null {
  if (!email || !email.includes("@")) return null;
  const d = email.split("@")[1].trim().toLowerCase();
  return GENERIC.has(d) ? null : d;
}

export function companyKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !STOP.has(w))
    .slice(0, 1)
    .join(" ");
}

export function matchLead(crm: CrmRow[], company: string, email?: string | null): CrmRow | null {
  if (email) {
    const exact = crm.filter((r) => r.contact_email.toLowerCase() === email.toLowerCase());
    if (exact.length) return pickPrimary(exact);
  }
  const dom = domainOf(email);
  if (dom) {
    const byDomain = crm.filter((r) => domainOf(r.contact_email) === dom);
    if (byDomain.length) return pickPrimary(byDomain);
  }
  const key = companyKey(company);
  if (key.length >= 4) {
    const byName = crm.filter((r) => companyKey(r.company) === key);
    if (byName.length) return pickPrimary(byName);
  }
  return null;
}

/** When a company is in the CRM twice, prefer the record with a value, then the oldest. */
function pickPrimary(rows: CrmRow[]): CrmRow {
  return [...rows].sort((a, b) => {
    const va = a.est_value_usd ? 1 : 0, vb = b.est_value_usd ? 1 : 0;
    if (va !== vb) return vb - va;
    return a.created_date.localeCompare(b.created_date);
  })[0];
}

export interface DuplicateGroup {
  key: string;
  reason: string;
  rows: CrmRow[];
}

export function findDuplicates(crm: CrmRow[]): DuplicateGroup[] {
  const groups = new Map<string, { reason: string; rows: CrmRow[] }>();
  const add = (k: string, reason: string, r: CrmRow) => {
    const g = groups.get(k) ?? { reason, rows: [] };
    if (!g.rows.includes(r)) g.rows.push(r);
    groups.set(k, g);
  };
  for (const r of crm) {
    const dom = domainOf(r.contact_email);
    if (dom) add("domain:" + dom, `Same email domain (${dom})`, r);
    const key = companyKey(r.company);
    if (key.length >= 4) add("name:" + key, `Similar company name ("${key}")`, r);
  }
  // merge groups that share rows, keep only real duplicates
  const out: DuplicateGroup[] = [];
  const seen = new Set<string>();
  for (const [key, g] of groups) {
    if (g.rows.length < 2) continue;
    const ids = g.rows.map((r) => r.lead_id).sort().join(",");
    if (seen.has(ids)) continue;
    seen.add(ids);
    out.push({ key, reason: g.reason, rows: g.rows });
  }
  return out;
}

export function money(n: number | null): string {
  if (n === null || Number.isNaN(n)) return "Not stated";
  return "USD " + n.toLocaleString("en-US");
}
