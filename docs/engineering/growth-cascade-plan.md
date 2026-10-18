# Plan: Koers — van jaardoel naar dit uur

18 oktober 2026 · bouwt voort op [growth-week-check-plan.md](./growth-week-check-plan.md) · schetsen: [Rumtelo Koers](https://claude.ai/artifact/BXzPQpYxp5mfL6enmhxhgv)

> **Voor Claude Code:** volg `CLAUDE.md`, `HANDOFF.md` en `.cursor/rules/` (vooral `backend-module-shape.mdc` en `react-next-patterns.mdc`). Dit plan **wijzigt het datamodel van de weekcheck** (zie "Wat dit verandert aan de weekcheck"). Bouw fase 0 vóór fase 1 van de weekcheck. Waar een open vraag nog niet beantwoord is, gebruik het voorstel.

## Doel en uitgangspunten

Groei krijgt een planner die een groot doel stap voor stap kleiner maakt:

```
Jaar → Kwartaal → Maand → Week → Dag → Uur
doel    resultaat   mijlpaal  top 3   top 3   tijdblok
```

Elke laag hangt aan de laag erboven. Een taak van vandaag weet dus altijd *waarom* hij er staat. Dat is precies wat de naam belooft: *rumbo*, koers. Werknaam van de feature: **Koers** (EN: *Course*).

- **Van groot naar klein:** je plant van boven naar beneden en de voortgang telt van beneden naar boven op.
- **Maximaal 3 per laag:** 3 jaardoelen, per jaardoel max. 3 kwartaalresultaten, enzovoort tot de top 3 van de dag. Weinig ruimte dwingt je te kiezen.
- **De week is het hart:** de zondagse weekcheck is het moment waarop je de week uit de maand haalt. Dag en uur zijn optioneel inzoomen, geen verplichting.
- **Geen agenda:** zie hieronder.

De feature volgt de vier productprincipes. *Tien minuten per week*: de cascade wordt onderhouden in de rituelen die er al zijn (weekcheck, maandcheck) plus een kwartaal- en jaarcheck. *Informatie, nooit schaamte*: een kwartaaldoel zonder weekprioriteiten is een signaal met één volgende stap, geen rood alarm. *Energie draagt geld*: de dagplanning kent je beschikbare tijd uit Energie, zodat je niet meer plant dan je hebt.

## Is het een agenda?

Nee. Een agenda beantwoordt *wanneer*, deze planner beantwoordt *waarom* en *wat eerst*. Alleen de onderste laag (uur) heeft een tijdlijn.

| Laag | Wat het is | Vorm |
| --- | --- | --- |
| Jaar, kwartaal, maand | uitkomsten | doelen met een definitie van "klaar" |
| Week, dag | keuzes | top 3, af te vinken |
| Uur | tijd | blokken op een dagtijdlijn |

Rumtelo bouwt **geen volledige agenda** (uitnodigingen, herhalende afspraken, gedeelde kalenders). Dat kunnen Google en Apple beter. In een latere fase tonen we bestaande afspraken alleen-lezen in de dagweergave via een ICS-link, zodat je om je afspraken heen blokt.

## Wie doet dit al, en wat nemen we mee

| App / methode | Wat ze goed doen | Wat wij overnemen |
| --- | --- | --- |
| *The ONE Thing* (Keller): "Goal setting to the now" | Someday → 5 jaar → jaar → maand → week → vandaag → nu, elke stap vraagt "wat is het ene dat ik nu kan doen" | de cascade zelf en de vraag per laag |
| Full Focus Planner (Hyatt) | jaardoelen → kwartaal → Weekly Big 3 → Daily Big 3, met weekly preview | max. 3 per laag, weekritueel als scharnier |
| *12 Week Year* (Moran) | het kwartaal als "jaar", wekelijkse score | kwartaal als belangrijkste doellaag; weekscore = maandscore uit de weekcheck |
| reMarkable-planners (hyperlinked PDF) | jaar → maand → week → dag met tabbladen en links, rustig papiergevoel | inzoomen met tabs/kruimelpad, rustig "papier"-uiterlijk |
| Sunsama | dagelijks plan- en afsluitritueel, weekdoelen | optionele 2-minuten dagstart en dagafsluiting |
| Reclaim, Motion, Structured | tijdblokken op een dagtijdlijn | uur-laag als tijdblokken, geen AI-inplanning |
| Notion "Life OS"-templates, OKR-tools | doelen → projecten → taken met roll-up | voortgang die automatisch optelt |

**Wat niemand van hen heeft, en wij wel:**

1. **Geld-doelen in dezelfde boom.** Een `Goal` uit Geld ("Noodfonds €5.000") kan een jaardoel zijn; de maandinleg wordt de maandmijlpaal.
2. **Energie als grens.** De dagplanning toont hoeveel vrije tijd je volgens je Energie-tijdsjabloon hebt, en waarschuwt rustig als je meer inplant.
3. **Samen.** Doelen kunnen van één persoon of van het huishouden zijn. In de weekcheck zie je elkaars top 3 en hulpvraag.
4. **De Coach.** Regels zoals "je kwartaaldoel X kreeg deze maand geen enkele weekprioriteit", altijd met één knop.

## Waar het in Rumtelo past

| Laag | Bestaat al | Toevoegen |
| --- | --- | --- |
| Backend | `growth/week-check/` (lege huls), `growth/learn/focus/`, `money/targets/goal/`, `energy/time-template/` | aggregate `growth/plan/` (items + tijdblokken) |
| Contract | `contract.growth.weekCheck` | `contract.growth.plan`, `contract.growth.timeBlock` |
| Route | `/growth`, `/growth/goals`, `/growth/learn` | `/growth/plan/[[...period]]` |
| Database | `growth_week_check` | `growth_plan_item`, `growth_time_block` |

## Datamodel

Eén tabel voor alle doellagen, met een `horizon` en een periodesleutel. Eén tabel omdat elke laag dezelfde vorm heeft (naam, status, ouder, positie) en omdat roll-up en "meenemen" dan één query zijn.

**`growth_plan_item`** (nieuw, `PersonalHouseholdEntity`)

| Kolom | Type | Toelichting |
| --- | --- | --- |
| `horizon` | enum `PlanHorizon` | `YEAR`, `QUARTER`, `MONTH`, `WEEK`, `DAY` |
| `period` | varchar(10) | `2027`, `2027-Q1`, `2027-03`, `2027-W10`, `2027-03-08` |
| `parent` | FK naar zichzelf, nullable, set null | het item één laag hoger; `null` = los (toegestaan, maar de Coach benoemt het) |
| `position` | int, 1 t/m 3 | volgorde binnen (`account`, `horizon`, `period`, `parent`) |
| `name` | max. 140 | het doel of de prioriteit |
| `doneWhen` | max. 280, nullable | "klaar als …", alleen zinvol voor jaar/kwartaal/maand |
| `status` | enum `PlanItemStatus` | `OPEN`, `DONE`, `PARTIAL`, `MISSED`, `DROPPED` |
| `reviewNote` | max. 280, nullable | wat hielp, of wat hield je tegen |
| `carriedFrom` | FK naar zichzelf, nullable, set null | gevuld als hij uit de vorige periode is meegenomen |
| `account`, `visibility` | uit `PersonalHouseholdEntity` | van wie en wie het ziet; `account = null` = *samen*. Zie [household-visibility-plan.md](./household-visibility-plan.md) |
| `goal` | FK naar `Goal`, nullable, set null | koppeling met een Geld-doel (alleen YEAR/QUARTER) |
| `skill` | varchar(64), nullable | catalogussleutel van een Leer-focus |

Uniek op (`account`, `horizon`, `period`, `parent`, `position`), zodat de database max. 3 afdwingt. Index op (`household`, `horizon`, `period`).

**`growth_time_block`** (nieuw): de uur-laag.

| Kolom | Type | Toelichting |
| --- | --- | --- |
| `account` | FK naar `Account` (mapToPk) | van wie |
| `date` | date | de dag |
| `startMinute` | int, 0 t/m 1439 | begin, minuten na middernacht in de tijdzone van het huishouden |
| `endMinute` | int | eind, groter dan `startMinute` |
| `item` | FK naar `growth_plan_item`, nullable, cascade | het dag- of weekitem waar dit blok voor is |
| `label` | max. 80, nullable | vrije tekst als er geen item is |

**Regels**

- `parent.horizon` is precies één laag hoger dan `horizon`. Week → maand loopt via de ISO-donderdag van de week (de maand waarin de donderdag valt), net als ISO-weken bij het jaar horen.
- Voortgang sla je niet op maar bereken je, van beneden naar boven: een item is zo ver als het aandeel `DONE` van zijn kinderen; `DROPPED` telt niet mee. Handmatig `DONE` zetten mag altijd en wint.
- Persoonsattributie via `Account`, zoals `TimeTemplate` en `LearnSkillFocus`. Niet via `auth.user`.
- Enums komen uit `@rumtelo/contracts` via `NativeEnum`.

## Wat dit verandert aan de weekcheck

De weekcheck is nog niet gebouwd, dus dit kost nu niets:

- `growth_week_priority` **vervalt**. Een weekprioriteit is een `growth_plan_item` met `horizon = WEEK`.
- `WeekPriorityStatus` heet `PlanItemStatus` en geldt voor alle lagen.
- `growth_week_check_entry` blijft (reflectie, aanpassing, hulpvraag) maar verwijst naar `Account` in plaats van `auth.user`.
- `weekCheck.updatePriorities` wordt een dunne laag over `plan.replace({ horizon: 'WEEK', … })`.
- De vooruitblik in de wizard toont bovenaan de maandmijlpalen; elke nieuwe weekprioriteit kies je onder een mijlpaal (of "los").
- De maandcheck uit fase 2 van de weekcheck wordt de MONTH-laag van deze boom; `growth_month_review` houdt alleen `onTrack` en `adjustment`.

## Contracts en backend

`contract.growth.plan`, in CRUD-volgorde; controllers doen alleen transport.

| Procedure | CRUD | Wat het doet |
| --- | --- | --- |
| `plan.create({ horizon, period, parentId?, name, doneWhen?, accountId?, goalId?, skill? })` | C | nieuw item; weigert een vierde |
| `plan.period({ horizon, period, accountId? })` | R | items van deze periode, hun ouderketen (het "waarom") en de kinderen één laag lager, met berekende voortgang |
| `plan.year({ year })` | R | de hele boom van een jaar, voor het jaaroverzicht |
| `plan.update({ id, name?, doneWhen?, parentId?, position? })` | U | bewerken, verhangen, herordenen |
| `plan.updateStatus({ id, status, reviewNote? })` | U | terugblik per item |
| `plan.carry({ id })` | U | kopieert een niet-afgerond item naar de volgende periode met `carriedFrom` |
| `plan.delete({ id })` | D | kinderen krijgen `parent = null` |
| `timeBlock.list({ date, accountId? })` | R | blokken van de dag plus `availableMinutes` uit `TimeTemplateService` |
| `timeBlock.create / update / delete` | C/U/D | blokken; weigert overlap voor dezelfde persoon |

De namen passen in `permissionActionFromPath`.

**Regels in de services**

- `PlanService` leest Geld-doelen via `GoalService` en het tijdsjabloon via `TimeTemplateService`, nooit hun tabellen.
- `accountId` moet een deelnemer (OWNER of MEMBER) van dit huishouden zijn, anders `ApiUserError`.
- Periodesleutels worden in de service gevalideerd én in Zod (regex per horizon). Week- en dagrekenwerk hergebruikt `week-key`-logica en `common/utils/timezone.util.ts`.

## Frontend

Eén route met inzoomen, in de geest van een hyperlinked papieren planner.

- **Route:** `app/(routes)/[locale]/(app)/(household)/product/growth/plan/[[...period]]/page.tsx`. `/growth/plan` opent de huidige week; `/growth/plan/2027`, `/2027-Q1`, `/2027-03`, `/2027-W10`, `/2027-03-08` zoomen.
- **Bovenaan:** horizon-tabs (Jaar · Kwartaal · Maand · Week · Dag) en een kruimelpad van de huidige periode, bijv. `2027 › Q1 › Maart › W10 › ma 8`. Pijltjes voor vorige/volgende periode.
- **Elke weergave heeft drie banden:**
  1. **Waarom:** de ouderketen als één rustige lijn ("Noodfonds €5.000 → Q1: €1.500 → maart: €500").
  2. **Deze periode:** max. 3 kaarten met naam, "klaar als", voortgangsring en status.
  3. **Volgende laag:** per kaart de kinderen (bijv. de weken van deze maand), met lege plekken om toe te voegen.
- **Dagweergave:** top 3 links, tijdlijn rechts (06:00–23:00, blokken van 15 min). Een balk "beschikbaar vandaag" uit Energie loopt leeg terwijl je blokt. Sleep een top-3-item naar de tijdlijn om een blok te maken. Op mobiel onder elkaar.
- **Groei-hub:** een kaart "Koers" met de lijn jaar → vandaag en de top 3 van vandaag (of van de week als je de daglaag niet gebruikt).
- **Data:** Provider plus TanStack `apiQuery` voor `plan.period`; formulieren via `useForm`; optimistic updates bij afvinken.
- **Teksten:** `packages/i18n/translations/features/growth.ts`, Engels eerst, dan Nederlands, daarna `pnpm --filter @rumtelo/i18n generate`.
- **Navigatie:** `_lib/routes.ts` en `_lib/nav.ts`.

### Zo past het bij het merk

| Element | Keuze | Waarom |
| --- | --- | --- |
| Koerslijn | een dunne teal lijn (`#06656C`) die van het jaardoel door alle lagen naar vandaag loopt | *rumbo* = koers; het merk gaat over richting, niet over grafieken |
| Horizon-labels | Plex Mono, kleine kapitalen: `JAAR`, `Q1`, `W10` | mono is in de richtlijnen al de letter voor rituelen en meta |
| Titels | Archivo Narrow | display-letter |
| Ondergrond | cool wash `#EEF1F5` met witte kaarten; heel subtiel puntraster in de dagweergave | rustig papiergevoel zoals reMarkable, zonder skeuomorfisme |
| Voortgang | ring rond het item, teal vulling | geen percentages in grote cijfers, geen staafdiagrammen |
| Status | gelukt teal, deels zand/geel, niet gelukt en losgelaten neutraal grijs | *informatie, nooit schaamte*: geen rood |
| Lege plek | gestippelde kaart "+ wat is het ene dat dit dichterbij brengt?" | de ONE Thing-vraag als uitnodiging |

Gebruik de bestaande `@theme`-tokens en `@rumtelo/ui`, alleen Tailwind.

## Privé, gedeeld of samen

Zichtbaarheid is een platformlaag voor het hele huishouden: [household-visibility-plan.md](./household-visibility-plan.md). Daar staan het model (`Alleen ik` · `Delen met eigenaar` · `Hele huishouden` · `Samen`), wie wat mag kiezen per `HouseholdSharingMode`, externe partijen en de handhaving. De cascade is de eerste gebruiker. Hieronder staat alleen wat specifiek is voor Groei.

- **Kind nooit opener dan ouder.** Een gedeelde weekprioriteit onder een privé-maanddoel kan niet; het formulier kiest automatisch de strengste toegestane optie. Een persoonlijke weekprioriteit onder een *samen*-jaardoel mag wel ("mijn week voor ons noodfonds").
- **Voortgang:** privé-kinderen tellen mee in de ring van een gedeelde ouder; de ander ziet "+1 privé" (via `countHidden`). Wie zo'n item aanmaakt, ziet: "Telt mee voor het gedeelde doel; de naam blijft privé."
- **Kruimelpad en "waarom"-lijn:** is een ouder voor de kijker onzichtbaar, dan toont de lijn alleen "Privé doel" zonder naam.
- **Tijdblokken** (`growth_time_block`) zijn altijd privé en zijn geen `PersonalHouseholdEntity`.
- **Weergavefilter** *Ik · Iedereen · [naam]* bovenaan `/growth/plan`.

### Weekcheck

| Modus | Wat je van de ander ziet |
| --- | --- |
| `TOGETHER` of `OWNER_SEES` | de prioriteiten die voor jou zichtbaar zijn, plus "1 privé prioriteit" met alleen de status. Tijdens de wizard mag je op één scherm de zichtbare items van de ander bijwerken (status, notitie). Dat kan alleen via `weekCheck.*`, niet via `plan.update`. |
| `SEPARATE` | niets van de ander; de wizard doet alleen jouw stappen |

In `OWNER_SEES` met een stel ziet het lid de items van de eigenaar die op *Hele huishouden* staan, en ziet de eigenaar wat het lid met de eigenaar deelt. Voor een stel werkt de weekcheck dus hetzelfde als in `TOGETHER`.

## Rechten, plan en isolatie

- **Wie doet mee:** OWNER en MEMBER. VIEWER ziet Groei niet.
- **Plan:** capability `growth-plan` in `FEATURES.growth`; de dag- en uurlaag eventueel als aparte `growth-plan-day` voor een hoger plan.
- **Isolatie:** `growth_plan_item` via `PersonalScopedRepository`, de rest via `HouseholdScopedRepository`.

## Fasering en acceptatiecriteria

### Fase 0: fundament (vóór weekcheck fase 1)

- [ ] Fase 0 van [household-visibility-plan.md](./household-visibility-plan.md) is af
- [ ] Enums `PlanHorizon` en `PlanItemStatus` in contracts; periodesleutel-helpers en Zod-schema's
- [ ] Entity `GrowthPlanItem` op `PersonalHouseholdEntity`, migratie met `pn db:gen`, nakijken, dan `pn db:push`
- [ ] `plan.create`, `plan.period`, `plan.update`, `plan.updateStatus`, `plan.carry`, `plan.delete`
- [ ] Weekcheck-plan bijwerken volgens "Wat dit verandert aan de weekcheck"

Klaar als: een vierde item in dezelfde periode en ouder wordt geweigerd, een week onder de juiste maand valt rond een maandwissel, en een tweede deelnemer de privé-items van de eerste in geen enkele response terugziet (ook niet als OWNER).

### Fase 1: jaar → week

- [ ] Route `/growth/plan` met tabs, kruimelpad en de drie banden
- [ ] Voortgang berekend van beneden naar boven
- [ ] Weekcheck-vooruitblik kiest weekprioriteiten onder maandmijlpalen
- [ ] Koppeling met Geld-doelen op jaar/kwartaal
- [ ] `VisibilityPicker` in het formulier, `VisibilityBadge` op de kaarten, weergavefilter Ik · Iedereen · partner
- [ ] Kaart "Koers" op de Groei-hub; capability en navigatie; teksten EN/NL

Klaar als: je op één scherm van een jaardoel naar de top 3 van deze week klikt, en het afvinken van weekprioriteiten de maand-, kwartaal- en jaarring laat oplopen.

### Fase 2: dag

- [ ] Dagweergave met top 3, onder weekprioriteiten
- [ ] Optionele dagstart ("wat zijn je 3 van vandaag?") en dagafsluiting (afvinken, meenemen)
- [ ] Instelling in Groei om de daglaag aan of uit te zetten (standaard uit)

Klaar als: wie de daglaag uit heeft niets van dagen merkt, en een niet afgerond dagitem met één tik naar morgen gaat.

### Fase 3: uur

- [ ] Entity `GrowthTimeBlock` en `contract.growth.timeBlock`
- [ ] Tijdlijn met slepen, blokken van 15 min, geen overlap
- [ ] Balk "beschikbaar vandaag" uit het Energie-tijdsjabloon

Klaar als: de balk vrije minuten correct afleidt uit het sjabloon van die weekdag en een overlappend blok wordt geweigerd.

### Fase 4: Coach en agenda

- [ ] Coach-regels: kwartaaldoel zonder weekprioriteiten deze maand; meer ingepland dan beschikbaar; drie weken achter elkaar hetzelfde item meegenomen ("loslaten of kleiner maken?")
- [ ] Kwartaal- en jaarcheck als korte wizard, zoals de maandcheck
- [ ] Optioneel: bestaande afspraken alleen-lezen in de dagweergave via ICS-link

### Checks bij elke PR

- [ ] `pnpm --filter @rumtelo/contracts check-types`
- [ ] `pnpm --filter @rumtelo/backend lint:entities` en `ENTITY_INVENTORY.md` bijgewerkt
- [ ] `pnpm lint`
- [ ] Unit-tests: periodesleutels per horizon, week-naar-maand rond maand- en jaarwissel, roll-up met `DROPPED`, max. 3, overlap van blokken
- [ ] Unit-tests zichtbaarheid (Groei-specifiek): kind niet opener dan ouder; "+1 privé" lekt geen naam of id; onzichtbare ouder in de "waarom"-lijn
- [ ] Groei-README bijgewerkt

## Open vragen

- [ ] Naam van de feature: **Koers** (voorstel), Planner, of iets anders?
- [ ] Hoort "max. 3" ook bij jaardoelen, of mag een jaar er 5 hebben?
- [x] Doelen van het huishouden én persoonlijke doelen in één boom? Ja, via de platformlaag zichtbaarheid; open vragen daarover staan in [household-visibility-plan.md](./household-visibility-plan.md).
- [ ] Aanmoedigen op gedeelde items van de ander in v1, of later?
- [ ] Daglaag standaard uit (voorstel) of aan?
- [ ] In welk plan zitten de cascade en de dag/uur-laag?
- [ ] Willen jullie bestaande afspraken uit Google/Apple zien (alleen-lezen ICS), of blijft de tijdlijn leeg?
- [ ] Worden Leer-focussen (`learn_focus`) automatisch voorgesteld als kwartaaldoel?
