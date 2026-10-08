"use client";
// Prototype audit trail and decisions, kept in the browser (localStorage).
// A production build would store these server-side (see the PRD's audit-log requirement).

export interface AuditEntry {
  ts: string;
  actor: string;
  action: string;
  target: string;
  detail?: string;
}

const AUDIT_KEY = "atliq-audit";
const STATE_KEY = "atliq-state";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: the prototype still works, it just won't remember */
  }
}

export function audit(entry: Omit<AuditEntry, "ts">) {
  const log = read<AuditEntry[]>(AUDIT_KEY, []);
  log.unshift({ ...entry, ts: new Date().toISOString() });
  write(AUDIT_KEY, log.slice(0, 500));
}

export const readAudit = () => read<AuditEntry[]>(AUDIT_KEY, []);

/** Decisions per item or CRM change: "done" | "snoozed" | "rejected" | "approved". */
export function getState(): Record<string, string> {
  return read<Record<string, string>>(STATE_KEY, {});
}

export function setState(id: string, value: string | null) {
  const s = getState();
  if (value === null) delete s[id];
  else s[id] = value;
  write(STATE_KEY, s);
}

export function resetAll() {
  write(AUDIT_KEY, []);
  write(STATE_KEY, {});
}
