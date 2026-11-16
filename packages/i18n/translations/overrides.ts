/**
 * Manual corrections applied after machine translation (`pnpm i18n:gen`).
 *
 * Same idea as Galighticus: `languages/*.json` is generated output. A wrong
 * DeepL word is fixed here, keyed by locale and dot path. The generator
 * writes these values into `languages/<locale>.json`. Cached translations
 * are reused, so editing this file does not spend DeepL quota on unchanged
 * English.
 *
 * This file lives outside `pages/`, `common/`, `ui/` and `features/`, so it
 * is never treated as English source text.
 */
export const TRANSLATION_OVERRIDES: Readonly<Record<string, Readonly<Record<string, string>>>> = {
    nl: {
        // Koers is a planner, not a calendar — never "agendapunt".
        'common.message.error.api.course_item_not_found':
            'Dit onderdeel van je planning bestaat niet meer',
        'common.message.error.api.course_period_full':
            'Vijf is hier het maximum. Rond er eerst één af, verplaats er één of laat er één los.',
        'common.message.error.api.course_scope_invalid':
            'Alleen een jaar-, kwartaal- of maanddoel kan persoonlijk of zakelijk zijn',
        // Course = "Koers" (rumbo), never "Cursus".
        'pages.nav.children.course': 'Koers',
        'pages.meta.course': 'Koers',
        'features.capabilities.growth-course.name': 'Koers',
        'features.growth.course.eyebrow': 'Groei · Koers',
        'features.growth.course.hub_card': 'Koers',
        // Course: Today · Week · Goals; badges Focus · Gewoonte · Discipline · Check · Advies.
        'features.growth.course.tab_today': 'Vandaag',
        'features.growth.course.tab_week': 'Week',
        'features.growth.course.tab_goals': 'Doelen',
        'features.growth.course.title_today': 'Vandaag',
        'features.growth.course.lead_today':
            'Wat er vandaag staat: je 3, je routines en de checks.',
        'features.growth.course.title_week': 'Deze week',
        'features.growth.course.lead_week': 'Je 3, je routines en de checks van deze week.',
        'features.growth.course.title_goals': 'Jouw {year}',
        'features.growth.course.section_checks': 'Checks',
        'features.growth.course.section_focus_week': 'Jouw 3 voor deze week',
        'features.growth.course.section_focus_day': 'Jouw 3 voor vandaag',
        'features.growth.course.section_routines': 'Je routines',
        'features.growth.course.section_routines_today': 'Routines vandaag',
        'features.growth.course.section_advice': 'Advies',
        'features.growth.course.today_empty_focus': 'Nog niets gekozen voor deze week.',
        'features.growth.course.today_choose_3': 'Kies je 3',
        'features.growth.course.day_prev': 'Vorige dag',
        'features.growth.course.day_next': 'Volgende dag',
        'features.growth.course.week_prev': 'Vorige week',
        'features.growth.course.week_next': 'Volgende week',
        'features.growth.course.back_to_today': 'Vandaag',
        'features.growth.course.back_to_this_week': 'Deze week',
        'features.growth.course.lane.HABIT': 'Gewoonte',
        'features.growth.course.lane.DISCIPLINE': 'Discipline',
        'features.growth.course.lane.CHECK': 'Check',
        'features.growth.course.rhythm.kind_HABIT': 'Gewoonte',
        'features.growth.course.rhythm.rule':
            'Een routine neemt nooit één van je 3 in. Een discipline telt en vult de stap erboven; een gewoonte vraagt alleen “gedaan?”.',
        'features.growth.course.rhythm.form.kind_HABIT_hint':
            'Klein en vaak. Geen teller: gedaan of niet.',
        'features.growth.course.rhythm.form.kind_DISCIPLINE_hint':
            'Telbaar, zoals 3× per week. Vult de stap erboven.',
        'features.growth.course.week_check.open_today': 'Open Vandaag',
        'features.growth.course.week_check.rhythm_open': 'Open de week',
        'features.growth.course.week_check.done_lead':
            'Je 3 voor {week} staan. Vandaag laat zien wat er elke dag staat.',
        'features.growth.course.home_card.open': 'Open Koers',
        'features.growth.course.home_card.next_check': 'Volgende: {check} · {when}',
        'features.growth.course.week_check_cta': 'Weekcheck',
        'features.growth.course.lane.FOCUS': 'Focus',
        'features.growth.course.lane.ADVICE': 'Advies',
        'features.growth.course.form.target_count': 'Hoe vaak?',
        'features.growth.course.form.target_count_hint':
            'Voor een telbare stap, zoals "12 trainingen". Vinkjes van de routines eronder vullen de ring.',
        'features.growth.course.rhythm.empty_body':
            'Voeg er één toe die je wilt volhouden, zoals "Trainen 3× per week" onder "12 trainingen deze maand".',
        'features.growth.course.rhythm.add': 'Routine toevoegen',
        'features.growth.course.rhythm.kind_DISCIPLINE': 'Discipline',
        'features.growth.course.rhythm.pattern_daily': 'Elke dag',
        'features.growth.course.rhythm.pattern_weekly': '{count}× per week',
        'features.growth.course.rhythm.pattern_monthly': '{count}× per maand',
        'features.growth.course.rhythm.paused': 'Gepauzeerd',
        'features.growth.course.rhythm.private_parent': 'Privé doel',
        'features.growth.course.rhythm.action_focus': 'Maak er deze week één van mijn 3 van',
        'features.growth.course.rhythm.action_pause': 'Pauzeren',
        'features.growth.course.rhythm.action_resume': 'Hervatten',
        'features.growth.course.rhythm.action_stop': 'Stoppen',
        'features.growth.course.rhythm.count_week': '{done} van {total} deze week',
        'features.growth.course.rhythm.count_month': '{done} van {total} deze maand',
        'features.growth.course.rhythm.suggest_eyebrow': 'Nieuwe week',
        'features.growth.course.rhythm.suggest_title': 'Deze doorzetten?',
        'features.growth.course.rhythm.suggest_lead': 'Er wordt niets gekopieerd zonder jouw ja.',
        'features.growth.course.rhythm.suggest_keep':
            '{name}: {done} van {total} in {period}. Doorgaan met {pattern}?',
        'features.growth.course.rhythm.suggest_renew':
            '"{name}" hoorde bij {from}. Opnieuw zetten voor {to}?',
        'features.growth.course.rhythm.keep_going': 'Doorgaan',
        'features.growth.course.rhythm.smaller': 'Kleiner ({count}×)',
        'features.growth.course.rhythm.renew': 'Opnieuw zetten',
        'features.growth.course.rhythm.renew_with_count': 'Opnieuw zetten ({count}×)',
        'features.growth.course.rhythm.not_now': 'Niet nu',
        'features.growth.course.rhythm.stopped_toast': 'Gestopt. Eerdere vinkjes tellen nog mee.',
        'features.growth.course.rhythm.focus_toast': 'Toegevoegd aan je 3 voor deze week',
        'features.growth.course.rhythm.hub_card': 'Ritme',
        'features.growth.course.rhythm.hub_note': 'routines vandaag',
        'features.growth.course.rhythm.form.title_create': 'Nieuwe routine',
        'features.growth.course.rhythm.form.title_edit': 'Routine bewerken',
        'features.growth.course.rhythm.form.description':
            'Een patroon dat je volhoudt. Het vult nooit één van je 3.',
        'features.growth.course.rhythm.form.cadence': 'Telt per',
        'features.growth.course.rhythm.form.cadence_DAILY': 'Dag',
        'features.growth.course.rhythm.form.cadence_WEEKLY': 'Week',
        'features.growth.course.rhythm.form.cadence_MONTHLY': 'Maand',
        'features.growth.course.rhythm.form.target': 'Keer',
        'features.growth.course.week_check.title': 'Weekcheck',
        'features.growth.course.week_check.lead':
            'Tien minuten: terugkijken, je routines vasthouden, je 3 zetten voor {week}.',
        'features.growth.course.week_check.step_back': 'Terugblik',
        'features.growth.course.week_check.step_rhythm': 'Routines',
        'features.growth.course.week_check.step_ahead': 'Jouw 3',
        'features.growth.course.week_check.step_done': 'Klaar',
        'features.growth.course.week_check.back_lead':
            'Markeer ze één voor één. Niet gelukt is een feit: schuif door of laat los.',
        'features.growth.course.week_check.rhythm_lead':
            'Doorgaan, kleiner maken of pauzeren. Niets herhaalt zonder jouw ja.',
        'features.growth.course.week_check.ahead_title': 'Jouw 3 voor {week}',
        'features.growth.course.week_check.finish': 'Weekcheck afronden',
        'features.growth.course.week_check.done_toast': 'Weekcheck klaar',
        'features.growth.course.week_check.done_title': 'Klaar. Tot volgende week zondag.',
        'features.growth.course.entry.growth_week_check': 'Groei-weekcheck',
        'features.growth.course.entry.money_week_check': 'Geld-weekcheck',
        'features.growth.course.entry.month_close': 'Maand afsluiten: {month}',
        'features.growth.course.entry.month_close_reminder': 'Plan je maandafsluiting: {month}',
        'features.growth.course.entry.month_close_reminder_lead':
            'Uiterlijk {date}. Kies er een moment voor.',
        'features.growth.course.entry.month_close_due_lead': 'Vandaag is de laatste dag.',
        'features.growth.course.entry.month_close_overdue': '{month} staat nog open',
        'features.growth.course.entry.month_close_overdue_lead':
            'Hij blijft hier staan tot je hem afsluit.',
        'features.growth.course.entry.sleep': 'Slaap: {hours} u gepland',
        'features.growth.course.entry.sleep_advice': 'Advies {low}–{high} u.',
        'features.growth.course.entry.sleep_under': 'Iets onder het advies van {low}–{high} u.',
        'features.growth.course.entry.snooze': 'Niet nu',
        'features.growth.course.entry.snoozed_toast': 'Herinnering verplaatst naar de laatste dag',
        'features.growth.course.calendar_hint': 'Wil je dit in Google, Apple of Outlook?',
        'features.growth.course.calendar_link': 'Spiegel het naar je agenda',
        'features.growth.course.home_card.eyebrow': 'Vandaag',
        'features.growth.course.home_card.check_GROWTH_WEEK_CHECK': 'Weekcheck',
        'features.growth.course.home_card.check_MONEY_WEEK_CHECK': 'Geld-check',
        'features.growth.course.home_card.check_MONTH_CLOSE': 'Maandafsluiting',
        'features.growth.course.home_card.sleep': 'Slaap {hours} u',
        'features.growth.course.home_card.today': 'vandaag',
        'pages.meta.course_week_check': 'Weekcheck',
        'pages.settings.panels.course_calendar.eyebrow': 'Jouw agenda',
        'pages.settings.panels.course_calendar.blurb':
            'Spiegel Koers naar Google, Apple of Outlook. Eén richting: afvinken doe je in Rumtelo, je agenda laat het zien.',
        'pages.settings.panels.course_calendar.add_google': 'Toevoegen aan Google',
        'pages.settings.panels.course_calendar.add_apple': 'Toevoegen aan Apple Agenda',
        'pages.settings.panels.course_calendar.add_outlook': 'Toevoegen aan Outlook',
        'pages.settings.panels.course_calendar.source_rituals_title':
            'Weekchecks en maandafsluiting',
        'pages.settings.panels.course_calendar.lead_label': 'Herinnering maandafsluiting',
        'pages.settings.panels.course_calendar.lead_same_day': 'Op de laatste dag',
        'pages.settings.panels.course_calendar.lead_days': '{count} dagen ervoor',
        'pages.settings.panels.course_calendar.lead_hint':
            '"Niet nu" verplaatst hem naar de laatste dag. Daarna blijft hij staan tot de maand is afgesloten.',
        'pages.settings.panels.course_calendar.rotate': 'Nieuw adres',
        'pages.settings.panels.course_calendar.disable': 'Uitzetten',
        'pages.settings.panels.course_calendar.enable': 'Aanzetten',
        // Schedule = "Schema", never "Rooster" or "Agenda".
        'pages.settings.panels.course_layers.eyebrow': 'Lagen in Koers',
        'pages.settings.panels.course_layers.blurb':
            'Koers toont doelen, maand en week. Zet meer stappen aan als je zo wilt plannen. Uitzetten verbergt alleen; er wordt niets verwijderd.',
        'pages.settings.panels.course_layers.saved': 'Lagen in Koers opgeslagen',
        'features.growth.course.carried': '{count}× doorgeschoven',
        'features.growth.course.status.DEFERRED': 'Doorgeschoven',
        'features.growth.course.action_carry': 'Doorschuiven naar volgende {layer}',
        'features.growth.course.carried_toast': 'Doorgeschoven naar volgende {layer}',
        'features.growth.course.leftover_eyebrow': 'Nog open',
        'features.growth.course.leftover_title': 'Niet af in {period}',
        'features.growth.course.leftover_lead':
            '{count, plural, one {# item uit de vorige {layer} staat nog open.} other {# items uit de vorige {layer} staan nog open.}} Vink af, schuif door naar hier, of laat los.',
        'features.growth.course.leftover_carry': 'Naar hier',
        'features.growth.course.leftover_drop': 'Loslaten',
        'features.growth.course.visibility.PRIVATE': 'Alleen ik',
        'features.growth.course.visibility.badge_PRIVATE': 'Alleen ik',
        'features.growth.course.visibility.SHARED': 'Samen',
        'features.growth.course.visibility.badge_SHARED': 'Samen',
        'features.growth.course.visibility.OWNER': 'Delen met {owner}',
        'features.growth.course.visibility.HOUSEHOLD': 'Hele huishouden',
        'pages.settings.panels.sharing.modes.SEPARATE.name': 'Ieder apart',
        'pages.settings.panels.sharing.modes.OWNER_SEES.name': 'Eigenaar kijkt mee',
        'pages.settings.panels.sharing.modes.TOGETHER.name': 'Samen',
        'pages.settings.panels.sharing.eyebrow': 'Privacy en delen',
        'features.growth.course.tabs_aria': 'Laag in Koers',
        'features.growth.course.section_mine': 'Van jou',
        'features.growth.course.link_to_goal': 'Koppel aan een doel',
        'features.growth.course.private_parent': 'Privé doel',
        'features.growth.course.children_title': 'Hieronder',
        'features.growth.course.status.OPEN': 'Open',
        'features.growth.course.status.MISSED': 'Niet gelukt',
        'features.growth.course.status.DROPPED': 'Losgelaten',
        'features.growth.course.status.PARTIAL': 'Deels',
        'features.growth.course.action_partial': 'Deels gelukt',
        'features.growth.course.action_missed': 'Niet gelukt',
        'features.growth.course.action_drop': 'Loslaten',
        'features.growth.course.empty_slot_week': 'Wat is een van je 3 voor deze week?',
        'features.growth.course.empty_slot_day': 'Wat is een van je 3 voor vandaag?',
        'features.growth.course.focus_beyond':
            'Drie is de ideale hoeveelheid, maar {count} is prima.',
        'features.growth.course.focus_full':
            'Meer past er niet. Rond er eerst één af of laat er één los.',
        'features.growth.course.money_shared_note':
            'Een gekoppeld Geld-doel wordt gedeeld met het huishouden.',
        'features.growth.course.form.title_create_goal': 'Nieuw doel',
        'features.growth.course.form.scope': 'Persoonlijk of zakelijk?',
        'features.growth.course.form.scope_none': 'Niet ingesteld',
        'features.growth.course.goal.count': '{count, plural, one {# doel} other {# doelen}}',
        'features.growth.course.goal.add_goal': 'Doel',
        'features.growth.course.goal.add_goal_aria': 'Een doel toevoegen',
        'features.growth.course.goal.add_goal_amount': 'Doel met een bedrag',
        'features.growth.course.goal.list_aria': 'Doelen voor {year}',
        'features.growth.course.goal.empty_title': 'Nog geen doelen',
        'features.growth.course.goal.empty_body':
            'Begin met één ding dat je dit jaar wilt. De stappen en weken volgen.',
        'features.growth.course.goal.loose_title': 'Losse stappen · {month}',
        'features.growth.course.goal.summary_steps': 'Stappen deze maand',
        'features.growth.course.goal.summary_focus': 'Focus deze week',
        'features.growth.course.goal.summary_needing': 'Doelen die een stap nodig hebben',
        'features.growth.course.goal.ring_aria': '{name}: {percent}% klaar',
        'features.growth.course.goal.no_step_yet': 'Nog geen stap in {month}',
        'features.growth.course.goal.step_more': '+{count} meer',
        'features.growth.course.goal.money_no_steps': 'Nog geen stappen',
        'features.growth.course.goal.add_step': 'Stap',
        'features.growth.course.goal.scope_PERSONAL': 'Persoonlijk',
        'features.growth.course.goal.scope_BUSINESS': 'Zakelijk',
        'features.growth.course.goal.done_when': 'Klaar als',
        'features.growth.course.goal.timeline_aria': 'Maanden van {year}: waar een stap gepland is',
        'features.growth.course.goal.timeline_step': 'stap gepland',
        'features.growth.course.goal.timeline_no_step': 'nog geen stap',
        'features.growth.course.goal.steps_title': 'Stappen in {month}',
        'features.growth.course.goal.week_title': 'Deze week',
        'features.growth.course.goal.routines_title': 'Routines',
        'features.growth.course.goal.plan_steps': 'Stappen plannen',
        'features.growth.course.goal.add_to_week': 'Toevoegen aan deze week',
        'features.growth.course.goal.step_for': 'Stap voor {month}',
        'features.growth.course.goal.money_title': 'Geld-doel',
        'features.growth.course.goal.money_saved': '{saved} van {target}',
        'features.growth.course.goal.money_lands': 'Rond {date} gehaald, in het huidige tempo.',
        'features.growth.course.form.parent': 'Hoort bij',
        'features.growth.course.form.parent_none': 'Nergens bij, staat op zichzelf',
        'features.growth.course.form.money_goal_none': 'Geen Geld-doel',
        'features.growth.course.form.money_goal': 'Geld-doel',
        'features.growth.course.form.name_hint': 'Korte titel — die zie je op de kaart.',
        'features.growth.course.form.done_when': 'Hoe weet je dat het klaar is?',
        'features.growth.course.form.done_when_hint':
            'Het resultaat of bewijs. De deadline is de periode hierboven — geen aparte datum.',
        'pages.settings.panels.sharing.owner_only':
            'Alleen de eigenaar van het huishouden kan dit wijzigen.',
        'pages.settings.panels.sharing.areas.growth_course': 'Doelen in Koers',
        'pages.settings.panels.sharing.areas.energy_log':
            'Energiemetingen (slaap, training, voeding)',
        'pages.settings.panels.sharing.saved': 'Delen opgeslagen',
        'pages.settings.panels.sharing.areas_title': 'Per onderdeel',
        'pages.settings.panels.sharing.areas_reset': 'Terug naar standaard',
        'pages.settings.panels.sharing.area_custom': 'Aangepast',
        'pages.settings.panels.course_layers.quarters_title': 'Kwartaalstap',
        'pages.settings.panels.course_layers.days_sub': 'Een top 3 voor elke dag onder je week.',
        'features.capabilities.growth-course.description':
            'Jouw 3 voor deze week, gekoppeld aan de maand en het doel waar ze bij horen. Plus en Max.',
        'features.capabilities.platform-sharing.description':
            'Kies per item wie het ziet, bepaal wat leden mogen delen en zie van wie welk geld is. Plus en Max.',
        // Plan your year: goal presets (Koers).
        'features.growth.course.preset.run_10k.name': 'Een 10 km lopen',
        'features.growth.course.preset.run_10k.doneWhen': 'Ik heb 10 km non-stop gelopen',
        'features.growth.course.preset.run_10k.firstStep': 'Twee keer rustig 3 km lopen',
        'features.growth.course.preset.run_10k.rhythm': '3× per week hardlopen',
        'features.growth.course.preset.sleep_7h.name': 'Minstens 7 uur slapen',
        'features.growth.course.preset.sleep_7h.doneWhen':
            'De meeste nachten slaap ik minstens 7 uur',
        'features.growth.course.preset.sleep_7h.firstStep':
            'Kies een vaste bedtijd en probeer die een week',
        'features.growth.course.preset.sleep_7h.rhythm': 'Op tijd het licht uit',
        'features.growth.course.preset.weekly_date.name': 'Elke week een date',
        'features.growth.course.preset.weekly_date.doneWhen': 'We hebben elke week een date',
        'features.growth.course.preset.weekly_date.firstStep':
            'Plan de eerste twee dates in je agenda',
        'features.growth.course.preset.weekly_date.rhythm': 'Date night',
        'features.growth.course.preset.family_time.name': 'Tijd voor familie beschermen',
        'features.growth.course.preset.family_time.doneWhen':
            'Tijd voor familie is een vast deel van mijn week',
        'features.growth.course.preset.family_time.firstStep':
            'Kies deze maand één vast moment voor familie',
        'features.growth.course.preset.family_time.rhythm': 'Tijd voor familie',
        'features.growth.course.preset.read_12_books.name': '12 boeken lezen',
        'features.growth.course.preset.read_12_books.doneWhen': 'Ik heb 12 boeken uitgelezen',
        'features.growth.course.preset.read_12_books.firstStep':
            'Kies je eerste boek en lees het eerste hoofdstuk',
        'features.growth.course.preset.read_12_books.rhythm': '10 minuten lezen',
        'features.growth.course.preset.learn_language.name': 'Een taal leren',
        'features.growth.course.preset.learn_language.doneWhen':
            'Ik kan een gesprek van 10 minuten voeren',
        'features.growth.course.preset.learn_language.firstStep':
            'Kies een taal, een methode en een eerste les',
        'features.growth.course.preset.learn_language.rhythm': '3× per week oefenen',
        'features.growth.course.preset.emergency_buffer.name': 'Een noodbuffer opbouwen',
        'features.growth.course.preset.emergency_buffer.doneWhen':
            'De buffer staat in mijn potje Lange termijn',
        'features.growth.course.preset.emergency_buffer.firstStep':
            'Bepaal het bedrag en stel de maandelijkse overboeking in',
        'features.growth.course.preset.pay_off_debt.name': 'Een schuld aflossen',
        'features.growth.course.preset.pay_off_debt.doneWhen': 'De schuld is afgelost',
        'features.growth.course.preset.pay_off_debt.firstStep':
            'Zet de schuld, de rente en de maandelijkse aflossing op een rij',
        'features.growth.course.preset.holiday.name': 'Sparen voor een vakantie',
        'features.growth.course.preset.holiday.doneWhen':
            'De vakantie is betaald voordat ik vertrek',
        'features.growth.course.preset.holiday.firstStep':
            'Kies waar en wanneer, en bepaal het bedrag',
        'features.growth.course.preset.gratitude_routine.name':
            'Elke dag een moment van dankbaarheid',
        'features.growth.course.preset.gratitude_routine.doneWhen':
            'Ik neem op de meeste dagen een moment van dankbaarheid',
        'features.growth.course.preset.gratitude_routine.firstStep':
            'Schrijf vanavond drie dingen op waar je dankbaar voor bent',
        'features.growth.course.preset.gratitude_routine.rhythm': 'Moment van dankbaarheid',
        'features.growth.course.preset.raise_income.name': 'Mijn inkomen verhogen',
        'features.growth.course.preset.raise_income.doneWhen':
            'Mijn netto maandinkomen heeft het doel bereikt',
        'features.growth.course.preset.raise_income.firstStep':
            'Schrijf je huidige inkomen en het doel op',
        'features.growth.course.preset.new_clients.name': 'Nieuwe klanten winnen',
        'features.growth.course.preset.new_clients.doneWhen':
            'Ik heb het aantal nieuwe klanten gehaald dat ik wilde',
        'features.growth.course.preset.new_clients.firstStep':
            'Zet 10 mensen of bedrijven op een rij waarmee je wilt werken',
        'features.growth.course.preset.new_clients.rhythm': '2 prospects benaderen',
        'features.growth.course.preset.promotion_raise.name':
            'Voor een promotie of loonsverhoging gaan',
        'features.growth.course.preset.promotion_raise.doneWhen':
            'Ik heb het gesprek gevoerd en ken de uitkomst',
        'features.growth.course.preset.promotion_raise.firstStep':
            'Schrijf je resultaten van het afgelopen jaar op',
        'features.growth.course.preset.promotion_raise.rhythm': 'Bijpraten met je leidinggevende',
        'features.growth.course.preset.find_work.name': 'Werk vinden',
        'features.growth.course.preset.find_work.doneWhen':
            'Ik ben gestart met een baan of opdracht die past',
        'features.growth.course.preset.find_work.firstStep':
            'Werk je cv bij en zet 10 plekken om te solliciteren op een rij',
        'features.growth.course.preset.find_work.rhythm':
            '3× per week solliciteren of contact zoeken',
        'features.growth.course.preset.learn_work_skill.name': 'Een vaardigheid voor werk leren',
        'features.growth.course.preset.learn_work_skill.doneWhen':
            'Ik kan de vaardigheid in mijn werk gebruiken',
        'features.growth.course.preset.learn_work_skill.firstStep':
            'Kies de vaardigheid en een eerste cursus of mentor',
        'features.growth.course.preset.learn_work_skill.rhythm': '2× per week studeren',
        'features.growth.course.preset.stop_at_18.name': 'Om 18:00 stoppen met werken',
        'features.growth.course.preset.stop_at_18.doneWhen':
            'De meeste dagen ben ik om 18:00 klaar met werken',
        'features.growth.course.preset.stop_at_18.firstStep':
            'Kies een afsluitmoment en vertel het de mensen om je heen',
        'features.growth.course.preset.stop_at_18.rhythm': 'Om 18:00 klaar',
        // Plan your year (Koers).
        'features.growth.course.plan.cta': 'Plan je jaar',
        'features.growth.course.plan.close': 'Terug naar doelen',
        'features.growth.course.plan.title': 'Plan {year}',
        'features.growth.course.plan.steps_aria': 'Voortgang',
        'features.growth.course.plan.progress': 'Stap {current} van {total}',
        'features.growth.course.plan.nav_aria': 'Vorige en volgende stap',
        'features.growth.course.plan.step_now': 'Nu',
        'features.growth.course.plan.step_areas': 'Gebieden',
        'features.growth.course.plan.step_goals': 'Doelen',
        'features.growth.course.plan.step_break': 'Uitwerken',
        'features.growth.course.plan.step_save': 'Opslaan',
        'features.growth.course.plan.now_title': 'Waar sta je nu?',
        'features.growth.course.plan.now_lead':
            'Twee korte vragen, zodat de ideeën die volgen bij je leven passen. Je mag dit overslaan.',
        'features.growth.course.plan.areas_title': 'Waar wil je naar kijken?',
        'features.growth.course.plan.areas_lead':
            'Kies zoveel gebieden als je wilt. Ze bepalen alleen welke ideeën je straks ziet.',
        'features.growth.course.plan.goals_title': 'Je doelen voor {year}',
        'features.growth.course.plan.goals_lead':
            'Kies een idee of schrijf je eigen doel. Pas elk woord aan, er is nog niets opgeslagen.',
        'features.growth.course.plan.break_title': 'Uitwerken',
        'features.growth.course.plan.break_lead':
            'Eén kleine eerste stap voor {month} en, als je wilt, een routine die het gaande houdt. Beide zijn optioneel.',
        'features.growth.course.plan.save_title': 'Klaar om op te slaan?',
        'features.growth.course.plan.save_lead':
            'Dit wordt aangemaakt. Gaat er iets mis, dan blijft wat is opgeslagen staan en kun je het opnieuw proberen.',
        'features.growth.course.plan.back': 'Terug',
        'features.growth.course.plan.next': 'Volgende',
        'features.growth.course.plan.skip': 'Overslaan',
        'features.growth.course.plan.save': 'Mijn plan opslaan',
        'features.growth.course.plan.saving': 'Opslaan…',
        'features.growth.course.plan.retry': 'Opnieuw proberen',
        'features.growth.course.plan.done_toast': 'Je plan is opgeslagen',
        'features.growth.course.plan.done_amount_missed':
            'Je plan is opgeslagen. Niet elk bedrag kon worden opgeslagen; voeg die later toe bij Geld-doelen.',
        'features.growth.course.plan.work_title': 'Waar verdien je je geld mee?',
        'features.growth.course.plan.work_hint': 'Kies wat het dichtst in de buurt komt.',
        'features.growth.course.plan.work_EMPLOYED': 'In loondienst',
        'features.growth.course.plan.work_EMPLOYED_hint': 'Een baan bij een werkgever',
        'features.growth.course.plan.work_SELF_EMPLOYED': 'Zelfstandig',
        'features.growth.course.plan.work_SELF_EMPLOYED_hint':
            'Mijn eigen bedrijf of freelancewerk',
        'features.growth.course.plan.work_BOTH': 'Allebei',
        'features.growth.course.plan.work_BOTH_hint': 'Een baan en een bedrijf naast elkaar',
        'features.growth.course.plan.work_STUDENT': 'Studeren',
        'features.growth.course.plan.work_STUDENT_hint': 'Leren is nu mijn hoofdtaak',
        'features.growth.course.plan.work_SEEKING': 'Op zoek naar werk',
        'features.growth.course.plan.work_SEEKING_hint':
            'Op zoek naar een baan of een volgende stap',
        'features.growth.course.plan.intention_title': 'Wat wil je van {year}?',
        'features.growth.course.plan.intention_hint': 'Dit geeft de toon aan, het is geen regel.',
        'features.growth.course.plan.intention_CALM': 'Een rustig jaar',
        'features.growth.course.plan.intention_CALM_hint':
            'Het stabiel houden en beschermen wat werkt',
        'features.growth.course.plan.intention_GROW': 'Groeien',
        'features.growth.course.plan.intention_GROW_hint': 'Een stap verder in wat al loopt',
        'features.growth.course.plan.intention_BUILD': 'Iets nieuws bouwen',
        'features.growth.course.plan.intention_BUILD_hint':
            'Beginnen met iets wat ik nog niet deed',
        'features.growth.course.plan.intention_RECOVER': 'Op adem komen',
        'features.growth.course.plan.intention_RECOVER_hint': 'Rust na een zware periode',
        'features.growth.course.plan.intention_CALM_goals':
            'Een rustig jaar: een of twee doelen zijn ruim genoeg.',
        'features.growth.course.plan.intention_GROW_goals':
            'Een jaar van groei: kies waar je al in gelooft.',
        'features.growth.course.plan.intention_BUILD_goals':
            'Een jaar van bouwen: begin klein en maak de eerste stap makkelijk.',
        'features.growth.course.plan.intention_RECOVER_goals':
            'Een jaar om bij te komen: hou het licht, rust is ook een doel.',
        'features.growth.course.plan.group_PERSONAL': 'Persoonlijk',
        'features.growth.course.plan.group_PERSONAL_hint': 'Alleen voor jou',
        'features.growth.course.plan.group_BUSINESS': 'Zakelijk',
        'features.growth.course.plan.group_BUSINESS_hint': 'Je werk, baan of bedrijf',
        'features.growth.course.plan.area_health': 'Gezondheid & energie',
        'features.growth.course.plan.area_relationships': 'Relaties',
        'features.growth.course.plan.area_learning': 'Groei & leren',
        'features.growth.course.plan.area_freedom': 'Geld & vrijheid',
        'features.growth.course.plan.area_meaning': 'Betekenis',
        'features.growth.course.plan.area_income': 'Inkomen',
        'features.growth.course.plan.area_clients': 'Klanten & netwerk',
        'features.growth.course.plan.area_career': 'Carrière of bedrijf',
        'features.growth.course.plan.area_skills': 'Vaardigheden',
        'features.growth.course.plan.area_balance': 'Werk-privébalans',
        'features.growth.course.plan.areas_none': 'Kies minstens één gebied om verder te gaan.',
        'features.growth.course.plan.goals_prompt': 'Wat wil je eind {year} anders zien?',
        'features.growth.course.plan.goals_none':
            'Kies een idee of schrijf een eigen doel om verder te gaan.',
        'features.growth.course.plan.own': 'Schrijf mijn eigen doel',
        'features.growth.course.plan.own_hint': 'Begin met een leeg doel',
        'features.growth.course.plan.editor_name': 'Doel',
        'features.growth.course.plan.editor_done_when': 'Klaar als',
        'features.growth.course.plan.editor_done_when_hint': 'Waaraan zie je dat het klaar is?',
        'features.growth.course.plan.editor_scope': 'Dit doel is',
        'features.growth.course.plan.amount_toggle': 'Hoort er een bedrag bij?',
        'features.growth.course.plan.amount_toggle_hint': 'Het wordt een Geld-doel bij Geld.',
        'features.growth.course.plan.amount_kind_aria': 'Wat voor bedrag',
        'features.growth.course.plan.amount_kind_SAVE': 'Een bedrag om te sparen',
        'features.growth.course.plan.amount_kind_EARN': 'Een maandinkomen',
        'features.growth.course.plan.amount_save': 'Bedrag om aan het eind van het jaar te sparen',
        'features.growth.course.plan.amount_save_hint':
            'Het totaal dat je opzij wilt hebben gezet.',
        'features.growth.course.plan.amount_earn': 'Maandinkomen dat je wilt bereiken',
        'features.growth.course.plan.amount_earn_hint':
            'Je netto inkomen per maand. Het komt niet uit een potje.',
        'features.growth.course.plan.per_month': '≈ {amount} per maand tot december',
        'features.growth.course.plan.jar': 'Welk potje?',
        'features.growth.course.plan.jar_hint': 'Geplande uitgaven horen bij Lange termijn.',
        'features.growth.course.plan.jar_placeholder': 'Kies een potje',
        'features.growth.course.plan.shared_note':
            'Een doel met een bedrag deel je met je huishouden bij Geld.',
        'features.growth.course.plan.amount_locked':
            'Bedragen bij doelen horen bij een abonnement met Geld-doelen. Het doel zelf wordt wel opgeslagen.',
        'features.growth.course.plan.remove_goal': 'Dit doel verwijderen',
        'features.growth.course.plan.step_label': 'Eerste stap in {month}',
        'features.growth.course.plan.step_hint':
            'Klein genoeg om deze maand te beginnen. Laat leeg om er later een toe te voegen.',
        'features.growth.course.plan.routine_toggle': 'Een routine aanhouden',
        'features.growth.course.plan.routine_hint': 'Een patroon dat het doel levend houdt.',
        'features.growth.course.plan.routine_name': 'Routine',
        'features.growth.course.plan.routine_daily': 'Elke dag',
        'features.growth.course.plan.routine_target_WEEKLY': 'Keer per week',
        'features.growth.course.plan.routine_target_MONTHLY': 'Keer per maand',
        'features.growth.course.plan.balance_only_BUSINESS':
            '{count, plural, one {# zakelijk doel} other {# zakelijke doelen}}, niets alleen voor jezelf. Eentje toevoegen?',
        'features.growth.course.plan.balance_only_PERSONAL':
            '{count, plural, one {# persoonlijk doel} other {# persoonlijke doelen}}, niets voor je werk. Eentje toevoegen?',
        'features.growth.course.plan.balance_add': 'Terug naar de gebieden',
        'features.growth.course.plan.save_list_aria': 'Wat wordt aangemaakt',
        'features.growth.course.plan.summary_save': 'Geld-doel {amount}',
        'features.growth.course.plan.summary_earn': 'Inkomensdoel {amount} per maand',
        'features.growth.course.plan.summary_step': 'Eerste stap',
        'features.growth.course.plan.summary_routine': 'Routine',
        'features.growth.course.plan.progress_line': '{saved} van {total} doelen opgeslagen…',
        'features.growth.course.plan.partial':
            '{saved} van {total} doelen opgeslagen. Wat is opgeslagen blijft staan; probeer het opnieuw voor de rest.',
        'features.growth.course.plan.amount_missed':
            'Het doel is opgeslagen, het bedrag niet ({reason}). Je kunt het later toevoegen bij Geld-doelen.',
        'features.growth.course.plan.stage_money': 'Geld-doel',
        'features.growth.course.plan.stage_year': 'Doel',
        'features.growth.course.plan.stage_step': 'Eerste stap',
        'features.growth.course.plan.stage_routine': 'Routine',
        'features.growth.course.plan.status_pending': 'wacht',
        'features.growth.course.plan.status_working': 'bezig met opslaan',
        'features.growth.course.plan.status_done': 'opgeslagen',
        'features.growth.course.plan.status_failed': 'niet opgeslagen',
        'features.growth.course.plan.status_skipped': 'overgeslagen',
        'features.growth.course.plan.error.name_required': 'Geef het doel een naam',
        'features.growth.course.plan.error.amount_invalid': 'Vul een bedrag boven nul in',
        'features.growth.course.plan.error.jar_required': 'Kies een potje',
        'features.growth.course.plan.error.target_invalid': 'Vul een passend getal in',
        'features.growth.course.plan.error.routine_name_required': 'Geef de routine een naam',
        'pages.meta.course_plan': 'Plan je jaar',
    },
    es: {
        // Kept as translated before: the generator without a DeepL key would drop them to English.
        'common.message.error.api.course_period_full':
            'Aquí el límite es cinco. Termina uno, muévelo o déjalo ir primero.',
        'common.message.error.api.course_scope_invalid':
            'Solo un objetivo anual, trimestral o mensual puede ser personal o profesional',
    },
    fr: {
        // Kept as translated before: the generator without a DeepL key would drop them to English.
        'common.message.error.api.course_period_full':
            'Ici, on ne peut pas en avoir plus de cinq. Finis-en un, déplace-en un ou laisse-en un.',
        'common.message.error.api.course_scope_invalid':
            'Seul un objectif annuel, trimestriel ou mensuel peut être personnel ou professionnel',
    },
};
