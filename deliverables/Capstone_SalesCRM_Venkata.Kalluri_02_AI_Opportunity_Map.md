# AtliQ AI Opportunity Map (Step 2)

**Miro board:** https://miro.com/app/board/uXjVEd_SCtA=/

This file is a text export of the board's content. Dataset date: 10 Jul 2026.

## Frame 1: Workflow stages
### 1. Capture
- Today: A lead turns up in an inbox, a LinkedIn DM, a phone call or a business card
- Leak: Never entered: it stays in one person's inbox or pocket
- Example: Harbor & Finch, Nimbus Lending, Lumino Fitness and PixelWorks all wrote in. None is in the CRM; none got a reply
- AI could: Spot new leads in email and notes and draft the CRM record

### 2. Log & qualify
- Today: Someone types a name and company into the CRM, days later, from memory
- Leak: Thin records: no need, value, decision-maker or contact
- Example: MedTrack note: "lab ops dashboards? or was it LIMS integration. both?" BlueOrchid's email is "on her card. which card. which drawer"
- AI could: Fill the fields (need, budget, deadline, people) from the conversation itself

### 3. Follow up
- Today: A founder promises "I'll send it by Friday" on the phone or in a reply
- Leak: Slipped follow-ups: the promise lives only in a sent email
- Example: Karandeep promised ByteBridge two case studies "by Friday" (15 May). Nothing sent 56 days later. Zenlytics' call invite was never sent
- AI could: Turn every promise and client deadline into a dated task with an owner

### 4. Propose & negotiate
- Today: Proposal goes out; client replies with questions, paperwork or a deadline
- Leak: Stale proposals: questions and deadlines sit unanswered
- Example: Meridian's two questions unanswered 24 days. FinEdge (USD 95k) asked to book a call 21 days ago. ShopSwift needs a SOW by 15 July
- AI could: Flag client emails waiting on AtliQ, ranked by deal size and deadline

### 5. Close & update
- Today: A deal is won, revived or lost, and the CRM status may or may not change
- Leak: The CRM says the wrong thing
- Example: Trustline said yes on 9 July but shows "Proposal Sent". Kaveri is back in a live demo but shows "Lost". Meridian is in twice
- AI could: Suggest status changes from what the emails say, and catch duplicates

### 6. Grow the client
- Today: A happy client mentions a second problem in a review or a thank-you email
- Leak: Missed cross-sells: no place to log a new need from an existing client
- Example: Northwind asked for dashboards; Acme raised inventory forecasting; GlobalMart asked about demand forecasting. None logged
- AI could: Spot new needs in client emails and match them to AtliQ's services

### 7. Revisit
- Today: A lost deal says "try again later"
- Leak: Forgotten revisits: nobody sets the reminder
- Example: Quantia: "check back around Q2 2026. I mean that." ClearPath's budget unfroze and Deepa wrote back. Both still say "Lost"
- AI could: Read "check back in Q4" as a revisit date and notice when lost leads return

## Frames 2-3: Opportunities and scores
| ID | Opportunity | Impact | Feasibility | Verdict | Why |
|---|---|---|---|---|---|
| #1 | Inbox lead catcher | 5 | 5 | Build now | Fixes the biggest leak with data AtliQ already has |
| #2 | Card photo & voice note capture | 4 | 3 | Park for v2 | Needs photo and speech tools and there are no samples in the dataset |
| #3 | Auto-fill deal details | 4 | 5 | Build now | Reading text into fields is what language models do well |
| #4 | Promise & deadline tracker | 5 | 4 | Build now | Addresses the zero follow-up dates problem directly |
| #5 | Waiting-on-us radar | 5 | 5 | Build now | A simple rule (who wrote last) plus AI to judge if a reply is needed |
| #6 | Cross-sell spotter | 4 | 4 | Build now | Cheapest revenue there is; needs a fixed list of AtliQ services |
| #7 | Revisit scheduler | 4 | 4 | Build now | Small effort, rescues pre-qualified deals |
| #8 | Status & duplicate fixer | 3 | 4 | Fold in | Useful but rides on the same reading as #1 and #5 |
| #9 | Daily "needs you today" brief | 5 | 4 | Build now | This is how the founders will actually see everything else |
| #10 | Reply drafter | 4 | 4 | Build now | Removes the blank-page delay; a human always sends |
| #11 | Proposal, SOW & questionnaire writer | 4 | 2 | Park for v2 | Needs AtliQ's real policies; a wrong answer is a legal risk |
| #12 | Win-probability score | 2 | 1 | Don't build | 40 records is far too little history; a guess dressed as a number |
| #13 | AI that emails clients on its own | 2 | 2 | Don't build | Founder-led sales runs on personal trust; one wrong email costs a deal |
| #14 | Meeting bot that joins calls | 3 | 2 | Don't build | Consent, privacy and many calls happen on the move or by phone |
| #15 | Owner suggester | 3 | 4 | Fold in | Quick add-on to the lead draft; founders confirm |
| #16 | Objection & competitor helper | 3 | 3 | Park for v2 | Needs a library of case studies and rate cards we don't have yet |

## Frame 4: Scope
**Should:**
- Read the sales inboxes, call notes and the CRM, and nothing else
- Draft new leads and suggest updates; a person clicks Approve to save
- Show the exact sentence each field came from
- Give every open deal a next step, a date and an owner
- Flag client emails waiting on AtliQ, with days waiting
- Spot cross-sell hints and "check back later" revisits
- Send each seller a short daily list of what needs them
- Draft replies for the founder to edit and send
- Say "not stated" when the source doesn't say

**Should NOT:**
- Send any email or message to a client by itself
- Change, merge or delete CRM records without a human click
- Invent prices, timelines, references or capabilities (e.g. promise HL7 support)
- Answer security or compliance questionnaires
- Predict win chances or score how well a seller performs
- Decide between founders who owns a deal; it only suggests
- Read personal mail or anything outside sales conversations
- Manage project delivery (out of scope for this dataset)
- Replace the CRM; it keeps the CRM honest instead

## Frame 5: Features, AI capability, guardrails
### F1 Lead catcher (#1 + #3 + #15)
- AI capability: Information extraction and matching
- In: New email or pasted note
- Out: A draft CRM record with a suggested owner
- Example: Harbor & Finch email (27 Jun) becomes: Harbor & Finch Advisory, David Harbor, Referral from Suresh (FinEdge), automate ~120 client reports a quarter, value not stated, next step: reply with call slots, owner: Bhavin (suggested)
- Guardrail: Every field links to the sentence it came from
- Guardrail: Blank stays blank: "not stated", never a guess
- Guardrail: Checks for an existing record before creating one (Meridian twice)
- Guardrail: Saved only after a person approves

### F2 Promise & deadline tracker (#4)
- AI capability: Commitment and date extraction
- In: Email threads and meeting notes
- Out: Follow-up tasks with owner, due date and the original words
- Example: "I'll send both, plus a reference, by Friday" (Karandeep to ByteBridge, Tue 12 May) becomes: Karandeep, send 2 case studies + 1 reference, due 15 May, 56 days overdue
- Guardrail: Shows the original words next to the date it worked out
- Guardrail: Asks when a date is vague ("after their board meet")
- Guardrail: Owner is the person who made the promise; they can reassign
- Guardrail: Never sends the reminder to the client

### F3 Waiting-on-us radar (#5 + #8)
- AI capability: Classification plus simple rules
- In: Email threads plus CRM status
- Out: A list of unanswered client emails, and suggested status fixes
- Example: FinEdge, 19 Jun: "please confirm your availability". 21 days unanswered, USD 95k, top of the list. Trustline: suggest "Proposal Sent" to "Verbal yes, contract out"
- Guardrail: Day counts come from a fixed rule, not the AI
- Guardrail: Status changes are suggestions with the email as proof
- Guardrail: Never marks a deal Won or Lost by itself
- Guardrail: Ignores out-of-office auto-replies as "replies"

### F4 Cross-sell & revisit spotter (#6 + #7)
- AI capability: Signal detection against a fixed service list
- In: Emails and notes from existing clients and lost deals
- Out: Cross-sell flags and dated revisit reminders
- Example: Acme QBR (24 Jun): "ops side struggles with seasonal inventory forecasting" becomes a cross-sell flag for AI/ML forecasting. Quantia (30 Sep 2025): "check back around Q2 2026" becomes a revisit due 1 Apr 2026, now overdue
- Guardrail: Matches only AtliQ's own service list
- Guardrail: Flags the hint; it never pitches the client
- Guardrail: Quotes the client's own words
- Guardrail: Revisit dates come from the client's words, not guesses

### F5 Daily brief with draft replies (#9 + #10)
- AI capability: Summarising, ranking and drafting
- In: Everything F1 to F4 found
- Out: A 5 to 10 line list per person, each with a draft
- Example: Bhavin, Fri 10 Jul: 1) FinEdge 95k, confirm the commercial call (21 days). 2) ShopSwift SOW due 15 Jul (5 days). 3) NovaPharma questionnaire due 24 Jul, no owner. 4) Meridian's 2 questions (24 days). 5) Harbor & Finch and Nimbus intros unanswered
- Guardrail: Ranking formula is visible: deal size, deadline, days waiting
- Guardrail: Drafts use only facts from the sources; gaps show as [check with Pranav: HL7 support?]
- Guardrail: A person always presses Send
- Guardrail: Every line links back to its email or note

## Frame 6: Product-wide guardrails
- **Grounded:** Every claim points to a real email, note or CRM row. No source, no claim.
- **Human in the loop:** AI drafts and suggests. People approve, send and decide.
- **Honest gaps:** When the source doesn't say, the answer is "not stated", not a guess.
- **Narrow access:** Sales mailboxes and notes only; personal mail is out.
- **Audit trail:** Every suggestion, approval and edit is logged with who and when.
- **Tested on the dataset:** It must find the leads missing from the CRM (Harbor & Finch, Lumino Fitness, PixelWorks, Nimbus Lending), the Meridian duplicate and the 7 stalled deals worth USD 405k before anyone trusts it.
