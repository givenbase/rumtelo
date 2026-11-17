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
        /** Screen-reader prefix for the level name next to the score. */
        level_sr: 'Level: {level}',
    },
    close_month: 'Close month',
    close_bills_title: 'Unpaid bills this month',
    close_bills_body:
        'Choose for each bill: carry it into next month (you’ll owe more then), or skip it for this period.',
    close_bills_roll: 'Carry forward',
    close_bills_skip: 'Skip',
    close_bills_roll_hint: 'Next month you’ll owe {due} ({count}× this bill).',
    close_bills_roll_debt_hint:
        'After this carry ({count} months open), register it as a debt on Fixed costs — with collection fees and a payment plan if needed.',
    close_bills_skip_hint: 'This month won’t count — next month starts fresh at 1×.',
    /** Shown above Close when inbox / bills still open. */
    close_blocked_title: 'Finish these before closing this month',
    close_blocked_inbox_one: '1 unsorted transaction in the inbox',
    close_blocked_inbox_other: '{count} unsorted transactions in the inbox',
    close_blocked_bills_one: '1 unpaid bill — choose carry or skip when you close{names}',
    close_blocked_bills_other: '{count} unpaid bills — choose carry or skip when you close{names}',
    close_blocked_bill_names: ' ({list})',
    /** Soft sequential-close: finish an earlier month before locking this one. */
    prior_open_title: 'Finish the earlier month first',
    prior_open_body:
        '{period} is still open. Close months in order so the score and log stay consistent.',
    closing: 'Closing…',
    month_closed: 'Month closed',
    /** Toast after close — recap is the surplus/overspent line. */
    month_closed_toast: 'Month closed · {recap}',
    close_failed: 'Could not close month',
    /** Close-month sheet opened from the Home next move (prior month first, then Inbox, then bills). */
    close_flow: {
        title: 'Close {month}',
        prior_first: 'Close {prior} first — months close in order.',
        prior_first_cta: 'Close {prior}',
        prior_done: '{month} closed.',
        inbox_first:
            '{count, plural, one {# line from {month} is still in your Inbox.} other {# lines from {month} are still in your Inbox.}}',
        inbox_first_cta: 'Sort them',
        inbox_first_reason: 'Sort the Inbox first, then close.',
        confirm_body:
            'You’ll see your score and carry what’s left into next month. A closed month can’t be changed.',
        bills_tail: 'A closed month can’t be changed.',
        close_cta: 'Close {month}',
        already_closed: '{month} is already closed.',
        done: 'Done',
        not_now: 'Not now',
        load_error: 'Couldn’t load {month}.',
        close_error_fallback: 'Couldn’t close {month}. Check your connection and try again.',
    },
    levels: {
        '1': 'Beginner',
        '2': 'Navigator',
        '3': 'Steersman',
        '4': 'Captain',
        '5': 'Compass',
    },
    recap: {
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
    /** Home's one next move (product state, not a Coach tip). */
    next_move: {
        eyebrow: 'Next move',
        close_month: {
            title: "Close {month}: see your score and carry what's left.",
            cta: 'Close month',
        },
        no_transactions: {
            title: 'Your jars are filled. Now see where it goes.',
            body: "Add this week's spending — by hand or import a bank statement. Next week, your first week check takes ten minutes.",
            body_basic:
                "Add this week's spending as it happens. Next week, your first week check takes ten minutes.",
            cta: 'Add a transaction',
            import: 'Import a statement',
        },
        zero_income: {
            title: 'No income yet? Add it when it lands — your jars split it the same second.',
            cta: 'Add income',
        },
        inbox: {
            title: '{count, plural, one {# line in your Inbox — about {minutes, plural, one {# minute} other {# minutes}}.} other {# lines in your Inbox — about {minutes, plural, one {# minute} other {# minutes}}.}}',
            cta: 'Sort the Inbox',
        },
        week_check: {
            title: 'Inbox clear. Your week check is ready — ten minutes.',
            cta: 'Start week check',
        },
        calm: {
            title: 'Every euro has a job. Next week check: {weekday}.',
            title_other_currency: 'Every amount has a job. Next week check: {weekday}.',
            link: 'See your jars',
        },
        viewer: {
            close_prior: '{month} is ready to close.',
            no_transactions: 'No spending added yet.',
            inbox: '{count, plural, one {# line waiting in the Inbox.} other {# lines waiting in the Inbox.}}',
            week_check: "This week's check is still open.",
            close_month: '{month} closes in {days, plural, one {# day} other {# days}}.',
        },
        travel_note: 'About today, not {period}.',
        error: "Couldn't load your next move.",
    },
    /** Week-1 setup list on Home (links only, hide is OWNER only). */
    checklist: {
        eyebrow: 'Setting up · {done} of {total} done',
        title: '{count, plural, one {One small thing, when it suits you.} other {# small things, when it suits you.}}',
        hide: 'Hide',
        hide_aria: 'Hide the setup list for everyone in this household',
        done: 'Done',
        invited: 'Invited — waiting for them',
        items: {
            bank: 'Add your bank to your main account',
            dream: 'Write down your dream',
            invite: 'Invite your partner',
        },
    },
    coach: {
        all_tips: 'All tips ({count})',
        inbox_one: '{count} transaction waiting for a jar.',
        inbox_many: '{count} transactions waiting for a jar.',
        all_sorted: 'All sorted — time for intention.',
        week_check: 'Week check',
        see_jars: 'See jars',
        practice_pending_one:
            'A Practice invitation is waiting — accept in settings if you want them on your board.',
        practice_pending_many:
            '{count} Practice invitations are waiting — accept in settings if you want them on your board.',
        practice_pending_cta: 'Review invite',
    },
    hero: {
        money_accumulated: 'Money · {period}',
        money_put_through: 'Money · Put through over {months} months',
        money_put_through_one: 'Money · Put through over 1 month',
        money_distributed: 'Money · Distributed this month',
        money_allocated_month: 'Money · Allocated this month',
        income_span: 'Across {months} months · {jars} jars',
        income_span_one_jar: 'Across {months} months · 1 jar',
        income_month: 'Distributed across {jars} jars',
        income_month_one_jar: 'Distributed across 1 jar',
        see_income: 'See income ▸',
        in_pots_label: 'In the pots',
        in_pots_hint: 'Built up over the months',
        six_jars: '✦ The six jars',
        see_all_jars: 'See all ▸',
    },
    travel: {
        goals_on_track: '{fulfilled}/{total} goals on track by then',
        debt_cleared: 'Debt cleared by then',
        debt_shift: 'Debt {from} → {to}',
        delta_months: '{delta} · {months} mo',
        /** Looking Back income/allocation shift vs this month (no horizon stack). */
        delta_vs_now: '{delta} · vs now',
    },
    stats: {
        avg_left: 'Avg left',
        safe_per_day: 'Safe / day',
        play_left: 'In Play',
    },
    open_portal: 'Open ▸',
    why: {
        label: 'Your dream',
    },
    widgets: {
        growth: {
            income_month: 'INCOME THIS MONTH',
            income_span: 'INCOME OVER SPAN',
            inbox: 'INBOX',
            tagline: 'Grip on your growth — skills, goals, income if you want.',
        },
        energy: {
            trained: 'TRAINED THIS WEEK',
            sleep: 'SLEEP SCORE',
            tagline: 'Grip on your energy — the floor under every decision.',
        },
        soul: {
            stillness: 'STILLNESS TODAY',
            why: 'WHY',
            tagline: 'Grip on your why — calm under the numbers.',
        },
    },
} as const;

export default dashboard;
