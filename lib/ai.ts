// Live AI calls (server only). Used when ANTHROPIC_API_KEY is set; otherwise the app runs on the snapshot.
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { DRAFT_SYSTEM, DraftSchema, EXTRACT_SYSTEM, ExtractSchema, MODELS } from "./prompts.mjs";
import { TODAY } from "./data";

export const aiEnabled = () => Boolean(process.env.ANTHROPIC_API_KEY);

let client: Anthropic | null = null;
const getClient = () => (client ??= new Anthropic());

export class AiError extends Error {}

export async function extractFromText(text: string, crmContext: string) {
  const response = await getClient().messages.parse({
    model: MODELS.extract,
    max_tokens: 8000,
    system: [{ type: "text", text: EXTRACT_SYSTEM.replace("{TODAY}", TODAY), cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: `CRM RECORDS THAT MAY MATCH:\n${crmContext || "(none)"}\n\nTEXT TO READ:\n${text}` }],
    output_config: { effort: "low", format: zodOutputFormat(ExtractSchema) },
  });
  if (response.stop_reason === "refusal") throw new AiError("The model declined this request.");
  if (!response.parsed_output) throw new AiError("The model did not return valid output.");
  return { items: response.parsed_output.items, usage: response.usage };
}

export async function draftReply(input: { owner: string; to: string; action: string; sources: string; crmRecord: string }) {
  const response = await getClient().messages.parse({
    model: MODELS.draft,
    max_tokens: 4000,
    system: [{ type: "text", text: DRAFT_SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [{
      role: "user",
      content: `OWNER (signs the email): ${input.owner}\nTO: ${input.to}\nWHAT NEEDS DOING: ${input.action}\n\nCRM RECORD:\n${input.crmRecord || "(not in the CRM)"}\n\nSOURCES:\n${input.sources}`,
    }],
    output_config: { effort: "medium", format: zodOutputFormat(DraftSchema) },
  });
  if (response.stop_reason === "refusal") throw new AiError("The model declined this request.");
  if (!response.parsed_output) throw new AiError("The model did not return valid output.");
  return { draft: response.parsed_output, usage: response.usage };
}
