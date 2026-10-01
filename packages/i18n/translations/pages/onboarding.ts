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
        'We ask a few basics so Rumtelo can set up your household. Approximate is fine — you can change this later.',
    jars: 'The six jars',
    jars_body:
        'Each jar has one job. The starting split is 55 / 10 / 10 / 10 / 10 / 5 — pay bills, then yourself, then joy and giving. Change percentages later.',
    jars_tap_hint: 'Tap a jar to learn why it exists.',
    jars_read_more: 'Read more about the six jars method',
    money_style: 'How you handle money',
    money_style_body:
        'There are no right answers. Soft labels only, so tips fit you. Partners in the same household can choose differently later.',
    coach: 'The Coach stays with you',
    coach_body:
        'Short tips on screen (marked ✦ The Coach) stay on while you learn — helpful, never shaming. Open The Coach anytime for next steps. Turn tips off later in Settings → Preferences.',
    coach_points: {
        tips: 'On-screen tips while you learn',
        open: 'Open The Coach anytime',
        settings: 'Turn tips off in Settings',
    },
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
    net_income_label: 'Net monthly income ({symbol})',
    net_income_hint:
        'What usually lands after tax — roughly is enough. We use it to fill your jars.',
    household_name: 'Household name',
    household_name_hint:
        'A name for your shared money space — e.g. your family name. You can rename it anytime.',
    household_default: 'My household',
    spending_style_label: 'I tend to…',
    spending_style_hint: 'Helps The Coach suggest tips that match how you spend.',
    spending_styles: {
        spender: 'Spender',
        saver: 'Saver',
        balanced: 'Balanced',
        unknown: 'Not sure',
    },
    income_stability_label: 'Income month to month',
    income_stability_hint: 'Stable or varying income changes how careful we are with tips.',
    income_stability: {
        stable: 'Stable',
        variable: 'Variable',
        none: 'None',
    },
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

    // ── Step: banks ───────────────────────────────────────────────────────
    banks: 'Your bank accounts',
    banks_body:
        'Rumtelo tracks which jar your money lives in. Tell us what you use and we will set up your account seats — or skip this later.',

    jar_experience_label: 'How familiar are you with banking by jars?',
    jar_experience_hint: 'No wrong answer — this only affects which setup steps we suggest.',
    jar_experience_options: {
        new_label: 'Brand new to it',
        new_hint: 'I have accounts but no jar system yet',
        familiar_label: 'I know the idea',
        familiar_hint: 'I get it but have not set accounts up yet',
        set_up_label: 'Already set up',
        set_up_hint: 'I already bank like jars — just log my seats',
    },

    bank_account_count_label: 'How many bank accounts do you use for everyday money?',
    bank_account_count_hint: 'Savings pots at the same bank count too.',
    bank_account_count_options: {
        one_label: 'One account',
        one_hint: 'I keep everything in one place',
        two_label: 'Two accounts',
        two_hint: 'Usually a checking and a savings',
        three_plus_label: 'Three or more',
        three_plus_hint: 'I spread money across multiple accounts',
    },

    // ── Continuation overlay (bank setup after onboarding) ────────────────
    banks_setup: {
        accounts_title: 'Add your accounts',
        accounts_body:
            'We will create a spot for each seat so jars know where to look. Rename them any time in Settings.',
        map_title: 'Assign jars to accounts',
        map_body: 'Pick which account each jar lives in. Change this any time in Settings → Jars.',
        bank_label: 'Bank',
        account_name_label: 'Account name',
        kind_label: 'Type',
        creating: 'Creating…',
        saving: 'Saving…',
        skip: 'Skip for now',
        finish: 'All set',
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
                'With one account Rumtelo still shows each jar balance separately — only the physical seat is shared.',
            two_accounts:
                'Freedom and Long-term Savings sit in your savings account — higher interest, same jar tracking.',
            three_plus:
                'Each jar gets its own seat. Money stays separate and Rumtelo knows exactly where it is.',
            familiar:
                'We have set up one seat per account. Map each jar after you create the accounts.',
            already_set_up:
                'Just record your existing seats. Rumtelo will not touch your real accounts.',
        },
    },
} as const;

export default onboarding;
