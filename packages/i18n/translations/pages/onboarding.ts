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
        'Short tips on screen (marked ✦ The Coach) stay on while you learn — helpful, never shaming. Open The Coach anytime for next steps. Turn tips off later in Settings → Account.',
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
} as const;

export default onboarding;
