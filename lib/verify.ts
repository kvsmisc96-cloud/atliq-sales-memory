// Guardrail: an AI-extracted fact is only shown if its quote really appears in the source.
// The check is plain string matching, so it does not depend on the model behaving.
import type { Evidence, VerifiedEvidence } from "./types";

export function normalize(text: string): string {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\*/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function quoteInText(quote: string, text: string): boolean {
  const q = normalize(quote);
  return q.length >= 8 && normalize(text).includes(q);
}

export function verifyEvidence(evidence: Evidence[], textForFile: (file: string) => string | undefined): VerifiedEvidence[] {
  return evidence.map((e) => {
    const text = textForFile(e.file);
    return { ...e, verified: text !== undefined && quoteInText(e.quote, text) };
  });
}

/** Splits "Phase 1 ... at 18k" style value notes and checks every part is in the sources. */
export function valueTextGrounded(valueText: string, texts: string[]): boolean {
  const parts = valueText.split("...").map((p) => p.trim()).filter((p) => p.length >= 3);
  if (parts.length === 0) return false;
  const joined = texts.map(normalize).join(" \n ");
  return parts.every((p) => joined.includes(normalize(p)));
}
