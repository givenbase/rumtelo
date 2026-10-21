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
            'Drie is hier het maximum. Rond er eerst één af, verplaats er één of laat er één los.',
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
        'features.growth.course.title_goals': 'Doelen',
        'features.growth.course.lead_goals':
            'Waar de weken heen leiden: je doelen en de mijlpalen van deze maand.',
        'features.growth.course.section_checks': 'Checks',
        'features.growth.course.section_focus_week': 'Jouw 3 voor deze week',
        'features.growth.course.section_focus_day': 'Jouw 3 voor vandaag',
        'features.growth.course.section_routines': 'Je routines',
        'features.growth.course.section_routines_today': 'Routines vandaag',
        'features.growth.course.section_advice': 'Advies',
        'features.growth.course.goals_year': 'Doelen {year}',
        'features.growth.course.goals_month': '{month}: mijlpalen',
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
        'features.growth.course.lead_quarter':
            'Resultaten voor dit kwartaal, tussen je doelen en de maand.',
        'features.growth.course.status.OPEN': 'Open',
        'features.growth.course.status.MISSED': 'Niet gelukt',
        'features.growth.course.status.DROPPED': 'Losgelaten',
        'features.growth.course.status.PARTIAL': 'Deels',
        'features.growth.course.action_partial': 'Deels gelukt',
        'features.growth.course.action_missed': 'Niet gelukt',
        'features.growth.course.action_drop': 'Loslaten',
        'features.growth.course.empty_slot_week': 'Wat is een van je 3 voor deze week?',
        'features.growth.course.empty_slot_day': 'Wat is een van je 3 voor vandaag?',
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
    },
};
