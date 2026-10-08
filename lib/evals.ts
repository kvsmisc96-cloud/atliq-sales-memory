// Evaluation set from the PRD (Section 11): known answers in the dataset the assistant must find.
import { buildBrief, buildCrmChanges } from "./brief";
import { sourceText } from "./data";
import { normalize, quoteInText } from "./verify";

export interface EvalResult {
  name: string;
  expected: string;
  actual: string;
  pass: boolean;
  feature: string;
}

export function runEvals(): EvalResult[] {
  const { perPerson, items, rejected } = buildBrief();
  const changes = buildCrmChanges();
  const open = items.filter((i) => i.status === "open");
  const has = (company: string) => open.find((i) => i.company.toLowerCase().startsWith(company.toLowerCase()));
  const out: EvalResult[] = [];

  const missing = ["Harbor & Finch", "Lumino", "PixelWorks", "Nimbus"];
  const proposed = changes.filter((c) => c.kind === "new_lead").map((c) => c.company);
  const found = missing.filter((m) => proposed.some((p) => p.startsWith(m)));
  out.push({ name: "Find leads missing from the CRM", feature: "F1", expected: missing.join(", "),
    actual: found.length ? found.join(", ") : "none", pass: found.length === missing.length });

  const dups = changes.filter((c) => c.kind === "duplicate").map((c) => c.lead_id ?? "");
  const meridian = dups.some((d) => d.includes("L-1003") && d.includes("L-1027"));
  out.push({ name: "Flag the Meridian duplicate", feature: "F1", expected: "L-1003 + L-1027",
    actual: dups.join("; ") || "none", pass: meridian });

  const bb = has("ByteBridge");
  out.push({ name: "Find the overdue ByteBridge promise", feature: "F2", expected: "Due 15 May 2026, 56 days overdue",
    actual: bb ? `Due ${bb.effective_due}, ${bb.days_overdue} days overdue` : "not found",
    pass: !!bb && bb.effective_due === "2026-05-15" && bb.days_overdue === 56 });

  const bhavin = perPerson["Bhavin"].top.map((i) => i.company);
  const fe = has("FinEdge"), me = has("Meridian");
  out.push({ name: "FinEdge and Meridian top Bhavin's brief", feature: "F3", expected: "Both in Bhavin's top 7; waiting 21 and 24 days",
    actual: `FinEdge ${fe?.waiting_days ?? "?"} days, Meridian ${me?.waiting_days ?? "?"} days; in top 7: ${bhavin.filter((c) => /FinEdge|Meridian/.test(c)).join(", ") || "neither"}`,
    pass: !!fe && !!me && fe.waiting_days === 21 && me.waiting_days === 24 && bhavin.some((c) => c.startsWith("FinEdge")) && bhavin.some((c) => c.startsWith("Meridian")) });

  const stalled = ["FinEdge", "NovaPharma", "Quantia", "ShopSwift", "Meridian", "ClearPath", "HealthFirst"];
  const vals = stalled.map((c) => {
    const its = open.filter((i) => i.company.toLowerCase().startsWith(c.toLowerCase()) && i.value);
    return its.length ? Math.max(...its.map((i) => i.value ?? 0)) : 0;
  });
  const total = vals.reduce((a, b) => a + b, 0);
  out.push({ name: "Surface all 7 stalled valued deals", feature: "F3", expected: "7 deals, USD 405,000",
    actual: `${vals.filter((v) => v > 0).length} deals, USD ${total.toLocaleString("en-US")}`, pass: vals.every((v) => v > 0) && total === 405000 });

  const acme = open.find((i) => i.type === "cross_sell" && i.company.startsWith("Acme") && /forecast/i.test(i.summary));
  out.push({ name: "Spot the Acme forecasting cross-sell", feature: "F4", expected: "Cross-sell item for Acme forecasting",
    actual: acme ? acme.summary : "not found", pass: !!acme });

  const hf = has("HealthFirst");
  out.push({ name: "Remind Karandeep before HealthFirst's 14 July board", feature: "F5", expected: "Due before 14 Jul, in Karandeep's brief",
    actual: hf ? `Due ${hf.effective_due}, owner ${hf.owner}` : "not found",
    pass: !!hf && !!hf.effective_due && hf.effective_due < "2026-07-14" && perPerson["Karandeep"].top.includes(hf) });

  const allEv = items.flatMap((i) => i.evidence);
  const verified = allEv.filter((e) => e.verified).length;
  out.push({ name: "Every shown fact has a verified source quote", feature: "Guardrail", expected: "100% of quotes found in their source; 0 items shown without one",
    actual: `${verified}/${allEv.length} quotes verified; ${rejected.length} items held back`, pass: verified === allEv.length && items.every((i) => i.evidence.some((e) => e.verified)) });

  const fake = "We have approved a budget of 500k for the full programme.";
  const caught = !quoteInText(fake, "Bhavin — good news, compliance has cleared AtliQ. We can move to the commercial discussion now.");
  out.push({ name: "A made-up quote is rejected", feature: "Guardrail", expected: "Fabricated \"500k budget\" quote fails verification",
    actual: caught ? "Rejected" : "Accepted (bug)", pass: caught });

  const valued = items.filter((i) => i.value !== null);
  const noGuess = valued.every((i) => i.value_source === "crm" || i.value_source === "stated");
  const notStated = items.filter((i) => i.value === null).length;
  out.push({ name: "No guessed deal values", feature: "Guardrail", expected: "Every value comes from a source quote or the CRM; others say \"Not stated\"",
    actual: `${valued.length} values sourced, ${notStated} shown as "Not stated"`, pass: noGuess });

  const sizes = Object.values(perPerson).map((p) => p.top.length);
  out.push({ name: "Brief stays short", feature: "F5", expected: "At most 7 items per person", actual: `Largest brief: ${Math.max(...sizes)} items`, pass: Math.max(...sizes) <= 7 });

  const drafts = items.filter((i) => i.draft);
  const unsupported: string[] = [];
  for (const i of drafts) {
    const src = i.evidence.map((e) => normalize(sourceText(e.file) ?? "")).join(" ");
    for (const fig of i.draft!.body.match(/\b\d+(?:[.,]\d+)?k\b|\bUSD\s?[\d,]+/gi) ?? []) {
      if (!src.includes(normalize(fig))) unsupported.push(`${i.company}: ${fig}`);
    }
  }
  out.push({ name: "Drafts only quote figures found in the sources", feature: "Guardrail", expected: "Every price or amount in a draft appears in its sources; unknowns stay as [placeholders]",
    actual: unsupported.length ? `Unsupported: ${unsupported.join(", ")}` : `${drafts.length} drafts checked, 0 unsupported figures`, pass: unsupported.length === 0 });

  return out;
}
