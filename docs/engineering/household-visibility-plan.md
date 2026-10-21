# Plan: Zichtbaarheid in het huishouden

18 oktober 2026 · eerste gebruiker: [growth-cascade-plan.md](./growth-cascade-plan.md)

> **Voor Claude Code:** volg `CLAUDE.md`, `HANDOFF.md` en `.cursor/rules/` (vooral `backend-module-shape.mdc`). Dit is een **platformlaag** naast `HouseholdEntity` en `HouseholdScopedRepository`, geen Groei-feature. Bouw fase 0 vóór de cascade. Waar een open vraag nog niet beantwoord is, gebruik het voorstel.

## Waarom een platformlaag

Rumtelo heeft nu twee soorten data in een huishouden, zonder dat dat ergens is vastgelegd:

| Soort | Voorbeelden | Wie ziet het nu |
| --- | --- | --- |
| **Van het huishouden** | potten, vaste lasten, inkomen, rekeningen, transacties, Geld-doelen, instellingen | iedereen, volgens de rolmatrix |
| **Van één persoon** | energielog, tijdregistratie, tijdsjabloon, dankbaarheid, Leer-focus/voortgang/boeken | elke service filtert zelf op `account = ik`, of telt per persoon op |

Voor persoonlijke data bedenkt elke service nu zijn eigen regel. Met de cascade komt daar "delen met mijn partner" bij, en straks wil Energie of Ziel hetzelfde. Daarom komt zichtbaarheid **één keer in het platform**: één basisklasse, één repository, één beleid in contracts en één keuzecomponent in de app. Elk portaal gebruikt die, net zoals nu iedereen `HouseholdScopedRepository` gebruikt.

Geld krijgt een eigen uitwerking: potten en plan blijven gedeeld ("eerst verdelen"), maar inkomen, rekeningen en uitgaven krijgen "van wie" (zie "Geld: van wie, en wat privé blijft"). Het hele model is een Plus-functie (zie "Abonnement: Plus en hoger").

## Het model

Elke persoonlijke rij krijgt twee velden:

| Veld | Waarden | Betekenis |
| --- | --- | --- |
| `account` | FK naar `Account`, nullable | van wie; `null` = **samen**, van het huishouden |
| `visibility` | `PRIVATE` · `OWNER` · `HOUSEHOLD` | wie het naast de maker mag zien |

| `visibility` | Wie ziet het | UI-label voor de maker |
| --- | --- | --- |
| `PRIVATE` | alleen de maker | **Alleen ik** |
| `OWNER` | de maker en de eigenaar van het huishouden | **Delen met [naam eigenaar]** |
| `HOUSEHOLD` | de maker en alle deelnemers (OWNER en MEMBER, geen `EXTERNAL`) | **Hele huishouden** |
| `account = null` | alle deelnemers, en zij mogen het ook bewerken | **Samen** |

De volgorde is `PRIVATE < OWNER < HOUSEHOLD < samen`. Bij een stel is `OWNER` hetzelfde als `HOUSEHOLD`; het verschil telt pas bij een gezin met meer leden.

## Wie mag wat kiezen

De eigenaar heeft alle opties. Een lid kiest bewust tussen alleen zichzelf en delen met de eigenaar. De eigenaar kan leden meer ruimte geven met één huishoudinstelling:

**`HouseholdSharingMode`**, in `HouseholdSettings.visibility.mode`, alleen te wijzigen door de OWNER (de rolmatrix doet dat al: MEMBER heeft `HOUSEHOLD_SETTINGS: READ_ONLY`).

| Optie | `SEPARATE` *Ieder apart* | `OWNER_SEES` *Eigenaar kijkt mee* (voorstel, standaard) | `TOGETHER` *Samen* |
| --- | --- | --- | --- |
| **OWNER** kiest | Alleen ik | Alleen ik · Hele huishouden · Samen | Alleen ik · Hele huishouden · Samen |
| **MEMBER** kiest | Alleen ik | Alleen ik · Delen met eigenaar | Alleen ik · Delen met eigenaar · Hele huishouden · Samen |
| **VIEWER** | maakt geen persoonlijke items | idem | idem |
| *Samen*-items bewerken | niemand maakt nieuwe | OWNER maakt en verwijdert; MEMBER mag status en inhoud bijwerken | iedere deelnemer |

Bij de eigenaar is "Delen met eigenaar" overbodig en staat het dus niet in de lijst. In een huishouden met maar één deelnemer is de hele keuze verborgen; alles is dan feitelijk privé.

### Per onderdeel: het huishouden bepaalt wat gezien mag worden

Eén modus voor alles is te grof. Een stel wil bijvoorbeeld samen plannen in Groei en trainingen delen, maar slaap en voeding liever niet. Daarom kiest het huishouden de modus **per onderdeel**. Rumtelo levert verstandige standaarden mee, zodat niemand iets hoeft in te stellen.

Een **onderdeel** (`VisibilityArea`) is een soort persoonlijke data. De catalogus staat in contracts, zoals `TIME_REFERENCE`:

| Onderdeel | Portaal | Tabellen | Standaard | Waarom |
| --- | --- | --- | --- | --- |
| `growth.course`: Koers-doelen | Groei | `growth_course_item`, `growth_week_check_entry` | volgt het huishouden | samen plannen is het doel |
| `growth.learn`: Leren | Groei | `learn_focus`, `learn_progress`, `learn_book` | volgt het huishouden | |
| `energy.log`: Energiemetingen (slaap, training, voeding, hoofd) | Energie | `energy_log` | **`SEPARATE`**, gevoelig | gezondheidsgegevens (AVG art. 9): delen alleen als het huishouden het zelf aanzet |
| `energy.time`: Tijdsbesteding | Energie | `time_entry`, `time_template` | volgt het huishouden | |
| `soul.gratitude`: Dankbaarheid | Ziel | `gratitude` | volgt het huishouden | |
| `money.income`: Inkomen per persoon | Geld | `income_source` | volgt het huishouden | samen verdelen vraagt dat je weet wat er binnenkomt |
| `money.personal`: Persoonlijke rekeningen en uitgaven | Geld | `bank_account` met houder, `transaction` daarop | **`SEPARATE`**, gevoelig | eigen ruimte met eigen geld |

**Hoe de modus voor een onderdeel wordt bepaald**, van sterk naar zwak:

1. de keuze van het huishouden voor dat onderdeel (`visibility.areas[area]`);
2. bij een **gevoelig** onderdeel: de standaard van Rumtelo (`SEPARATE`), ook als de algemene modus opener is;
3. de algemene modus van het huishouden (`visibility.mode`, standaard `OWNER_SEES`).

Het huishouden overschrijft dus alleen wat het bewust aanpast. Een gevoelig onderdeel gaat nooit open door een algemene keuze, alleen door een keuze voor dat onderdeel zelf. Die keuze krijgt één regel uitleg, bijvoorbeeld "Slaap, training en voeding zijn gezondheidsgegevens. Leden blijven zelf per item kiezen."

In de instellingen staan bovenaan de drie modi als snelle keuze. Daaronder staat **"Per onderdeel"**: per portaal de onderdelen met dezelfde drie opties. Een label *Aangepast* verschijnt waar het afwijkt van de algemene keuze, en *Gevoelig* bij gezondheidsdata. Er is een knop "Terug naar standaard".

Elke tabel hoort bij precies één onderdeel. Een nieuw portaal of een nieuwe tabel met persoonlijke data voegt een regel toe aan de catalogus, met een standaard en eventueel `sensitive: true`.

**Standaardkeuze bij een nieuw item:** de hoogste optie die de persoon mag gebruiken, behalve *Samen*. Ieder kan in de eigen instellingen kiezen voor "Nieuwe items standaard: Alleen ik". Dat komt in `AccountSettings.visibility.defaultPrivate`, persoonlijk en niet per huishouden.

## Geld: van wie, en wat privé blijft

Potten, vaste lasten en het plan blijven van het huishouden, want "eerst verdelen" werkt alleen als al het geld in beeld is. Nieuw is **van wie** het geld is, volgens het bekende model *van mij, van jou, van ons*:

| Tabel | Nieuw veld | Keuze in het formulier | Waarvoor |
| --- | --- | --- | --- |
| `bank_account` | houder (`account`) | Van [naam] · Gezamenlijk | de basis; een persoonlijke rekening kan privé zijn |
| `income_source` | verdiener (`account`) | Van [naam] · Van ons beiden | inkomen per persoon, en wie wat bijdraagt |
| `transaction` | `account` + `visibility`, overgenomen van de rekening; los daarvan `paidBy` | **Betaald door:** [naam] · Gezamenlijk; standaard de houder van de rekening | uitgaven per persoon; wie het deed, ook op een gezamenlijke rekening |
| `fixed_cost` | voor wie (`account`, optioneel) | Huishouden · Voor [naam] | alleen toerekening; altijd zichtbaar, want het is een vaste verplichting |
| `jar`, `category`, `goal`, plan | — | — | blijft van het huishouden |

*Gezamenlijk* en *Van ons beiden* zijn *samen* in het model: `account = null`.

**Wanneer "van wie" verschijnt.** Houder, verdiener, "voor wie" en *Betaald door* staan alleen in beeld als het huishouden **Plus of hoger** heeft **én meer dan één deelnemer** (OWNER of MEMBER, geen `EXTERNAL`). Bij één deelnemer is "van wie" altijd dezelfde persoon, dus zijn de velden en filters weg. Eén helper in contracts beslist dit voor UI en backend: `attributionEnabled({ plan, participantCount })`.

- **Verborgen betekent niet weg.** Vertrekt de tweede deelnemer of gaat het huishouden naar Basic, dan blijven de waarden bewaard maar worden ze niet getoond of gefilterd. Komt er weer iemand bij, of gaat het huishouden weer naar Plus, dan zijn ze terug.
- **Betaald door is toerekening, geen zichtbaarheid.** `paidBy` bepaalt niet wie een transactie ziet; dat doet de rekening (`account` + `visibility`). Zo kan "Sam deed de boodschappen" op een gezamenlijke rekening staan zonder iets privé te maken.
- **Als de betaler vertrekt,** wordt `paidBy` `null` (*Gezamenlijk*, `deleteRule: 'set null'`). De transactie zelf blijft, want het is huishoudgeld.
- **De backend weigert** `paidBy`, houder en verdiener in een create of update als `attributionEnabled` onwaar is. Een oude client kan zo niets zetten wat de gebruiker niet ziet.

Er komen twee onderdelen bij (zie ook de tabel bij "Per onderdeel"):

| Onderdeel | Tabellen | Standaard | Waarom |
| --- | --- | --- | --- |
| `money.income`: Inkomen per persoon | `income_source` | volgt het huishouden | samen verdelen vraagt dat je weet wat er binnenkomt |
| `money.personal`: Persoonlijke rekeningen en uitgaven | `bank_account` met een houder, en de `transaction`-rijen daarop | **`SEPARATE`**, gevoelig | eigen ruimte: wat je met je eigen geld doet, is van jou |

**Totalen tellen altijd mee.** Potten, maandscore en overzicht rekenen met alle rijen, ook de privé-rijen; anders klopt de verdeling niet. De ander ziet het totaal per pot en één regel "3 privé-uitgaven · € 84", nooit de omschrijving, de tegenpartij of de datum.

**Eerlijk over rekensommen.** Bij twee inkomens is een verborgen salaris uit het totaal af te leiden. Daarom staat bij *Alleen ik* op een inkomen: "Je bedrag telt mee in het totaal. Met twee inkomens kan de ander het uitrekenen." Wie echt eigen ruimte wil, gebruikt een persoonlijke rekening. Daarvan ziet het huishouden alleen wat in een pot wordt gesorteerd, als totaal.

**Rekening en transacties blijven gelijk.** Bij import of banksync krijgt een transactie de houder en zichtbaarheid van de rekening. Verandert de houder of zichtbaarheid van de rekening, dan past dezelfde service de transacties aan, in één database-transactie. Een gekoppelde rekening krijgt als houder wie hem koppelde, met de standaard van `money.personal`.

**Inbox en The Coach:** transacties op een privé-rekening staan alleen in de inbox van de houder, en tips daarover gaan alleen naar de houder.

## Regels die niet onderhandelbaar zijn

1. **Alleen ik kan altijd.** Geen modus en geen rol haalt *Alleen ik* weg. Ook de eigenaar ziet nooit de privé-items van een ander.
2. **Nooit met terugwerkende kracht blootleggen.** Een modus die meer toestaat verandert niets aan bestaande items. Bij een migratie van bestaande tabellen krijgen alle rijen `PRIVATE`, want zo werken die services nu al.
3. **Strenger wordt direct strenger.** De echte zichtbaarheid is `min(item.visibility, wat de modus van dat onderdeel nu toestaat voor de maker)`, berekend bij elke read. Er wordt niets herschreven, dus terugzetten herstelt de oude toestand. Bestaan er *samen*-items bij een overstap naar `SEPARATE`, dan vraagt de instelling wat ermee moet: "Behouden als alleen-lezen" (voorstel) of "Archiveren".
4. **"Delen met eigenaar" is gedeeld met een persoon, niet met een rol.** Gaat het eigenaarschap over naar iemand anders, dan worden alle `OWNER`-items `PRIVATE` en krijgen de makers één melding: "Opnieuw delen met [nieuwe eigenaar]?". Wie met Alex deelde, deelde niet met de volgende eigenaar.
5. **Ouder en kind:** in boomstructuren, zoals de cascade, is een kind nooit opener dan zijn ouder. Persoonlijke kinderen onder een *samen*-ouder mogen wel.
6. **Tellingen lekken geen inhoud.** Waar privé-items meetellen in iets gedeelds (zoals voortgang), ziet de ander alleen een aantal ("+1 privé"), nooit een naam of id. In Geld komt het bedrag mee als totaal, omdat de verdeling anders niet klopt; nooit omschrijving, tegenpartij of datum.
7. **De server filtert, nooit de client.** Wat je niet mag zien, zit niet in de response.

## Externe partijen

Er zijn twee soorten externen, en voor geen van beide geldt `HOUSEHOLD`:

| Wie | Hoe binnen | Wat ze van persoonlijke data zien |
| --- | --- | --- |
| **Stoel met relatie `EXTERNAL`** (bijv. een helper als VIEWER of MEMBER) | uitnodiging in het huishouden | **niets** persoonlijks; alleen huishouddata volgens de rolmatrix |
| **Praktijk-coach** | `PracticeClientLink`, geaccepteerd door de eigenaar | huishouddata via de toestemming van de eigenaar; **persoonlijke data alleen met toestemming van die persoon zelf** |

Mag een lid zelf met een externe partij delen? **Ja, maar alleen de eigen data, alleen met een eigen ja, en nooit via iemand anders.**

- De eigenaar accepteert de koppeling met een praktijk. Dat dekt de huishouddata en de eigen gedeelde items van de eigenaar.
- Elk lid krijgt daarna een eigen vraag: "Mag [praktijk] meekijken met jouw gedeelde items?", met een vinkje per onderdeel, gegroepeerd per portaal. Standaard staat alles uit.
- De coach ziet dan alleen de items van die persoon met `visibility ≥ HOUSEHOLD`, in onderdelen waar die persoon ja op zei en die het huishouden niet op `SEPARATE` heeft staan. *Alleen ik* en *Delen met eigenaar* nooit, want die zijn niet voor buiten bedoeld.
- Een lid kan niet zelf een praktijk koppelen. Een eigen coach voor jezelf alleen is later een eigen huishouden of een persoonlijke koppeling (buiten dit plan).
- Opslag: tabel `practice_client_consent` (`link`, `account`, `areas[]`, `grantedAt`), uniek op (`link`, `account`).

**Gecontroleerd in fase 0:** de praktijk-snapshot lekt geen data van leden. De Energie- en Ziel-services filteren op het account van de ingelogde persoon, en in een preview is dat de coach zelf. Daardoor toont de snapshot "training this week" en "stillness streak" altijd 0 of leeg (bug). Oplossen in fase 4, via `PersonalScopedRepository` en `practice_client_consent`.

## Abonnement: Plus en hoger

Delen op maat is een Plus-functie. Bescherming kost nooit iets extra.

| | Basic | Plus en Max |
| --- | --- | --- |
| Persoonlijke data (Groei, Energie, Ziel) | vast *Alleen ik*, zoals nu | keuze per item, algemene modus en per onderdeel |
| Geld | vast van het huishouden, geen "van wie", zoals nu | houder, verdiener, persoonlijke rekeningen, onderdelen `money.*` |
| Instellingen "Privacy en delen" | zichtbaar met een slotje en uitleg, niet te wijzigen | volledig |
| Privé blijft privé, externen alleen met een eigen ja, de server filtert | ja | ja |

Dat sluit aan op de plekken. Basic heeft één schrijvende plek (`maxWritableMembers: 1`) en één kijker, dus delen tussen deelnemers speelt daar pas met een extra plek. Koopt een Basic-huishouden een extra schrijvende plek, dan blijft de vaste Basic-regel gelden: ieder ziet alleen de eigen persoonlijke data.

**Capability:** `platform.sharing` in `FEATURES.platform`, toegekend in `PLUS_EXTRA`, met copy in `CAPABILITY_CATALOG`. `RequireCapability` staat op het wijzigen van `visibility` in de instellingen en op de Geld-velden voor houder en verdiener. `VisibilityService` leest het plan. Zonder `platform.sharing` is elk onderdeel `SEPARATE` en geeft `visibilityOptionsFor` alleen *Alleen ik*.

**Overstappen:**

- **Van Plus naar Basic:** niets wordt gewist en niets gaat open. Instellingen en keuzes per item blijven bewaard maar worden niet toegepast: elk onderdeel gedraagt zich als `SEPARATE` (regel 3). *Samen*-items blijven alleen-lezen zichtbaar voor deelnemers. Persoonlijke rekeningen blijven privé voor de houder.
- **Van Basic naar Plus:** de bewaarde instellingen gelden meteen weer.
- **Praktijk sponsort Plus** (toegang *Manage*): het huishouden heeft dan Plus en dus deze functies. De toestemming per persoon voor de coach geldt op elk abonnement.

## Bouwstenen

### Contracts (`packages/contracts/src/public/platform/household/visibility.ts`)

Net als `role-permissions.ts` is dit de bron van waarheid voor UI en backend:

- enums `Visibility`, `HouseholdSharingMode` en `VisibilityArea`
- `visibilityEntitled(plan)`: of het huishouden `platform.sharing` heeft; zonder is elk onderdeel `SEPARATE`
- `VISIBILITY_AREAS`: de catalogus met per onderdeel `portal`, `sensitive` en `defaultMode` (`null` = volgt het huishouden)
- `sharingModeFor(area, settings)`: de volgorde uit "Per onderdeel"
- `visibilityOptionsFor({ role, mode, participantCount })`: welke opties het formulier toont, met de modus van het onderdeel
- `effectiveVisibility(item, { makerRole, mode })`: regel 3
- `canSee(viewer, item)` en `canEdit(viewer, item)`: pure functies, volledig getest
- Zod-fragment `PersonalFields = { accountId: string | null, visibility, isMine: boolean }` dat elke persoonlijke DTO overneemt
- `HouseholdVisibilitySettings = { mode, areas: Partial<Record<VisibilityArea, HouseholdSharingMode>> }` in `HouseholdSettings` en `HouseholdSettingsPatch`, standaard `{ mode: OWNER_SEES, areas: {} }`. Een lege `areas` betekent: overal de standaard. In de patch vervangt `areas` het hele object, zodat "Terug naar standaard" een sleutel kan weghalen.

### Backend (`apps/backend/src/common/`)

- **`database/personal.entity.ts`**: `PersonalHouseholdEntity extends HouseholdEntity` met `account` (nullable, cascade), `visibility` (`NativeEnum`, standaard `PRIVATE`), index op (`household`, `account`) en de check-constraint `account IS NOT NULL OR visibility = 'HOUSEHOLD'`.
- **`household/household.context.ts`**: `HouseholdContext` krijgt `accountId`, `relation` en `source: 'SEAT' | 'PRACTICE'` (plus `practiceId`). De `household-scope.interceptor` vult ze al bij het oplossen van de rol. Een coach-preview is dan niet meer te verwarren met een VIEWER-stoel.
- **`household/personal-scoped.repository.ts`**: `PersonalScopedRepository<T extends PersonalHouseholdEntity> extends HouseholdScopedRepository<T>`, gemaakt met het onderdeel erbij: `new PersonalScopedRepository(em, GrowthCourseItem, VisibilityArea.GROWTH_COURSE)`. Het voegt bij `find`, `findOne` en `count` het zichtbaarheidsfilter toe uit de context (`scope()` wordt daarvoor `protected`). `create` zet `account` op de huidige persoon en weigert opties die `visibilityOptionsFor` niet toestaat. `assertCanEdit(entity)` is er voor updates en deletes. Daarnaast is er `countHidden(where)` voor "+1 privé".
- **`household/visibility.service.ts`**: laadt de zichtbaarheidsinstellingen één keer per request (uit `HouseholdSettings`) en de praktijktoestemmingen. `modeFor(area)` gebruikt `sharingModeFor` uit contracts. Hij bouwt het filter met dezelfde regels als `canSee`.

Het filter per kijker (vóór regel 3):

| Kijker | Ziet |
| --- | --- |
| zichzelf | alle eigen items |
| OWNER | eigen + samen + andermans `OWNER` en `HOUSEHOLD` |
| MEMBER (niet `EXTERNAL`) | eigen + samen + andermans `HOUSEHOLD` |
| VIEWER of `EXTERNAL` | geen persoonlijke items; samen-items alleen als de rolmatrix het portaal toestaat |
| praktijk | samen-items + `HOUSEHOLD`-items van personen die toestemming gaven voor dat portaal |

### App (`apps/application`)

- **`_components/features/household/visibility-picker.tsx`**: een segmentkeuze die zijn opties uit `visibilityOptionsFor` haalt, met de naam van de eigenaar in het label en één regel uitleg eronder. Dit hoort niet in `@rumtelo/ui`, omdat het huishoudcontext nodig heeft.
- **`visibility-badge.tsx`**: mono-label met icoon (`ALLEEN IK` slotje, `GEDEELD` oog, `SAMEN` twee stippen), plus de avatar van de maker bij items van een ander.
- **Instellingen:** OWNER kiest in de huishoudinstellingen onder "Privacy en delen" de algemene modus en eventueel per onderdeel een andere (zie "Per onderdeel"). Ieder kiest de eigen standaard in de accountinstellingen. Leden zien alles alleen-lezen, met per onderdeel wat dat voor hen betekent ("Slaap en training: alleen voor jezelf").
- **Weergavefilter** *Ik · Iedereen · [naam]* op lijstpagina's met persoonlijke data. Dit filtert alleen; het staat in de URL en per persoon in `localStorage`.
- **Teksten:** `packages/i18n/translations/features/household.ts`, Engels eerst, dan Nederlands.

## Welke tabellen het krijgen

| Tabel | Nu | Wordt |
| --- | --- | --- |
| `growth_course_item` (nieuw) | — | eerste gebruiker; *Samen* toegestaan |
| `growth_week_check_entry` (nieuw) | — | persoonlijk; in de weekcheck zichtbaar volgens dezelfde regels |
| `learn_focus`, `learn_progress`, `learn_book` | filter `account = ik` | persoonlijk, migratie op `PRIVATE` |
| `energy_log`, `time_entry`, `time_template` | eigen rijen; de weeksamenvatting telt per lid | persoonlijk, migratie op `PRIVATE`; de samenvatting toont per lid alleen zichtbare rijen, de rest als "privé" |
| `gratitude` | filter `account = ik` | persoonlijk, migratie op `PRIVATE` |
| `coach_message`, `account_settings`, `device` | per persoon | **altijd privé**, geen keuze (geen `PersonalHouseholdEntity`) |
| `bank_account`, `income_source`, `transaction` | huishouden | **houder of verdiener + zichtbaarheid** (Plus+); migratie: `account = null`, dus *gezamenlijk*, en daarmee zichtbaar zoals nu |
| `fixed_cost` | huishouden | optioneel "voor wie", altijd zichtbaar |
| `jar`, `category`, `goal`, plan | huishouden | **blijft huishouden** |

## Fasering en acceptatiecriteria

### Fase 0: platform

- [x] `visibility.ts` in contracts met unit-tests voor elke rol × modus × relatie × bron
- [x] `VISIBILITY_AREAS` met standaarden; tests voor `sharingModeFor` (keuze per onderdeel wint, gevoelig blijft dicht bij een open algemene modus, lege `areas` = standaard)
- [x] `HouseholdVisibilitySettings` in de settings-DTO's en het jsonb-veld `visibility` op `HouseholdSettings`
- [x] `HouseholdContext` uitbreiden; interceptor vult `accountId`, `relation`, `source`
- [x] Capability `platform.sharing` in `FEATURES.platform` en `PLUS_EXTRA`, copy in `CAPABILITY_CATALOG`; `VisibilityService` valt zonder terug op `SEPARATE`
- [x] `PersonalHouseholdEntity`, `PersonalScopedRepository`, `VisibilityService`
- [x] Praktijk-snapshot controleren op persoonlijke data van leden
- [x] Regels toevoegen aan `backend-module-shape.mdc`: persoonlijke data → `PersonalHouseholdEntity`; geen eigen `account = ik`-filters meer

Klaar als: in een testhuishouden met OWNER, MEMBER, VIEWER, een `EXTERNAL`-stoel en een praktijk elke kijker precies de rijen uit de tabel hierboven terugkrijgt, ook als OWNER. Na een overstap van Plus naar Basic ziet niemand meer dan daarvoor.

### Fase 1: Groei-cascade

- [x] `growth_course_item` op `PersonalHouseholdEntity`
- [x] `VisibilityPicker` en `VisibilityBadge`; instellingen voor de algemene modus en "Per onderdeel"
- [ ] Eigen standaard per persoon (`AccountSettings.visibility.defaultPrivate`)

### Fase 2: bestaande persoonlijke tabellen

- [ ] Leer, Energie en Ziel naar `PersonalHouseholdEntity`, migratie op `PRIVATE`, eigen filters weg
- [ ] Keuze in hun formulieren waar delen zinvol is (Leer-focus, training, dankbaarheid)

Klaar als: voor bestaande gebruikers niets verandert tot ze zelf iets delen.

### Fase 3: Geld

- [ ] `attributionEnabled({ plan, participantCount })` in contracts, met tests (Basic, Plus solo, Plus met twee deelnemers, `EXTERNAL` telt niet mee)
- [ ] Houder op `bank_account`, verdiener op `income_source`, `account` + `visibility` + `paidBy` op `transaction`; migratie op *gezamenlijk*
- [ ] *Betaald door* in het transactieformulier en als filter in Uitgaven, alleen als `attributionEnabled`
- [ ] Onderdelen `money.income` en `money.personal`; transacties volgen de rekening
- [ ] Potten, maandscore en overzicht rekenen met alle rijen; regel "N privé-uitgaven · € X" per pot
- [ ] Inbox en The Coach respecteren privé-rekeningen
- [ ] "Voor wie" op `fixed_cost`

Klaar als: een uitgave op een privé-rekening die in een pot is gesorteerd het pottotaal voor iedereen verandert, maar alleen bij de houder met omschrijving zichtbaar is.

### Fase 4: externen

- [ ] `practice_client_consent` en de vraag per lid na acceptatie van een koppeling
- [ ] Praktijk-preview en snapshot lezen via `PersonalScopedRepository`
- [ ] Overdracht van eigenaarschap zet `OWNER`-items op `PRIVATE` en stuurt de melding

## Open vragen

- [x] Standaardmodus voor nieuwe huishoudens: `OWNER_SEES`.
- [x] Eén modus of per portaal? Per onderdeel, met standaarden van Rumtelo (zie "Per onderdeel").
- [ ] `energy_log` als één onderdeel (voorstel voor v1), of per meting (slaap, training, voeding, hoofd apart)? Per meting vraagt een onderdeel dat uit een kolom komt in plaats van uit de tabel.
- [ ] Welke onderdelen zijn nog meer gevoelig? Voorstel: alleen `energy.log`. Dankbaarheid en tijdsbesteding volgen het huishouden.
- [ ] Mag ieder lid voor zichzelf per onderdeel een strengere standaard kiezen (bijv. "Leren: standaard alleen ik"), of alleen één persoonlijke standaard voor alles (voorstel)?
- [ ] Mag een MEMBER in `OWNER_SEES` *samen*-items bijwerken (voorstel), of alleen afvinken?
- [ ] Ziet een MEMBER de modus alleen, of kan die een verzoek sturen om hem te veranderen?
- [ ] Praktijktoestemming per portaal (voorstel) of per item?
- [ ] *Samen*-items bij overstap naar `SEPARATE`: alleen-lezen behouden (voorstel) of archiveren?
- [x] `platform.sharing` zit in Plus en Max.
- [ ] Persoonlijke rekening: tellen uitgaven daarop alleen mee als ze in een pot zijn gesorteerd (voorstel), of staat zo'n rekening helemaal buiten het plan?
- [x] *Betaald door*: ja, alleen bij Plus of hoger en meer dan één deelnemer (zie "Wanneer 'van wie' verschijnt").
