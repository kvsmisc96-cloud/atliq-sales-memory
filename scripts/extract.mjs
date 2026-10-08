// Re-run the AI extraction over every file in data/raw with Claude Haiku 5.5.
// Needs ANTHROPIC_API_KEY. Writes data/extracted.ai.json (the app keeps using data/extracted.json
// until you review the new file and copy it over).
//   ANTHROPIC_API_KEY=sk-... npm run extract
import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { EXTRACT_SYSTEM, ExtractSchema, MODELS } from "../lib/prompts.mjs";

const TODAY = "2026-07-10";
const RAW = path.join(process.cwd(), "data/raw");
const OUT = path.join(process.cwd(), "data/extracted.ai.json");

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("Set ANTHROPIC_API_KEY first (see .env.example).");
  process.exit(1);
}

// Same check as lib/verify.ts: a quote counts only if it appears word-for-word in its file.
const normalize = (s) =>
  s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\*/g, "").replace(/\s+/g, " ").trim().toLowerCase();
const found = (q, text) => q.trim().length >= 8 && normalize(text).includes(normalize(q));

const crm = fs.readFileSync(path.join(process.cwd(), "data/crm_export.csv"), "utf8");
const client = new Anthropic();
const items = [];
let inTok = 0, outTok = 0, heldBack = 0;

for (const file of fs.readdirSync(RAW).filter((f) => f.endsWith(".md")).sort()) {
  const text = fs.readFileSync(path.join(RAW, file), "utf8");
  const res = await client.messages.parse({
    model: MODELS.extract,
    max_tokens: 8000,
    system: [{ type: "text", text: EXTRACT_SYSTEM.replace("{TODAY}", TODAY) + "\n\nCRM EXPORT:\n" + crm, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: `FILE: ${file}\n\n${text}` }],
    output_config: { effort: "low", format: zodOutputFormat(ExtractSchema) },
  });
  inTok += res.usage.input_tokens + (res.usage.cache_read_input_tokens ?? 0);
  outTok += res.usage.output_tokens;
  if (res.stop_reason === "refusal" || !res.parsed_output) {
    console.warn(`  ${file}: no usable output (${res.stop_reason})`);
    continue;
  }
  for (const it of res.parsed_output.items) {
    const evidence = it.quotes.filter((q) => found(q, text)).map((quote) => ({ file, quote }));
    if (evidence.length === 0) { heldBack++; continue; } // guardrail: no verified quote, not shown
    const { quotes, ...rest } = it;
    items.push({ id: `${file.replace(/\.md$/, "")}-${items.length}`, ...rest, evidence, draft: null });
  }
  console.log(`  ${file}: ${res.parsed_output.items.length} items`);
}

fs.writeFileSync(OUT, JSON.stringify({ generated_by: `${MODELS.extract} via scripts/extract.mjs`, generated_at: new Date().toISOString(), items, crm_updates: [], new_leads: [] }, null, 2));
console.log(`\n${items.length} items written to ${path.relative(process.cwd(), OUT)}; ${heldBack} held back for unverified quotes.`);
console.log(`Tokens: ${inTok} in, ${outTok} out (Haiku 5.5 at $0.10/$0.50 per million ≈ $${((inTok * 0.1 + outTok * 0.5) / 1e6).toFixed(4)}).`);
