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
        'Tap a jar to learn its job. Next you name the account where money lands — start with one main account; add more later if you need them.',
    jars_read_more: 'Read more about the six jars method',
    jars_spaarpotjes_help: 'What are spaarpotjes?',
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

    // ── Bank accounts after household create ──────────────────────────────
    banks_setup: {
        accounts_title: 'Name your accounts',
        accounts_body:
            'Name the main account where money lands (Necessity). Need more? Add them here — then you link the jars. You can rename later in Settings.',
        map_title: 'Link jars to accounts',
        map_body:
            'Necessity stays on your main account. Put the other jars on the right savings account. Change this any time in Settings → Jars.',
        map_body_one:
            'You have one account — every jar is already linked to it. Change this later in Settings → Jars if you add more accounts.',
        map_required: 'Choose an account for every jar before you finish.',
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
        },
        preview: {
            main_account: 'Main account',
            sub_savings: 'Sub-savings',
        },
        tips: {
            one_account:
                'Start with one main account (Necessity). Add spaarpotjes as extra accounts only if you already bank that way — then link each jar on the next screen.',
            familiar:
                'Start with your main account. Add any other accounts you already use, then link each jar.',
            already_set_up:
                'Just record the accounts you already have. Rumtelo will not touch your real bank.',
        },
    },
} as const;

export default onboarding;
