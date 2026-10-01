const onboarding = {
    welcome: 'Welcome to Rumtelo',
    welcome_body:
        'Rumtelo helps you see where your money goes — calmly. We split income into six jars so you always know what is for bills, saving, and living. No finance degree needed.',
    welcome_points: {
        jars: 'Six jars with a job',
        overview: 'One calm overview',
        coach: 'Tips without shame',
    },
    income: 'Your income',
    income_body:
        'This is your personal income — yours as the person creating this account for yourself. Approximate is fine. Next you will name the bank account where it lands.',
    jars: 'The six jars',
    jars_body:
        'Each jar has one job. Below, choose how many bank accounts you want to use — the list updates to match. Starting split 55 / 10 / 10 / 10 / 10 / 5; change later.',
    jars_tap_hint: 'Tap a jar to learn why it exists. Then choose how many bank accounts you use.',
    jars_read_more: 'Read more about the six jars method',
    why: 'Your dream',
    why_body:
        'In one short sentence: why do you want Rumtelo — or what dream are you working toward? We put it on your dashboard as a small reminder of what you are working for.',
    why_tip: 'Write a dream or a reason — not a number. Keep it simple.',
    why_label: 'Your dream or reason',
    why_hint: 'Shown on your dashboard as a reminder. You can change it later.',
    why_placeholder: 'e.g. A house in the sun, sea & fresh fruit',
    why_examples: {
        house: 'A house in the sun',
        calm: 'More calm around money',
        free: 'Freedom to choose my path',
    },
    currency: 'Currency',
    currency_hint: 'Amounts and jars use this currency for this household.',
    net_income_label: 'Your net monthly income ({symbol})',
    net_income_hint:
        'What usually lands in your account after tax — roughly is enough. We use it to fill your jars, and connect it to the bank account you set up next.',
    household_name: 'Household name',
    household_name_hint:
        'A name for your shared money space — e.g. your family name. You can rename it anytime.',
    household_default: 'My household',
    step_of: 'Step {current} of {total}',
    back: 'Back',
    next: 'Next',
    start: 'Start',
    creating: 'Creating…',
    setup_failed: 'Setup failed — please try again',
    dialog_label: 'Welcome to Rumtelo',
    household_created: 'Household created',
    continue: 'Continue',
    finish: 'Open Rumtelo',
    skip: 'Skip for now',

    // ── Jar ↔ bank structure (one-time choice) ─────────────────────────────
    bank_account_count_label: 'How many bank accounts do you want to use?',
    bank_account_count_hint: 'You name them next — for now just pick how many.',
    bank_account_count_options: {
        one_label: 'Everything on one account',
        one_hint:
            'All jars on your checking account. Rumtelo still tracks each jar’s balance separately.',
        two_label: 'Checking + savings',
        two_hint: 'Daily jars on checking; Freedom and Long-term Savings on a savings account.',
        three_plus_label: 'One account per jar',
        three_plus_hint: 'Most separation — each jar on its own bank account.',
    },

    // ── Bank accounts after household create ──────────────────────────────
    banks_setup: {
        accounts_title: 'Name your accounts',
        accounts_body:
            'These match what you just picked. Choose your bank — you can rename them later in Settings.',
        map_title: 'Link jars to accounts',
        map_body:
            'Pick which bank account each jar lives in. Change this any time in Settings → Jars.',
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
            main_checking: 'Main checking',
            savings: 'Savings',
            freedom: 'Freedom savings',
            lts: 'Long-term savings',
            education: 'Education savings',
            play: 'Play savings',
            give: 'Give savings',
            seat_2: 'Second account',
            seat_3: 'Third account',
        },
        tips: {
            one_account:
                'With one account Rumtelo still shows each jar balance separately — only the bank account is shared.',
            two_accounts:
                'Freedom and Long-term Savings sit on savings — often better interest, same jar tracking.',
            three_plus:
                'Each jar gets its own account. Money stays separate and Rumtelo knows exactly where it is.',
            familiar:
                'We set up one Rumtelo account per bank account. Link each jar after you create them.',
            already_set_up:
                'Just record the accounts you already have. Rumtelo will not touch your real bank.',
        },
    },
} as const;

export default onboarding;
