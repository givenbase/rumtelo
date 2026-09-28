# Outreach — PIS access without our own license

Two mails, one question each. Context and the reasoning behind them: [banking.md → Moving money](./banking.md#moving-money--pis-licenses-bunq-vs-revolut).

**The one thing we want to learn:** can Rumtelo let a user *approve* a salary split into real bank accounts (SEPA, SCA per payment) **without holding a PISP license ourselves** — and what does that cost per month / per payment?

Send both the same week. Whoever answers "yes, and here is the price" first decides route 2.

Before sending, fill in the `[…]` placeholders. Do not invent user numbers — say "pre-launch" or give the real figure.

---

## 1 · Enable Banking — PIS as an agent / under their license

**To:** support.api@enablebanking.com (cc the "Get a Quote" form on enablebanking.com)
**Subject:** Rumtelo (NL) — AIS quote + question on PIS access without own PISP license

> Hi Enable Banking team,
>
> We are Rumtelo, an Amsterdam-based household-finance coach (six-jar budgeting + a weekly coach). We already have your AIS adapter stubbed in our backend and plan to go from restricted production to full production for Dutch households — ING, Rabobank, ABN AMRO, bunq and Revolut Bank UAB.
>
> Two questions:
>
> **1. AIS quote.** NL only, AIS only, personal accounts, [pre-launch / N] households, no PIS to start. What does full production cost per month, and is there a starter tier below your standard commercial contract?
>
> **2. PIS without our own PISP license.** Your API reference states that production payment initiation is only available to PISP license holders. We do *not* want to become a payment institution. Is there any route where we initiate SEPA payments as an **agent under Enable Banking's (or a partner's) license**, with the end user authorising every payment via SCA? Concretely: after salary lands, the user sees a proposed split and approves 3–6 SEPA transfers to their own sub-accounts (bunq IBANs, savings accounts) in one flow.
>
> If yes: what does it require from us (contract, audit, capital), what does it cost, and which NL/EU banks support `defer_submission` so we can show the proposal before executing?
> If no: do you have a recommended partner for the agent model?
>
> We are happy to share our current adapter design and expected volumes on a call.
>
> Thanks,
> Given Loyiso
> Founder & CEO, Rumtelo · Amsterdam
> [phone] · [email]

**Have ready:** current `EnableBankingAdapter` design, list of target banks, expected households at 6 / 12 months, whether we need PIS at all in year one (honest answer: no — AIS first).

---

## 2 · Flow / FlowOS — embed their rails, keep our brain

**To:** via withflow.com contact form; try hello@flowyour.money as well
**Subject:** Rumtelo × FlowOS — embedded money automation voor een coach-app

> Hoi team Flow,
>
> Wij zijn Rumtelo, een Amsterdamse coach-app voor huishoudens: zes potjes, een wekelijkse check van tien minuten, en een Coach die geld koppelt aan slaap, doelen en richting. Geen bank, geen adviseur — een overzicht en een mentor.
>
> Wij bouwen bewust *geen* betaalinstelling. Maar onze gebruikers willen precies wat jullie kunnen: salaris komt binnen, potjes worden gevuld. Met FlowOS lijkt dat combineerbaar.
>
> Concreet zoeken we:
>
> - **Betaalinitiatie onder jullie vergunning** — de gebruiker keurt in Rumtelo een voorgestelde verdeling goed, FlowOS voert de overboekingen uit (SEPA, SCA per betaling waar de bank dat eist).
> - **Triggers** bij binnenkomend salaris (bunq realtime; andere banken zoals jullie die nu ook doen).
> - **Bunq-subrekeningen als potjes** — mapping van onze zes potjes op echte IBAN's.
>
> Rumtelo blijft het brein (verdeling, Coach, energie, doelen); Flow levert de rails. Wij zijn [pre-launch / N huishoudens], EN-first, NL-tweede, EU-hosting in Amsterdam.
>
> Drie vragen:
>
> 1. Is dit een use-case die FlowOS vandaag ondersteunt, of pas na een bepaalde schaal?
> 2. Hoe ziet het commerciële model eruit — per huishouden, per betaling, of een vast bedrag?
> 3. Welke banken kunnen we via FlowOS dag één aanbieden voor triggers én betalingen?
>
> Een kop koffie in Amsterdam is zo geregeld.
>
> Groet,
> Given Loyiso
> Founder & CEO, Rumtelo · Amsterdam
> [telefoon] · [e-mail]

**Have ready:** one-pager of the loop (split → inbox → week check → month score), a screen of the Coach proposing a split, and a clear line that Rumtelo is not a competing *automation* product — the overlap is only the jars.

---

## What to record afterwards

Add to [banking.md → Moving money](./banking.md#moving-money--pis-licenses-bunq-vs-revolut):

| Party | Agent model? | Price | Banks with PIS day one | SCA per payment? | Notes |
|---|---|---|---|---|---|
| Enable Banking | | | | | |
| Flow / FlowOS | | | | | |
| (fallback: Yapily / Tink) | | | | | |

Decision rule: pick the route that ships **"you approve, we propose"** with the fewest new obligations for Rumtelo. Own license stays off the table until route 2 has proven demand.
