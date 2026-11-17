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
        'features.growth.course.week_check.rhythm_open': 'Open de week',
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
        'features.growth.course.week_check.back_lead':
            'Markeer ze één voor één. Niet gelukt is een feit: schuif door of laat los.',
        'features.growth.course.week_check.rhythm_lead':
            'Doorgaan, kleiner maken of pauzeren. Niets herhaalt zonder jouw ja.',
        'features.growth.course.week_check.ahead_title': 'Jouw 3 voor {week}',
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
        'pages.settings.panels.household.remove_member': 'Verwijderen',
        'pages.settings.panels.household.remove_member_confirm':
            'Nogmaals klikken om te verwijderen',
        'pages.settings.toasts.member_removed': 'Lid verwijderd',
        'pages.settings.toasts.member_remove_failed': 'Lid verwijderen lukte niet',
        'common.message.error.api.member_not_found': 'Dit lid hoort niet meer bij dit huishouden',
        'common.message.error.api.cannot_remove_owner':
            'De eigenaar van het huishouden kun je niet verwijderen',
        'common.message.error.api.member_remove_failed':
            'Dit lid kon niet worden verwijderd. Probeer het opnieuw.',
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
        // CL-2 meaning fixes (clarity audit findings 6 and 16). Machine output changed the meaning.
        'pages.landing.hero.eyebrow': 'RUMTELO — GRIP OP JE LEVEN',
        'pages.landing.proof.jars.value': '6 potjes',
        'pages.landing.proof.jars.label': 'gevuld zodra je inkomen binnenkomt',
        'pages.landing.jars_section.eyebrow': 'DE ZES POTJES',
        'pages.landing.principles.energy.title': 'Energie draagt geld.',
        'pages.dashboard.coach.practice_pending_cta': 'Uitnodiging bekijken',
        // Approved Dutch twins from docs/brand/quotes.md.
        'pages.landing.meta.title': 'Rumtelo — Niet meer gissen waar het bleef.',
        'pages.landing.hero.headline': 'Niet meer gissen waar het bleef.',
        'pages.landing.principles.split.title': 'Eerst verdelen. Dan uitgeven.',
        'pages.landing.signup_section.headline': 'Eerst verdelen. Dan uitgeven.',
        'pages.landing.how_section.headline': 'Zes potjes. Tien minuten per week.',
        'pages.landing.why.headline': 'Jaag niet op het getal. Kies de richting.',
        'pages.landing.why.manifesto': 'Jaag niet op het getal. Kies de richting.',
        'pages.landing.why.audience': 'Voor wie het goed doet — en voor wie er klaar voor is.',
        'pages.landing.why.quote': 'Rijkdom is geen getal. Het is grip op je leven.',
        'pages.landing.coach_section.headline': 'De Coach tipt. Jij kiest.',
        'pages.landing.pricing_section.headline_practice':
            'Niet meer gissen waar je cliënten staan.',
        'pages.landing.practice_plan.line':
            'Eén bureau voor elke cliënt — sessies gaan over keuzes, niet over cijfers verzamelen.',
        'pages.landing.practice_plan.f4':
            'Tussen de sessies tipt De Coach — jij begeleidt de keuzes.',
        // Landing: meta and hero (clarity release).
        'pages.landing.meta.description':
            'Niet meer gissen waar het bleef. Je inkomen gaat zodra het binnenkomt over zes potjes. Tien minuten per week laat zien waar het bleef en wat je verschuift. De Coach tipt, jij kiest. Gemaakt in Amsterdam. Gratis om te beginnen.',
        'pages.landing.meta.keywords.0': 'geldoverzicht',
        'pages.landing.meta.keywords.1': 'zes potjes',
        'pages.landing.meta.keywords.2': 'grip op je leven',
        'pages.landing.meta.keywords.3': 'coach voor persoonlijke financiën',
        'pages.landing.meta.keywords.4': 'financiële vrijheid',
        'pages.landing.meta.keywords.5': 'weekcheck',
        'pages.landing.meta.keywords.6': 'overzicht van je geld',
        'pages.landing.meta.keywords.7': 'potjesmethode',
        'pages.landing.hero.lead':
            'Je inkomen gaat zodra het binnenkomt over zes potjes — vaste kosten, sparen, vrijheid, plezier. Tien minuten per week laat zien waar het bleef en wat je verschuift.',
        'pages.landing.hero.cta_primary': 'Verdeel mijn inkomen — gratis',
        'pages.landing.hero.cta_secondary': 'Bekijk het in 3 stappen',
        'pages.landing.hero.cta_microline': 'Geen kaart. Geen bankkoppeling nodig.',
        'pages.landing.hero.demo_coach_line':
            'Elk bedrag heeft een taak. Vandaag veilig uit te geven: €64.',
        'pages.landing.hero.demo_stage_landing': 'INKOMEN KOMT BINNEN…',
        'pages.landing.hero.demo_stage_splitting': 'VERDEELD OVER ZES POTJES…',
        'pages.landing.hero.demo_stage_complete': 'DEZE MAAND · ELK BEDRAG HEEFT EEN TAAK',
        'pages.landing.header.aria_primary': 'Hoofdmenu',
        'pages.landing.header.staging_banner_badge': 'Staging',
        'pages.landing.header.staging_banner':
            'Niet de live omgeving — gegevens hier kunnen worden gereset.',
        'pages.landing.header.staging_banner_aria': 'Melding over de staging-omgeving',
        // Landing: How it works (new section).
        'pages.landing.how_section.eyebrow': 'HOE HET WERKT',
        'pages.landing.how_section.steps_aria': 'Zo werkt Rumtelo in drie stappen',
        'pages.landing.how_section.steps.split.title': 'Inkomen binnen, geld verdeeld.',
        'pages.landing.how_section.steps.split.body':
            'Vul één keer je netto-inkomen in. Rumtelo verdeelt het over zes potjes, zodat elk bedrag een taak heeft vóór je uitgeeft.',
        'pages.landing.how_section.steps.spend.title': 'Uitgaven vinden hun potje.',
        'pages.landing.how_section.steps.spend.body':
            'Vaste kosten gaan van het juiste potje af. Aankopen komen in je Inbox; sorteer ze zelf of laat een regel het doen.',
        'pages.landing.how_section.steps.week.title': 'Tien minuten per week.',
        'pages.landing.how_section.steps.week.body':
            'De weekcheck laat zien waar het bleef en wat er over is. Verschuif één bedrag, kies je focus voor volgende week, klaar.',
        // Landing: jars, principles, why, Coach. Jar names follow the backend jar seed (jar-translations.ts).
        'pages.landing.jars_section.headline':
            'Zes taken, zodat geen enkel bedrag zelf hoeft te beslissen.',
        'pages.landing.jars_section.lead':
            'Elk potje heeft een regel die je in één zin leest: wat erin hoort en wat niet. De percentages kun je zelf aanpassen. Het gaat om de gewoonte.',
        'pages.landing.jars.nec.name': 'Noodzakelijk',
        'pages.landing.jars.nec.line':
            'Huur, energie, verzekeringen, boodschappen, vervoer. De dingen die komen, of je het nu leuk vindt of niet.',
        'pages.landing.jars.nec.not': 'Niet voor uit eten of kleding — dat is Plezier.',
        'pages.landing.jars.ff.line':
            'Indexfondsen, een aanbetaling voor een huis, je eigen bedrijf. Met dit potje koop je dingen die je iets opleveren.',
        'pages.landing.jars.ff.not': 'Nooit uitgegeven. Alleen geïnvesteerd.',
        'pages.landing.jars.edu.name': 'Opleiding',
        'pages.landing.jars.edu.line':
            'Boeken, cursussen, een mentor, een hulpmiddel waar je beter van wordt. Het enige potje waar uitgeven je meer waard maakt.',
        'pages.landing.jars.edu.not': 'Niet voor gadgets die je onderzoek noemt.',
        'pages.landing.jars.lts.name': 'Langetermijn sparen',
        'pages.landing.jars.lts.line':
            'Eerst een noodfonds, dan de auto, de borg en de belastingaanslag waarvan je weet dat die eraan komt.',
        'pages.landing.jars.lts.not': 'Niet voor iets wat je deze maand wilt.',
        'pages.landing.jars.play.line':
            'Uit eten, een concert, iets spontaans. Geef het uit zonder toestemming te vragen.',
        'pages.landing.jars.play.not':
            'Moet aan het eind van de maand leeg zijn. Dat is de bedoeling.',
        'pages.landing.jars.give.name': 'Geven',
        'pages.landing.jars.give.line':
            'Een goed doel, een vriend die het nodig heeft, ooit je eigen stichting. Vrijgevigheid als gewoonte, niet als bui.',
        'pages.landing.jars.give.not': 'Niet voor een fooi die je al hebt gegeven.',
        'pages.landing.principles_section.headline':
            'Als een functie een principe in de weg zit, verliest de functie.',
        'pages.landing.principles_section.eyebrow_core': 'DRIE PRINCIPES WAAR WE ONS AAN HOUDEN',
        'pages.landing.principles.information.body':
            'Een potje dat over de streep gaat is een signaal, geen oordeel. Bij elke waarschuwing hoort de ene stap die het oplost.',
        'pages.landing.why.body':
            'We bouwden Rumtelo eerst voor onszelf. We verdienden prima en vroegen ons toch af waar het bleef: geld, leven, energie, tijd. Budgetapps telden achteraf. Niemand hielp ons weer grip te krijgen. Dus maakten we wat we nodig hadden: duidelijke tools, een tip van De Coach, en jij kiest. Daarna brachten we het op de markt, zodat anderen hetzelfde kunnen doen.',
        'pages.landing.why.books.millionaire_mind.line':
            'De verdeling over zes potjes — elk bedrag krijgt een taak zodra het binnenkomt.',
        'pages.landing.why.books.psychology.line':
            'Gedrag wint van slimheid — rustige systemen boven paniek en schaamte.',
        'pages.landing.coach_section.lead':
            'Eén tip over waar je staat, één stap die je kunt zetten — in elk product, en samen op de pagina van De Coach. Geen muur van grafieken. Geen preek. Nooit schaamte. Jij houdt de regie.',
        'pages.landing.coach_section.points.quiet':
            'Stil totdat er genoeg gegevens zijn — ruis is geen inzicht',
        'pages.landing.coach_section.points.shame':
            'Informatie, nooit schaamte — een potje over de streep is een signaal, geen oordeel',
        'pages.landing.coach_section.points.ten':
            'Tien minuten per week met De Coach — geen dagelijks huiswerk',
        'pages.landing.coach_section.demo_aria': 'Voorbeeld van De Coach — één tip per portaal',
        'pages.landing.coach_section.demo_feed_eyebrow': 'De Coach · in elk portaal',
        'pages.landing.coach_section.demo_kicker': 'één tip · één stap · jij kiest',
        'pages.landing.coach_section.demo.money.text':
            'Plezier zit €38 boven de lijn. Haal het één keer uit Langetermijn sparen — of laat het staan en houd het diner van volgende week erin.',
        'pages.landing.coach_section.demo.money.cta': 'Open potjes',
        'pages.landing.coach_section.demo.growth.kind': 'DE HEFBOOM',
        'pages.landing.coach_section.demo.growth.text':
            'Kosten besparen heeft een bodem. Meer verdienen niet. Je bijverdienste is al 20% op weg naar het doel dat je stelde.',
        'pages.landing.coach_section.demo.energy.kind': 'JE ONDERGRENS',
        'pages.landing.coach_section.demo.energy.text':
            'Drie nachten onder de 6,5 uur — en de uitgaven bij Plezier stegen op diezelfde dagen. Eerst slapen. Dan beslissen.',
        'pages.landing.coach_section.demo.soul.text':
            'De intentie van deze week is nog leeg. Eén zin is genoeg: wat maakt dit een goede week?',
        'pages.landing.coach_section.demo.soul.cta': 'Intentie kiezen',
        'pages.landing.portal_demo.coach_lines.money':
            'Plezier zit €38 boven de lijn. Eén stap: haal het uit Langetermijn sparen — of laat het staan.',
        'pages.landing.portal_demo.coach_lines.growth':
            'Kosten besparen heeft een bodem. Meer verdienen niet. Je bijverdienste is al 20% op weg.',
        'pages.landing.portal_demo.coach_lines.energy':
            'Drie nachten onder de 6,5 uur — en Plezier ging omhoog op die dagen. Eerst slapen. Dan beslissen.',
        'pages.landing.portal_demo.coach_lines.soul':
            'Intentie gezet. Eén zin is genoeg — de week heeft nu een richting.',
        'pages.landing.portal_demo.growth_goals.course.meta': 'Potje Opleiding',
        'pages.landing.portal_demo.energy_days.tu': 'Di',
        'pages.landing.portal_demo.energy_days.we': 'Wo',
        'pages.landing.portal_demo.energy_days.th': 'Do',
        'pages.landing.faq.coach.answer':
            'Eén tip over waar je staat en één stap die je kunt zetten — in elk product, en samen op de pagina van De Coach. Het blijft stil totdat er genoeg gegevens zijn, en je wordt er nooit op aangekeken. De Coach tipt. Jij kiest.',
        'pages.landing.faq.partner.answer':
            'Ja — Basic bevat één kijkplek (coach of meekijker). Plus en Max voegen meer volledige plekken en kijkplekken toe. Een huishouden deelt de potjes. Uitgavenstijl blijft persoonlijk, want partners verschillen. Meer mensen nodig? Voeg plekken toe voor € 2,50 per stuk.',
        'pages.landing.faq.data.answer':
            'Op EU-servers in Amsterdam, versleuteld opgeslagen. Exporteer of verwijder je gegevens wanneer je wilt. Zeg je een betaald abonnement op, dan blijven al je potjes, transacties en doelen leesbaar.',
        'pages.landing.faq.practice.answer':
            'Ja — met Rumtelo Practice. Nodig cliënten uit per e-mail; zodra ze accepteren, zie je hun bord alleen-lezen vanaf één bureau. Meekijken is gratis voor hen, en je kunt hun Plus-abonnement sponsoren voor {clientPrice} per maand. Een praktijk kost {basePrice} per maand plus {staffPrice} per medewerkersplek.',
        'pages.landing.footer.cols.coach': 'De Coach',
        'pages.landing.footer.trust.yours.line':
            'Zeg je op, dan blijven al je potjes, transacties en doelen leesbaar. Geen lock-in, geen gegevens als gijzelaar.',
        'pages.landing.footer.badges.eu_hosted': 'EU-HOSTING · AMSTERDAM',
        'pages.landing.footer.badges.readonly': 'ALLEEN-LEZEN BANKGEGEVENS',
        'pages.landing.footer.badges.tls': 'TLS-VERSLEUTELD',
        'pages.landing.assurances.bank':
            'Bankgegevens zijn alleen-lezen — en pas nadat je ze zelf koppelt',
        'pages.landing.assurances.eu': 'EU-hosting in Amsterdam · AVG',
        // Landing: floaters and ticker (still naming-drift: potjes, Noodzakelijk, weekcheck).
        'pages.landing.floaters.f3': '+€ 850 freelance',
        'pages.landing.floaters.f4': 'Noodzakelijk → € 2.365',
        'pages.landing.floaters.f5': 'Intentie gezet',
        'pages.landing.floaters.f7': '1 boek · Opleiding',
        'pages.landing.floaters.f8': 'FF → € 430 · geïnvesteerd',
        'pages.landing.floaters.f11': 'Weekcheck · 9 min',
        'pages.landing.ticker.t5': 'Intentie gezet: “één eerlijke week”',
        'pages.landing.ticker.t7': 'Boek uitgelezen · potje Opleiding',
        'pages.landing.ticker.t9': 'Weekcheck klaar · 9 min',
        'pages.landing.ticker.t11': 'Vandaag veilig uit te geven: € 64',
        'pages.landing.portal_demo.money_rows.groceries.jar': 'Noodzakelijk',
        // Landing: pricing and plans (clarity release: Course/Koers on Plus, outcomes instead of meters).
        'pages.landing.pricing_section.lead':
            'Begin gratis met je potjes. Betaal pas als het je werk scheelt: je bankafschriften erin, je schuldenvrije datum, je Koers.',
        'pages.landing.practice_plan.f3':
            'Per cliënt een momentopname: inkomen, potjes, uitgaven, weekcheck.',
        'pages.landing.practice_plan.extra_manage_hint':
            'Jij betaalt hun Plus — {discount}% minder dan de {retail} per maand die ze zelf zouden betalen. Je ziet hun volledige bord, alleen-lezen.',
        'pages.landing.plans.basic.f1': 'GELD · zes potjes, transacties, vaste kosten',
        'pages.landing.plans.basic.f4': 'ZIEL · stilte, dankbaarheid, één intentie per week',
        'pages.landing.plans.basic.f5': 'De Coach, de weekcheck, de maandscore',
        'pages.landing.plans.basic.f6':
            '1 volledige plek + 1 kijkplek (partner, coach of adviseur)',
        'pages.landing.plans.basic.outcome.money': 'Zes potjes, je Inbox en vaste kosten',
        'pages.landing.plans.basic.outcome.growth':
            '{maxGoals, plural, one {# doel} other {# doelen}} en je inkomenscurve',
        'pages.landing.plans.basic.outcome.energy': 'Slaap, de basis onder elke beslissing',
        'pages.landing.plans.basic.outcome.soul': 'Stilte, dankbaarheid, één intentie per week',
        'pages.landing.plans.plus.line':
            'Je deelt geld met een partner of gezin, wilt je week plannen rond je doelen, lost schulden af of wilt je bankafschriften erin. De meeste mensen komen hier uit.',
        'pages.landing.plans.plus.f2':
            'GROEI · Koers — plan je week rond de drie dingen die je doelen vooruit helpen',
        'pages.landing.plans.plus.f3':
            'GELD · aflosplan met een schuldenvrije datum, en import van bankafschriften',
        'pages.landing.plans.plus.f4':
            'GROEI · Leren — boeken, cursussen, vaardigheden · tot {maxGoals} doelen',
        'pages.landing.plans.plus.f6':
            'Tot {maxMembers} plekken — mix van volledige en kijkplekken',
        'pages.landing.plans.plus.outcome.money':
            'Je schuldenvrije datum en import van bankafschriften',
        'pages.landing.plans.plus.outcome.growth': 'Je Koers, Leren en tot {maxGoals} doelen',
        'pages.landing.plans.plus.outcome.energy': 'Je 168 uur, training en voeding',
        'pages.landing.plans.plus.outcome.soul': 'Alles uit Basic',
        'pages.landing.plans.max.outcome.money': 'Alles uit Plus',
        'pages.landing.plans.max.outcome.growth':
            'Nettovermogen, rendement, je vrijheidsgetal en elk doel',
        'pages.landing.plans.max.outcome.energy': 'Alles uit Plus',
        'pages.landing.plans.max.outcome.soul': 'Plus de zeven centra',
        'pages.landing.plans.max.f4': 'ZIEL · de zeven centra',
        'pages.landing.plans.max.f5': 'Tot {maxMembers} plekken (meer volledige toegang)',
        // App: onboarding, Home dream, tour, Coach, Why, Practice, Settings (core launch copy).
        'pages.dashboard.why.label': 'Jouw droom',
        'features.tour.pages.home.sections.what_for_core.heading': 'Wat je hier ziet',
        'features.tour.pages.home.sections.what_for_core.body':
            'Je grip-overzicht voor deze maand — De Coach, het geldbeeld en de deur naar Groei. Start de volledige rondleiding via Help: eerst Home, dan potjes, vaste kosten en inkomen.',
        'features.tour.pages.home.steps.portals_core.title': 'Jouw producten',
        'features.tour.pages.home.steps.portals_core.content':
            'Geld staat in de bovenste navigatie. Groei open je vanaf hier, wanneer je dat volgende hulpmiddel wilt.',
        'features.coach.session.quiet_body_core':
            'Niets dringends wacht. Sluit de maand af als je er klaar voor bent, of open de weekcheck.',
        'pages.why.lead_core':
            'Je afvragen wat? Waar je geld bleef. Rumtelo helpt je dat te zien, zodat niets een mysterie blijft. Zo krijg je weer grip: controle over wat ertoe doet. Duidelijke tools daarvoor, en we blijven er meer toevoegen. De Coach kan een tip geven. Jij kiest wat je daarna doet.',
        'pages.practice.clients.progress_blurb':
            'Live cijfers over geld, groei, energie en ziel voor dit huishouden.',
        'pages.practice.clients.progress_blurb_core':
            'Live cijfers over geld en groei voor dit huishouden.',
        'pages.settings.panels.coach.blurb_core':
            'De Coach geeft nooit een standje — alleen duidelijke volgende stappen. Tips op het scherm (waarom-regels, potjeskaarten) blijven aan terwijl je leert; de inbox onder Home → De Coach bevat tipkaarten over geld en groei.',
        'pages.settings.panels.sharing.blurb_core':
            'Wat leden mogen delen bij Groei en Geld. Alleen de eigenaar kan dit wijzigen. Iets voor jezelf houden kan altijd.',
        'pages.settings.panels.plan.card_basic_line':
            'Solo-bord — de zes potjes en de routine eronder. Geen bank nodig.',
        'pages.settings.panels.plan.card_plus_line_core':
            'Deel het bord met familie of vrienden — schulden, Leren, Koers en meer doelen.',
        'pages.settings.panels.plan.card_plus_feats_core':
            '{members} · Schulden · Leren · Koers · Doelen',
        'pages.settings.panels.plan.card_max_tag_core': 'Alles, zonder limieten',
        // Dashboard: naming drift (potjes, weekcheck, De Coach) and wrong-sense words.
        'pages.dashboard.levels.unlocks.week_check': 'Weekcheck',
        'pages.dashboard.levels.unlocks.coach': 'De Coach',
        'pages.dashboard.coach.week_check': 'Weekcheck',
        'pages.dashboard.coach.see_jars': 'Bekijk potjes',
        'pages.dashboard.coach.inbox_one': '{count} transactie wacht op een potje.',
        'pages.dashboard.coach.inbox_many': '{count} transacties wachten op een potje.',
        'pages.dashboard.coach.all_sorted': 'Alles gesorteerd — tijd voor een intentie.',
        'pages.dashboard.coach.practice_pending_one':
            'Er wacht een uitnodiging van een Practice — accepteer die in Instellingen als je ze op je bord wilt.',
        'pages.dashboard.coach.practice_pending_many':
            '{count} uitnodigingen van een Practice wachten — accepteer ze in Instellingen als je ze op je bord wilt.',
        'pages.dashboard.household.attention_eyebrow': 'Jouw akkoord nodig',
        'pages.dashboard.recap.surplus': '{amount} over deze periode',
        'pages.dashboard.recap.overspent': 'Eén of meer potjes zijn overschreden',
        'pages.dashboard.hero.money_put_through': 'Geld · Verwerkt over {months} maanden',
        'pages.dashboard.hero.money_put_through_one': 'Geld · Verwerkt over 1 maand',
        'pages.dashboard.hero.money_distributed': 'Geld · Deze maand verdeeld',
        'pages.dashboard.hero.income_span': 'Over {months} maanden · {jars} potjes',
        'pages.dashboard.hero.income_span_one_jar': 'Over {months} maanden · 1 potje',
        'pages.dashboard.hero.income_month': 'Verdeeld over {jars} potjes',
        'pages.dashboard.hero.income_month_one_jar': 'Verdeeld over 1 potje',
        'pages.dashboard.hero.in_pots_label': 'In de potjes',
        'pages.dashboard.stats.play_left': 'In Plezier',
        'pages.dashboard.month_score.label': 'Score',
        // Week check = weekcheck everywhere (was “wekelijkse controle” / “weekcontrole”).
        'pages.meta.week_check': 'Weekcheck',
        'pages.why.cta_week_check': 'Weekcheck',
        'features.coach.verdict.kind_week_check': 'Weekcheck',
        'features.money.week_check.toast_done': 'De weekcheck is afgerond. Tot volgende week.',
        'features.capabilities.home-coach.description':
            'Tips over alle producten — weekcheck, maandscore en volgende stappen.',
        // ── Clarity 2 (week check, Home week 1, onboarding, nav, locks) ───────────────────
        // Week check: one product noun, "weekcheck"; Course = Koers.
        'features.money.week_check.page_title': 'Weekcheck',
        'features.money.week_check.page_lead':
            'Tien minuten. Zie waar het naartoe ging, geef de rest een taak en zet één intentie.',
        'features.money.week_check.grace_note':
            'De weekcheck van vorige week staat nog open. Rond die eerst af — deze week volgt daarna.',
        'features.money.week_check.progress': 'Stap {current} van {total} · ongeveer tien minuten',
        'features.money.week_check.group_money': 'Geld · week {week}',
        'features.money.week_check.group_course': 'Koers · week {week}',
        'features.money.week_check.steps_aria': 'Stappen van de weekcheck',
        'features.money.week_check.step_go_back': 'Terug naar {step}',
        'features.money.week_check.step_course_back': 'De drie van vorige week',
        'features.money.week_check.step_course_ahead': 'De drie voor volgende week',
        'features.money.week_check.look_over_by': '{amount} overschreden',
        'features.money.week_check.look_move': 'Geld verplaatsen',
        'features.money.week_check.look_no_income': 'Deze maand nog geen inkomen.',
        'features.money.week_check.look_add_income': 'Inkomen toevoegen',
        'features.money.week_check.intend_saved': 'Je intentie: {intention}',
        'features.money.week_check.finish': 'Weekcheck afronden',
        'features.money.week_check.skip_course': 'Koers deze week overslaan',
        'features.money.week_check.skip_course_toast':
            'Weekcheck klaar. Koers blijft deze week open.',
        'features.money.week_check.course_load_failed':
            'We kunnen dit deel van Koers niet laden. Probeer het opnieuw of sla het deze week over.',
        'features.money.week_check.save_failed': 'Niet opgeslagen. Je antwoorden staan er nog.',
        'features.money.week_check.error_no_jars':
            'We kunnen je potjes niet laden. Probeer het opnieuw.',
        'features.money.week_check.done_title': 'Klaar voor week {week}.',
        'features.money.week_check.done_lead': 'Eén blik, één stap, één intentie.',
        'features.money.week_check.done_allocations_label': 'Deze week verplaatst',
        'features.money.week_check.done_next_three_label': 'De drie voor volgende week',
        'features.money.week_check.done_course_open': 'Koers voor volgende week staat nog open.',
        'features.money.week_check.done_course_open_cta': 'Plan Koers toch',
        'features.money.week_check.look_again': 'Nog eens kijken',
        'features.money.week_check.look_again_note':
            'Alleen lezen — dit verandert je weekcheck niet.',
        'features.money.week_check.back_to_summary': 'Terug naar het overzicht',
        'features.money.week_check.summary_status_done': 'Klaar op {day}',
        'features.money.week_check.summary_status_open': 'Nog niet gedaan',
        'features.money.week_check.summary_read_only':
            'Alleen lezen. Het huishouden doet de weekcheck.',
        'features.money.week_check.entry': 'Weekcheck',
        'features.money.week_check.entry_done': 'Weekcheck',
        'features.money.week_check.entry_done_sr': 'deze week gedaan',
        'features.money.week_check.entry_view': 'Weekcheck bekijken',
        'features.money.week_check.entry_status_open': 'Deze week: nog niet gedaan',
        'features.money.week_check.entry_status_done': 'Deze week: gedaan',
        // Home: one next move, week-1 checklist. Plurals are ICU, so DeepL skips them.
        'pages.dashboard.next_move.eyebrow': 'Volgende stap',
        'pages.dashboard.next_move.close_month.title':
            'Sluit {month} af: zie je score en neem mee wat over is.',
        'pages.dashboard.next_move.close_month.cta': 'Maand afsluiten',
        'pages.dashboard.next_move.no_transactions.title':
            'Je potjes zijn gevuld. Kijk nu waar het heen gaat.',
        'pages.dashboard.next_move.no_transactions.body':
            'Voeg de uitgaven van deze week toe — zelf of importeer een bankafschrift. Volgende week duurt je eerste weekcheck tien minuten.',
        'pages.dashboard.next_move.no_transactions.body_basic':
            'Voeg de uitgaven van deze week toe zodra ze er zijn. Volgende week duurt je eerste weekcheck tien minuten.',
        'pages.dashboard.next_move.no_transactions.cta': 'Transactie toevoegen',
        'pages.dashboard.next_move.no_transactions.import': 'Bankafschrift importeren',
        'pages.dashboard.next_move.zero_income.title':
            'Nog geen inkomen? Voeg het toe zodra het binnenkomt — je potjes verdelen het meteen.',
        'pages.dashboard.next_move.zero_income.cta': 'Inkomen toevoegen',
        'pages.dashboard.next_move.inbox.title':
            '{count, plural, one {# regel in je Inbox — ongeveer {minutes, plural, one {# minuut} other {# minuten}}.} other {# regels in je Inbox — ongeveer {minutes, plural, one {# minuut} other {# minuten}}.}}',
        'pages.dashboard.next_move.inbox.cta': 'Inbox sorteren',
        'pages.dashboard.next_move.week_check.title':
            'Inbox leeg. Je weekcheck staat klaar — tien minuten.',
        'pages.dashboard.next_move.week_check.cta': 'Weekcheck starten',
        // Pinned in the Clarity 2 design: "bedrag" in both (the euro line has no NL twin).
        'pages.dashboard.next_move.calm.title':
            'Elk bedrag heeft een taak. Volgende weekcheck: {weekday}.',
        'pages.dashboard.next_move.calm.title_other_currency':
            'Elk bedrag heeft een taak. Volgende weekcheck: {weekday}.',
        'pages.dashboard.next_move.calm.link': 'Bekijk je potjes',
        'pages.dashboard.next_move.viewer.close_prior': '{month} staat klaar om af te sluiten.',
        'pages.dashboard.next_move.viewer.no_transactions': 'Nog geen uitgaven toegevoegd.',
        'pages.dashboard.next_move.viewer.inbox':
            '{count, plural, one {# regel wacht in de Inbox.} other {# regels wachten in de Inbox.}}',
        'pages.dashboard.next_move.viewer.week_check': 'De weekcheck van deze week staat nog open.',
        'pages.dashboard.next_move.viewer.close_month':
            '{month} wordt over {days, plural, one {# dag} other {# dagen}} afgesloten.',
        'pages.dashboard.next_move.travel_note': 'Over vandaag, niet over {period}.',
        'pages.dashboard.next_move.error': 'We kunnen je volgende stap niet laden.',
        'pages.dashboard.checklist.eyebrow': 'Instellen · {done} van {total} klaar',
        'pages.dashboard.checklist.title':
            '{count, plural, one {Eén klein ding, wanneer het jou uitkomt.} other {# kleine dingen, wanneer het jou uitkomt.}}',
        'pages.dashboard.checklist.hide': 'Verbergen',
        'pages.dashboard.checklist.hide_aria':
            'Verberg de instellijst voor iedereen in dit huishouden',
        'pages.dashboard.checklist.done': 'Klaar',
        'pages.dashboard.checklist.items.bank': 'Voeg je bank toe aan je hoofdrekening',
        'pages.dashboard.checklist.items.dream': 'Schrijf je droom op',
        'pages.dashboard.checklist.items.invite': 'Nodig je partner uit',
        'pages.dashboard.coach.all_tips': 'Alle tips ({count})',
        // Onboarding: two screens (income, split).
        'pages.onboarding.income_lead':
            'Vul in wat je elke maand op je rekening krijgt. Daarna zie je het verdeeld over zes potjes.',
        'pages.onboarding.net_income_label': 'Netto maandinkomen',
        'pages.onboarding.net_income_hint': 'Na belasting — wat er op je rekening binnenkomt.',
        'pages.onboarding.net_income_placeholder': 'Bedrag per maand',
        'pages.onboarding.income_echo': 'Dat is {amount} per maand.',
        'pages.onboarding.income_error_empty': 'Vul je maandinkomen in. Nul mag ook.',
        'pages.onboarding.income_error_nan':
            'Gebruik alleen cijfers, zoals je een bedrag opschrijft.',
        'pages.onboarding.income_error_negative': 'Inkomen kan niet onder nul zijn.',
        'pages.onboarding.income_error_decimals': 'Gebruik maximaal twee decimalen.',
        'pages.onboarding.income_error_large':
            'Dat is meer dan Rumtelo per maand aankan. Controleer het bedrag.',
        'pages.onboarding.split_title': 'Hier gaat je {amount} naartoe.',
        'pages.onboarding.split_lead':
            'Elk potje heeft één taak. Pas de percentages aan wanneer je wilt — de gewoonte telt meer dan de getallen.',
        'pages.onboarding.split_list_aria': 'Je verdeling',
        'pages.onboarding.split_row_aria': '{jar}, {percent} procent, {amount}',
        // "vaste kosten", not "vaste lasten": the locale normaliser rewrites it anyway.
        'pages.onboarding.split_jobs.NECESSITIES': 'huur, vaste kosten, boodschappen',
        'pages.onboarding.split_jobs.FINANCIAL_FREEDOM': 'geld dat voor je werkt — nooit uitgeven',
        'pages.onboarding.split_jobs.EDUCATION': 'lessen, boeken, een nieuwe vaardigheid',
        'pages.onboarding.split_jobs.LONG_TERM_SAVINGS': 'grote aankopen en een veiligheidsbuffer',
        'pages.onboarding.split_jobs.PLAY': 'plezier zonder schuldgevoel — geef het helemaal uit',
        'pages.onboarding.split_jobs.GIVE': 'cadeaus en goede doelen waar je om geeft',
        'pages.onboarding.split_main_account':
            'Alle zes potjes staan voor nu op één hoofdrekening. Voeg je bank toe wanneer het jou uitkomt.',
        'pages.onboarding.split_note':
            'Rumtelo verplaatst nooit geld. Spaarpotjes bij je bank? Zet het daar zelf over — wij laten de verdeling zien.',
        'pages.onboarding.split_change_later':
            'Je past de percentages altijd aan via Geld › Potjes.',
        'pages.onboarding.split_zero':
            'Nog geen inkomen? Je potjes wachten — ze verdelen het zodra het binnenkomt.',
        'pages.onboarding.split_cta': 'Klopt — open mijn overzicht',
        'pages.onboarding.split_cta_pending': 'Je overzicht wordt geopend…',
        'pages.onboarding.split_error': 'We kunnen de potjes niet laden — probeer het opnieuw.',
        'pages.onboarding.onboard_error':
            'Je overzicht is nog niet aangemaakt. Probeer het opnieuw.',
        'pages.onboarding.household_default_named': 'Huishouden van {name}',
        'pages.onboarding.step_of': '{current} van {total}',
        'pages.onboarding.banks_setup.read_only_link': 'Bankinstellingen openen',
        // Navigation: Meer tab and sheet.
        'pages.nav.pills.more': 'Meer',
        'pages.nav.children.why': 'Waarom Rumtelo',
        'pages.nav.children.jars': 'Potjes',
        'pages.nav.children.net_worth': 'Nettovermogen',
        'pages.nav.more.title': 'Meer',
        'pages.nav.more.close': 'Sluiten',
        'pages.nav.more.settings': 'Instellingen',
        'pages.nav.more.help': 'Hulp',
        'pages.nav.more.go_to_practice': 'Naar je praktijk',
        'pages.nav.more.back_to_practice': 'Terug naar je praktijk',
        'pages.nav.more.preview_badge': 'Preview',
        'pages.nav.more.with_plan': 'Meer met {plan}',
        'pages.nav.more.with_plan_price': '{plan} · {price}/maand',
        'pages.nav.more.with_plus_line':
            'Koers, je schuldenvrij-datum en bankafschriften importeren',
        'pages.nav.more.with_max_line': 'Nettovermogen en ruimte voor meer mensen',
        'pages.nav.search.course_today': 'Koers · Vandaag',
        'pages.nav.search.course_week': 'Koers · Week',
        'pages.nav.search.course_goals': 'Koers · Doelen',
        'pages.nav.inbox_badge_sr':
            '{count, plural, one {# om te sorteren} other {# om te sorteren}}',
        'pages.nav.aria.mobile_tabs': 'Hoofdmenu',
        'pages.nav.aria.money_sections': 'Onderdelen van Geld',
        // Locks that explain the gain. "Overstappen", never "Probeer" (no trial).
        'pages.shell.plan_gains.title': 'Meer met {plan}',
        'pages.shell.plan_gains.price': '{plan} · {price}/maand',
        'pages.shell.plan_gains.close': 'Sluiten',
        'pages.shell.plan_gains.members': 'Tot {count} mensen in je huishouden',
        'pages.shell.plan_gains.goals': 'Tot {count} doelen',
        'pages.shell.plan_gains.goals_unlimited': 'Zoveel doelen als je nodig hebt',
        'pages.shell.plan_gains.bank_links':
            '{count, plural, one {# bankkoppeling} other {# bankkoppelingen}}',
        'pages.shell.gates.lock.badge': 'Vergrendeld · in {plan}',
        'pages.shell.gates.lock.badge_sr': 'Vergrendeld: zit in {plan}',
        'pages.shell.gates.lock.title': '{feature} zit in {plan} · {price}/maand',
        'pages.shell.gates.lock.feature_fallback': 'Deze pagina',
        'pages.shell.gates.lock.body_tail':
            'Alles wat je invult blijft van jou, op elk abonnement.',
        'pages.shell.gates.lock.example': 'Voorbeeld',
        'pages.shell.gates.lock.switch_cta': 'Overstappen naar {plan}',
        'pages.shell.gates.lock.not_now': 'Nu niet',
        'pages.shell.gates.lock.back': 'Terug',
        'pages.shell.gates.lock.ask_owner': 'Vraag {owner} om over te stappen naar {plan}.',
        'pages.shell.gates.lock.ask_owner_unknown':
            'Vraag de eigenaar van dit huishouden om over te stappen naar {plan}.',
        'pages.shell.gates.lock.region_aria': 'Vergrendeld: {feature} zit in {plan}',
        'features.capabilities.money-debt.gain':
            'Zie wanneer je schuldenvrij bent en wat één extra aflossing verandert.',
        'features.capabilities.money-import.gain':
            'Importeer een bankafschrift in plaats van elk bedrag in te typen.',
        'features.capabilities.growth-learn.gain':
            'Kies elk kwartaal één vaardigheid en houd bij wat je leert.',
        'features.capabilities.growth-net-worth.gain':
            'Zie wat je bezit min wat je schuldig bent, in één getal, elke maand.',
        'features.capabilities.growth-course.gain':
            'Zet je week rond de drie dingen die je doelen vooruit helpen.',
        'common.message.error.api.jar_split_keys':
            'De verdeling moet elk van de zes potjes precies één keer bevatten',
    },
    es: {
        // Kept as translated before: the generator without a DeepL key would drop them to English.
        'common.message.error.api.course_period_full':
            'Aquí el límite es cinco. Termina uno, muévelo o déjalo ir primero.',
        'common.message.error.api.course_scope_invalid':
            'Solo un objetivo anual, trimestral o mensual puede ser personal o profesional',
        // ICU plurals are skipped by DeepL; pinned so they do not stay English.
        'pages.dashboard.next_move.inbox.title':
            '{count, plural, one {# línea en tu Inbox — unos {minutes, plural, one {# minuto} other {# minutos}}.} other {# líneas en tu Inbox — unos {minutes, plural, one {# minuto} other {# minutos}}.}}',
        'pages.dashboard.next_move.viewer.inbox':
            '{count, plural, one {# línea esperando en el Inbox.} other {# líneas esperando en el Inbox.}}',
        'pages.dashboard.next_move.viewer.close_month':
            '{month} se cierra en {days, plural, one {# día} other {# días}}.',
        'pages.dashboard.checklist.title':
            '{count, plural, one {Una cosa pequeña, cuando te venga bien.} other {# cosas pequeñas, cuando te vengan bien.}}',
        'pages.nav.inbox_badge_sr': '{count, plural, one {# por ordenar} other {# por ordenar}}',
        'pages.shell.plan_gains.bank_links':
            '{count, plural, one {# conexión bancaria} other {# conexiones bancarias}}',
    },
    fr: {
        // Kept as translated before: the generator without a DeepL key would drop them to English.
        'common.message.error.api.course_period_full':
            'Ici, on ne peut pas en avoir plus de cinq. Finis-en un, déplace-en un ou laisse-en un.',
        'common.message.error.api.course_scope_invalid':
            'Seul un objectif annuel, trimestriel ou mensuel peut être personnel ou professionnel',
        // ICU plurals are skipped by DeepL; pinned so they do not stay English.
        'pages.dashboard.next_move.inbox.title':
            '{count, plural, one {# ligne dans ton Inbox — environ {minutes, plural, one {# minute} other {# minutes}}.} other {# lignes dans ton Inbox — environ {minutes, plural, one {# minute} other {# minutes}}.}}',
        'pages.dashboard.next_move.viewer.inbox':
            '{count, plural, one {# ligne en attente dans l’Inbox.} other {# lignes en attente dans l’Inbox.}}',
        'pages.dashboard.next_move.viewer.close_month':
            '{month} se clôture dans {days, plural, one {# jour} other {# jours}}.',
        'pages.dashboard.checklist.title':
            '{count, plural, one {Une petite chose, quand ça t’arrange.} other {# petites choses, quand ça t’arrange.}}',
        'pages.nav.inbox_badge_sr': '{count, plural, one {# à trier} other {# à trier}}',
        'pages.shell.plan_gains.bank_links':
            '{count, plural, one {# connexion bancaire} other {# connexions bancaires}}',
    },
};
