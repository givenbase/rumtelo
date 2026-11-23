/** App navigation labels — resolve with `t(labelKey)` in the shell. */
const nav = {
    groups: {
        home: 'Home',
        money: 'My money',
        growth: 'My growth',
        energy: 'My energy',
        soul: 'My soul',
    },
    pills: {
        home: 'Home',
        money: 'Money',
        growth: 'Growth',
        energy: 'Energy',
        soul: 'Soul',
        you: 'You',
    },
    children: {
        coach: 'The Coach',
        why: 'Why Rumtelo',
        jars: 'Pots',
        transactions: 'Transactions',
        debt: 'Debt',
        fixed_costs: 'Fixed costs',
        course: 'Course',
        goals: 'Goals',
        income: 'Income',
        learn: 'Learn',
        net_worth: 'Net worth',
        energy_overview: 'Overview',
        week: 'Week',
        sleep: 'Sleep',
        training: 'Training',
        food: 'Food',
        soul_overview: 'Overview',
        stillness: 'Stillness',
        gratitude: 'Gratitude',
        giving: 'Giving',
        intent: 'Intent',
        centers: 'Centers',
    },
    /** You: the avatar menu on desktop, the fourth tab (a sheet) on phones. */
    you: {
        title: 'You',
        close: 'Close',
        settings: 'Settings',
        help: 'Help',
        go_to_practice: 'Go to practice',
        back_to_practice: 'Back to practice',
        preview_group: 'Preview',
    },
    /** Muted product page in its subnav: what brings it to the front. */
    later_hint: {
        week_check: 'Shows after your first week check.',
        month_close: 'Shows after your first closed month.',
    },
    /** Plan-locked product page in its subnav (screen readers; the lock icon is decorative). */
    locked_hint: 'Not in your plan. Opens the upgrade page.',
    search: {
        course_today: 'Course · Today',
        course_week: 'Course · Week',
        course_goals: 'Course · Goals',
        /** Muted line under a search hit the ladder keeps out of the menu for now. */
        deferred: {
            week_check: 'Shows in your menu after your first week check.',
            month_close: 'Shows in your menu after you close your first month.',
        },
    },
    /** You › Coming up: what the next stage adds and what brings it. */
    coming_up: {
        row: 'Coming up',
        row_next: {
            week_check: 'After your first week check',
            month_close: 'After you close your first month',
            sorting: 'After you sort a few lines',
        },
        row_aria: 'Coming up: {next}',
        title: 'Coming up',
        lead: 'Rumtelo starts with your pots, transactions and week check. More joins as your board fills in.',
        next_eyebrow: 'Next',
        trigger: {
            week_check: 'Do your first week check — ten minutes.',
            month_close: 'Close your first month.',
            sorting:
                'Sort {sorted, plural, one {# more line} other {# more lines}} or wait {days, plural, one {# day} other {# days}}.',
        },
        adds_eyebrow: 'Then your menu shows',
        adds: {
            levels: 'Your level on the month score',
        },
        search_hint: 'Every page is already open: search for it in Quick add.',
        close: 'Close',
    },
    /** "Show everything now": skip the step-by-step start (Coming up sheet + Settings › Account). */
    show_all: {
        label: 'Show everything now',
        hint_off: 'Skip the step-by-step start. You can switch back any time.',
        hint_on: 'On — you see every page your plan and role include, in every household.',
        done: 'Everything is in your menu now. Switch back in Settings › Account.',
    },
    stage_items: {
        course: 'Course',
        goals: 'Goals',
    },
    /** One quiet note when the board reaches a stage that adds menu items. */
    stage_note: {
        text: '{count, plural, one {New: {items} is now in your menu.} other {New: {items} are now in your menu.}}',
        dismiss: 'Got it',
    },
    to_sort_badge_sr: '{count} to sort',
    aria: {
        mobile_tabs: 'Main',
        money_sections: 'Money sections',
        growth_sections: 'Growth sections',
    },
} as const;

export default nav;
