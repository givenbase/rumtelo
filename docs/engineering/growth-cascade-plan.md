# Plan: Koers — van jaardoel naar dit uur

18 oktober 2026 · bouwt voort op [growth-week-check-plan.md](./growth-week-check-plan.md) · schetsen: [Rumtelo Koers](https://claude.ai/artifact/BXzPQpYxp5mfL6enmhxhgv)

> **Bijgewerkt 20 oktober 2026:** sectie [Focus, Ritme en Home-schema](#focus-ritme-en-home-schema) toegevoegd: herhalende routines als tweede baan naast de top 3, herhaling als *voorstel* in plaats van een agenda-reeks, en een alleen-lezen Schema op Home (Vandaag · Deze week · Volgende week · Doelen) dat eerst Koers toont en later Energie, Geld en Ziel. Fase 5a kan nu, zonder nieuwe tabellen; 5b en 5c beschrijven Ritme en de overige bronnen. Fase 6 spiegelt Koers, rituelen en slimme herinneringen ("maandafsluiting over 3 dagen") naar Google, Apple of Outlook, eerst als abonnement, later als push.

> **Gebouwd 20 oktober 2026.** Het product heet overal **Koers / `course`**: contract `contract.growth.course.*`, tabellen `growth_course_*`, enums `Course*`, capability `growth-course`, routes `/product/growth/course/…`, teksten `features.growth.course.*`, instellingen `isCourseQuartersEnabled` en `isCourseDaysEnabled`, zichtbaarheidsgebied `growth.course`. Migratie `Migration20261020114239` hernoemt `growth_plan_item` op zijn plek (geen data weg) en zet de JSON-sleutels in `household_settings` om. Gebouwd zijn: weekcheck MVP, Fase 5a, 5b en 5c, Fase 6a. **21 oktober:** Schema en Ritme zijn opgegaan in Koers met drie tabs (Vandaag · Week · Doelen), alles onder `growth-course` (Plus en Max), met badges Focus · Gewoonte · Discipline · Check · Advies. Fase 6b staat als ADR: [adr-course-calendar-push.md](./adr-course-calendar-push.md). Afwijkingen van het voorstel staan bij [Zo is het gebouwd](#zo-is-het-gebouwd).

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

Rumtelo bouwt **geen volledige agenda** (uitnodigingen, herhalende afspraken, gedeelde kalenders). Dat kunnen Google en Apple beter. In een latere fase tonen we bestaande afspraken alleen-lezen in de dagweergave via een ICS-link, zodat je om je afspraken heen blokt. Andersom spiegelt Rumtelo jouw keuzes wél naar je eigen agenda, één richting en per bron aan of uit; zie [Jouw agenda: spiegel, geen tweede waarheid](#jouw-agenda-spiegel-geen-tweede-waarheid).

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
| Backend | `growth/week-check/` (lege huls), `growth/learn/focus/`, `money/targets/goal/`, `energy/time-template/` | aggregate `growth/course/` (items + tijdblokken) |
| Contract | `contract.growth.weekCheck` | `contract.growth.course`, `contract.growth.timeBlock` |
| Route | `/growth`, `/growth/goals`, `/growth/learn` | `/growth/course/[[...period]]` |
| Database | `growth_week_check` | `growth_course_item`, `growth_time_block` |

## Datamodel

Eén tabel voor alle doellagen, met een `horizon` en een periodesleutel. Eén tabel omdat elke laag dezelfde vorm heeft (naam, status, ouder, positie) en omdat roll-up en "meenemen" dan één query zijn.

**`growth_course_item`** (nieuw, `PersonalHouseholdEntity`)

| Kolom | Type | Toelichting |
| --- | --- | --- |
| `horizon` | enum `CourseHorizon` | `YEAR`, `QUARTER`, `MONTH`, `WEEK`, `DAY` |
| `period` | varchar(10) | `2027`, `2027-Q1`, `2027-03`, `2027-W10`, `2027-03-08` |
| `parent` | FK naar zichzelf, nullable, set null | een item hoger in de boom, in de periode die deze bevat; `null` = los (toegestaan, de Coach benoemt het) |
| `position` | int, 1 t/m 3 | volgorde; week/dag binnen (`account`, `horizon`, `period`), de rest binnen (…, `parent`) |
| `name` | max. 140 | het doel of de prioriteit |
| `doneWhen` | max. 280, nullable | "klaar als …", alleen zinvol voor jaar/kwartaal/maand |
| `status` | enum `CourseItemStatus` | `OPEN`, `DONE`, `PARTIAL`, `MISSED`, `DROPPED`, `DEFERRED` (doorgeschoven) |
| `reviewNote` | max. 280, nullable | wat hielp, of wat hield je tegen |
| `carriedFrom` | FK naar zichzelf, nullable, set null | gevuld als hij uit de vorige periode is doorgeschoven |
| `carryCount` | smallint, standaard 0 | hoe vaak dit item al is doorgeschoven langs zijn keten |
| `account`, `visibility` | uit `PersonalHouseholdEntity` | van wie en wie het ziet; `account = null` = *samen*. Zie [household-visibility-plan.md](./household-visibility-plan.md) |
| `goal` | FK naar `Goal`, nullable, set null | koppeling met een Geld-doel (alleen YEAR/QUARTER) |
| `skill` | varchar(64), nullable | catalogussleutel van een Leer-focus |
| `dayPart` | enum `CourseDayPart`, nullable | alleen `DAY`: `MORNING` · `AFTERNOON` · `EVENING`, "wanneer ongeveer"; zie [Van week naar uur](#van-week-naar-uur-eerst-wat-dan-wanneer) |

Twee gedeeltelijke unieke indexen dwingen de maxima af: week en dag op (`account`, `horizon`, `period`, `position`); jaar, kwartaal en maand op (`account`, `horizon`, `period`, `parent`, `position`). Index op (`household`, `horizon`, `period`).

**`growth_time_block`** (nieuw): de uur-laag.

| Kolom | Type | Toelichting |
| --- | --- | --- |
| `account` | FK naar `Account` (mapToPk) | van wie |
| `date` | date | de dag |
| `startMinute` | int, 0 t/m 1439 | begin, minuten na middernacht in de tijdzone van het huishouden |
| `endMinute` | int | eind, groter dan `startMinute` |
| `item` | FK naar `growth_course_item`, nullable, cascade | het dag- of weekitem waar dit blok voor is |
| `label` | max. 80, nullable | vrije tekst als er geen item is |

**Regels**

- `parent` ligt hoger in de boom en zijn periode bevat die van het kind (`ancestorPeriodOf`). Een week hoort bij de maand waar de meeste dagen in vallen (de ISO-donderdag); zo zeggen we het ook in de UI.
- Voortgang sla je niet op maar bereken je, van beneden naar boven: een item is zo ver als het aandeel `DONE` van zijn kinderen; `DROPPED` en `DEFERRED` tellen niet mee. Handmatig `DONE` zetten mag altijd en wint.
- **Doorschuiven (snoozen).** Is een item aan het einde van de periode nog open of niet gehaald, dan schuif je het met één tik door (`course.carry`). Het origineel krijgt status `DEFERRED` als het nog niet beoordeeld was (een `PARTIAL` of `MISSED` houdt zijn status); de kopie in de volgende periode krijgt `carryCount + 1` en blijft onder dezelfde ouder hangen. Op de kaart staat `2× DOORGESCHOVEN` in mono. Doorschuiven is een feit, geen mislukking; na drie keer vraagt The Coach: loslaten of kleiner maken?
- Persoonsattributie via `Account`, zoals `TimeTemplate` en `LearnSkillFocus`. Niet via `auth.user`.
- Enums komen uit `@rumtelo/contracts` via `NativeEnum`.

## Wat dit verandert aan de weekcheck

De weekcheck is nog niet gebouwd, dus dit kost nu niets:

- `growth_week_priority` **vervalt**. Een weekprioriteit is een `growth_course_item` met `horizon = WEEK`.
- `WeekPriorityStatus` heet `CourseItemStatus` en geldt voor alle lagen.
- `growth_week_check_entry` blijft (reflectie, aanpassing, hulpvraag) maar verwijst naar `Account` in plaats van `auth.user`.
- `weekCheck.updatePriorities` wordt een dunne laag over `course.replace({ horizon: 'WEEK', … })`.
- De vooruitblik in de wizard toont bovenaan de maandmijlpalen en jaardoelen; een nieuwe weekprioriteit koppel je optioneel aan een daarvan.
- De maandcheck uit fase 2 van de weekcheck wordt de MONTH-laag van deze boom; `growth_month_review` houdt alleen `onTrack` en `adjustment`.

## Contracts en backend

`contract.growth.course`, in CRUD-volgorde; controllers doen alleen transport.

| Procedure | CRUD | Wat het doet |
| --- | --- | --- |
| `course.create({ horizon, period, parentId?, name, doneWhen?, accountId?, goalId?, skill? })` | C | nieuw item; weigert een vierde |
| `course.period({ horizon, period, accountId? })` | R | items van deze periode, hun ouderketen (het "waarom") en alles wat er direct onder hangt (elke lagere laag), met berekende voortgang |
| `course.year({ year })` | R | de hele boom van een jaar, voor het jaaroverzicht |
| `course.update({ id, name?, doneWhen?, parentId?, position? })` | U | bewerken, verhangen, herordenen |
| `course.updateStatus({ id, status, reviewNote? })` | U | terugblik per item |
| `course.carry({ id })` | U | kopieert een niet-afgerond item naar de volgende periode met `carriedFrom` |
| `course.remove({ id })` | D | kinderen krijgen `parent = null` |
| `timeBlock.list({ date, accountId? })` | R | blokken van de dag plus `availableMinutes` uit `TimeTemplateService` |
| `timeBlock.create / update / delete` | C/U/D | blokken; weigert overlap voor dezelfde persoon |

De namen passen in `permissionActionFromPath`.

**Regels in de services**

- `CourseService` leest Geld-doelen via `GoalService` en het tijdsjabloon via `TimeTemplateService`, nooit hun tabellen.
- `accountId` moet een deelnemer (OWNER of MEMBER) van dit huishouden zijn, anders `ApiUserError`.
- Periodesleutels worden in de service gevalideerd én in Zod (regex per horizon). Week- en dagrekenwerk hergebruikt `week-key`-logica en `common/utils/timezone.util.ts`.

## Frontend

Eén route met inzoomen, in de geest van een hyperlinked papieren planner.

- **Route:** `app/(routes)/[locale]/(app)/(household)/product/growth/course/[[...period]]/page.tsx`. `/growth/course` opent de huidige week, met als kop "Jouw 3 voor deze week"; `/growth/course/2027`, `/2027-03`, `/2027-W10` (en `/2027-Q1`, `/2027-03-08` als die lagen aanstaan) zoomen.
- **Bovenaan:** drie tabs, **Doelen · Maand · Week**. Staat kwartaal aan, dan komt *Kwartaal* tussen Doelen en Maand; staat dag aan, dan *Dag* na Week. Kruimelpad van de huidige periode: `2027 › Maart › W10`, zonder kwartaal tenzij aan. Pijltjes voor vorige/volgende periode.
- **Lege staat:** drie gestippelde kaarten "Wat zijn je 3 voor deze week?". Nooit een stap "maak eerst een jaardoel".
- **Elke weergave heeft drie banden:**
  1. **Waarom:** alleen de directe ouder, als één regel op de kaart (`← Noodfonds €5.000`). De volledige keten staat in het kruimelpad van de detailweergave, niet op elke kaart.
  2. **Deze periode:** max. 3 kaarten met naam, "klaar als", voortgangsring en status.
  3. **Eronder:** per kaart wat eronder hangt (bij een jaardoel: de maandmijlpalen én de weken die er direct aan hangen), met een lege plek om toe te voegen.
- **Formulier:** "Hoort bij… (optioneel)" kiest uit zichtbare hogere items in de passende periodes; standaard leeg. Een los item krijgt op de kaart een rustige link "Koppel aan een doel".
- **Instellingen (Groei):** `HouseholdFeatureSettings.isCourseQuartersEnabled` en `isCourseDaysEnabled`, standaard uit. Uitzetten verbergt alleen; bestaande items blijven staan en hangen in de weergave onder hun dichtstbijzijnde zichtbare ouder.
- **Weekregel in mensentaal:** één zin bij de maandweergave: "Een week telt mee bij de maand waar de meeste dagen in vallen."
- **Dagweergave:** top 3 links, tijdlijn rechts (06:00–23:00, blokken van 15 min). Een balk "beschikbaar vandaag" uit Energie loopt leeg terwijl je blokt. Sleep een top-3-item naar de tijdlijn om een blok te maken. Op mobiel onder elkaar.
- **Groei-hub:** een kaart "Koers" met de top 3 van deze week en, als er een doel aan hangt, één regel waarom.
- **Data:** Provider plus TanStack `apiQuery` voor `course.period`; formulieren via `useForm`; optimistic updates bij afvinken.
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

## Focus, Ritme en Home-schema

20 oktober 2026 · bron: Cursor-plan *Koers ritme home* (`~/.cursor/plans/koers_ritme_home_db73570e.plan.md`, buiten de repo)

Koers krijgt twee banen die naast elkaar leven en elkaar niet vervuilen:

| Baan | Wat het is | Vorm | Voorbeeld |
| --- | --- | --- | --- |
| **Focus** | de cascade hierboven: bewuste keuzes, maximaal drie per week en per dag | kaarten met status en voortgangsring | "Deze week: trainingsschema afmaken" |
| **Ritme** | herhalende routines die je *vaak* doet, niet één keer kiest | teller per periode, afvinken per dag | "Training 3× per week" · "12× deze maand" |

**Hoe we typeren.** Niet met één categorie-veld op alles (`GOAL | HABIT | DAILY | …`), want dan wordt Schema weer een takenlijst en verdwijnt het verschil tussen max. 3 en consistentie. Wel in drie lagen: de **baan** (Focus · Ritme · Advies) op elke rij in Koers en Schema; op een routine de **kind** (`HABIT` klein en dagelijks, `DISCIPLINE` telbaar); in Schema de **area** (Geld · Groei · Energie · Ziel) voor kleur en icoon. Een Focus-item krijgt geen habit-type: de horizon zegt al wat het is, en de maand krijgt optioneel een teller. Een dagelijkse activiteit is óf je Focus van vandaag óf een Ritme-vinkje, geen derde soort. Schema toont de baan altijd als badge in mono (`FOCUS` · `RITME` · `ADVIES`), nooit alleen "habit".

Een routine neemt **nooit** een top-3-slot in. Ritme vult de week niet stilletjes vol; dat is precies wat Structured en Akiflow wél doen en wat Koers niet wil. Woordkeus volgt [positioning.md](../brand/positioning.md): de losse rij heet een **routine** (EN *routine*), nooit "practice" of "gewoonte-tracker". *Ritme* is de naam van de baan en van de tab.

### Voorbeeld: "er goed uitzien"

```text
JAAR   Er goed uitzien                       uitkomst, doneWhen
 └─ MAAND  12 trainingen in oktober          mijlpaal met teller (targetCount = 12)
     ├─ WEEK Focus  (max. 3)                 "schema laten nakijken"  ← keuze
     └─ Ritme  Training, 3× per week          ma · wo · vr, afvinken per dag
                                              teller: 7 van 12 deze maand
```

- Het jaardoel blijft een uitkomst.
- De maandmijlpaal krijgt een **teller** ("12×"). Hij loopt op door afgevinkte routines, niet door Focus-kinderen.
- De weekkeuze blijft wat je kiest. Als je deze week niets kiest voor dit doel, draait de routine gewoon door.
- Volgende maand stelt Rumtelo voor om de mijlpaal "12×" opnieuw te zetten. Jij bevestigt, past aan of laat los. Geen stille twaalf kopieën.

### Herhaling als voorstel, geen reeks

Rumtelo bouwt geen RRULE-kalender. Een routine beschrijft een **patroon**; bij een nieuwe periode wordt het patroon een **voorstel** op de plekken waar je toch al kijkt:

| Moment | Wat je ziet | Wat je kunt doen |
| --- | --- | --- |
| Nieuwe week (`/growth/course`, Ritme-tab) | de routines die deze week lopen, met de dagen van het patroon | afvinken, overslaan, pauzeren |
| Leftover-band / weekcheck-vooruitblik | "Training liep vorige week 2 van 3. Doorgaan met 3× per week?" | ja · kleiner (2×) · pauze · stop |
| Nieuwe maand (maandcheck) | "Vorige maand 10 van 12 trainingen. Opnieuw 12× in november?" | ja · ander getal · los van dit doel |
| Routine 14 dagen zonder vinkje | Coach: "Pauzeren of kleiner maken?" | één knop, geen rood |

De regels in één adem: een patroon is van jou, een voorstel vraagt bevestiging, een bevestiging maakt nog steeds **geen** Focus-item. Alleen jij kunt een routine expliciet tot één van je drie maken ("Maak hier deze week mijn Focus van"), en dan telt hij mee voor het slot.

### Datamodel (voorstel)

Twee tabellen bij, één kolom erbij. Alles `PersonalHouseholdEntity`, dus met maker en zichtbaarheid zoals de rest van Koers.

**`growth_course_rhythm`** (nieuw): het patroon.

| Kolom | Type | Toelichting |
| --- | --- | --- |
| `name` | max. 140 | "Training", "Lezen 20 min", "Bedtijd 23:00" |
| `kind` | enum `CourseRhythmKind` | `HABIT` (mini-gewoonte, klein en dagelijks) · `DISCIPLINE` (vaste afspraak met jezelf, telbaar) |
| `cadence` | enum `CourseRhythmCadence` | `DAILY` · `WEEKLY` · `MONTHLY` — de periode waarin `target` telt |
| `target` | smallint, 1 t/m 31 | hoe vaak per cadence; `WEEKLY` + `3` = "3× per week" |
| `weekdays` | jsonb `number[]`, nullable | ISO-weekdagen als hint voor het Schema (1 = ma … 7 = zo); leeg = vrij te kiezen |
| `dayPart` | enum `CourseDayPart`, nullable | dagdeel waarin de routine meestal valt; Schema › Vandaag groepeert erop |
| `parent` | FK naar `growth_course_item`, nullable, set null | het maand- of jaardoel dat deze routine voedt; `null` = los |
| `area` | enum `HouseholdPermissionSection`, nullable | portaal als categorie (Geld · Groei · Energie · Ziel) voor kleur en icoon in Schema |
| `source` | varchar(64), nullable | later: sleutel van een bron buiten Koers (`energy.sleep`, `energy.training`, `soul.intent`); zo'n rij maak je niet zelf en kun je alleen pauzeren |
| `pausedAt`, `endedAt` | timestamptz, nullable | pauze is omkeerbaar, stop niet |
| `account`, `visibility` | uit `PersonalHouseholdEntity` | zoals `growth_course_item` |

**`growth_course_rhythm_tick`** (nieuw): één vinkje. Uniek op (`rhythm`, `date`). Alleen `date` (dag in de tijdzone van het huishouden) en een optionele `note` (max. 140). Geen status-enum: een routine is gedaan of niet; "deels" bestaat hier niet.

**`growth_course_item.targetCount`** (nieuwe kolom, smallint, nullable): alleen zinvol voor `MONTH` (en `QUARTER`). Is hij gezet, dan is de voortgang van dat item `done = ticks van gekoppelde routines in deze periode`, `total = targetCount`; `DONE`-kinderen tellen dan niet dubbel. Handmatig `DONE` zetten wint nog steeds. Voor items zónder teller verandert er niets.

Regels:

- Een routine hangt onder een item met `horizon` `YEAR`, `QUARTER` of `MONTH`, nooit onder een week of dag.
- Afvinken gaat per dag (`tick`), ook als de cadence weekly of monthly is; de teller per periode is een `count` over ticks.
- *Informatie, nooit schaamte*: Rumtelo toont "7 van 12 deze maand", geen streaks met vuurtjes, geen rode gemiste dagen. Een gemiste dag is leeg, niet fout.
- Enums via `NativeEnum` uit `@rumtelo/contracts`; `growth_course_rhythm` via `PersonalScopedRepository` (area `growth.course`), ticks via `HouseholdScopedRepository` met de routine als sleutel.

### Contract (voorstel)

`contract.growth.rhythm`, in CRUD-volgorde:

| Procedure | CRUD | Wat het doet |
| --- | --- | --- |
| `rhythm.create({ name, kind, cadence, target, weekdays?, parentId?, area?, accountId?, visibility? })` | C | nieuwe routine |
| `rhythm.list({ period, accountId? })` | R | lopende routines voor een week of maand, met `count` per routine in die periode en de ticks per dag |
| `rhythm.suggestions({ horizon, period })` | R | voorstellen voor een nieuwe periode: routines met een lopend patroon plus hun score van de vorige periode |
| `rhythm.update({ id, name?, kind?, cadence?, target?, weekdays?, parentId?, area?, visibility? })` | U | patroon bijstellen ("kleiner maken") |
| `rhythm.pause({ id })` / `rhythm.resume({ id })` | U | pauze aan/uit |
| `rhythm.tick({ id, date, note? })` / `rhythm.untick({ id, date })` | C/D | het vinkje |
| `rhythm.remove({ id })` | D | stoppen (`endedAt`); ticks blijven voor de geschiedenis |

`course.period` krijgt per item met `targetCount` de nieuwe voortgang mee; `course.update` accepteert `targetCount`. Verder verandert `contract.growth.course` niet.

### Frontend: Ritme in Koers

- **Tab Ritme** naast Doelen · Maand · Week op `/growth/course`, altijd zichtbaar (geen instelling). Hij opent op de huidige week: per routine een rij met de naam, `3× per week`, zeven kleine dagvakjes (gevuld = tick) en de teller van de periode van het doel erboven ("7 van 12 in oktober").
- **Waarom-regel** zoals op Focus-kaarten: `← 12 trainingen in oktober`.
- **Formulier**: naam, soort (mini-gewoonte · discipline), hoe vaak (dagelijks · n× per week · n× per maand), dagen (optioneel), "Hoort bij… (optioneel)", zichtbaarheid. Zelfde `VisibilityPicker` en dezelfde regel "kind nooit opener dan ouder".
- **Maand- en jaarkaart** met teller: ring loopt op ticks; onder de kaart staat "Ritme: Training 3×/week" naast de weekkeuzes.
- **Voorstellen**: één rustige kaart boven de Ritme-tab bij een nieuwe periode, in de stijl van `CourseLeftoverBanner`; in de weekcheck-vooruitblik als extra stap vóór de nieuwe top 3.
- **Groei-hub**: de kaart "Koers" krijgt één regel Ritme onder de top 3: "Ritme vandaag: Training · Lezen".
- Teksten in `features.growth.rhythm` (EN eerst, dan NL), daarna `pnpm --filter @rumtelo/i18n generate`.

### Van week naar uur: eerst wat, dan wanneer

Onder de week worden de lagen steeds fijner, maar niet in één sprong van "dag" naar "minuut":

```text
WEEK  top 3      →  DAG  top 3      →  MOMENT  ochtend · middag · avond  →  UUR  tijdblok
wat eerst           wat vandaag        wanneer ongeveer                    wanneer precies
```

Bouwvolgorde: **eerst prioriteiten, dan momenten, dan uren.**

- *Prioriteiten eerst.* Koers belooft "waarom en wat eerst", niet "wanneer". Een top 3 overleeft een dag die anders loopt; een tijdblok niet, en een gemist blok is precies de schaamte die het product niet wil. Tijden zijn bovendien wat Google en Apple al goed doen en waar de spiegel (fase 6) ze neerzet.
- *Momenten* als eerste stap richting tijd: een optioneel `dayPart` (`MORNING` · `AFTERNOON` · `EVENING`) op dag-items en routines. Geen minuten, geen overlap-regels, één tik op een telefoon, en het sluit aan op Energie (wanneer heb jij energie?). Schema › Vandaag groepeert op moment zodra er één gezet is, anders blijft het één lijst. De grenzen van de dagdelen liggen vast: 06–12, 12–18, 18–23. Geen instelling.
- *Uren* (fase 3) alleen als je een item zelf naar de tijdlijn sleept. Het dagdeel is dan de plek waar het blok standaard landt.

Spiegel naar de agenda: een item met dagdeel blijft een hele-dag-afspraak met het dagdeel in de titel ("Ochtend · Trainen"); pas een tijdblok krijgt een tijd. Geen verzonnen precisie.

### Home → Schema

Groei blijft Koers; het *zien* van alles wat vandaag en deze week van je verwacht wordt, verhuist naar **Home → Schema** (EN *Schedule*). Dit is een **alleen-lezen synthese**: elke rij komt uit een bestaand product en wordt daar afgevinkt. Er bestaat geen tweede waarheid naast Koers.

| Bron | Wat Schema toont | Vanuit |
| --- | --- | --- |
| Koers Focus | top 3 van vandaag (als daglaag aan) of van deze week | `course.period` |
| Koers Ritme | routines die vandaag op het patroon staan, met vinkje | `rhythm.list` |
| Koers Uur (fase 3) | tijdblokken op de dagtijdlijn | `timeBlock.list` |
| Energie | "beschikbaar vandaag" uit het tijdsjabloon; **slaapvenster** als advies-rij ("Slapen om 23:00 voor 8 u"), afgeleid van de slaapband in `TIME_REFERENCE` en de wektijd van het sjabloon; later training en eten als Energie die loggen | `TimeTemplateService`, `TIME_REFERENCE` |
| Geld | rituelen: geld-weekcheck, maandafsluiting, dag dat vaste lasten geïnd worden | bestaande week-check- en maand-services |
| Groei | rituelen: Groei-weekcheck (zondag), maandcheck (laatste zondag) | `weekCheck.current` |
| Ziel | weekintentie als één regel bovenaan; stil moment als routine met `source = soul.intent` | Ziel-weekcheck |
| Later | bestaande afspraken alleen-lezen via ICS (fase 4 hierboven) | ICS-link |

Rijen van Energie, Geld en Ziel die uit een *bron* komen, zijn geen routines die je zelf aanmaakt. Ze verschijnen omdat het product ze kent, en je kunt ze hoogstens verbergen. Zo kan Koers later "advies: slapen om 23:00" tonen zonder dat iemand een slaaproutine hoeft in te typen.

**Route en vorm**

- *Vervallen 21 oktober: Schema is opgegaan in Koers › Vandaag en Week, zie [Zo is het gebouwd](#zo-is-het-gebouwd).* Route `/product/growth/course/schedule` onder Groei › Koers in `_lib/nav.ts` (eerst voorgesteld onder Home); capability `CAPABILITIES.growthCourseSchedule` (`growth-course-schedule`), voor alle plannen. Wat erin staat, volgt de capabilities van de bronnen: zonder `growth.course` zie je geen Focus of Ritme, wel de rituelen en het slaapvenster.
- Vier weergaven, als tabs: **Vandaag · Deze week · Volgende week · Doelen**. Dat is het overzicht dat Koers zelf niet geeft, omdat Koers één periode per keer toont.
  - *Vandaag*: Focus van vandaag (daglaag aan) of de weekkeuzes met "vandaag" als accent; routines die vandaag op het patroon staan; rituelen en advies. Hangt er tijd aan (tijdblokken, slaapvenster), dan staat er een smalle tijdlijn naast; op mobiel onder elkaar.
  - *Deze week*: de top 3 met status en "waarom"-regel, de routines met zeven dagvakjes, de weekcheck van zondag.
  - *Volgende week*: wat er al staat voor volgende week, de open items van deze week die eraan komen (dezelfde logica als `CourseLeftoverBanner`, maar vooruit) en, zodra Ritme bestaat, de voorstellen. Hier plan je rustig vooruit zonder de huidige week te verlaten.
  - *Doelen*: de jaardoelen en maandmijlpalen van nu met hun ring, zodat je ziet waar de week voor dient. Geen maandraster; de maand zelf is Koers › Maand.
- Afvinken gebeurt in Schema via dezelfde mutaties (`course.updateStatus`, `rhythm.tick`) met optimistic update; de rij blijft van zijn bron en linkt ernaar.
- Backend: aggregate `home/schedule/` met `contract.home.schedule.day({ date, accountId? })` en `.week({ week, accountId? })`. De service leest via `CourseService`, `RhythmService`, `TimeTemplateService` en de weekcheck-services, nooit hun tabellen, en schrijft niets. Hij komt pas als er meer dan één bron is; de eerste stap hieronder heeft hem niet nodig.

**Eerste stap, nu te bouwen zonder nieuwe tabellen**

Het overzicht van vandaag, deze week, volgende week en de doelen bestaat al in de data van Koers. De eerste versie van Schema is daarom frontend-werk op bestaande procedures:

| Tab | Leest | Bestaat |
| --- | --- | --- |
| Vandaag | `course.period({ horizon: DAY })` als de daglaag aan is, anders `course.period({ horizon: WEEK })` met de dag van vandaag als accent | ja |
| Deze week | `course.period({ horizon: WEEK })` met `ancestors` voor de "waarom"-regel | ja |
| Volgende week | `course.period({ horizon: WEEK, period: volgende week })` plus de open items van deze week via `leftoverItems` | ja |
| Doelen | `course.year({ year })` | ja |

Daar komt bij: de kaart "Vandaag" op Home (zie hieronder) en de zondag-weekcheck als vaste rij uit `weekCheck.current`. Ritme, slaapvenster, rituelen van Geld en Ziel en de tijdlijn haken later in dezelfde tabs, zonder dat de route of de kaart verandert.
- Filter *Ik · Iedereen · [naam]* zoals op Koers; zichtbaarheid wordt per rij door de bron bepaald.

**Widget op Home**

Op het dashboard komt een kaart **Vandaag** in dezelfde taal als `PortalWidget`, boven de rij Groei · Energie · Ziel: maximaal drie Focus-regels, de routines van vandaag als kleine vinkjes, het volgende ritueel ("Weekcheck zondag") en het slaapvenster als één regel. Eén link: "Open Schema". Geen tweede Coach-kaart; de Coach-regels blijven in `CoachVerdict`.

### Jouw agenda: spiegel, geen tweede waarheid

Koers en Schema leven in Rumtelo, maar je kijkt elke dag in Google, Apple of Outlook. Daarom spiegelt Rumtelo wat je gekozen hebt **naar** jouw agenda, zodat je focus staat waar je toch al kijkt. Eén richting: Rumtelo schrijft, de agenda toont. Afvinken, verplaatsen en loslaten doe je in Rumtelo; elke gespiegelde afspraak draagt een link terug naar Schema. Dit is iets anders dan de alleen-lezen ICS-import uit fase 4 (jouw bestaande afspraken zichtbaar in de dagweergave). Twee spiegels, elk één kant op, nooit een samenvoeging: de agenda overschrijft Koers niet en Rumtelo raakt geen afspraak aan die het niet zelf maakte.

**Wat de spiegel kan tonen**, per persoon aan of uit, standaard voorzichtig:

| Bron | Als afspraak | Standaard |
| --- | --- | --- |
| Focus week | één hele-dag-afspraak van maandag t/m zondag, "Koers · W43 · 3 keuzes", de drie in de omschrijving | aan |
| Focus dag | hele-dag-afspraak per dag met de top 3 van die dag (alleen als de daglaag aan is) | aan |
| Tijdblokken (fase 3) | afspraak met tijd, titel van het item | aan |
| Ritme (5b) | hele-dag-afspraak op de dagen van het patroon, "Ritme · Training" | uit |
| Rituelen | Groei-weekcheck (zondag), geld-weekcheck, maandafsluiting, met herinnering | aan |
| Slaapvenster (5c) | afspraak met tijd uit Energie, bijvoorbeeld 23:00–07:00 | uit |
| Partner | de voor jou zichtbare items van de ander, als eigen reeks met naam | uit |

**Slimme herinneringen** zijn regels, geen handwerk. Ze volgen de periodes die Rumtelo al kent en staan als afspraak met herinnering in de agenda:

| Ritueel | Afspraak | Herinnering (instelbaar) |
| --- | --- | --- |
| Maandafsluiting | laatste dag van de maand, hele dag | getrapt: "Plan je maandafsluiting" 3 dagen ervoor; weggeklikt → op de dag zelf; daarna blijft hij als open rij staan tot de maand gesloten is |
| Groei-weekcheck | zondag, op de tijd van het huishouden of hele dag | zaterdagavond, optioneel |
| Maandcheck | laatste zondag van de maand, binnen de weekcheck | zelfde als de weekcheck |
| Kwartaal- en jaarcheck (fase 4) | laatste zondag van kwartaal en jaar | 7 dagen ervoor |
| Nieuwe week | maandag | "Kies je 3 voor deze week" als de week nog leeg is (alleen met push, 6b) |

**Twee stappen**

1. **Abonnement (ICS-feed).** Per persoon een geheime URL `GET /calendar/:token.ics`, als publiek pad buiten de household-scope, zoals `/webhooks/stripe`. Werkt in Google ("via URL toevoegen"), Apple en Outlook zonder OAuth. Stabiele `UID` per bronrij (`plan-item:<id>@rumtelo`), `VALARM` voor herinneringen, `URL` naar Schema, `CLASS:PRIVATE`. Eerlijk erbij zetten: Google vernieuwt een abonnement traag (uren tot een dag) en negeert `VALARM`; Apple en Outlook verversen sneller en tonen de herinneringen wel.
2. **Push (OAuth).** Later een eigen agenda "Rumtelo" in Google Calendar of Outlook via de Google Calendar API en Microsoft Graph, met account-koppeling via better-auth. Nu kent `auth.config.ts` alleen e-mail-OTP, organisatie en 2FA; social providers, scopes en versleutelde token-opslag in de EU zijn een ADR. Daarna is de spiegel bijna direct, werken herinneringen overal en volgen wijzigingen in Rumtelo als update of verwijdering van de afspraak.

**Instellingen.** Paneel **Agenda** per persoon in Instellingen, onder Home › Schema: de schakelaars uit de tabel, de doorlooptijd van herinneringen, de abonnee-URL met knoppen voor Google, Apple en Outlook, en "Nieuwe link" (de oude URL werkt meteen niet meer). Privé-items van de ander komen nooit in iemands feed; "+1 privé" bestaat in een agenda niet.

**Model (voorstel).** `home_schedule_feed`, één rij per account per huishouden: `tokenHash` (uniek; de URL draagt het token, de tabel alleen de hash), schakelaars per bron, `reminderLeadDays` per ritueel, `isPartnerIncluded`, `lastFetchedAt`, `revokedAt`. Contract `contract.home.scheduleFeed`: `get`, `enable`, `update`, `rotate`, `disable`. De feed leest via dezelfde `ScheduleService` als Schema (6a mag tot die er is direct via `CourseService` en de weekcheck-services). Bereik: 4 weken terug, 8 weken vooruit; rituelen 12 maanden vooruit. Cache 5 minuten, rate-limit per token, `REFRESH-INTERVAL` 1 uur.

### Zo past het bij het merk

| Element | Keuze | Waarom |
| --- | --- | --- |
| Ritme-rij | zeven kleine vakjes in mono, gevuld in teal, leeg in `line` | tellen zonder te scoren; geen vlammetjes of streak-getallen |
| Teller | `7 / 12` in Plex Mono op de maandkaart | zelfde meta-letter als `W10` en `2× DOORGESCHOVEN` |
| Advies-rij (slaapvenster) | lichte kaart met klein Energie-icoon, zonder knop | advies is informatie, geen taak |
| Schema | zelfde cool wash en witte kaarten als Koers; de dag krijgt het puntraster | Home spreekt Koers na, niet andersom |

### Wat we hier wel en niet bouwen

| Wel | Niet |
| --- | --- |
| een helder overzicht van wat je als doelen hebt gezet en wat er voor vandaag, deze week en volgende week staat | een inbox waar losse taken binnenkomen en wachten (Akiflow) |
| een dagweergave met de keuzes van vandaag en, waar tijd aan hangt, een smalle tijdlijn | een dagagenda waarin elke minuut een blok moet krijgen (Structured) |
| herhaling als voorstel dat jij bevestigt | RRULE-reeksen, uitnodigingen, gedeelde kalenders, automatische kopieën |
| routines met een teller per periode | een habit-app met streaks en badges |
| afvinken in Schema via de mutaties van de bron | een schrijvende Schema-backend met een eigen waarheid |
| een spiegel van Koers, rituelen en herinneringen naar je eigen agenda, per bron aan of uit | twee-richting-sync waarbij de agenda Koers overschrijft, of Rumtelo andermans afspraken aanraakt |

## Zo is het gebouwd

Waar de bouw afwijkt van de voorstellen hierboven, geldt dit.

| Onderdeel | Gebouwd | Waarom |
| --- | --- | --- |
| Indeling | Eén menu-item **Koers** met drie tabs: **Vandaag** (start: checks, je 3, routines van vandaag, advies), **Week** (je 3, je routines met dagvakjes, de checks van de week; volgende week toont wat nog openstaat en de voorstellen) en **Doelen** (jaardoelen met de stappen van deze maand, het kwartaal als het aanstaat, alle mijlpalen van de maand). Route `/product/growth/course` = Vandaag, `/course/2026-10-21` = een dag, `/course/2026-W43` = Week, `/course/2026-10` = Doelen. De aparte Schema- en Ritme-pagina's zijn vervallen; Home houdt de kaart "Vandaag" | beslist 21 oktober: minder tabs, één scherm voor alles wat je plant |
| Plan en capability | Alles van Koers is **Plus en Max**, onder één capability `growth-course`: de tabs, de weekcheck, de agenda-feed en de Home-kaart. De aparte `growth-course-schedule` is weg | beslist 21 oktober: Schema was nooit een apart product |
| Soorten en badges | Elke rij draagt een badge met icoon: **Focus** (je 3), **Gewoonte** (`HABIT`), **Discipline** (`DISCIPLINE`), **Check** (weekcheck, maandafsluiting) en **Advies** (slaap). De baan `RITUAL` heet nu `CHECK`; "ritueel" is geen woord meer in het product. Routines (`growth_course_rhythm`) hebben `name`, `kind`, `cadence`, `target`, `weekdays`, `parent`, `area`, `confirmedWeek`, `pausedAt`, `endedAt`; vinkjes in `growth_course_rhythm_tick` | HABIT/DISCIPLINE blijven, zodat presets (Leren, Energie) er later op kunnen haken |
| Gewoonte of discipline | Een **discipline** telt ("7 van 12"), vult de teller van de stap erboven en krijgt bij een nieuwe periode het voorstel doorgaan · kleiner · pauze · stop. Een **gewoonte** is altijd dagelijks op haar patroondagen, telt niet, vult geen teller en vraagt alleen "gedaan?"; ze krijgt alleen een voorstel om haar doel te vernieuwen. Contract `contract.growth.course.rhythm`: `create`, `tick`, `list`, `suggestions`, `update`, `pause`, `resume`, `confirm`, `renew`, `untick`, `remove` | zo blijft trainen scherp en lezen zacht |
| Teller | `growth_course_item.targetCount` (1 t/m 99) op maand en kwartaal; de ring telt vinkjes van **disciplines** eronder in die periode | beslist: een vinkje van een discipline telt mee |
| Checks | Groei-weekcheck en geld-weekcheck op zondag; maandafsluiting op de laatste dag, getrapt: herinnering 3 dagen ervoor (instelbaar 0 · 3 · 7), "niet nu" verplaatst hem naar de dag zelf, daarna blijft de oudste open maand elke dag staan tot hij gesloten is. Intern heten de tabel en de enum nog `ritual` (`growth_course_ritual_snooze`, `CourseRitual`), om de migratie niet te raken | beslist |
| Slaapadvies | geplande slaapminuten per weekdag uit het tijdsjabloon tegen de band van 7–9 u; geen kloktijden | het tijdsjabloon kent geen wektijd. De Energie-entities staan bewust buiten MikroORM, dus tot ze terugkomen blijft deze rij leeg |
| Ziel | nog geen rij in Schema | de Ziel-weekcheck heeft nog geen intentie-veld |
| Agenda-feed | `GET /calendar/:token.ics`; token = HMAC van rij-id en `version` met `BETTER_AUTH_SECRET`; de tabel `growth_course_feed` bewaart alleen de SHA-256 | zo kan het adres opnieuw getoond worden zonder het op te slaan; "Nieuw adres" verhoogt `version` |
| Week-Focus in de agenda | één hele-dag-afspraak van maandag t/m zondag met de drie in de omschrijving | beslist: minder ruis, meer focus |
| Weekcheck MVP | `/product/growth/course/week-check`: terugblik op vorige week, Ritme-voorstellen, de nieuwe drie, afronden via `growth.weekCheck.complete`. Op zondag plant hij de week erna | partnerwissel, hulpvraag en maandcheck volgen in de volledige weekcheck |
| Coach | `CourseCoachService`: routine 14 dagen zonder vinkje ("pauzeren of kleiner?") en een maandteller zonder routine eronder; tekst in de taal van het account | registry `growth_tip_producers` staat nu op ship |

## Privé, gedeeld of samen

Zichtbaarheid is een platformlaag voor het hele huishouden: [household-visibility-plan.md](./household-visibility-plan.md). Daar staan het model (`Alleen ik` · `Delen met eigenaar` · `Hele huishouden` · `Samen`), wie wat mag kiezen per `HouseholdSharingMode`, externe partijen en de handhaving. De cascade is de eerste gebruiker. Hieronder staat alleen wat specifiek is voor Groei.

- **Kind nooit opener dan ouder.** Een gedeelde weekprioriteit onder een privé-maanddoel kan niet; het formulier kiest automatisch de strengste toegestane optie. Een persoonlijke weekprioriteit onder een *samen*-jaardoel mag wel ("mijn week voor ons noodfonds").
- **Voortgang:** privé-kinderen tellen mee in de ring van een gedeelde ouder; de ander ziet "+1 privé" (via `countHidden`). Wie zo'n item aanmaakt, ziet: "Telt mee voor het gedeelde doel; de naam blijft privé."
- **Kruimelpad en "waarom"-lijn:** is een ouder voor de kijker onzichtbaar, dan toont de lijn alleen "Privé doel" zonder naam.
- **Tijdblokken** (`growth_time_block`) zijn altijd privé en zijn geen `PersonalHouseholdEntity`.
- **Weergavefilter** *Ik · Iedereen · [naam]* bovenaan `/growth/course`.

### Weekcheck

| Modus | Wat je van de ander ziet |
| --- | --- |
| `TOGETHER` of `OWNER_SEES` | de prioriteiten die voor jou zichtbaar zijn, plus "1 privé prioriteit" met alleen de status. Tijdens de wizard mag je op één scherm de zichtbare items van de ander bijwerken (status, notitie). Dat kan alleen via `weekCheck.*`, niet via `course.update`. |
| `SEPARATE` | niets van de ander; de wizard doet alleen jouw stappen |

In `OWNER_SEES` met een stel ziet het lid de items van de eigenaar die op *Hele huishouden* staan, en ziet de eigenaar wat het lid met de eigenaar deelt. Voor een stel werkt de weekcheck dus hetzelfde als in `TOGETHER`.

## Rechten, plan en isolatie

- **Wie doet mee:** OWNER en MEMBER. VIEWER ziet Groei niet.
- **Plan:** capability `growth.course` in `FEATURES.growth`, toegekend aan **Plus en Max**. Basic ziet Koers in het menu met een slotje en de upgrade-uitleg, zoals Leren.
- **Isolatie:** `growth_course_item` via `PersonalScopedRepository`, de rest via `HouseholdScopedRepository`.

## Fasering en acceptatiecriteria

### Fase 0: fundament (vóór weekcheck fase 1)

- [x] Fase 0 van [household-visibility-plan.md](./household-visibility-plan.md) is af
- [x] Enums `CourseHorizon` en `CourseItemStatus` in contracts; periodesleutel-helpers en Zod-schema's
- [x] Entity `GrowthCourseItem` op `PersonalHouseholdEntity`, migratie met `pn db:gen` en nagekeken (`pn db:push` nog niet gedraaid)
- [x] `course.create`, `course.period`, `course.year`, `course.update`, `course.updateStatus`, `course.carry`, `course.remove`
- [x] Weekcheck-plan bijwerken volgens "Wat dit verandert aan de weekcheck"
- [x] Regels: week en dag drie per periode, de rest drie per ouder; koppelen aan elke hogere laag (`ancestorPeriodOf`)
- [x] Doorschuiven: `course.carry` zet een open origineel op `DEFERRED` en telt `carryCount` op

Klaar als: een vierde weekprioriteit wordt geweigerd ongeacht de ouder, een vierde maandmijlpaal onder hetzelfde jaardoel wordt geweigerd, een week onder de juiste maand valt rond een maandwissel, en een tweede deelnemer de privé-items van de eerste in geen enkele response terugziet (ook niet als OWNER).

### Fase 1: week, maand, doelen

- [x] Route `/growth/course` opent op de week, met de tabs Doelen · Maand · Week, kruimelpad en de drie banden
- [x] Lege staat zonder verplichte doelen; "Hoort bij… (optioneel)" in het formulier; één "waarom" per kaart
- [x] Knop "Doorschuiven" op open items van een afgelopen week (en in de terugblik van de weekcheck); badge `n× doorgeschoven` op de kaart
- [x] Voortgang berekend van beneden naar boven
- [x] Instellingen `isCourseQuartersEnabled` en `isCourseDaysEnabled` (standaard uit); kwartaal-tab verschijnt als hij aanstaat
- [x] Weekcheck-vooruitblik biedt maandmijlpalen en jaardoelen aan om aan te koppelen (via "Hoort bij…" in het formulier van de weekcheck MVP)
- [x] Koppeling met Geld-doelen op jaar/kwartaal
- [x] `VisibilityPicker` in het formulier, `VisibilityBadge` op de kaarten, weergavefilter Ik · Iedereen · partner
- [x] Kaart "Koers" op de Groei-hub; capability en navigatie; teksten EN/NL

Klaar als: een nieuw huishouden zonder enig doel drie weekprioriteiten zet en afvinkt; wie daarna uitzoomt ziet die week onder de juiste maand; en het afvinken van een gekoppelde weekprioriteit de ring van de maand en het doel laat oplopen.

### Fase 2: dag

- [ ] Dagweergave met top 3, onder weekprioriteiten
- [ ] Optionele dagstart ("wat zijn je 3 van vandaag?") en dagafsluiting (afvinken, meenemen)
- [ ] Dag-tab en dagweergave achter `isCourseDaysEnabled` (de instelling bestaat sinds fase 1)
- [ ] Optioneel dagdeel (`dayPart`: ochtend · middag · avond) op dag-items; Schema › Vandaag groepeert erop; routines krijgen het in fase 5b

Klaar als: wie de daglaag uit heeft niets van dagen merkt, en een niet afgerond dagitem met één tik naar morgen gaat.

### Fase 3: uur

- [ ] Entity `GrowthTimeBlock` en `contract.growth.timeBlock`
- [ ] Tijdlijn met slepen, blokken van 15 min, geen overlap; een item met dagdeel landt standaard in dat dagdeel
- [ ] Balk "beschikbaar vandaag" uit het Energie-tijdsjabloon

Klaar als: de balk vrije minuten correct afleidt uit het sjabloon van die weekdag en een overlappend blok wordt geweigerd.

### Fase 4: Coach en agenda

- [ ] Coach-regels: los weekitem dat bij een doel lijkt te horen; doel zonder weekprioriteiten deze maand; meer ingepland dan beschikbaar; `carryCount ≥ 3` ("loslaten of kleiner maken?")
- [ ] Kwartaal- en jaarcheck als korte wizard, zoals de maandcheck
- [ ] Optioneel: bestaande afspraken alleen-lezen in de dagweergave via ICS-link

### Weekcheck MVP (vóór Ritme)

- [x] Route `/product/growth/course/week-check` (capability `growth-course`): terugblik, Ritme-voorstellen, de nieuwe drie, afronden
- [x] Op zondag plant de check de week erna (`weekCheckWeekFor`); Schema toont hem elke zondag als ritueel
- [ ] Partnerwissel, hulpvraag, gedeelde notitie en maandcheck: de volledige weekcheck uit [growth-week-check-plan.md](./growth-week-check-plan.md)

### Fase 5a: Schema, eerste stap (nu, zonder nieuwe tabellen)

Alleen frontend op bestaande procedures. Kan direct na fase 1, los van de weekcheck.

- [x] Eerst als aparte route `/product/growth/course/schedule`; op 21 oktober opgegaan in Koers › Vandaag en Week, onder `growth-course`
- [x] Tabs Vandaag · Deze week · Volgende week · Doelen op `course.period` en `course.year`; "waarom"-regel uit `ancestors`
- [x] Volgende week toont wat er al staat plus de open items van deze week (`leftoverItems`, nu gedeeld in `app/_lib/course-leftovers.ts`); doorschuiven en afvinken via `course.carry` en `course.updateStatus`
- [x] Zondag-weekcheck als vaste rij uit `weekCheck.current`; de rij opent voorlopig de week in Koers, omdat `/growth/week-check` nog niet bestaat
- [x] Kaart "Vandaag" op Home met de Focus van vandaag of deze week en het volgende ritueel

Klaar als: iemand zonder de daglaag op Home in één blik ziet wat er deze week staat en wat er al voor volgende week klaarligt, met de daglaag aan ook wat vandaag is, en elk vinkje in Schema meteen in Koers terugkomt.

### Fase 5b: Ritme

Na fase 1 van de weekcheck (de vooruitblik toont de voorstellen).

- [x] Enums `CourseRhythmKind` en `CourseRhythmCadence` in contracts; entities `GrowthCourseRhythm` en `GrowthCourseRhythmTick`; kolom `targetCount` op `GrowthCourseItem`; migratie gegenereerd met `pn db:gen` en met de hand omgezet naar een hernoeming
- [x] `rhythm.create`, `rhythm.list`, `rhythm.suggestions`, `rhythm.update`, `rhythm.pause`, `rhythm.resume`, `rhythm.tick`, `rhythm.untick`, `rhythm.remove`
- [x] Voortgang van een item met `targetCount` komt uit ticks; zonder teller verandert niets
- [x] Tab Ritme op `/growth/course` met dagvakjes en teller; formulier met "Hoort bij… (optioneel)" en `VisibilityPicker`
- [x] Voorstellen bij een nieuwe week en maand (kaart boven Ritme en een stap in de weekcheck; een maandritme stelt voor in de eerste week van een nieuwe maand); geen kopieën zonder bevestiging
- [ ] Voorstellen in de maandcheck: wacht op de maandcheck zelf
- [x] "Maak hier deze week mijn Focus van" maakt een weekitem onder dezelfde ouder en respecteert max. 3
- [x] Coach-regels: routine 14 dagen zonder vinkje ("pauzeren of kleiner?"); maandmijlpaal met teller zonder routine ("welke routine brengt dit dichterbij?")

Klaar als: een huishouden "12 trainingen" als maandmijlpaal zet met een routine "3× per week" eronder, drie weken afvinkt en de ring op 9 van 12 ziet staan; de nieuwe maand één voorstel toont en geen enkele kopie zonder bevestiging maakt; en de top 3 van de week nooit door een routine gevuld wordt.

### Fase 5c: Schema, alle bronnen

Zodra Ritme bestaat en er meer dan één bron is; de tijdlijn volgt fase 3.

- [x] `CourseScheduleService` met `course.schedule.list` en `.snooze`, lezend via services; capability `growth-course`, navigatie en teksten EN/NL
- [x] Slaapadvies als advies-rij uit tijdsjabloon en `TIME_REFERENCE` (geplande uren, geen kloktijd); rituelen van Geld en Groei als rijen. Ziel volgt zodra de Ziel-weekcheck een intentie heeft
- [x] Kaart "Vandaag" op Home uitbreiden met de routines van vandaag en het slaapvenster
- [ ] Dagtijdlijn in Schema zodra `timeBlock.list` bestaat (fase 3)

Klaar als: Koers › Schema vandaag de Focus, de routines, het slaapvenster en de zondagse weekcheck in één lijst toont, afvinken direct in Koers en Ritme terugkomt, en de route en de kaart uit fase 5a daarvoor niet hoefden te veranderen.

### Fase 6: jouw agenda

#### 6a: abonnement (ICS-feed)

Na fase 5a; elke latere bron (Ritme, tijdblokken, slaapvenster) haakt vanzelf in.

- [x] Entity `GrowthCourseFeed` (`version`, `tokenHash`, `monthCloseLeadDays`, `isEnabled`, schakelaars per bron, `lastFetchedAt`); contract `contract.growth.course.feed` met `get`, `enable`, `update`, `rotate`, `disable`
- [x] Publieke controller `GET /calendar/:token.ics` buiten de household-scope; token gehasht opgezocht; rate-limit 60 per 10 minuten per IP (Nest throttler); 5 minuten cache per adres
- [x] Afspraken voor Focus week en dag en voor de rituelen; herinneringen als `VALARM`; stabiele `UID`, `URL` naar Schema, `CLASS:PRIVATE`
- [x] Maandafsluiting op de laatste dag van de maand, getrapt: herinnering 3 dagen ervoor, bij wegklikken op de dag zelf, daarna open rij tot de maand gesloten is
- [x] Paneel Agenda in Instellingen: schakelaars per bron, doorlooptijd, URL-knoppen voor Google, Apple en Outlook met de eerlijke regel over verversen, "Nieuwe link"
- [x] Ritme en slaapadvies in de feed (standaard uit)
- [ ] Tijdblokken in de feed: wacht op fase 3

Klaar als: een huishouden de feed in Google, Apple en Outlook toevoegt en de top 3 van deze week, de weekcheck van zondag en de maandafsluiting met herinnering ziet; het uitzetten van een bron die rijen bij de volgende verversing weghaalt; "Nieuwe link" de oude URL direct laat weigeren; en geen enkel privé-item van de ander in iemands feed staat.

#### 6b: push (OAuth), ADR eerst

Status: ADR geschreven, niet gebouwd. Zie [adr-course-calendar-push.md](./adr-course-calendar-push.md).

- [x] ADR: Google Calendar API en Microsoft Graph via better-auth account-koppeling; scopes; versleutelde token-opslag in de EU; verificatie van de OAuth-app
- [ ] Eigen agenda "Rumtelo" per gekoppeld account; create, update en delete volgen de mutaties in Koers, Ritme en de rituelen
- [ ] Herinnering "Kies je 3 voor deze week" op maandag als de week leeg is
- [ ] Rumtelo raakt nooit afspraken aan die het niet zelf maakte

Klaar als: afvinken of loslaten in Koers binnen een minuut in de agenda zichtbaar is, en het ontkoppelen van het account de Rumtelo-agenda leegmaakt zonder iets anders te raken.

### Checks bij elke PR

- [ ] `pnpm --filter @rumtelo/contracts check-types`
- [ ] `pnpm --filter @rumtelo/backend lint:entities` en `ENTITY_INVENTORY.md` bijgewerkt
- [ ] `pnpm lint`
- [ ] Unit-tests: periodesleutels per horizon, week-naar-maand rond maand- en jaarwissel, koppelen over lagen heen (`ancestorPeriodOf`), roll-up met `DROPPED`, max. 3 op beide manieren, overlap van blokken
- [ ] Unit-tests Ritme: teller per cadence over een maand- en jaarwissel; `targetCount`-voortgang telt ticks en geen kinderen dubbel; voorstellen zonder kopieën; routine onder week of dag wordt geweigerd
- [ ] Unit-tests zichtbaarheid (Groei-specifiek): kind niet opener dan ouder; "+1 privé" lekt geen naam of id; onzichtbare ouder in de "waarom"-lijn
- [ ] Groei-README bijgewerkt

## Open vragen

- [ ] Naam van de feature: **Koers** (voorstel), Planner, of iets anders?
- [ ] Hoort "max. 3" ook bij jaardoelen, of mag een jaar er 5 hebben?
- [x] Doelen van het huishouden én persoonlijke doelen in één boom? Ja, via de platformlaag zichtbaarheid; open vragen daarover staan in [household-visibility-plan.md](./household-visibility-plan.md).
- [ ] Aanmoedigen op gedeelde items van de ander in v1, of later?
- [ ] Kwartaal en dag standaard uit (voorstel), of één van beide aan?
- [x] In welk plan zit Koers? Plus en Max (`growth.course`). Dag en uur vallen daar voorlopig onder.
- [ ] Willen jullie bestaande afspraken uit Google/Apple zien (alleen-lezen ICS), of blijft de tijdlijn leeg?
- [ ] Worden Leer-focussen (`learn_focus`) automatisch voorgesteld als kwartaaldoel?
- [ ] Ritme: heet de tab *Ritme* of *Routines*? (Voorstel: tab *Ritme*, rij *routine*, zie positioning.md.)
- [x] Telt een afgevinkte routine mee voor de maandmijlpaal via `targetCount`? **Ja** (20 oktober 2026).
- [x] Hoort Ritme bij `growth.course`? **Ja: Koers en Ritme zijn Plus en Max.** Basic ziet de tab met slotje, zoals Koers nu.
- [ ] Home › Schema voor alle plannen (voorstel: ja, inhoud volgt de bron-capabilities), of achter een eigen plan?
- [x] Agenda-spiegel: herinnering maandafsluiting. **Beide, getrapt:** 3 dagen ervoor; wie hem wegklikt krijgt hem op de dag zelf; daarna blijft de maandafsluiting als open rij staan in Schema en de agenda tot hij gedaan is. Te laat is informatie, geen alarm.
- [x] Agenda-spiegel: de week-Focus als **één hele-dag-afspraak van maandag t/m zondag** met de drie in de omschrijving. Minder ruis in de agenda, meer focus. Eén afspraak per keuze alleen voor dag-items en tijdblokken.
- [ ] Agenda-spiegel: abonnement (6a) voor alle plannen en push (6b) bij Plus en Max?
- [x] Dagdelen: **vaste grenzen** 06–12 · 12–18 · 18–23. Geen huishoudinstelling.
