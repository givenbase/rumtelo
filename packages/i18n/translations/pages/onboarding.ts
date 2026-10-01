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
        'Six jars, each with one job. Money usually lands in Necessity — your main account for rent and bills. The other jars are where the rest of the split goes, often as sub-savings at the same bank. Starting split 55 / 10 / 10 / 10 / 10 / 5; change later.',
    jars_tap_hint:
        'Tap a jar to learn its job. Below, pick how your bank is set up today — we recommend starting with one main account.',
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
    bank_account_count_label: 'How is your bank set up?',
    bank_account_count_hint: 'Next you name the accounts. Unsure? Start with one main account.',
    bank_account_count_options: {
        one_label: 'One bank (recommended)',
        one_hint:
            'Salary lands on Necessity — your main account. The other jars are spaarpotjes / sub-savings at that same bank (Rumtelo tracks them separately).',
        one_help: 'What are spaarpotjes?',
        multiple_label: 'Multiple bank accounts',
        multiple_hint:
            'You have more than one real account. Next you name them and choose which jar lives where — Necessity stays on the account where money lands.',
        // Kept for older answers / tooling; not shown in the wizard.
        two_label: 'Main account + savings account',
        two_hint:
            'Necessity and daily jars on your main account; Freedom and Long-term Savings on a separate savings account.',
        three_plus_label: 'One account per jar',
        three_plus_hint: 'Each jar has its own bank account — maximum separation.',
    },

    // ── Bank accounts after household create ──────────────────────────────
    banks_setup: {
        accounts_title: 'Name your accounts',
        accounts_body:
            'Name the main account where money lands (Necessity), then any savings accounts for the other jars. You can rename them later in Settings.',
        map_title: 'Link jars to accounts',
        map_body:
            'Necessity stays on your main account. Put the other jars on the right savings account. Change this any time in Settings → Jars.',
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
            freedom: 'Freedom savings',
            lts: 'Long-term savings',
            education: 'Education savings',
            play: 'Play savings',
            give: 'Give savings',
            seat_2: 'Second account',
            seat_3: 'Third account',
        },
        preview: {
            main_account: 'Main account',
            sub_savings: 'Sub-savings',
            assign_later: 'Assign next',
        },
        tips: {
            one_account:
                'Start here if you mostly use one bank. Necessity is where money comes in; the other jars are spaarpotjes so you know how to split.',
            multiple_accounts:
                'Name your main account first (Necessity). Add any other accounts, then link each jar on the next screen.',
            two_accounts:
                'Your main account is Necessity (rent, bills). Your savings account holds Freedom and Long-term Savings — we link the jars next.',
            three_plus:
                'Each jar maps to a real account. Necessity stays the account where income lands.',
            familiar:
                'We set up one Rumtelo account per bank account. Link each jar after you create them.',
            already_set_up:
                'Just record the accounts you already have. Rumtelo will not touch your real bank.',
        },
    },
} as const;

export default onboarding;
