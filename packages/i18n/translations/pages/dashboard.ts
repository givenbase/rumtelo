const dashboard = {
    month_score: {
        eyebrow: '✦ Month score',
        label: 'Score',
        days_left_one: '1 day left',
        days_left_other: '{count} days left',
        /** Persistent badge when this period’s score is locked. */
        closed_badge: 'Closed',
        closed_hint:
            'This month is closed — the score stays as it was, and nothing can be added or changed for this period.',
        /** Why close matters — shown while the period is still open. */
        close_explain:
            'Closing locks this score and freezes the month. Clear the inbox and bills first so the log stays honest.',
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
    /** Shown above Close when inbox / bills still open. */
    close_blocked_title: 'Finish these before closing this month',
    close_blocked_inbox_one: '1 unsorted transaction in the inbox',
    close_blocked_inbox_other: '{count} unsorted transactions in the inbox',
    close_blocked_bills_one: '1 bill still unpaid or unskipped{names}',
    close_blocked_bills_other: '{count} bills still unpaid or unskipped{names}',
    close_blocked_bill_names: ' ({list})',
    close_blocked_open_bills: 'Open bills ▸',
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
    coach: {
        inbox_one: '{count} transaction waiting for a jar.',
        inbox_many: '{count} transactions waiting for a jar.',
        all_sorted: 'All sorted — time for intention.',
        sort_inbox: 'Sort inbox',
        week_check: 'Week check',
        see_jars: 'See jars',
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
