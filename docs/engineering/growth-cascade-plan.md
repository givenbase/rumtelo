# Plan: Koers — van jaardoel naar dit uur

18 oktober 2026 · bouwt voort op [growth-week-check-plan.md](./growth-week-check-plan.md) · schetsen: [Rumtelo Koers](https://claude.ai/artifact/BXzPQpYxp5mfL6enmhxhgv)

> **Voor Claude Code:** volg `CLAUDE.md`, `HANDOFF.md` en `.cursor/rules/` (vooral `backend-module-shape.mdc` en `react-next-patterns.mdc`). Dit plan **wijzigt het datamodel van de weekcheck** (zie "Wat dit verandert aan de weekcheck"). Bouw fase 0 vóór fase 1 van de weekcheck. Waar een open vraag nog niet beantwoord is, gebruik het voorstel.

## Doel en uitgangspunten

Groei krijgt een planner die een groot doel stap voor stap kleiner maakt. Het model kent vijf lagen; **je ziet er standaard drie** en je begint onderaan:

```text
Doelen  →  (Kwartaal)  →  Maand   →  Week   →  (Dag)  →  (Uur)
jaardoel    resultaat      mijlpaal   top 3     top 3     tijdblok
                                        ▲
                                  hier begin je
```

Een prioriteit van deze week kan laten zien *waarom* hij er staat. Dat is wat de naam belooft: *rumbo*, koers. Werknaam van de feature: **Koers** (EN: *Course*).

- **Begin bij de week.** Koers opent op "Jouw 3 voor deze week". Doelen en maand zijn uitzoomen, niet de start. Wie nooit uitzoomt, heeft nog steeds een werkende planner.
- **Standaard drie lagen:** Doelen (jaar) · Maand · Week. Kwartaal en dag zet een huishouden zelf aan in de Groei-instellingen; uur komt later. De backend kent alle lagen, de UI toont er drie.
- **Koppelen is een aanbod, geen eis.** Bij elke prioriteit staat "Hoort bij… (optioneel)". Losse items mogen; The Coach stelt later rustig voor om ze ergens onder te hangen. Een item mag aan *elke* hogere laag hangen: een week direct onder een jaardoel is prima.
- **Maximaal drie, op twee manieren.** Week en dag: drie per week en drie per dag, ongeacht waar ze bij horen. Dat is de top 3. Doelen, kwartaal en maand: drie per doel erboven (drie mijlpalen per jaardoel).
- **Voortgang telt van beneden naar boven op:** vink je weekprioriteiten af, dan loopt de ring van de maand en het jaar op.
- **Geen agenda:** zie hieronder.

De feature volgt de vier productprincipes. *Tien minuten per week*: je onderhoudt alleen de week; de maand raak je aan in de maandcheck en de doelen één keer per jaar. *Informatie, nooit schaamte*: een kwartaaldoel zonder weekprioriteiten is een signaal met één volgende stap, geen rood alarm. *Energie draagt geld*: de dagplanning kent je beschikbare tijd uit Energie, zodat je niet meer plant dan je hebt.

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
| `parent` | FK naar zichzelf, nullable, set null | een item hoger in de boom, in de periode die deze bevat; `null` = los (toegestaan, de Coach benoemt het) |
| `position` | int, 1 t/m 3 | volgorde; week/dag binnen (`account`, `horizon`, `period`), de rest binnen (…, `parent`) |
| `name` | max. 140 | het doel of de prioriteit |
| `doneWhen` | max. 280, nullable | "klaar als …", alleen zinvol voor jaar/kwartaal/maand |
| `status` | enum `PlanItemStatus` | `OPEN`, `DONE`, `PARTIAL`, `MISSED`, `DROPPED`, `DEFERRED` (doorgeschoven) |
| `reviewNote` | max. 280, nullable | wat hielp, of wat hield je tegen |
| `carriedFrom` | FK naar zichzelf, nullable, set null | gevuld als hij uit de vorige periode is doorgeschoven |
| `carryCount` | smallint, standaard 0 | hoe vaak dit item al is doorgeschoven langs zijn keten |
| `account`, `visibility` | uit `PersonalHouseholdEntity` | van wie en wie het ziet; `account = null` = *samen*. Zie [household-visibility-plan.md](./household-visibility-plan.md) |
| `goal` | FK naar `Goal`, nullable, set null | koppeling met een Geld-doel (alleen YEAR/QUARTER) |
| `skill` | varchar(64), nullable | catalogussleutel van een Leer-focus |

Twee gedeeltelijke unieke indexen dwingen de maxima af: week en dag op (`account`, `horizon`, `period`, `position`); jaar, kwartaal en maand op (`account`, `horizon`, `period`, `parent`, `position`). Index op (`household`, `horizon`, `period`).

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

- `parent` ligt hoger in de boom en zijn periode bevat die van het kind (`ancestorPeriodOf`). Een week hoort bij de maand waar de meeste dagen in vallen (de ISO-donderdag); zo zeggen we het ook in de UI.
- Voortgang sla je niet op maar bereken je, van beneden naar boven: een item is zo ver als het aandeel `DONE` van zijn kinderen; `DROPPED` en `DEFERRED` tellen niet mee. Handmatig `DONE` zetten mag altijd en wint.
- **Doorschuiven (snoozen).** Is een item aan het einde van de periode nog open of niet gehaald, dan schuif je het met één tik door (`plan.carry`). Het origineel krijgt status `DEFERRED` als het nog niet beoordeeld was (een `PARTIAL` of `MISSED` houdt zijn status); de kopie in de volgende periode krijgt `carryCount + 1` en blijft onder dezelfde ouder hangen. Op de kaart staat `2× DOORGESCHOVEN` in mono. Doorschuiven is een feit, geen mislukking; na drie keer vraagt The Coach: loslaten of kleiner maken?
- Persoonsattributie via `Account`, zoals `TimeTemplate` en `LearnSkillFocus`. Niet via `auth.user`.
- Enums komen uit `@rumtelo/contracts` via `NativeEnum`.

## Wat dit verandert aan de weekcheck

De weekcheck is nog niet gebouwd, dus dit kost nu niets:

- `growth_week_priority` **vervalt**. Een weekprioriteit is een `growth_plan_item` met `horizon = WEEK`.
- `WeekPriorityStatus` heet `PlanItemStatus` en geldt voor alle lagen.
- `growth_week_check_entry` blijft (reflectie, aanpassing, hulpvraag) maar verwijst naar `Account` in plaats van `auth.user`.
- `weekCheck.updatePriorities` wordt een dunne laag over `plan.replace({ horizon: 'WEEK', … })`.
- De vooruitblik in de wizard toont bovenaan de maandmijlpalen en jaardoelen; een nieuwe weekprioriteit koppel je optioneel aan een daarvan.
- De maandcheck uit fase 2 van de weekcheck wordt de MONTH-laag van deze boom; `growth_month_review` houdt alleen `onTrack` en `adjustment`.

## Contracts en backend

`contract.growth.plan`, in CRUD-volgorde; controllers doen alleen transport.

| Procedure | CRUD | Wat het doet |
| --- | --- | --- |
| `plan.create({ horizon, period, parentId?, name, doneWhen?, accountId?, goalId?, skill? })` | C | nieuw item; weigert een vierde |
| `plan.period({ horizon, period, accountId? })` | R | items van deze periode, hun ouderketen (het "waarom") en alles wat er direct onder hangt (elke lagere laag), met berekende voortgang |
| `plan.year({ year })` | R | de hele boom van een jaar, voor het jaaroverzicht |
| `plan.update({ id, name?, doneWhen?, parentId?, position? })` | U | bewerken, verhangen, herordenen |
| `plan.updateStatus({ id, status, reviewNote? })` | U | terugblik per item |
| `plan.carry({ id })` | U | kopieert een niet-afgerond item naar de volgende periode met `carriedFrom` |
| `plan.remove({ id })` | D | kinderen krijgen `parent = null` |
| `timeBlock.list({ date, accountId? })` | R | blokken van de dag plus `availableMinutes` uit `TimeTemplateService` |
| `timeBlock.create / update / delete` | C/U/D | blokken; weigert overlap voor dezelfde persoon |

De namen passen in `permissionActionFromPath`.

**Regels in de services**

- `PlanService` leest Geld-doelen via `GoalService` en het tijdsjabloon via `TimeTemplateService`, nooit hun tabellen.
- `accountId` moet een deelnemer (OWNER of MEMBER) van dit huishouden zijn, anders `ApiUserError`.
- Periodesleutels worden in de service gevalideerd én in Zod (regex per horizon). Week- en dagrekenwerk hergebruikt `week-key`-logica en `common/utils/timezone.util.ts`.

## Frontend

Eén route met inzoomen, in de geest van een hyperlinked papieren planner.

- **Route:** `app/(routes)/[locale]/(app)/(household)/product/growth/plan/[[...period]]/page.tsx`. `/growth/plan` opent de huidige week, met als kop "Jouw 3 voor deze week"; `/growth/plan/2027`, `/2027-03`, `/2027-W10` (en `/2027-Q1`, `/2027-03-08` als die lagen aanstaan) zoomen.
- **Bovenaan:** drie tabs, **Doelen · Maand · Week**. Staat kwartaal aan, dan komt *Kwartaal* tussen Doelen en Maand; staat dag aan, dan *Dag* na Week. Kruimelpad van de huidige periode: `2027 › Maart › W10`, zonder kwartaal tenzij aan. Pijltjes voor vorige/volgende periode.
- **Lege staat:** drie gestippelde kaarten "Wat zijn je 3 voor deze week?". Nooit een stap "maak eerst een jaardoel".
- **Elke weergave heeft drie banden:**
  1. **Waarom:** alleen de directe ouder, als één regel op de kaart (`← Noodfonds €5.000`). De volledige keten staat in het kruimelpad van de detailweergave, niet op elke kaart.
  2. **Deze periode:** max. 3 kaarten met naam, "klaar als", voortgangsring en status.
  3. **Eronder:** per kaart wat eronder hangt (bij een jaardoel: de maandmijlpalen én de weken die er direct aan hangen), met een lege plek om toe te voegen.
- **Formulier:** "Hoort bij… (optioneel)" kiest uit zichtbare hogere items in de passende periodes; standaard leeg. Een los item krijgt op de kaart een rustige link "Koppel aan een doel".
- **Instellingen (Groei):** `HouseholdFeatureSettings.isPlanQuartersEnabled` en `isPlanDaysEnabled`, standaard uit. Uitzetten verbergt alleen; bestaande items blijven staan en hangen in de weergave onder hun dichtstbijzijnde zichtbare ouder.
- **Weekregel in mensentaal:** één zin bij de maandweergave: "Een week telt mee bij de maand waar de meeste dagen in vallen."
- **Dagweergave:** top 3 links, tijdlijn rechts (06:00–23:00, blokken van 15 min). Een balk "beschikbaar vandaag" uit Energie loopt leeg terwijl je blokt. Sleep een top-3-item naar de tijdlijn om een blok te maken. Op mobiel onder elkaar.
- **Groei-hub:** een kaart "Koers" met de top 3 van deze week en, als er een doel aan hangt, één regel waarom.
- **Data:** Provider plus TanStack `apiQuery` voor `plan.period`; formulieren via `useForm`; optimistic updates bij afvinken.
- **Teksten:** `packages/i18n/translations/features/growth.ts`, Engels eerst, dan Nederlands, daarna `pnpm --filter @rumtelo/i18n generate`.
- **Navigatie:** `_lib/routes.ts` en `_lib/nav.ts`.

### Zo past het bij het merk

| Element | Keuze | Waarom |
| --- | --- | --- |
| Koerslijn | een dunne teal lijn (`#06656C`) van de top 3 van deze week omhoog naar het doel, in het kruimelpad en de detailweergave | *rumbo* = koers; het merk gaat over richting, niet over grafieken |
| Horizon-labels | Plex Mono, kleine kapitalen: `JAAR`, `Q1`, `W10` | mono is in de richtlijnen al de letter voor rituelen en meta |
| Titels | Archivo Narrow | display-letter |
| Ondergrond | cool wash `#EEF1F5` met witte kaarten; heel subtiel puntraster in de dagweergave | rustig papiergevoel zoals reMarkable, zonder skeuomorfisme |
| Voortgang | ring rond het item, teal vulling | geen percentages in grote cijfers, geen staafdiagrammen |
| Status | gelukt teal, deels zand/geel, niet gelukt, losgelaten en doorgeschoven neutraal grijs | *informatie, nooit schaamte*: geen rood |
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
- **Plan:** capability `growth.plan` in `FEATURES.growth`, toegekend aan **Plus en Max**. Basic ziet Koers in het menu met een slotje en de upgrade-uitleg, zoals Leren.
- **Isolatie:** `growth_plan_item` via `PersonalScopedRepository`, de rest via `HouseholdScopedRepository`.

## Fasering en acceptatiecriteria

### Fase 0: fundament (vóór weekcheck fase 1)

- [x] Fase 0 van [household-visibility-plan.md](./household-visibility-plan.md) is af
- [x] Enums `PlanHorizon` en `PlanItemStatus` in contracts; periodesleutel-helpers en Zod-schema's
- [x] Entity `GrowthPlanItem` op `PersonalHouseholdEntity`, migratie met `pn db:gen` en nagekeken (`pn db:push` nog niet gedraaid)
- [x] `plan.create`, `plan.period`, `plan.year`, `plan.update`, `plan.updateStatus`, `plan.carry`, `plan.remove`
- [x] Weekcheck-plan bijwerken volgens "Wat dit verandert aan de weekcheck"
- [x] Regels: week en dag drie per periode, de rest drie per ouder; koppelen aan elke hogere laag (`ancestorPeriodOf`)
- [x] Doorschuiven: `plan.carry` zet een open origineel op `DEFERRED` en telt `carryCount` op

Klaar als: een vierde weekprioriteit wordt geweigerd ongeacht de ouder, een vierde maandmijlpaal onder hetzelfde jaardoel wordt geweigerd, een week onder de juiste maand valt rond een maandwissel, en een tweede deelnemer de privé-items van de eerste in geen enkele response terugziet (ook niet als OWNER).

### Fase 1: week, maand, doelen

- [ ] Route `/growth/plan` opent op de week, met de tabs Doelen · Maand · Week, kruimelpad en de drie banden
- [ ] Lege staat zonder verplichte doelen; "Hoort bij… (optioneel)" in het formulier; één "waarom" per kaart
- [ ] Knop "Doorschuiven" op open items van een afgelopen week (en in de terugblik van de weekcheck); badge `n× doorgeschoven` op de kaart
- [ ] Voortgang berekend van beneden naar boven
- [ ] Instellingen `isPlanQuartersEnabled` en `isPlanDaysEnabled` (standaard uit); kwartaal-tab verschijnt als hij aanstaat
- [ ] Weekcheck-vooruitblik biedt maandmijlpalen en jaardoelen aan om aan te koppelen
- [ ] Koppeling met Geld-doelen op jaar/kwartaal
- [ ] `VisibilityPicker` in het formulier, `VisibilityBadge` op de kaarten, weergavefilter Ik · Iedereen · partner
- [ ] Kaart "Koers" op de Groei-hub; capability en navigatie; teksten EN/NL

Klaar als: een nieuw huishouden zonder enig doel drie weekprioriteiten zet en afvinkt; wie daarna uitzoomt ziet die week onder de juiste maand; en het afvinken van een gekoppelde weekprioriteit de ring van de maand en het doel laat oplopen.

### Fase 2: dag

- [ ] Dagweergave met top 3, onder weekprioriteiten
- [ ] Optionele dagstart ("wat zijn je 3 van vandaag?") en dagafsluiting (afvinken, meenemen)
- [ ] Dag-tab en dagweergave achter `isPlanDaysEnabled` (de instelling bestaat sinds fase 1)

Klaar als: wie de daglaag uit heeft niets van dagen merkt, en een niet afgerond dagitem met één tik naar morgen gaat.

### Fase 3: uur

- [ ] Entity `GrowthTimeBlock` en `contract.growth.timeBlock`
- [ ] Tijdlijn met slepen, blokken van 15 min, geen overlap
- [ ] Balk "beschikbaar vandaag" uit het Energie-tijdsjabloon

Klaar als: de balk vrije minuten correct afleidt uit het sjabloon van die weekdag en een overlappend blok wordt geweigerd.

### Fase 4: Coach en agenda

- [ ] Coach-regels: los weekitem dat bij een doel lijkt te horen; doel zonder weekprioriteiten deze maand; meer ingepland dan beschikbaar; `carryCount ≥ 3` ("loslaten of kleiner maken?")
- [ ] Kwartaal- en jaarcheck als korte wizard, zoals de maandcheck
- [ ] Optioneel: bestaande afspraken alleen-lezen in de dagweergave via ICS-link

### Checks bij elke PR

- [ ] `pnpm --filter @rumtelo/contracts check-types`
- [ ] `pnpm --filter @rumtelo/backend lint:entities` en `ENTITY_INVENTORY.md` bijgewerkt
- [ ] `pnpm lint`
- [ ] Unit-tests: periodesleutels per horizon, week-naar-maand rond maand- en jaarwissel, koppelen over lagen heen (`ancestorPeriodOf`), roll-up met `DROPPED`, max. 3 op beide manieren, overlap van blokken
- [ ] Unit-tests zichtbaarheid (Groei-specifiek): kind niet opener dan ouder; "+1 privé" lekt geen naam of id; onzichtbare ouder in de "waarom"-lijn
- [ ] Groei-README bijgewerkt

## Open vragen

- [ ] Naam van de feature: **Koers** (voorstel), Planner, of iets anders?
- [ ] Hoort "max. 3" ook bij jaardoelen, of mag een jaar er 5 hebben?
- [x] Doelen van het huishouden én persoonlijke doelen in één boom? Ja, via de platformlaag zichtbaarheid; open vragen daarover staan in [household-visibility-plan.md](./household-visibility-plan.md).
- [ ] Aanmoedigen op gedeelde items van de ander in v1, of later?
- [ ] Kwartaal en dag standaard uit (voorstel), of één van beide aan?
- [x] In welk plan zit Koers? Plus en Max (`growth.plan`). Dag en uur vallen daar voorlopig onder.
- [ ] Willen jullie bestaande afspraken uit Google/Apple zien (alleen-lezen ICS), of blijft de tijdlijn leeg?
- [ ] Worden Leer-focussen (`learn_focus`) automatisch voorgesteld als kwartaaldoel?
