# Rumtelo for practices

**Status:** draft positioning (October 2026). The product facts here are checked against the code. The website and sales copy is **proposed** and not live yet.

Rumtelo has two front doors:

| Door | Who | What they buy |
|---|---|---|
| **People** | Individuals, couples, families | A household board: Money · Growth · Energy · Soul |
| **Practices** | Coaches and advisors who help other households | **Rumtelo Practice**: one desk to follow every client's board, with the client's consent |

The practice door is invisible today. There is no website section, no pricing and no FAQ for it. This page sets out what it is, who it's for, and what to fix before we sell it.

---

## Who it's for

| Practice type | Typical situation | Fit |
|---|---|---|
| **Budget and money coaches** | Coach households 1:1 on spending, bills and saving | **Core**: the six jars are their method in software |
| **Debt-help and social-work teams** | Help households get stable and stay stable | **Core**: dual consent and read-only access suit careful work |
| **Financial advisors and planners** | Advise on goals, debt and freedom number | **Good**: clients arrive with a current picture |
| **Life and career coaches** | Coach direction, energy and habits | **Secondary**: Growth, Energy and Soul give them a shared language |

**Not for:** managing client money on their behalf (for example, *bewindvoering*). Rumtelo never moves money.

### What they feel

- Sessions start with *collecting numbers*: statements, screenshots, "I think it was about…".
- Clients lose the thread between sessions. Progress made in the room fades by the next one.
- Every client lives in a different spreadsheet, or in nobody's.
- Privacy worries: "Am I allowed to see this? Did they agree?"

### What they need

- A **current picture per client** before the session starts.
- A **routine the client keeps alone**, between sessions.
- **Visibility only with consent**, and easy to end.
- **One overview of the caseload**: who is active, who is waiting, who needs attention.
- A **per-client cost** that fits a coaching fee.

---

## What Rumtelo Practice does today

Checked against the code, October 2026.

| Capability | How it works |
|---|---|
| **Practice desk** | Its own shell: Overview, Clients, Staff, Billing, Settings. Separate from your personal household. |
| **Invite a client by email** | Works for new people (signup link) and existing households (they accept in Settings). |
| **Dual consent** | Every link starts as *Invited*. **Nothing is shared until the household owner accepts.** |
| **Two access levels** | **View**: look along, free for the client. **Manage**: the practice sponsors **Plus** for the client. |
| **Client snapshot** | Per client: spent this month, income this month, training this week, stillness streak. |
| **Open the client's board** | Read-only preview of their Money · Growth · Energy · Soul. |
| **Caseload overview** | Active, managed, invited and view-only counts, pending invites, estimated monthly cost. |
| **Staff** | Add colleagues to the practice. |
| **Ending a link** | The practice can revoke; the household can unlink (Settings → Practice coaches). |

### What it does **not** do yet

Say this plainly in sales. Never imply otherwise.

- **The practice cannot edit a client's board.** Manage is read-only today, the same as View. The difference is that the practice pays for the client's Plus plan. (`membership.service.ts`: "MANAGE writes later".)
- **No notes, messages or session log** inside Rumtelo.
- **No direct "sign up as a practice"** on the website.

---

## Pricing (from `plan.util.ts`)

| Item | Price / month |
|---|---|
| Practice base | €49 |
| Staff seat | €2.50 each. **The owner's seat is billed too**, so the minimum is €51.50. |
| Client on **View** | Free (the client stays on Basic) |
| Client on **Manage** | €6.75 = Plus retail €9 − 25% practice discount (the practice sponsors Plus for that household) |

**Example:** a solo coach with 10 managed clients pays €49 + €2.50 + 10 × €6.75 = **€119/month**, about €11.90 per client.

**Why 25%:** it is the smallest round discount that lands below both Plus monthly (€9) and Plus yearly per month (€7.50). Sponsoring through a practice always beats the client buying Plus alone, each seat keeps margin, and the €49 base already covers the practice's own overhead. One constant changes it: `PRACTICE_CLIENT_DISCOUNT_PCT` in contracts; a test fails if the seat ever reaches retail.

**Open questions**
- Is it intended that the owner's seat is billed?
- Are prices for practices shown with or without VAT? Household prices include VAT.

---

## Positioning

### The connected story (practice version)

Same key as the household story, decoded for a practice:

1. **Slogan:** *Stop wondering where it went.*
2. **Decode (practice):** *Stop wondering where your clients stand.*
3. **Grip:** Your clients get grip on their money. You see it, with their yes.
4. **Product:** *Rumtelo Practice: one desk for every client's board.*
5. **Balance:** *The Coach tips between sessions. You guide the decisions. They choose.*

### One-liners

| Role | EN | NL |
|---|---|---|
| Headline | **Stop wondering where your clients stand.** | **Niet meer gissen waar je cliënten staan.** |
| Value | **Sessions on decisions, not on collecting numbers.** | **Sessies over keuzes, niet over cijfers verzamelen.** |
| Between sessions | **The Coach tips between sessions. You guide the decisions.** | **De Coach tipt tussen de sessies. Jij begeleidt de keuzes.** |
| Consent | **Their board. Your view. Only with their yes.** | **Hun bord. Jouw blik. Alleen met hun ja.** |
| Overview | **One desk. Every client.** | **Eén bureau. Elke cliënt.** |

### The three proof points

1. **A current picture before every session.** Clients keep six jars, fixed costs and a weekly ten-minute check. You open their board and start where they are.
2. **Progress continues between sessions.** The weekly check and The Coach's small tips (bills due, inbox to sort) keep clients moving without you chasing them.
3. **Consent-first and calm.** The client accepts before anything is shared. Read-only. EU hosting in Amsterdam. Either side can end it. Rumtelo never moves money.

---

## Naming rules

These collisions confuse practice buyers today.

| Word | Means | Use |
|---|---|---|
| **The Coach** | The in-app tips (rule-based, small, one next move) | Always "The Coach", capital T, as a product feature |
| **coach / advisor** (lowercase) | A human professional | "your coach", "coaches and advisors", "practitioner" |
| **Practice** | The B2B product and the company using it | "Rumtelo Practice", "your practice" |
| **routine** | The weekly habit | Never "practice" in this sense. Fixed on the landing page and pricing in this pass. |

**Dutch:** Practice = **Praktijk**. Avoid "praktijk" in the habit sense too (fixed: "dagelijkse routine").

**Rule for practice copy:** never let it read as if The Coach replaces the human coach. The Coach does the small nudges between sessions; the human does the judgement.

---

## 30-second talk track

> You know how sessions start with digging up numbers? With Rumtelo your clients keep their own picture: six jars, their fixed costs, a ten-minute check each week. With their yes, you see it from one desk, for every client. Between sessions the app gives them small nudges, like "two bills are still due", so they keep moving. You spend the session on decisions. Looking along is free for clients. If you want them on the full plan, you sponsor it for €6.75 a month — less than they'd pay themselves.

### Objections

| They say | We say |
|---|---|
| "Does this replace me?" | No. The Coach gives small, rule-based nudges. You bring the judgement and the relationship. |
| "Privacy / AVG?" | Nothing is shared until the client accepts. Read-only access. Data stays in the EU (Amsterdam). Either side can end the link at any time. |
| "Do clients have to connect their bank?" | No. Entering amounts by hand works. Plus (which you sponsor on Manage) adds bank-statement import. |
| "Can I change their plan for them?" | Not yet. Access is read-only today. You guide; they make the change. |
| "Does Rumtelo move money?" | Never. The client pays and transfers at their own bank. |
| "What does it cost?" | €49/month for the practice plus €2.50 per staff seat. Looking along is free; sponsoring a client's Plus is €6.75/month (Plus retail is €9). |

---

## Proposed website copy (not live)

A section between Pricing and FAQ, with its own anchor `#practices`.

**EN**

- **Eyebrow:** FOR COACHES & ADVISORS
- **Headline:** Stop wondering where your clients stand.
- **Lead:** Your clients keep their own Rumtelo board: six jars, fixed costs, a ten-minute week check. With their yes, you follow every board from one desk, so sessions go to decisions instead of collecting numbers.
- **Points**
  - Their yes first: nothing is shared until the client accepts.
  - One desk: active clients, pending invites, a snapshot per client.
  - Between sessions, The Coach nudges. You guide the decisions.
- **Price line:** €49/month per practice + €2.50 per staff seat. Looking along is free for clients; sponsor their Plus for €6.75/month.
- **CTA:** Start a practice

**NL**

- **Eyebrow:** VOOR COACHES & ADVISEURS
- **Headline:** Niet meer gissen waar je cliënten staan.
- **Lead:** Je cliënten houden hun eigen Rumtelo-bord bij: zes potjes, vaste kosten, tien minuten per week. Met hun ja volg je elk bord vanuit één bureau, zodat sessies over keuzes gaan in plaats van over cijfers verzamelen.
- **Points**
  - Eerst hun ja: er wordt niets gedeeld tot de cliënt accepteert.
  - Eén bureau: actieve cliënten, open uitnodigingen, een momentopname per cliënt.
  - Tussen de sessies tipt De Coach. Jij begeleidt de keuzes.
- **Price line:** €49 per maand per praktijk + €2,50 per medewerker. Meekijken is gratis voor cliënten; sponsor hun Plus voor €6,75 per maand.
- **CTA:** Start een praktijk

### Proposed FAQ entry

- **Q:** I'm a coach or advisor. Can I use Rumtelo with my clients?
- **A:** Yes, with Rumtelo Practice. Invite clients by email. Once they accept, you see their board read-only from one desk. Looking along is free for them; you can sponsor their Plus plan for €6.75/month. €49/month per practice plus €2.50 per staff seat.
- **NL Q:** Ik ben coach of adviseur. Kan ik Rumtelo met mijn cliënten gebruiken?
- **NL A:** Ja, met Rumtelo Praktijk. Nodig cliënten uit per e-mail. Zodra ze accepteren, zie je hun bord vanuit één bureau, alleen-lezen. Meekijken is gratis voor hen; je kunt hun Plus sponsoren voor €6,75 per maand. €49 per maand per praktijk plus €2,50 per medewerker.

---

## Fix before we sell

In priority order.

1. ~~**No way into the practice desk.**~~ **Done for new sign-ups:** the pricing table has a *For practices* tab, sign-up asks "I'm signing up as" (`?as=practice`), and after verify a practice lands on `/practice/create`. Household onboarding also offers "Start a practice instead". **Still open:** an existing household owner has no menu path ("Start something of my own" only shows for viewers).
2. ~~**Website section, pricing and FAQ.**~~ **Done:** pricing tab, header link (`#practices`) and FAQ entry; prices come from contracts.
3. **Manage write access.** Copy is now honest in all four languages: Manage = you sponsor their Plus; "today read-only, editing their plan with them is coming next". **Still open:** build the write access (`membership.service.ts`: "MANAGE writes later"), then drop the "coming next" wording.
4. **Practice explain video.** Script: [explain/01-practice.md](../explain/01-practice.md).
5. **Pricing questions** (owner seat, VAT) answered before quoting prices.

---

## Related

- [Audience](./audience.md)
- [Brand positioning](../brand/positioning.md)
- [Quotes](../brand/quotes.md)
- [Architecture → Practice vs Household](../engineering/architecture.md)
