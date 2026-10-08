// Plain date rules (no AI): working days, overdue counts, labels.
const DAY = 86_400_000;

export function toDate(iso: string): Date {
  return new Date(iso + "T00:00:00Z");
}

export function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addWorkingDays(isoDate: string, n: number): string {
  const d = toDate(isoDate);
  let added = 0;
  while (added < n) {
    d.setUTCDate(d.getUTCDate() + 1);
    const day = d.getUTCDay();
    if (day !== 0 && day !== 6) added++;
  }
  return iso(d);
}

export function addDays(isoDate: string, n: number): string {
  return iso(new Date(toDate(isoDate).getTime() + n * DAY));
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((toDate(toIso).getTime() - toDate(fromIso).getTime()) / DAY);
}

export function pretty(isoDate: string | null): string {
  if (!isoDate) return "not stated";
  return toDate(isoDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export function weekday(isoDate: string): string {
  return toDate(isoDate).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}
