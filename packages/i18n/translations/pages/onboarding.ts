const onboarding = {
    // ── Screen 1 · Your income ────────────────────────────────────────────
    income: 'Your income',
    income_lead:
        "Type what lands in your account each month. Next you'll see it split over Basics, Future and Free.",
    currency: 'Currency',
    net_income_label: 'Net monthly income',
    net_income_hint: 'After tax — what lands in your account.',
    net_income_placeholder: 'Amount per month',
    income_echo: "That's {amount} a month.",
    income_error_empty: 'Type your monthly income. Zero is fine.',
    income_error_nan: "Use numbers only, like you'd write an amount.",
    income_error_negative: "Income can't be below zero.",
    income_error_decimals: 'Use at most two decimals.',
    income_error_large: "That's above what Rumtelo handles per month. Check the amount.",

    // ── Screen 2 · Here's where it goes ───────────────────────────────────
    split_title: "Here's where your {amount} goes.",
    split_lead:
        'Three pots to start: Basics, Future, Free. Each has one job. Change the percentages any time — the habit matters more than the numbers.',
    split_list_aria: 'Your split',
    split_row_aria: '{jar}, {percent} percent, {amount}',
    /**
     * One job per pot, lowercase. Onboarding always shows the three main pots unrefined,
     * so NECESSITIES / LONG_TERM_SAVINGS / PLAY describe their whole group; the optional
     * keys match `features.money.jars.purpose` for later use.
     */
    split_jobs: {
        NECESSITIES: 'rent, bills, groceries, transport',
        LONG_TERM_SAVINGS: 'a buffer first, then goals, investing, learning',
        PLAY: 'fun, hobbies, giving — spent freely',
        DAILY: 'groceries, transport, everyday spends',
        GOALS: 'the big things you plan',
        FINANCIAL_FREEDOM: 'money set aside for you to invest — never spent',
        EDUCATION: 'courses, books, a new skill',
        GIVE: 'gifts and causes you care about',
    },
    split_refine_later:
        'Want more pots — Daily, Goals, Giving? Refine a pot later in Settings; the three percentages stay as they are.',
    split_main_account:
        'All your pots sit on one main account for now. Add your bank when it suits you.',
    split_note:
        'Rumtelo never moves money. Savings pots at your bank? Move it there yourself — we show the split.',
    split_change_later: 'Change the percentages any time in Money › Pots.',
    split_zero: 'No income yet? Your pots wait — they split it the second it lands.',
    split_cta: 'Looks right — open my board',
    split_cta_pending: 'Opening your board…',
    split_error: "We couldn't load the pots — try again.",
    onboard_error: "Your board wasn't created yet. Try again.",

    // ── Shared ────────────────────────────────────────────────────────────
    household_default_named: "{name}'s household",
    household_default: 'My household',
    step_of: '{current} of {total}',
    back: 'Back',
    next: 'Next',
    household_created: 'Household created',
    continue: 'Continue',

    // ── Bank accounts after household create ──────────────────────────────
    banks_setup: {
        accounts_title: 'Name your accounts',
        accounts_body:
            'Name the main account where money lands (Basics). Need more? Add them here — then you link the pots. You can rename later in Settings.',
        map_title: 'Link pots to accounts',
        map_body:
            'Basics stays on your main account. Put the other pots on the right savings account. Change this any time in Settings → Pots.',
        map_body_one:
            'You have one account — every pot is already linked to it. Change this later in Settings → Pots if you add more accounts.',
        read_only_link: 'Open bank settings',
        map_required: 'Choose an account for every pot before you finish.',
        bank_label: 'Bank',
        account_name_label: 'Account name',
        iban_label: 'IBAN',
        iban_optional: 'Optional — you can add this later in Settings',
        kind_label: 'Type',
        creating: 'Creating…',
        saving: 'Saving…',
        skip: 'Skip for now',
        finish: 'All set',
        back: 'Back',
        add_account: 'Add another account',
        remove_account: 'Remove',
        extra_account: 'Extra account',
        tips_title: 'Tips',
        no_accounts_yet: 'Create accounts first',
        suggested_names: {
            main_checking: 'Main account',
            savings: 'Savings',
            freedom: 'Investing',
            lts: 'Buffer',
            education: 'Learning',
            play: 'Fun',
            give: 'Giving',
        },
        preview: {
            main_account: 'Main account',
            sub_savings: 'Sub-savings',
        },
        tips: {
            one_account:
                'Start with one main account (Basics). Add spaarpotjes as extra accounts only if you already bank that way — then link each pot on the next screen.',
            familiar:
                'Start with your main account. Add any other accounts you already use, then link each pot.',
            already_set_up:
                'Just record the accounts you already have. Rumtelo will not touch your real bank.',
        },
    },
} as const;

export default onboarding;
