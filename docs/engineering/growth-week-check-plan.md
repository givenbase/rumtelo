# Plan: Weekcheck met je partner in Rumtelo

18 oktober 2026 · bron: [Claude-plan](https://claude.ai/code/artifact/a054f835-943b-4bca-a874-2d1927e5f496)

> **Voor Claude Code:** volg `CLAUDE.md`, `HANDOFF.md` en `.cursor/rules/` (vooral `backend-module-shape.mdc` en `react-next-patterns.mdc`). Begin met fase 1. Waar een open vraag nog niet beantwoord is, gebruik het voorstel. Vink de checkboxes af zodra een stap klaar is.

## Doel en uitgangspunten

Bouw de zondagse weekmeeting als de **Groei-weekcheck** in Rumtelo. Iedere partner kijkt terug op de top 3 van vorige week, legt een nieuwe top 3 vast en vraagt de ander om hulp. Dit vervangt het Excel-bestand en de tekst in de agenda.

- **Per persoon per week:** maximaal 3 prioriteiten, een status per prioriteit, wat je anders doet en je hulpvraag.
- **Samen:** één gedeelde notitie met afspraken. Wie begint, wisselt elke week vanzelf.
- **Laatste zondag van de maand:** een maandcheck per persoon (op koers voor het grotere doel?) met het percentage gelukte prioriteiten.
- **Ook solo bruikbaar:** het partnerdeel verschijnt zodra het huishouden een tweede deelnemer heeft.

De feature volgt twee productprincipes. *Tien minuten per week*: ongeveer 12 minuten per persoon, één wizard, daarna klaar. *Informatie, nooit schaamte*: "niet gelukt" is een feit met één volgende stap (meenemen of loslaten), geen rode alarmkleur.

## Waar het in Rumtelo past

De plek bestaat al: `growth/week-check` is nu een lege huls (huishouden, week, `completedAt`), met de notitie dat productvelden later komen. Deze feature vult die huls, in alle vier de lagen.

| Laag | Bestaat al | Toevoegen |
| --- | --- | --- |
| Backend | `modules/public/product/growth/week-check/` | entities voor entry en prioriteit; nieuwe aggregate `growth/month-review/` |
| Contract | `contract.growth.weekCheck`: `current`, `history`, `complete` | procedures voor entries, prioriteiten en notities; `contract.growth.monthReview` |
| Route | geen | `/growth/week-check` (net als `/money/week-check`) en `/growth/month-review` |
| Database | `public.growth_week_check` | `growth_week_check_entry`, `growth_week_priority`, `growth_month_review` |

De geld-weekcheck (overschot en één intentie per huishouden) en Ziel → Intentie blijven in v1 apart. Of de weekintentie van Ziel hierin opgaat, staat bij de open vragen.

## De zondag-flow

De wizard volgt jullie format: eerst de een, dan de ander, en op de laatste zondag van de maand een extra stap.

```
Start → A: terugblik → A: vooruitblik → B: terugblik → B: vooruitblik
                                                            │
                                         Laatste zondag van de maand?
                                           ja → Maandcheck → Afsluiten
                                           nee ───────────→ Afsluiten
```

Wie persoon A is, wisselt elke week. Per scherm:

1. **Start:** wie begint, plus de spelregels. Eén vertelt, de ander stelt alleen vragen en geeft geen advies tenzij erom gevraagd wordt.
2. **Terugblik:** "Hoe was je week?" en de top 3 van vorige week. Per prioriteit: gelukt, deels, niet gelukt of losgelaten, met een korte notitie. Een niet gelukte prioriteit neem je met één tik mee.
3. **Vooruitblik:** "Wat doe ik deze week anders?", de nieuwe top 3 en "Waar heb ik je hulp of aanmoediging bij nodig?".
4. **Persoon B:** stap 2 en 3 opnieuw.
5. **Maandcheck**, alleen op de laatste zondag: groter doel, op koers (ja, twijfel, nee), wat stuur ik bij, met de score van de maand.
6. **Afsluiten:** beide top 3's en hulpvragen naast elkaar, de gezamenlijke afspraken, en de check afronden.

## Datamodel

Eén bestaande tabel krijgt een kolom erbij en er komen drie tabellen bij. Prioriteiten worden rijen, geen `jsonb`, omdat de maandscore erover telt. Dat is dezelfde reden waarom `week_check_allocation` bestaat.

**`growth_week_check`** (bestaat, `GrowthWeekCheck`): één rij per huishouden per week. Dit is de meeting zelf.

| Kolom | Type | Toelichting |
| --- | --- | --- |
| `week` | `YYYY-Www` | bestaat; de week die gepland wordt |
| `completedAt` | timestamptz | bestaat; meeting afgerond |
| `notes` | text, max. 1000, nullable | nieuw: de afspraken die jullie samen maken |

**`growth_week_check_entry`** (nieuw, `HouseholdEntity`): één rij per deelnemer per week, uniek op (`weekCheck`, `user`).

| Kolom | Type | Toelichting |
| --- | --- | --- |
| `weekCheck` | FK naar `growth_week_check`, cascade | de meeting |
| `user` | FK naar `auth.user` (mapToPk) | de deelnemer |
| `reflection` | max. 280, nullable | "Hoe was je week?" |
| `adjustment` | max. 280, nullable | "Wat doe ik deze week anders?" |
| `helpRequest` | max. 280, nullable | "Waar heb ik je hulp of aanmoediging bij nodig?" |

**`growth_week_priority`** (nieuw): uniek op (`entry`, `position`), dus de database dwingt maximaal 3 af.

| Kolom | Type | Toelichting |
| --- | --- | --- |
| `entry` | FK naar entry, cascade | van wie en welke week |
| `position` | int, 1 t/m 3 | volgorde in de top 3 |
| `name` | max. 140 | de prioriteit zelf |
| `status` | enum `WeekPriorityStatus` | `OPEN`, `DONE`, `PARTIAL`, `MISSED`, `DROPPED` |
| `reviewNote` | max. 280, nullable | wat hielp, of wat hield je tegen |
| `carriedFrom` | FK naar zichzelf, nullable, set null | gevuld als hij van vorige week is meegenomen |

**`growth_month_review`** (nieuw, eigen aggregate `growth/month-review/`): uniek op (`household`, `user`, `month`).

| Kolom | Type | Toelichting |
| --- | --- | --- |
| `user` | FK naar `auth.user` | de deelnemer |
| `month` | `YYYY-MM` | de maand |
| `goal` | FK naar `goal`, nullable, set null | koppeling met een bestaand Groei-doel |
| `name` | max. 280, nullable | het grotere doel in eigen woorden, als er geen doel gekoppeld is |
| `onTrack` | enum `OnTrackStatus` | `YES`, `UNSURE`, `NO` |
| `adjustment` | max. 280, nullable | "Wat stuur ik bij?" |

De maandscore sla je niet op maar bereken je: `DONE` gedeeld door alle beoordeelde prioriteiten. `DROPPED` telt niet mee, want bewust loslaten is geen mislukking.

**Weekregels**

- Een week is een ISO-week (maandag t/m zondag), net als in `week-key.ts` en de andere weekchecks.
- Op zondag plant de meeting de volgende week en kijkt hij terug op de week die die dag eindigt. Op maandag t/m zaterdag (meeting gemist) plant hij de lopende week.
- Bepaal "zondag" in de tijdzone van het huishouden, niet in UTC. Check wat `common/utils/timezone.util.ts` daarvoor al biedt.
- Enums komen uit `@rumtelo/contracts` via `NativeEnum`, nooit als lokale enum.

## Contracts en backend

Breid `contract.growth.weekCheck` uit en voeg `contract.growth.monthReview` toe. Alles staat in CRUD-volgorde en controllers doen alleen transport.

| Procedure | CRUD | Wat het doet |
| --- | --- | --- |
| `weekCheck.current({ week? })` | R | check, entries van alle deelnemers, prioriteiten van vorige week, `firstSpeakerUserId`, `isMonthEnd`; lazy aangemaakt zoals nu |
| `weekCheck.history()` | R | laatste 26 weken, per deelnemer gelukt/totaal |
| `weekCheck.updateEntry({ week, userId, reflection, adjustment, helpRequest })` | U | antwoorden van één deelnemer |
| `weekCheck.updatePriorities({ week, userId, priorities })` | U | vervangt de top 3; Zod `.max(3)`, per item `name` en optioneel `carriedFromId` |
| `weekCheck.updatePriorityStatus({ priorityId, status, reviewNote? })` | U | terugblik per prioriteit |
| `weekCheck.updateNotes({ week, notes })` | U | gezamenlijke afspraken |
| `weekCheck.complete({ week })` | U | bestaat; zet `completedAt` |
| `monthReview.current({ month? })` | R | reviews per deelnemer plus berekende score |
| `monthReview.history()` | R | per maand, per deelnemer |
| `monthReview.update({ month, userId, goalId?, name?, onTrack, adjustment })` | U | lazy aangemaakt, zoals de weekcheck |

De namen passen in `permissionActionFromPath`: `current` en `history` worden READ, `update*` wordt UPDATE.

**Regels in de services**

- Deelnemers zijn leden met rol OWNER of MEMBER. Haal ze op via de household-service, nooit door zelf `auth.member` te lezen.
- Wie begint: sorteer deelnemers op moment van toetreden; index = ISO-weeknummer modulo het aantal deelnemers. Daar is geen kolom voor nodig.
- Een `userId` die geen deelnemer van dit huishouden is, geeft een `ApiUserError`.
- `carriedFromId` moet een prioriteit van dezelfde persoon uit een eerdere week zijn.
- `MonthReviewService` importeert `GrowthWeekCheckService` voor de score en leest nooit diens tabellen.
- Na `complete` gaat niets op slot. Aanpassen blijft mogelijk, anders dan bij de geld-maand.

## Frontend

Eén nieuwe pagina met een wizard, een kaart op de Groei-hub en een geschiedenispagina. Bestaande patronen gaan voor.

- **Route:** `app/(routes)/[locale]/(app)/(household)/product/growth/week-check/page.tsx`, met per stap een component in `_components/`.
- **Wizard:** hergebruik `_components/features/week-check/week-check-wizard.tsx` als die generiek genoeg is. Check dat eerst.
- **Data:** Provider plus TanStack `apiQuery` voor `weekCheck.current`; elke stap submit met `useForm`.
- **Groei-hub:** een kaart in `growth-portal-hub.tsx` met je top 3 van deze week en de status. Op zondag staat er een knop om de weekcheck te starten.
- **Geschiedenis:** `/growth/month-review` met per maand de score per deelnemer.
- **Statuskleuren:** gelukt groen, deels geel, niet gelukt en losgelaten neutraal. Geen rood, want het is geen waarschuwing.
- **Teksten:** in `packages/i18n/translations/features/growth.ts`, Engels eerst en Nederlands daarna. Daarna `pnpm --filter @rumtelo/i18n generate`. De spelregels ("één vertelt, de ander stelt alleen vragen") staan kort op het startscherm.
- **Navigatie:** de nieuwe routes toevoegen in `_lib/routes.ts` en `_lib/nav.ts`.
- **Design:** deze schermen zitten niet in de Claude Design-export. Bouw ze met de bestaande `@theme`-tokens en `@rumtelo/ui`, alleen Tailwind.

## Rechten, plan en privacy

De bestaande rolmatrix dekt het meeste al: VIEWER heeft geen toegang tot Groei, OWNER en MEMBER wel.

- **Wie doet mee:** OWNER en MEMBER. Een VIEWER ziet de weekcheck niet.
- **Wie mag bewerken:** voorstel is dat elke deelnemer alle entries mag aanpassen, zodat jullie de meeting op één scherm doen. Dat past bij hoe de rest van het bord werkt.
- **Plan:** nieuwe capability `growth-week-check` in `FEATURES.growth` (`capabilities.ts`), toegekend in `PLAN_ACCESS`, met copy in `CAPABILITY_CATALOG`. Zet `RequireCapability` op de controller en de route.
- **Praktijk-coaches:** zij zien het bord alleen-lezen. Prioriteiten en hulpvragen zijn persoonlijk, dus het voorstel is om de weekcheck in v1 niet te tonen in de praktijk-preview.
- **Isolatie:** alles loopt via `HouseholdScopedRepository`; geen lezen of schrijven over huishoudens heen.

## Fasering en acceptatiecriteria

Drie fasen. Na fase 1 kunnen jullie de zondagmeeting al volledig in Rumtelo doen.

### Fase 1: één zondag werkt

- [ ] Enum `WeekPriorityStatus` in contracts
- [ ] Entities voor entry en prioriteit, en `notes` op `GrowthWeekCheck`; migratie met `pn db:gen`, nakijken, dan `pn db:push`
- [ ] Contract-uitbreiding, service en controller
- [ ] Pagina `/growth/week-check` met de wizard: start, terugblik en vooruitblik per persoon, afsluiten
- [ ] Capability en navigatie
- [ ] Teksten in het Engels en Nederlands

Klaar als: de hele meeting lukt op één telefoon, de top 3 van vorige week verschijnt in de terugblik, "meenemen" zet een prioriteit in de nieuwe top 3 en een vierde prioriteit wordt geweigerd.

### Fase 2: maandcheck en geschiedenis

- [ ] Aggregate `growth/month-review` met contract en migratie
- [ ] Maandcheck-stap op de laatste zondag van de maand
- [ ] Score per deelnemer per maand
- [ ] Pagina `/growth/month-review`
- [ ] Kaart op de Groei-hub

Klaar als: de maandcheck alleen op de laatste zondag verschijnt en de score klopt met de statussen die je met de hand telt.

### Fase 3: The Coach

- [ ] Tip op zondag als de check nog open staat, met een knop naar de wizard
- [ ] Op maandag een rustige melding dat de check van gisteren nog openstaat
- [ ] Optioneel: na afronden een samenvatting naar beide deelnemers via `backoffice/communication`

Klaar als: na `complete` geen tip meer verschijnt.

### Checks bij elke PR

- [ ] `pnpm --filter @rumtelo/contracts check-types`
- [ ] `pnpm --filter @rumtelo/backend lint:entities` en `ENTITY_INVENTORY.md` bijgewerkt
- [ ] `pnpm lint`
- [ ] Unit-tests: planweek (zondag tegenover maandag, tijdzone, jaarwissel naar week 1), wie-begint-rotatie, maximaal 3
- [ ] E2E: een tweede deelnemer toevoegen aan een demo-huishouden in de seed, plus een smoke-test van de wizard
- [ ] Groei-README bijgewerkt met de nieuwe onderdelen

## Open vragen

- [ ] Mag elke deelnemer alle entries bewerken, of alleen de eigen? Voorstel: alle.
- [ ] In welk plan zit de weekcheck: Basic, Plus of Max?
- [ ] Is zondag vast, of kiest elk huishouden zelf een dag in de Groei-instellingen?
- [ ] Blijft Ziel → Intentie apart, of wordt de weekintentie onderdeel van deze check?
- [ ] Verbergen in de praktijk-preview (voorstel), of tonen met toestemming van het huishouden?
- [ ] Telt "losgelaten" mee in de maandscore? Voorstel: nee.
- [ ] Willen jullie de weken die al in het Excel-bestand staan importeren?
