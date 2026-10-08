// Prompts and output schemas shared by the live API routes and scripts/extract.mjs.
import { z } from "zod";

export const MODELS = {
  extract: "claude-haiku-5-5", // high-volume reading: cheap and fast (see Cost Estimation.xlsx)
  draft: "claude-sonnet-5-5", // drafts a founder will read and send
};

export const EXTRACT_SYSTEM = `You read sales emails and meeting notes for AtliQ, a small data and AI services company.
AtliQ people: Bhavin, Dhaval, Karandeep (founders who sell), Jay (sales executive), Pranav (CTO), Ayush (AI product manager).
Today's date is {TODAY}.

Find every item that needs an AtliQ person to act:
- waiting_on_us: a client asked something and AtliQ has not answered.
- promise: AtliQ said it would do something ("I'll send it by Friday").
- deadline: a dated event AtliQ should act before (a board meeting, a budget window).
- meeting: a scheduled call to prepare for.
- cross_sell: an existing client mentions a new need.
- revisit: a lost or quiet deal with a reason to get back in touch.
- new_lead: a company or person that wants to buy from AtliQ.
- internal: AtliQ housekeeping that blocks selling (missing details, unfinished notes).

Rules you must follow:
1. Every item needs at least one evidence quote copied EXACTLY, word for word, from the text. Never paraphrase a quote. If you cannot quote it, do not report it.
2. Never guess. If a value, date, email or name is not in the text, use null. Do not invent amounts.
3. due_date: use a date the text states ("by 15 July" -> explicit). For vague phrases ("next week", "shortly") propose a date and set due_basis "inferred". If there is no deadline at all, use null and due_basis "default".
4. owner: the AtliQ person who must act (from the thread). Use "Unassigned" if unclear.
5. Lines in italics in parentheses are mailbox notes saying what happened afterwards; treat them as facts.
6. Mark status "done" only if the text says it already happened.
7. Dates as YYYY-MM-DD.`;

export const ExtractSchema = z.object({
  items: z.array(
    z.object({
      type: z.enum(["waiting_on_us", "promise", "deadline", "meeting", "cross_sell", "revisit", "new_lead", "internal"]),
      status: z.enum(["open", "done"]),
      company: z.string(),
      contact_name: z.string().nullable(),
      contact_email: z.string().nullable(),
      owner: z.string(),
      summary: z.string(),
      action: z.string(),
      asked_on: z.string().nullable(),
      due_date: z.string().nullable(),
      due_basis: z.enum(["explicit", "inferred", "default"]),
      due_text: z.string().nullable(),
      client_deadline: z.string().nullable(),
      value_usd: z.number().nullable(),
      value_text: z.string().nullable(),
      quotes: z.array(z.string()),
    })
  ),
});

export const DRAFT_SYSTEM = `You draft short email replies for an AtliQ founder to review, edit and send themselves. You never send anything.
Rules you must follow:
1. Use only facts from the SOURCES and CRM RECORD provided. Do not invent prices, dates, names, attachments or technical answers.
2. Where the founder must supply something you don't know, write a placeholder in square brackets, e.g. [attach case study] or [confirm with Pranav].
3. If AtliQ is late, apologise once, briefly. No grovelling.
4. 3 to 6 sentences, plain and warm, signed with the owner's first name.
5. List in facts_used each sentence from the sources you relied on, copied exactly.`;

export const DraftSchema = z.object({
  subject: z.string(),
  body: z.string(),
  facts_used: z.array(z.string()),
});
