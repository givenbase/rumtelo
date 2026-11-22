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
            'Vaste kosten gaan van het juiste potje af. Aankopen komen in Transacties; sorteer ze zelf of laat een regel het doen.',
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
            'Ja — met Rumtelo Praktijk. Nodig cliënten uit per e-mail; zodra ze accepteren, zie je hun bord alleen-lezen vanuit één bureau. Meekijken is gratis voor hen.',
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
        'pages.landing.plans.basic.outcome.money': 'Zes potjes, je transacties en vaste kosten',
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
            'De Coach geeft nooit een standje — alleen duidelijke volgende stappen. Tips op het scherm (waarom-regels, potjeskaarten) blijven aan terwijl je leert; de tiplijst onder Home → De Coach bevat tipkaarten over geld en groei.',
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
        'pages.dashboard.todo.eyebrow': 'Te doen · {count}',
        'pages.dashboard.todo.eyebrow_empty': 'Te doen',
        'pages.dashboard.todo.empty_title': 'Alles gedaan voor nu ✓',
        'pages.dashboard.todo.view': 'Bekijken',
        'pages.dashboard.todo.view_aria': 'Bekijken: {item}',
        'pages.dashboard.todo.rows.inbox':
            '{count, plural, one {# transactie te sorteren} other {# transacties te sorteren}}',
        'pages.dashboard.todo.rows.week_check': 'Je weekcheck staat klaar — tien minuten.',
        'pages.dashboard.todo.rows.bills':
            '{count, plural, one {# rekening nog niet betaald} other {# rekeningen nog niet betaald}}',
        'pages.dashboard.todo.rows.bills_names':
            '{count, plural, one {# rekening nog niet betaald: {names}} other {# rekeningen nog niet betaald, onder andere {names}}}',
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
            '{count, plural, one {# transactie te sorteren — ongeveer {minutes, plural, one {# minuut} other {# minuten}}.} other {# transacties te sorteren — ongeveer {minutes, plural, one {# minuut} other {# minuten}}.}}',
        'pages.dashboard.next_move.inbox.cta': 'Transacties sorteren',
        'pages.dashboard.next_move.week_check.title':
            'Alles gesorteerd. Je weekcheck staat klaar — tien minuten.',
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
            '{count, plural, one {# transactie wacht om gesorteerd te worden.} other {# transacties wachten om gesorteerd te worden.}}',
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
        'pages.nav.children.why': 'Waarom Rumtelo',
        'pages.nav.children.jars': 'Potjes',
        'pages.nav.children.net_worth': 'Nettovermogen',
        'pages.nav.search.course_today': 'Koers · Vandaag',
        'pages.nav.search.course_week': 'Koers · Week',
        'pages.nav.search.course_goals': 'Koers · Doelen',
        'pages.nav.aria.mobile_tabs': 'Hoofdmenu',
        'pages.nav.aria.money_sections': 'Onderdelen van Geld',
        // Locks that explain the gain. "Overstappen", never "Probeer" (no trial).
        'pages.shell.period_today': 'Vandaag',
        'pages.shell.period_week': 'Week {week}',
        'pages.shell.period_days_left':
            'Nog {count, plural, one {# dag} other {# dagen}} in {month}',
        'pages.shell.period_quarter': 'Q{quarter}',
        'pages.shell.period_quarter_label': 'Kwartaal {quarter}',
        'pages.shell.period_month_current': '{month}, deze maand',
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
        // Terminology (CL-14): jars = potjes (not pot/potten/spaarpot), with het/dit/elk agreement.
        'common.message.error.api.goal_save_only_jar_focus':
            'Alleen SAVE-doelen kunnen focus op een potje hebben',
        'common.message.error.api.goal_save_needs_jar_focus':
            'Het SAVE-doel heeft een potje nodig voordat het focus kan zijn',
        'common.message.error.api.goal_no_jar_spend': 'Het doel heeft geen potje om uit te geven',
        'common.message.error.api.jar_split_total':
            'De potjesverdeling moet samen 100% zijn; ontvangen: {total}%',
        'ui.form.jar': 'Potje',
        'ui.form.validation.choose_jar': 'Kies een potje',
        'ui.form.validation.choose_from_jar': 'Kies een potje om uit te nemen',
        'ui.form.validation.choose_to_jar': 'Kies een potje om naar te sturen',
        'ui.form.validation.different_jars': 'Kies twee verschillende potjes',
        'ui.statusPage.maintenance.description':
            'We doen een korte update. Je potjes en gegevens blijven veilig — probeer het over een paar minuten opnieuw.',
        'features.auth.sign_up.subtitle': 'Zes potjes. Eén overzichtelijk geheel.',
        'features.brand.auth_manifesto.jars_eyebrow': 'Zes potjes',
        'features.brand.auth_quotes_app.money_picture.support':
            'Kijk waar het heen is gegaan. Krijg weer grip. Zes potjes beslissen.',
        'features.capabilities.money-overview.description': 'Geldoverzicht en potjespuls.',
        'features.capabilities.money-jars.name': 'Potjes',
        'features.capabilities.growth-goals.description':
            'Doelen met een datum, een potje en voortgang.',
        'features.capabilities.soul-giving.description':
            'Waarom het ‘Give’-potje bestaat, waar de opbrengst naartoe gaat en hoe je een goede keuze maakt.',
        'features.coach.jar_guide.learn_nudge':
            'Zet titels op je Leren-plank, blader door de bibliotheek voor inspiratie, en voeg een doel toe op dit potje als je klaar bent om de uitgave te claimen.',
        'features.coach.jar_guide.split_inside': 'Verdeeld in dit potje',
        'features.growth.goals.filter_jar_aria': 'Filteren op potje',
        'features.growth.goals.share_jar_hint':
            'Doelen in hetzelfde potje delen de maandelijkse ruimte. Meer doelen daar betekent meestal dat elk doel langer duurt — tenzij er één Focus is.',
        'features.growth.goals.form.kind_save_line': 'Leg geld opzij in een potje',
        'features.growth.goals.form.pledge_tip_body':
            'Elk gesorteerd bedrag dat dit jaar uit je ‘Give’-potje komt, telt mee — je hoeft niets met de hand te verplaatsen.',
        'features.growth.goals.form.cause_open_hint':
            'Open toezegging — elke bijdrage uit het ‘Give’-potje telt mee.',
        'features.growth.goals.toast_achieve_spend':
            'Doel geclaimd — geld uit het potje uitgegeven',
        'features.growth.goals.toast_achieve_keep': 'Doel bereikt — het geld blijft in het potje',
        'features.growth.goals.jar_accordion.empty': 'Er zijn nog geen doelen op dit potje.',
        'features.growth.goals.jar_accordion.jar_available':
            'Er is een potje beschikbaar voor dit doel.',
        'features.growth.goals.jar_accordion.fill_jar_first':
            'Vul eerst dit potje — en bereik dan je doel zodra je er klaar voor bent.',
        'features.growth.goals.claim_enough': 'Het potje bevat {available} — genoeg voor {target}.',
        'features.growth.goals.claim_short':
            'Het potje bevat {available}; het streefbedrag is {target}. Je kunt het geld in het potje nog steeds opeisen en houden, of later uitgeven wat je kunt.',
        'features.growth.goals.claim_default':
            'Markeer dit doel als bereikt. Bepaal of het geld nu uit het potje gaat.',
        'features.growth.goals.achieve_keep': 'Bereid — in een potje bewaren',
        'features.growth.goals.achieve_spend_blocked':
            'Uitgeven (volledige doelbedrag moet in het potje zitten)',
        'features.growth.goals.detail.jar_toward_focus': 'Potje richting focus',
        'features.growth.goals.detail.jar_context': 'Potjescontext',
        'features.growth.goals.detail.other_goals': 'Andere doelen op dit potje',
        'features.growth.goals.detail.open_jar': 'Potje openen',
        'features.growth.goals.detail.advice_save_amount_body':
            'Een doel zonder tempo is slechts een wens. Bepaal hoeveel je elke maand van dit potje kunt missen — dan verschijnt de einddatum.',
        'features.growth.goals.detail.advice_save_room_title': 'Ruimte in het potje',
        'features.growth.goals.detail.advice_siblings_body':
            'Ze delen dezelfde maandelijkse ruimte in het potje na vaste kosten. Elke euro voor een ander doel verlengt deze einddatum — kies één Focus zodat de rest wacht.',
        'features.growth.goals.detail.this_jar': 'Dit potje',
        'features.growth.net_worth.detail.money_note':
            'Rekeningen en inkomsten blijven in hun eigen potje. Deze pagina laat alleen zien wat bij dit bezit hoort.',
        'features.growth.net_worth.setup.step_in_body':
            'Voeg de inkomsten toe die je eruit haalt — salaris, dividend, huur. Het komt net als elk ander inkomen in je potjes terecht; dit bezit krijgt alleen de credits.',
        'features.growth.net_worth.setup.step_out_body':
            'Hosting, verzekering, software — voeg de rekeningen toe die je ervoor betaalt. Elke rekening houdt zijn eigen potje.',
        'features.growth.income_simulator.intro':
            'Sleep het maandbedrag. De verdeling blijft behouden; elk potje wordt mee verplaatst.',
        'features.growth.income_simulator.no_jar': 'Geen potje',
        'features.growth.income_simulator.not_funded_from_jar':
            'Dit wordt niet uit een potje gefinancierd, dus het inkomen verandert op deze datum niet.',
        'features.growth.income_simulator.tip_no_plan':
            'Geen maandelijks bedrag, dus nog geen eindmaand. Stel in hoeveel er elke maand naartoe gaat — dan tonen we hoeveel maanden en in welke maand je landt. Andere doelen in hetzelfde potje delen die ruimte, dus meer doelen rekken meestal elke einddatum uit.',
        'features.growth.income_simulator.tip_behind_room':
            '{need} per maand zou dit in {months} maanden afronden. Er is nog ruimte in het potje.',
        'features.money.hub.cards.jars.name': 'Potjes',
        'features.money.hub.cards.jars.note_period': 'potjes liggen deze maand op schema',
        'features.money.jars.eyebrow': 'DE ZES POTJES',
        'features.money.jars.move_between': 'Van potje naar potje gaan',
        'features.money.jars.allocated': '{count} potjes · {pct}% opzijgezet',
        'features.money.jars.in_pot': 'In het potje',
        'features.money.jars.footer_stacked':
            '{on} / {total} potjes op schema · opgestapeld gedurende {months} maanden',
        'features.money.jars.footer_period': '{on} / {total}-potjes liggen deze periode op schema',
        // Jar tile: literal, positive. Names apply only while the household jar has its seed name.
        'features.money.jars.names.NECESSITIES': 'Noodzakelijk',
        'features.money.jars.names.FINANCIAL_FREEDOM': 'Financiële vrijheid',
        'features.money.jars.names.LONG_TERM_SAVINGS': 'Lange termijn',
        'features.money.jars.names.EDUCATION': 'Opleiding',
        'features.money.jars.names.PLAY': 'Plezier',
        'features.money.jars.names.GIVE': 'Geven',
        'features.money.jars.purpose.NECESSITIES': 'Huur, eten, rekeningen',
        'features.money.jars.purpose.FINANCIAL_FREEDOM': 'Beleggen, nooit uitgeven',
        'features.money.jars.purpose.LONG_TERM_SAVINGS': 'Grote plannen, buffer',
        'features.money.jars.purpose.EDUCATION': 'Cursussen, boeken, groei',
        'features.money.jars.purpose.PLAY': 'Plezier, vrij te besteden',
        'features.money.jars.purpose.GIVE': 'Doneren, anderen helpen',
        'features.money.jars.tile_of': 'van {amount} deze maand',
        'features.money.jars.tile_saved': 'Gespaard',
        'features.money.jars.tile_open_bills':
            '{count, plural, one {# open rekening} other {# open rekeningen}}',
        'features.money.jars.tile_meter_label': '{name}: over deze maand',
        'features.money.jars.tile_meter_left': '{pct}% over',
        'features.money.jars.tile_meter_over': 'Over het budget',
        'features.money.jars.left_label': 'Over deze maand',
        'features.money.jars.left_label_stacked': 'Over in de periode',
        'features.money.jars.guides.FINANCIAL_FREEDOM.note':
            'Met dit potje koop je activa. Geld gaat erin en komt er nooit meer uit — alleen het rendement komt eruit.',
        'features.money.jars.guides.EDUCATION.note':
            'Boeken, cursussen, mentoren, hulpmiddelen. De enige uitgaven die je verdiencapaciteit vergroten. Gebruik Leren voor wat je doorwerkt, blader door de bibliotheek voor inspiratie, en zet een doel op dit potje als je klaar bent om het te claimen.',
        'features.money.jars.guides.PLAY.not_allowed':
            'Geen remmen, geen schuldgevoel — maar ook geen bijvullen uit een ander potje als dat leeg is.',
        'features.money.jars.detail.goals_on_jar': '✦ Doelen op dit potje',
        'features.money.jars.detail.fill_jar_first':
            'Vul eerst dit potje — en bereik dan je doel zodra je er klaar voor bent.',
        'features.money.jars.detail.no_tx_month_body': 'Er is nog niets in dit potje gestopt.',
        'features.money.jars.detail.loading_jar': 'Potje wordt geladen…',
        'features.money.jars.detail.back_jars': '← Potjes',
        'features.money.jars.detail.open_jar_link': 'Potje openen ▸',
        'features.money.fixed.filter_jar_aria': 'Filteren op potje',
        'features.money.fixed.empty_jar_title': 'Er zit niets in dit potje.',
        'features.money.fixed.select_group_due': 'Selecteer alle openstaande in dit potje',
        'features.money.fixed.confirm_pause_body':
            'Hij blijft op je lijst, maar telt niet mee voor druk op de potjes of “nog te betalen” tot je hem weer aanzet.',
        'features.money.transactions.out_lead':
            'Geld dat uit een potje is verdwenen. Tik op een rij om deze te bewerken of te verwijderen.',
        'features.money.transactions.layout_by_jar': 'Per potje',
        'features.money.transactions.empty_out_body':
            'In deze periode bleef er niets in het potje achter.',
        'features.money.transactions.filter_jar_aria': 'Filteren op potje',
        'features.money.transactions.jar_fallback': 'Potje',
        'features.money.transactions.statement_import.after_import':
            'Regels landen bij Te sorteren. Koppel aan potjes — en aan vaste kosten als de tegenpartij matcht.',
        'features.money.transactions.rules_sign_in_body':
            'Regels sorteren nieuwe transacties automatisch in het juiste potje.',
        'features.money.transactions.detail.status_sorted': 'In een potje gedaan',
        'features.money.transactions.detail.rule_to_jar': '"{value}" → potje',
        'features.money.holding_link.hint':
            'Optioneel. Tel dit mee voor je bedrijf, een pand of een ander bezit. Het potje blijft hetzelfde.',
        'features.money.expense_form.into_jar': 'In het potje',
        'features.money.expense_form.this_jar': 'Dit potje',
        'features.money.expense_form.no_jars': 'Geen potjes — eerst de installatie voltooien',
        'features.money.move.toast_moved': 'Geld dat tussen potjes is overgeheveld',
        'features.money.move.choose_source_first': 'Kies eerst een bronpotje.',
        'features.money.move.source_blocked':
            'Kies een ander bronpotje — dit kan geen geld versturen.',
        'features.money.move.aria_from': 'Potje om uit te nemen',
        'features.money.move.aria_to': 'Potje om naar te sturen',
        'features.money.move.eligibility.cannot_send': 'Met dit potje kun je geen geld overmaken',
        'features.money.expense_intent.catalog_hint':
            'Kies uit de catalogus van dit potje als je de winkel of het type kent — of typ een eigen naam in.',
        'features.money.expense_intent.no_types_custom':
            'Er zijn nog geen typen voor dit potje — voer in plaats daarvan een eigen naam in.',
        'features.money.expense_intent.custom_jar_hint':
            'Kies hieronder een potje — of pas je keuze aan en selecteer een type, zodat we het kunnen indelen.',
        'features.money.jar_coverage.in_pot_label': 'In het potje',
        'features.money.jar_coverage.in_pot': 'In het potje {amount} · opgebouwd over de maanden',
        'features.money.fixed_form.no_jars':
            'Geen potjes — eerst de volledige installatie voltooien',
        'features.soul.giving.lead':
            'Het ‘Give’-potje is de kleinste van de zes en heeft de grootste invloed op je relatie met geld. Wanneer een vast deel al weg is voordat je het kunt uitgeven, is geld niet langer iets om aan vast te houden.',
        'features.soul.giving.open_jar': 'Open het ‘Give’-potje',
        'features.soul.giving.reached_by':
            '{when} bereikt. Het potje blijft stromen — daar ging het om.',
        'features.soul.giving.pledge_met':
            'De belofte is nagekomen. Het potje blijft vollopen — daar ging het om.',
        'features.soul.giving.pledge_pitch':
            'Een toezegging geeft het potje een einddoel voor het jaar. Elk gesorteerd bedrag dat Give verlaat, telt mee voor dat doel — je hoeft niets handmatig te verplaatsen.',
        'features.soul.giving.empty_auto_body':
            'Voeg vaste kosten toe aan het ‘Give’-potje om maandelijkse donaties te plannen.',
        'features.tour.explain.money.title': 'Geld — zes potjes',
        'features.tour.explain.jars.title': 'Potjes — hoe de verdeling werkt',
        'features.tour.pages.home.sections.what_for.body':
            'Je grip-overzicht voor deze maand — De Coach, het geldbeeld en de deuren naar Groei, Energie en Ziel. Begin de volledige rondleiding bij ‘Help’ en loop vervolgens door ‘Thuis’, daarna ‘Potjes’, ‘Vaste kosten’ en ‘Inkomsten’.',
        'features.tour.pages.shell.steps.period.content':
            'Wijzig de maand die je bekijkt. De totaalbedragen en uitgaven in het potje worden op basis van deze periode bijgehouden.',
        'features.tour.pages.income.sections.simulator.body':
            'Sleep de maandelijkse netto-opbrengst. De verdeling over de potjes blijft behouden; het bedrag in elk potje verschuift mee. Kies een doel om de bijbehorende datum te zien. Dit is een prognose — het geld is nog niet overgemaakt.',
        'features.tour.pages.fixed.sections.jars_use.heading': 'Hoe potjes hiervan gebruikmaken',
        'features.tour.pages.fixed.sections.jars_use.body':
            'Een vast bedrag aan OUT vermindert het beschikbare saldo in dat potje. Zodra er geld binnenkomt, wordt het inkomen procentueel over de potjes verdeeld — dit scherm geeft het plan weer, niet de boekhouding.',
        'features.tour.pages.fixed.steps.list.content':
            'Je vaste kosten per potje. Tik op een rij om hem te openen.',
        'features.tour.pages.fixed.steps.tabs.title': 'Toevoegen en wat overblijft',
        'features.tour.pages.fixed.steps.tabs.content':
            'Voeg hier een vaste kost toe. Wat er na de kosten overblijft, staat ernaast. Je inkomen vind je onder Geld → Inkomen.',
        'features.tour.pages.fixed.sections.out_vs_in.heading': 'Wat eruit gaat',
        'features.tour.pages.fixed.sections.out_vs_in.body':
            'Deze lijst bevat je actieve vaste kosten (huur, verzekeringen, abonnementen). Inkomen heeft een eigen pagina: Geld → Inkomen. Wat er na de kosten overblijft is je maandelijkse netto min de vaste kosten.',
        'features.tour.pages.jars.sections.what_for.heading': 'Waar de potjes voor dienen',
        'features.tour.pages.jars.sections.how.body':
            'Je voert je inkomsten zelf in. Aan de hand van je vaste percentages zie je hoeveel er in elk potje hoort — wat je kunt uitgeven of voor dat doel opzij kunt zetten. Werk vervolgens de ‘Money pills’ van links naar rechts af: Vaste kosten → Transacties → Schulden → Nettovermogen. Rumtelo verplaatst nooit geld op je bankrekening.',
        'features.tour.pages.jars.steps.list.title': 'Je zes potjes',
        'features.tour.pages.goals.sections.save_vs_earn.body':
            'Spaardoelen vullen een potje dat uiteindelijk een berg geld oplevert. Verdiensten houden het maandelijkse netto-inkomen van het huishouden bij — zodra het netto-inkomen het streefbedrag bereikt, wordt het doel automatisch als bereikt gemarkeerd.',
        'features.tour.pages.transactions.sections.what_for.body':
            'Het overzicht van het geld dat al is uitgegeven — Uitgegeven, Ontvangen (cadeaus, terugbetalingen en aanvullingen in de potjes). Door dit hier bij te houden, blijft elk potje op orde.',
        'features.tour.pages.debt.sections.how.body':
            'Voeg elke schuld toe, inclusief het saldo en de aflossing. Bekijk ze als vaste kosten: als de aflossing een gat in het potje slaat, moet het potjesplan worden herzien.',
        'pages.meta.jars': 'Potjes',
        'pages.meta.jar': 'Potje',
        'pages.meta.settings_jars': 'Potjes — Instellingen',
        'pages.settings.tabs.jars.label': 'Potjes',
        'pages.settings.panels.household.blurb_suffix':
            'Leden delen potjes, regels en transactiegeschiedenis.',
        'pages.settings.panels.jars_placement.eyebrow': 'Waar elk potje staat',
        'pages.settings.panels.bank.account_label_hint':
            'Zichtbaar bij potjes en CSV — bijv. Betaalrekening, of Creditcard · t.n.v. Avery Chen.',
        'pages.settings.panels.automation.rules.guard.name': 'Potjesbeschermer',
        'pages.settings.panels.automation.rules.guard.desc':
            'Geef een waarschuwing zodra een potje meer dan 90% van zijn toewijzing heeft verbruikt.',
        'pages.settings.panels.export.sheet_jars': 'Potjes',
        'pages.settings.panels.export.sheet_fixed_cols': 'naam · bedrag · potje',
        'pages.settings.panels.export.sheet_transactions_cols': 'datum · omschr · bedrag · potje',
        'pages.settings.panels.export.sheet_goals_cols': 'naam · doel · potje',
        'pages.settings.panels.export.sheet_rules_cols': 'voorwaarde · potje · prioriteit',
        'pages.settings.panels.import.found_jars_one': '{count} potje',
        'pages.settings.panels.import.found_jars_other': '{count} potjes',
        'pages.settings.panels.import.split_ok': 'Er wordt een verdeling van het potje toegepast',
        'pages.settings.panels.import.split_skip': 'De verdeling van het potje blijft ongewijzigd',
        'pages.shell.forms.tx_update.description':
            'Pas de richting, het bedrag, het potje of de notitie aan.',
        'pages.shell.forms.fixed_create.description': 'Wat verdwijnt er elke maand uit het potje?',
        'pages.shell.forms.fixed_income_create.title': 'Overige vaste inkomsten toevoegen',
        'pages.shell.forms.fixed_income_create.description':
            'Wat komt er op vaste momenten binnen, naast je inkomstenbronnen?',
        'features.money.fixed.eyebrow': 'VASTE KOSTEN',
        'features.money.fixed.out_total_line': 'Er gaat {amount} per maand uit.',
        'features.money.fixed.search_aria': 'Zoek in je vaste kosten',
        'features.money.fixed_form.save_income': 'Inkomen opslaan',
        'features.money.fixed_form.received_from': 'Ontvangen van (optioneel)',
        'features.growth.income.add_other_income': '+ Overige vaste inkomsten',
        'features.growth.income.other_heading': '✦ Overige vaste inkomsten',
        'features.growth.income.other_hint':
            'Zakgeld, bijdragen en ander geld dat op vaste momenten binnenkomt.',
        'pages.shell.forms.move_create.description_from_jar':
            'Kies zelf waar het naartoe gaat — dit potje is al de bron.',
        'pages.shell.gates.maintenance_api_down_body':
            'We kunnen de API momenteel niet bereiken. Je potjes en gegevens zijn veilig — probeer het straks nog eens.',
        'pages.why.meaning.money_leaves_body':
            'Als er geld wordt opgenomen, zie je meteen uit welk potje het komt — en hoeveel er nog over is voor die klus. Geen spreadsheet achteraf.',
        'pages.why.cta_jars': 'Bekijk mijn potjes',
        'features.growth.goals.detail.kind_save': 'Sparen · in een spaarpotje',
        'features.growth.income_simulator.tip_behind_income_no_jar':
            '{need} per maand zou dit in {months} maanden afbetalen. Leg het geld in een spaarpotje om te zien of je inkomen daarvoor voldoende is.',
        'features.money.transactions.lead':
            'Uitgaven zijn geld dat je uitgeeft. Inkomsten zijn een cadeau, belastingteruggave, terugbetaling of geld dat je in een spaarpotje stopt. Een bankrekening koppelen is een instelling.',
        'features.money.transactions.in_lead':
            'Cadeaus, terugbetalingen, belastingteruggaven en aanvullingen op het spaarpotje. Tik op een rij om deze te bewerken.',
        'features.money.debt.form.link_fixed_body':
            'Hiermee houd je de geplande aflossing in je potjesbudget volgens dit ritme aan.',
        'features.tour.pages.jars.title': 'Mijn spaarpotjes',
        'pages.settings.panels.plan.card_basic_feats':
            '{members} · Alleen solo · Spaarpotjes · 1 doel · Coach',
        'pages.shell.forms.tx_create.description':
            'Uitgeven: eruit; cadeaus, terugbetalingen en bijvullen van het spaarpotje: erin.',
        // Necessity jar = Noodzakelijk (not Noodzaak / Necessities); jar names match the landing page.
        'features.coach.split_tips.nec-high':
            'Een Noodzakelijk-aandeel van meer dan 60% zet alle andere potjes onder druk. Het verlagen van vaste kosten helpt meestal meer dan het inperken van vrijheid.',
        'features.brand.auth_manifesto.jars.necessity.name': 'Noodzakelijk',
        'features.brand.auth_manifesto.jars.education.name': 'Opleiding',
        'features.brand.auth_manifesto.jars.savings.name': 'Sparen',
        'features.brand.auth_manifesto.jars.play.name': 'Plezier',
        'features.brand.auth_manifesto.jars.give.name': 'Geven',
        'features.coach.money_coach.necessities_share.text':
            'Noodzakelijk staat op {pct}% — het doel is 55%. Prima voor nu; om het gat te dichten, schrap je vaste kosten of verhoog je je inkomen, en laat je Vrijheid met rust.',
        'features.growth.goals.detail.advice_give_gap_body':
            'Als er ongeveer {amount} meer per maand wordt gedoneerd, wordt de toezegging op tijd nagekomen. Een vast bedrag bij Noodzakelijk of ‘Give’ maakt het saai — op een positieve manier.',
        'features.money.debt.detail.no_fixed_linked':
            'Er is nog geen doorlopende betaling gekoppeld. Voeg er een toe, zodat Noodzakelijk deze betaling kan zien.',
        'features.money.debt.form.link_fixed_title':
            'Voeg dit ook toe als vaste kosten in Noodzakelijk',
        'features.money.debt.toast_monthly_added':
            'Maandelijkse betaling toegevoegd aan Noodzakelijk',
        'features.tour.pages.debt.sections.what_for.body':
            'Houd bij wat je nog verschuldigd bent en hoeveel dat maandelijks van je inkomen opslokt. Aflossingen van schulden horen meestal bij Noodzakelijk — op deze pagina houd je het saldo in de gaten.',
        'pages.settings.panels.automation.rules.sweep.desc':
            'Wat er op de 1e nog overblijft in de categorie ‘Noodzakelijk’, wordt overgeheveld naar ‘Financiële vrijheid’.',
        // CL-15: The Secret dropped from the book list (decision D10).
        'pages.landing.footer.attribution':
            'Rumtelo · Amsterdam, Nederland. Eerst door de oprichters voor zichzelf ontwikkeld — en vervolgens op de markt gebracht zodat ook anderen er gebruik van kunnen maken. Gebaseerd op boeken als ‘Rich Dad Poor Dad’, ‘Think and Grow Rich’, ‘Secrets of the Millionaire Mind’ en ‘The Psychology of Money’. Onafhankelijk product — niet gelieerd aan, goedgekeurd door of in licentie gegeven door deze auteurs.',
        // Weekly habit = routine, never praktijk/oefening/methode. EN source now says routine, so NL is pinned.
        'features.soul.stillness.mind_tie':
            'Een onrustige geest stuurt geld niet aan — hij geeft het uit en noemt dat een beslissing. Rust is geen meditatie, maar een strategie: de enige routine die niets kost en al het andere beschermt. Elke munt die je niet impulsief uitgeeft, is een munt die voor een potje kiest.',
        'pages.settings.panels.stillness.blurb':
            'Hoe lang je zit. Kort en dagelijks is beter dan lang en af en toe — dit is de enige routine die niets kost en elk potje beschermt.',
        'features.capabilities.home-why.description': 'Waarom deze routine ertoe doet.',
        'features.capabilities.soul-stillness.description': 'Routine voor stilte en aanwezigheid.',
        'features.capabilities.soul-gratitude.description': 'Routine voor dankbaarheid.',
        'features.soul.stillness.lead':
            'De enige routine hier die niets kost en al het andere beschermt.',
        // Informal je/jouw (not u/uw) outside pages.legal.*.
        'common.message.error.api.party_or_merchant':
            'Kies ofwel een catalogusverkoper ofwel een van je opgeslagen contacten, maar niet beide.',
        'features.auth.sign_up.practice_name_required':
            'Vul de naam van je praktijk of bedrijf in.',
        'features.brand.auth_quotes_app.money_picture.eyebrow': 'Je geld',
        'features.brand.auth_quotes_app.energy.eyebrow': 'Je capaciteit',
        'features.tour.pages.home.steps.portals.title': 'Je producten',
        'pages.practice.clients.not_found_body':
            'Deze link ontbreekt of is niet langer beschikbaar op je praktijkwebsite.',
        'pages.settings.panels.bank.wizard_authorize_mismatch':
            'De bank die je autoriseert ({aspsp}) kan afwijken van de bank van het Rumtelo-label ({catalog}). Voor testdoeleinden is dat geen probleem; in het dagelijks gebruik komen ze meestal overeen.',
        'pages.support.hub.cards.legal.body':
            'Privacy, gebruiksvoorwaarden, cookies en hoe wij je gegevens verwerken.',
        'pages.support.contact.form.message_placeholder': 'Hoe kunnen we je helpen?',
        'pages.support.contact.channels.support.body':
            'Vragen over je account, huishouden, facturering of producten.',
        'pages.shell.gates.locked_plan_body_practice':
            'Dit zit niet in hun huishoudabonnement. Beheer je hun account, upgrade dan via de Practice-facturering.',
        // Practice clients = cliënten (not klanten).
        'features.auth.sign_up.subtitle_practice': 'Eén bureau voor elke cliënt.',
        'features.auth.sign_up.practice_name_hint':
            'Dit wordt aan je cliënten getoond wanneer je ze uitnodigt. De juridische details volgen hierna.',
        'pages.practice.overview.insight_people_hint': 'Leden in huishoudens met actieve cliënten',
        'pages.practice.overview.insight_cost_hint':
            'Basis + stoelen voor het personeel + beheerde cliënten',
        'pages.practice.overview.attention_blurb':
            'Er zijn nog uitstaande uitnodigingen — neem contact op of open het cliëntdossier.',
        'pages.practice.overview.attention_view_all': 'Alle cliënten',
        'pages.practice.clients.not_found_title': 'Cliënt niet gevonden',
        'pages.practice.clients.back_to_roster': 'Terug naar cliënten',
        'pages.practice.clients.detail_title': 'Voortgang van de cliënt',
        'pages.practice.settings.chrome.lead':
            'Facturering, bedrijfsprofiel en de gegevens die cliënten op facturen te zien krijgen.',
        'pages.shell.gates.locked_plan_title_practice': 'Deze cliënt heeft {plan} nodig',
        'pages.shell.gates.locked_plan_aria_practice': 'Upgrade van het cliëntabonnement vereist',
        'pages.shell.gates.back_to_practice': 'Terug naar de cliënten van Practice',
        // Practice desk = praktijkbureau (as on the landing page).
        'pages.settings.panels.household.invite_relation_hint_circle':
            'Vriend, huisgenoot of andere vertrouwde — deel het bord zonder praktijkbureau.',
        'pages.shell.menu.start_own_sub': 'Je huishoudbord of een praktijkbureau',
        'pages.shell.viewer.start_own_banner':
            'Wil je iets van jezelf? Kies een huishoudbord of een praktijkbureau.',
        'pages.shell.viewer.chooser_practice_title': 'Praktijkbureau',
        // The Coach (feature) = De Coach, capitalised as a product name.
        'features.brand.auth_quotes_web.who_its_for.support':
            'De tips van De Coach. Jij kiest. Bepaal zelf de richting.',
        'features.coach.page_title': 'De Coach',
        'features.coach.helpers.mark_label': 'De Coach',
        'features.coach.jar_guide.give_hint':
            'Kies een goed doel en vervolgens een organisatie die onafhankelijk wordt gecontroleerd — dezelfde shortlist van De Coach als op Waarom en waar.',
        'features.money.fixed_form.give_hint':
            'Ik weet wie — vul hier de naam in van de organisatie waaraan je al doneert. Help me kiezen — een shortlist van De Coach met onafhankelijke beoordelingen (Doneer Effectief, GiveWell, ACE, CBF).',
        'features.soul.giving.pick_hint':
            'Ik weet wel aan wie — vul hier de naam in van de organisatie waaraan je al doneert. Help me kiezen — een shortlist van De Coach met onafhankelijke beoordelingen (Doneer Effectief, GiveWell, ACE, CBF).',
        'features.growth.goals.form.give_mode_hint':
            'Ik weet wie — vul de naam in van degene aan wie je al doneert. Help me kiezen — een shortlist van De Coach met onafhankelijke beoordelingen. Houd het open — noem alleen het goede doel, nog geen organisatie.',
        'features.money.debt.strategy_coach.badge_coach_pick':
            'Tip van De Coach · beste prijs-kwaliteitverhouding',
        'features.tour.chrome.helpers_hint':
            'Waarom-regels en potjeskaarten van De Coach (✦ De Coach). Hetzelfde als Instellingen → Voorkeuren. Standaard ingeschakeld voor beginners.',
        'features.tour.pages.home.steps.todo.title': 'Te doen',
        'pages.landing.faq.coach.question': 'Wat doet De Coach eigenlijk?',
        'pages.meta.coach': 'De Coach',
        'pages.settings.panels.coach.eyebrow': 'De Coach',
        'pages.settings.panels.debt_payoff.blurb':
            'Eén keuze per huishouden voor het scherm ‘Schulden’. Lawine, Sneeuwbal of Minimaal — je kunt op elk moment wisselen; de lijst met schulden en de vergelijking van De Coach volgen daarna.',
        'pages.shell.quick_add.next_step': 'Vervolg met De Coach',
        'pages.shell.quick_add.open_coach': 'Open De Coach',
        'features.coach.empty_body':
            'Registreer inkomsten, potjes of slaap — De Coach spreekt wanneer er genoeg te zien is.',
        'features.coach.helpers.mark_title':
            'Van De Coach — schakel tips op het scherm in of uit via Instellingen → Voorkeuren',
        'features.coach.helpers.open_coach': 'Open De Coach',
        'features.money.jars.guides.GIVE.note':
            'Door te geven blijft geld een hulpmiddel en geen meester. Het wordt automatisch overgemaakt — De Coach helpt je te kiezen waarheen.',
        'features.tour.pages.home.steps.todo.content':
            'Je volgende stap en wat er nog meer wacht, op één plek. De Coach voegt één tip toe als die er is — je kiest zelf. Schakel De Coach in of uit via ‘Help’ of ‘Instellingen’.',
        'pages.settings.panels.automation.blurb':
            'Drie regels. Als alles is uitgeschakeld, geeft Rumtelo alleen weer, maar voert nooit acties uit. De instellingen voor De Coach vind je onder ‘Account’.',
        // Week check = weekcheck (not wekelijkse controle).
        'features.energy.hub.cards.week.note': 'weekcheck',
        'features.soul.gratitude.empty_body': 'De weekcheck vraagt je hier later naar.',
        'features.soul.gratitude.this_week_body':
            'Eén regel per week tijdens de weekcheck. Niet meer dan dat — het is een check-in, geen dagboek.',
        'pages.landing.portal_features.money.f5': 'De weekcheck · de maandscore',
        // Clarity 3: the ladder (Coming up, Show everything now, stage note), Quick add by stage.
        'pages.nav.search.deferred.week_check': 'Komt in je menu na je eerste weekcheck.',
        'pages.nav.search.deferred.month_close':
            'Komt in je menu nadat je je eerste maand afsluit.',
        'pages.nav.coming_up.row': 'Binnenkort',
        'pages.nav.coming_up.row_next.week_check': 'Na je eerste weekcheck',
        'pages.nav.coming_up.row_next.month_close': 'Nadat je je eerste maand afsluit',
        'pages.nav.coming_up.row_next.sorting': 'Nadat je een paar regels sorteert',
        'pages.nav.coming_up.row_aria': 'Binnenkort: {next}',
        'pages.nav.coming_up.title': 'Binnenkort',
        'pages.nav.coming_up.lead':
            'Rumtelo begint met je potjes, transacties en weekcheck. De rest komt erbij naarmate je overzicht zich vult.',
        'pages.nav.coming_up.next_eyebrow': 'Hierna',
        'pages.nav.coming_up.trigger.week_check': 'Doe je eerste weekcheck — tien minuten.',
        'pages.nav.coming_up.trigger.month_close': 'Sluit je eerste maand af.',
        'pages.nav.coming_up.trigger.sorting':
            'Sorteer nog {sorted, plural, one {# regel} other {# regels}} of wacht {days, plural, one {# dag} other {# dagen}}.',
        'pages.nav.coming_up.adds_eyebrow': 'Daarna staat in je menu',
        'pages.nav.coming_up.adds.levels': 'Je niveau bij de maandscore',
        'pages.nav.coming_up.search_hint':
            'Elke pagina is al open: zoek hem op via Snel toevoegen.',
        'pages.nav.coming_up.close': 'Sluiten',
        'pages.nav.show_all.label': 'Laat alles meteen zien',
        'pages.nav.show_all.hint_off': 'Sla de stap-voor-stap-start over. Je kunt altijd terug.',
        'pages.nav.show_all.hint_on':
            'Aan — je ziet elke pagina die je abonnement en rol bevatten, in elk huishouden.',
        'pages.nav.show_all.done':
            'Alles staat nu in je menu. Zet het terug via Instellingen › Account.',
        'pages.nav.stage_items.course': 'Koers',
        'pages.nav.stage_items.goals': 'Doelen',
        'pages.nav.stage_note.text':
            '{count, plural, one {Nieuw: {items} staat nu in je menu.} other {Nieuw: {items} staan nu in je menu.}}',
        'pages.nav.stage_note.dismiss': 'Begrepen',
        'pages.settings.panels.start.eyebrow': 'Je start',
        'pages.settings.panels.start.blurb':
            'Nieuwe borden beginnen met potjes, transacties en de weekcheck. De rest komt in je menu na je eerste weekcheck en je eerste afgesloten maand.',
        'pages.shell.quick_add.ask_placeholder': 'Zoek in De Coach of naar een pagina…',
        'pages.shell.quick_add.search_label_ask': 'Zoek pagina’s en De Coach',
        'pages.shell.quick_add.search_label_add': 'Filter wat je wilt toevoegen',
        'pages.shell.quick_add.deferred.week_check': 'Komt hier na je eerste weekcheck.',
        'pages.shell.quick_add.deferred.month_close': 'Komt hier nadat je je eerste maand afsluit.',
        'pages.settings.panels.bank.group_accounts': '{count} rekeningen',
        // Settings tabs: "Practice coaches" is the coaches who look along, not trainers; devices machine output was off.
        'pages.settings.tabs.practice.label': 'Coaches',
        'pages.settings.tabs.devices.sub': 'Bandjes, hubs en gekoppelde apparaten',
        // Home: close-month sheet, level for screen readers, invited checklist item, Help score section.
        'pages.dashboard.month_score.level_sr': 'Niveau: {level}',
        'pages.dashboard.checklist.invited': 'Uitgenodigd — wacht op hen',
        'pages.dashboard.close_flow.title': '{month} afsluiten',
        'pages.dashboard.close_flow.prior_first':
            'Sluit eerst {prior} af — maanden sluiten op volgorde.',
        'pages.dashboard.close_flow.prior_first_cta': '{prior} afsluiten',
        'pages.dashboard.close_flow.prior_done': '{month} is afgesloten.',
        'pages.dashboard.close_flow.inbox_first':
            '{count, plural, one {# transactie uit {month} is nog te sorteren.} other {# transacties uit {month} zijn nog te sorteren.}}',
        'pages.dashboard.close_flow.inbox_first_cta': 'Sorteer ze',
        'pages.dashboard.close_flow.inbox_first_reason':
            'Sorteer eerst je transacties en sluit daarna af.',
        'pages.dashboard.close_flow.confirm_body':
            'Je ziet je score en neemt wat over is mee naar volgende maand. Een afgesloten maand kun je niet meer wijzigen.',
        'pages.dashboard.close_flow.bills_tail': 'Een afgesloten maand kun je niet meer wijzigen.',
        'pages.dashboard.close_flow.close_cta': '{month} afsluiten',
        'pages.dashboard.close_flow.already_closed': '{month} is al afgesloten.',
        'pages.dashboard.close_flow.done': 'Klaar',
        'pages.dashboard.close_flow.not_now': 'Nu niet',
        'pages.dashboard.close_flow.load_error': 'Kon {month} niet laden.',
        'pages.dashboard.close_flow.close_error_fallback':
            'Kon {month} niet afsluiten. Controleer je verbinding en probeer het opnieuw.',
        'features.tour.pages.home.sections.score.heading': 'Je maandscore en niveau',
        'features.tour.pages.home.sections.score.body':
            'Elke maand die je afsluit telt mee voor je score. Je niveau groeit mee: een afspiegeling van je routine, geen sleutel. Er gaat niets open of dicht door een niveau.',
        'features.tour.pages.growth.sections.what_for.body':
            'Koers is je week: de drie dingen die je doelen vooruit helpen, gekozen in je weekcheck. Op Basic heb je één doel; Koers en Leren zitten in Plus.',
        'features.growth.learn.search_catalog_placeholder': 'Atomic Habits, Deep Work…',
        // Practice door (CL-11): Practice = Praktijk, clients = cliënten, docs/product/practice.md.
        'pages.landing.footer.cols.practices': 'Voor praktijken',
        'pages.landing.pricing_section.practice_link':
            'Coach of adviseur? Bekijk de prijzen voor Praktijk',
        'pages.landing.practice_band.eyebrow': 'VOOR COACHES & ADVISEURS',
        'pages.landing.practice_band.headline': 'Niet meer gissen waar je cliënten staan.',
        'pages.landing.practice_band.lead':
            'Eén bureau voor de potjes en weekcheck van elke cliënt — pas als ze ja zeggen. Rumtelo verplaatst nooit geld.',
        'pages.landing.practice_band.cta': 'Zo werkt het voor praktijken',
        'pages.practices.meta.title': 'Rumtelo voor praktijken',
        'pages.practices.meta.description':
            'Eén bureau voor de potjes en weekcheck van elke cliënt — pas als ze ja zeggen. Rumtelo verplaatst nooit geld.',
        'pages.practices.hero.eyebrow': 'VOOR COACHES & ADVISEURS',
        'pages.practices.hero.headline': 'Niet meer gissen waar je cliënten staan.',
        'pages.practices.hero.lead':
            'Eén bureau voor de potjes en weekcheck van elke cliënt — pas als ze ja zeggen. Rumtelo verplaatst nooit geld.',
        'pages.practices.hero.microline': 'Meekijken is gratis voor je cliënten.',
        'pages.practices.how.eyebrow': 'ZO WERKT HET',
        'pages.practices.how.headline': 'Nodig uit. Zij zeggen ja. Eén bureau.',
        'pages.practices.how.steps_aria': 'Zo werkt een praktijk',
        'pages.practices.how.steps.invite.title': 'Nodig een cliënt uit',
        'pages.practices.how.steps.invite.body':
            'Maak je praktijk aan en nodig een cliënt uit per e-mail. Nieuw bij Rumtelo? Dan krijgt de cliënt een aanmeldlink. Al aangemeld? Dan accepteert de cliënt in Instellingen.',
        'pages.practices.how.steps.yes.title': 'Zij zeggen ja',
        'pages.practices.how.steps.yes.body':
            'Elke koppeling begint als uitnodiging. Er wordt niets gedeeld tot de eigenaar van het huishouden accepteert.',
        'pages.practices.how.steps.desk.title': 'Eén bureau',
        'pages.practices.how.steps.desk.body':
            'Bekijk het bord van elke geaccepteerde cliënt, alleen-lezen, met een momentopname per cliënt: inkomen, potjes, uitgaven, weekcheck.',
        'pages.practices.proof.eyebrow': 'WAAROM PRAKTIJKEN HET GEBRUIKEN',
        'pages.practices.proof.headline': 'Sessies over keuzes, niet over cijfers verzamelen.',
        'pages.practices.proof.points.picture.title': 'Een actueel beeld vóór elke sessie',
        'pages.practices.proof.points.picture.body':
            'Je cliënten houden zes potjes, hun vaste kosten en een weekcheck van tien minuten bij. Jij opent hun bord en begint waar zij staan.',
        'pages.practices.proof.points.between.title': 'De voortgang gaat door tussen sessies',
        'pages.practices.proof.points.between.body':
            'De weekcheck en de kleine tips van De Coach, zoals een rekening die nog openstaat of transacties om te sorteren, houden cliënten in beweging zonder dat jij erachteraan hoeft. De Coach tipt. Jij begeleidt de keuzes.',
        'pages.practices.proof.points.yes.title': 'Hun ja komt eerst',
        'pages.practices.proof.points.yes.body':
            'Er wordt niets gedeeld tot de cliënt accepteert, en beide kanten kunnen het beëindigen. Rustig voor hen, helder voor jou.',
        'pages.practices.detail.desk_title': 'Wat je bureau je geeft',
        'pages.practices.detail.consent_title': 'Waar je cliënten mee instemmen',
        'pages.practices.detail.consent.c1':
            'Elke koppeling begint als uitnodiging. Er wordt niets gedeeld tot de eigenaar van het huishouden accepteert.',
        'pages.practices.detail.consent.c2':
            'Jij ziet hun bord alleen-lezen. Hun cijfers blijven van hen.',
        'pages.practices.detail.consent.c3':
            'Beide kanten kunnen de koppeling op elk moment beëindigen. De cliënt houdt het eigen bord en de eigen gegevens.',
        'pages.practices.detail.consent.c4':
            'Rumtelo verplaatst nooit geld. Gegevens blijven in de EU, gehost in Amsterdam.',
        'pages.practices.pricing.eyebrow': 'PRIJZEN',
        'pages.practices.pricing.headline':
            'Eén prijs voor je praktijk. Cliënten die meekijken zijn gratis.',
        'pages.practices.pricing.lead':
            'Per praktijk per maand gefactureerd. Voeg collega’s toe als medewerkersplek. Jij bepaalt welke cliënten je op Plus sponsort.',
        'pages.practices.pricing.example':
            'Voorbeeld: jij als eerste medewerkersplek + {clients} cliënten die meekijken = {total} per maand in totaal.',
        'pages.practices.pricing.example_sponsor':
            'Sponsor er {sponsored} op Plus: + {amount} per maand.',
        'pages.practices.faq.eyebrow': 'VRAGEN',
        'pages.practices.faq.headline': 'Wat praktijken ons vragen.',
        'pages.practices.faq.replace.question': 'Vervangt dit mij?',
        'pages.practices.faq.replace.answer':
            'Nee. De Coach geeft kleine, regelgestuurde tips tussen sessies. Jij brengt het oordeel en de relatie.',
        'pages.practices.faq.privacy.question': 'Wie kan de gegevens van mijn cliënt zien?',
        'pages.practices.faq.privacy.answer':
            'Alleen jij en je medewerkers, en pas nadat de cliënt je uitnodiging accepteert. De toegang is alleen-lezen, beide kanten kunnen het op elk moment beëindigen en de gegevens blijven in de EU, gehost in Amsterdam.',
        'pages.practices.faq.bank.question': 'Moeten cliënten hun bank koppelen?',
        'pages.practices.faq.bank.answer':
            'Nee. Bedragen met de hand invoeren werkt. Plus, dat je kunt sponsoren, voegt het importeren van bankafschriften toe.',
        'pages.practices.faq.edit.question': 'Kan ik het bord van een cliënt aanpassen?',
        'pages.practices.faq.edit.answer':
            'Nee. De toegang is nu alleen-lezen. Jij begeleidt; de cliënt voert de wijziging door.',
        'pages.practices.faq.money.question': 'Verplaatst Rumtelo geld?',
        'pages.practices.faq.money.answer':
            'Nooit. Cliënten betalen en boeken over bij hun eigen bank, en Rumtelo is geen hulpmiddel om het geld van een cliënt voor hen te beheren.',
        'pages.practices.faq.cost.question': 'Wat kost het?',
        'pages.practices.faq.cost.answer':
            'Een praktijk kost {basePrice} per maand plus {staffPrice} per medewerkersplek, en jij telt als de eerste. Cliënten die meekijken zijn gratis. Het Plus-abonnement van een cliënt sponsoren kost {clientPrice} per maand per cliënt, {discount}% minder dan de {retail} per maand die ze zelf zouden betalen.',
        'pages.practices.closing.headline': 'Klaar om te zien waar je cliënten staan?',
        'pages.practices.closing.lead':
            'Start een praktijk, nodig je eerste cliënt uit en open hun bord zodra ze ja zeggen.',
        // Inbox reads as email: the list is Transactions, the count is "Te sorteren"; You = Jij.
        'common.message.error.api.month_close_incomplete':
            'Rond eerst het openstaande werk af voordat je deze maand afsluit ({inbox} transacties om te sorteren, {bills} rekeningen onbetaald of niet overgeslagen).',
        'features.coach.money_coach.inbox_unsorted.text':
            '{count} transacties wachten om gesorteerd te worden. Sorteer ze in potjes, dan blijft het beeld eerlijk.',
        'features.coach.money_coach.inbox_unsorted.cta': 'Transacties sorteren',
        // Fixed-cost tips in the household Coach feed: literal, positive, no shame.
        'features.coach.money_coach.over_necessities.text':
            'Rekeningen uit {jar} zijn {amount} per maand meer dan het potje krijgt.',
        'features.coach.money_coach.over_necessities.cta': 'Inkomen toevoegen',
        'features.coach.money_coach.over_necessities.cta_secondary':
            'Open de grootste vaste kosten',
        'features.coach.money_coach.business_leak.text':
            '{amount} per maand aan zakelijke kosten betaal je vanuit je huishouden.',
        'features.coach.money_coach.business_leak.cta': 'Bekijk deze rekeningen',
        'features.coach.money_coach.subscription_review.text_one':
            '1 abonnement kost {amount} per maand. Gebruik je het nog?',
        'features.coach.money_coach.subscription_review.text_other':
            '{count} abonnementen kosten {amount} per maand. Gebruik je ze nog allemaal?',
        'features.coach.money_coach.subscription_review.cta': 'Abonnementen bekijken',
        'features.money.transactions.tab_inbox': 'Te sorteren',
        'features.money.transactions.inbox_chip': 'Te sorteren',
        'features.money.transactions.rules_empty_body':
            'Kies “Altijd dit” bij een transactie die je nog moet sorteren om een regel aan te leren. Daarna beheer je ze hier.',
        'features.money.transactions.toast_rules_no_match': 'Geen overeenkomsten — niets gewijzigd',
        'features.money.transactions.detail.status_inbox': 'Wacht om gesorteerd te worden',
        'features.money.transactions.detail.inbox_still': 'Nog te sorteren',
        'features.tour.pages.overview.sections.what_for.body':
            'Een momentopname van de huidige periode: potjes, transacties om te sorteren, wat je al bezit en hoe de maand verloopt.',
        'features.tour.pages.transactions.sections.how.body':
            'Kies Uit of In, zeg wat het was, kies een potje en bewaar. Transacties om te sorteren blijven wachten tot je ze sorteert. Wijzigingen werken het beschikbare saldo van dezelfde periode bij.',
        'pages.dashboard.month_score.close_explain':
            'Afsluiten vergrendelt deze score en bevriest de maand. Sorteer eerst je transacties; onbetaalde rekeningen kun je bij het afsluiten doorschuiven of overslaan.',
        'pages.dashboard.month_score.close_explain_soon':
            'De maand eindigt binnenkort — sorteer je transacties en schuif onbetaalde rekeningen daarna door of sla ze over, zodat je kunt afsluiten.',
        'pages.dashboard.month_score.close_explain_today':
            'Vandaag is de laatste dag. Sorteer je transacties, schuif onbetaalde rekeningen door of sla ze over en sluit af.',
        'pages.dashboard.month_score.close_explain_overdue':
            'Deze maand had al afgesloten moeten zijn. Sorteer je transacties, schuif onbetaalde rekeningen door of sla ze over en sluit af.',
        'pages.dashboard.close_blocked_inbox_one': '1 transactie nog te sorteren',
        'pages.dashboard.close_blocked_inbox_other': '{count} transacties nog te sorteren',
        'pages.dashboard.widgets.growth.inbox': 'TE SORTEREN',
        'pages.landing.portal_features.money.f2':
            'Transacties — gesorteerd door een regel of met de hand',
        'pages.landing.portal_demo.screens.money': 'Transacties · deze week',
        'pages.nav.pills.you': 'Jij',
        'pages.nav.children.transactions': 'Transacties',
        'pages.nav.you.title': 'Jij',
        'pages.nav.you.close': 'Sluiten',
        'pages.nav.you.settings': 'Instellingen',
        'pages.nav.you.help': 'Hulp',
        'pages.nav.you.go_to_practice': 'Naar je praktijk',
        'pages.nav.you.back_to_practice': 'Terug naar je praktijk',
        'pages.nav.you.preview_group': 'Preview',
        'pages.nav.later_hint.week_check': 'Komt na je eerste weekcheck.',
        'pages.nav.later_hint.month_close': 'Komt na je eerste afgesloten maand.',
        'pages.nav.locked_hint': 'Niet in je abonnement. Opent de upgradepagina.',
        'pages.nav.to_sort_badge_sr': '{count} te sorteren',
        'pages.nav.aria.growth_sections': 'Onderdelen van Groei',
        'pages.settings.panels.coach.blurb':
            'De Coach geeft nooit een standje — alleen duidelijke volgende stappen. Tips op het scherm (waarom-regels, potjeskaarten) blijven aan terwijl je leert; de tiplijst onder Home → De Coach bevat tipkaarten over geld, groei, energie en ziel.',
        'pages.settings.panels.coach.hint_on':
            'Aan — zoek het ✦ De Coach-teken. Je tips staan onder Home → De Coach.',
        'pages.settings.panels.coach.hint_off':
            'Uit — tips op het scherm verborgen. Je tips staan altijd onder Home → De Coach.',
        'pages.settings.panels.bank.empty_linked_body':
            'Koppel een bank om transacties automatisch binnen te halen.',
        'pages.settings.panels.bank.wizard_authorize_hint':
            'Straks verlaat je Rumtelo even, log je in bij de bank en geef je alleen-lezen toegang. We verplaatsen nooit geld. Als je terugkomt, worden je transacties gesynchroniseerd en wachten ze onder Te sorteren.',
        'pages.settings.panels.bank.import_blurb':
            'Liever CAMT.053 van je bank. MT940 of CSV werkt ook. Sorteer na het importeren wat onder Te sorteren wacht en koppel passende vaste kosten.',
        'pages.shell.forms.tx_import.description':
            'Liever CAMT.053 van je bank. Rijen komen in Transacties onder Te sorteren — sorteer ze en koppel vaste kosten als ze overeenkomen.',
        // Coach redesign: one Coach line per page, literal and positive (docs/product/coach-redesign.md).
        'features.coach.line.label': 'De Coach',
        'features.coach.line.hide': 'Verberg deze tip',
        'features.coach.line.hidden': 'Tip verborgen.',
        'features.coach.line.undo': 'Ongedaan maken',
        'features.coach.line.locked_suffix': 'Plus',
        'features.coach.verdict.kind_nudge': 'Volgende stap',
        'features.coach.verdict.kind_warning': 'Even naar kijken',
        'features.coach.verdict.kind_alert': 'Deze week doen',
        'features.coach.money_coach.fixed_costs.over_necessities.text':
            'Rekeningen uit {jar} zijn {amount} per maand meer dan het potje krijgt.',
        'features.coach.money_coach.fixed_costs.business_leak.text':
            '{amount} per maand aan zakelijke kosten betaal je vanuit je huishouden.',
        'features.coach.money_coach.fixed_costs.subscription_review.text_one':
            '1 abonnement kost {amount} per maand. Gebruik je het nog?',
        'features.coach.money_coach.fixed_costs.subscription_review.text_other':
            '{count} abonnementen kosten {amount} per maand. Gebruik je ze nog allemaal?',
        'features.coach.money_coach.fixed_costs.over_necessities.cta': 'Inkomen toevoegen',
        'features.coach.money_coach.fixed_costs.over_necessities.cta_secondary':
            'Open de grootste vaste kosten',
        'features.coach.money_coach.fixed_costs.business_leak.cta': 'Bekijk gekoppelde rekeningen',
        'features.coach.money_coach.fixed_costs.subscription_review.cta': 'Abonnementen bekijken',
        'features.coach.jar_guide.summary': 'Waar is {jar} voor?',
        // Extra seats on the plan panel: "plek", not DeepL's "stoel"/"zitplaats".
        'pages.settings.panels.plan.seat_addon_eyebrow': 'Extra plekken',
        'pages.settings.panels.plan.seat_addon_blurb':
            'Ruimte voor nog iemand op het bord: €{price} per maand per plek, samen met je abonnement.',
        'pages.settings.panels.plan.seat_contributor': 'Plek voor een lid (mag bewerken)',
        'pages.settings.panels.plan.seat_viewer': 'Plek voor een kijker (kijkt mee)',
        'pages.settings.panels.plan.seat_count_active':
            '{count, plural, one {# extra plek} other {# extra plekken}}',
        'pages.settings.panels.plan.seat_count_none': 'Geen extra plekken',
        'features.coach.split_more': '{count, plural, =1 {Nog 1 tip} other {Nog # tips}}',
        'features.money.jars.coach_line.necessities_over':
            '{jar} heeft deze maand {amount} meer nodig dan het krijgt.',
        'features.money.jars.coach_line.open_fixed': 'Open vaste kosten',
        'features.money.business_household_leak.line':
            '{amount} per maand aan zakelijke kosten betaal je vanuit je huishouden.',
        'features.money.household_profile.filter_hint':
            'Sommige soorten rekeningen zijn verborgen door je huishoudprofiel.',
        'features.money.fixed.could_cancel': 'Kun je opzeggen?',
        'features.growth.income_simulator.eyebrow': '✦ Jouw doel',
        'features.growth.income_simulator.target_line': '{amount} per maand netto',
        'features.growth.income_simulator.gap_to_go': 'nog {amount}',
        'features.growth.income_simulator.gap_met': 'Doel bereikt',
        'features.growth.income_simulator.gap_over': '{amount} boven je doel',
    },
    es: {
        // Kept as translated before: the generator without a DeepL key would drop them to English.
        'common.message.error.api.course_period_full':
            'Aquí el límite es cinco. Termina uno, muévelo o déjalo ir primero.',
        'common.message.error.api.course_scope_invalid':
            'Solo un objetivo anual, trimestral o mensual puede ser personal o profesional',
        // ICU plurals are skipped by DeepL; pinned so they do not stay English.
        'pages.dashboard.next_move.inbox.title':
            '{count, plural, one {# transacción por ordenar — unos {minutes, plural, one {# minuto} other {# minutos}}.} other {# transacciones por ordenar — unos {minutes, plural, one {# minuto} other {# minutos}}.}}',
        'pages.dashboard.next_move.viewer.inbox':
            '{count, plural, one {# transacción esperando a ser ordenada.} other {# transacciones esperando a ser ordenadas.}}',
        'pages.dashboard.next_move.viewer.close_month':
            '{month} se cierra en {days, plural, one {# día} other {# días}}.',
        'pages.dashboard.checklist.title':
            '{count, plural, one {Una cosa pequeña, cuando te venga bien.} other {# cosas pequeñas, cuando te vengan bien.}}',
        'pages.shell.plan_gains.bank_links':
            '{count, plural, one {# conexión bancaria} other {# conexiones bancarias}}',
        'pages.nav.to_sort_badge_sr': '{count} por ordenar',
    },
    fr: {
        // Kept as translated before: the generator without a DeepL key would drop them to English.
        'common.message.error.api.course_period_full':
            'Ici, on ne peut pas en avoir plus de cinq. Finis-en un, déplace-en un ou laisse-en un.',
        'common.message.error.api.course_scope_invalid':
            'Seul un objectif annuel, trimestriel ou mensuel peut être personnel ou professionnel',
        // ICU plurals are skipped by DeepL; pinned so they do not stay English.
        'pages.dashboard.next_move.inbox.title':
            '{count, plural, one {# transaction à trier — environ {minutes, plural, one {# minute} other {# minutes}}.} other {# transactions à trier — environ {minutes, plural, one {# minute} other {# minutes}}.}}',
        'pages.dashboard.next_move.viewer.inbox':
            '{count, plural, one {# transaction en attente de tri.} other {# transactions en attente de tri.}}',
        'pages.dashboard.next_move.viewer.close_month':
            '{month} se clôture dans {days, plural, one {# jour} other {# jours}}.',
        'pages.dashboard.checklist.title':
            '{count, plural, one {Une petite chose, quand ça t’arrange.} other {# petites choses, quand ça t’arrange.}}',
        'pages.shell.plan_gains.bank_links':
            '{count, plural, one {# connexion bancaire} other {# connexions bancaires}}',
        'pages.nav.to_sort_badge_sr': '{count} à trier',
    },
};
