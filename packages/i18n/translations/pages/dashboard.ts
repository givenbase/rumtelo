const dashboard = {
    month_score: {
        eyebrow: '✦ Month score',
        label: 'Score',
        days_left_one: '1 day left',
        days_left_other: '{count} days left',
        /** Last calendar day of an open period. */
        last_day: 'Last day to close',
        /** Past period end and still open. */
        overdue: 'Overdue',
        overdue_days_one: '1 day overdue',
        overdue_days_other: '{count} days overdue',
        /** Persistent badge when this period’s score is locked. */
        closed_badge: 'Closed',
        closed_hint:
            'This month is closed — the score stays as it was, and nothing can be added or changed for this period.',
        /** Why close matters — shown while the period is still open. */
        close_explain:
            'Closing locks this score and freezes the month. Clear the inbox first; unpaid bills can be carried or skipped when you close.',
        close_explain_soon:
            'The month ends soon — clear the inbox, then carry or skip unpaid bills so you can close.',
        close_explain_today:
            'Today is the last day. Finish the inbox, then carry or skip unpaid bills and close.',
        close_explain_overdue:
            'This month is overdue to close. Finish the inbox, then carry or skip unpaid bills and close it.',
        /** Compact period-travel note (lives here instead of a Coach slide). */
        travel_past_one: '{stamp} · about {money} through jars over {horizon} month',
        travel_past_other: '{stamp} · about {money} through jars over {horizon} months',
        travel_ahead_one: 'By {stamp} · about {money} through jars over {horizon} month',
        travel_ahead_other: 'By {stamp} · about {money} through jars over {horizon} months',
        travel_jar: '{name} {from} → {to}',
    },
    close_month: 'Close month',
    /** Second click on ConfirmActionButton / coach close CTA. */
    close_month_confirm: 'Are you sure? Close this month',
    /** Second click when unpaid bills need skip/carry choices. */
    close_month_review_bills: 'Review unpaid bills',
    close_bills_title: 'Unpaid bills this month',
    close_bills_body:
        'Choose for each bill: carry it into next month (you’ll owe more then), or skip it for this period.',
    close_bills_roll: 'Carry forward',
    close_bills_skip: 'Skip',
    close_bills_roll_hint: 'Next month you’ll owe {due} ({count}× this bill).',
    close_bills_roll_debt_hint:
        'After this carry ({count} months open), register it as a debt on Fixed costs — with collection fees and a payment plan if needed.',
    close_bills_skip_hint: 'This month won’t count — next month starts fresh at 1×.',
    close_bills_confirm: 'Close month',
    /** Shown above Close when inbox / bills still open. */
    close_blocked_title: 'Finish these before closing this month',
    close_blocked_inbox_one: '1 unsorted transaction in the inbox',
    close_blocked_inbox_other: '{count} unsorted transactions in the inbox',
    close_blocked_bills_one: '1 unpaid bill — choose carry or skip when you close{names}',
    close_blocked_bills_other: '{count} unpaid bills — choose carry or skip when you close{names}',
    close_blocked_bill_names: ' ({list})',
    close_blocked_open_bills: 'Open bills ▸',
    /** Soft sequential-close: finish an earlier month before locking this one. */
    prior_open_title: 'Finish the earlier month first',
    prior_open_body:
        '{period} is still open. Close months in order so the score and log stay consistent.',
    prior_open_cta: 'Go to {period} ▸',
    closing: 'Closing…',
    month_closed: 'Month closed',
    /** Toast after close — recap is the surplus/overspent line. */
    month_closed_toast: 'Month closed · {recap}',
    close_failed: 'Could not close month',
    levels: {
        '1': 'Beginner',
        '2': 'Navigator',
        '3': 'Steersman',
        '4': 'Captain',
        '5': 'Compass',
        unlocks: {
            six_jars: 'Six jars',
            inbox: 'Inbox',
            week_check: 'Week check',
            goals: 'Goals',
            debts: 'Debts',
            energy_layer: 'Energy layer',
            coach: 'Coach',
            export: 'Export',
        },
    },
    recap: {
        money_what: 'spent this week',
        growth_what: 'income growth/year',
        energy_what: 'trained this week',
        soul_what: 'stillness today',
        surplus: '{amount} left this period',
        overspent: 'One or more jars are overspent',
    },
    household: {
        eyebrow: 'Your household',
        blurb: 'People on this board, and any Practice coach who asked to look along.',
        open_settings: 'Manage people',
        open_practice: 'Manage coaches',
        members_label: 'People',
        members_hint: 'Members with access to this board',
        practice_label: 'Practice',
        practice_hint: 'External coaches — dual consent',
        practice_none: 'No coach linked',
        practice_pending: '{count, plural, one {# invite pending} other {# invites pending}}',
        practice_active: '{count, plural, one {Linked · {name}} other {# Practices linked}}',
        attention_eyebrow: 'Needs your OK',
        attention_blurb:
            'A Practice asked to view or manage this board. Accept only if you know them.',
    },
    coach: {
        inbox_one: '{count} transaction waiting for a jar.',
        inbox_many: '{count} transactions waiting for a jar.',
        all_sorted: 'All sorted — time for intention.',
        sort_inbox: 'Sort inbox',
        week_check: 'Week check',
        see_jars: 'See jars',
        practice_pending_one:
            'A Practice invitation is waiting — accept in settings if you want them on your board.',
        practice_pending_many:
            '{count} Practice invitations are waiting — accept in settings if you want them on your board.',
        practice_pending_cta: 'Review invite',
    },
    hero: {
        money_accumulated: 'Money · Accumulated through {period}',
        money_put_through: 'Money · Put through over {months} months',
        money_put_through_one: 'Money · Put through over 1 month',
        money_distributed: 'Money · Distributed this month',
        money_allocated_month: 'Money · Allocated this month',
        income_span: 'Across {months} months · {jars} jars',
        income_span_one_jar: 'Across {months} months · 1 jar',
        income_month: 'Distributed across {jars} jars',
        income_month_one_jar: 'Distributed across 1 jar',
        see_income: 'See income ▸',
        six_jars: '✦ The six jars',
        see_all_jars: 'See all ▸',
    },
    travel: {
        goals_on_track: '{fulfilled}/{total} goals on track by then',
        debt_cleared: 'Debt cleared by then',
        debt_shift: 'Debt {from} → {to}',
        delta_months: '{delta} · {months} mo',
    },
    stats: {
        avg_left: 'Avg left/month',
        safe_per_day: 'Safe per day',
        play_left: 'Left in Play',
    },
    open_portal: 'Open ▸',
    widgets: {
        growth: {
            income_month: 'INCOME THIS MONTH',
            income_span: 'INCOME OVER SPAN',
            inbox: 'INBOX',
            tagline: 'Cutting costs has a floor; raising income does not.',
        },
        energy: {
            trained: 'TRAINED THIS WEEK',
            sleep: 'SLEEP SCORE',
            tagline: 'A tired mind spends; a rested mind directs.',
        },
        soul: {
            stillness: 'STILLNESS TODAY',
            why: 'WHY',
            tagline: 'A calm mind directs money. A restless one spends it.',
        },
    },
} as const;

export default dashboard;
