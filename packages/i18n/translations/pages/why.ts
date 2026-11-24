/** In-app Why manifesto — L1 grip on life + L2 each product (align with docs/explain/). */
const why = {
    title: 'Why',
    eyebrow: '✦ Why Rumtelo',
    stand_on: 'What we stand on',
    lead: 'Wondering what? All of it — your money, your life, your energy, your time. Rumtelo helps you see where it went, so nothing stays a mystery. From there you get grip again: control over what matters. Clear tools for that, and we’ll keep adding more. The Coach can give a tip. You choose what to do next.',
    lead_core:
        'Wondering what? Where your money went. Rumtelo helps you see it, so nothing stays a mystery. From there you get grip again: control over what matters. Clear tools for that, and we’ll keep adding more. The Coach can give a tip. You choose what to do next.',
    meaning_eyebrow: '✦ How Rumtelo helps you',
    meaning: {
        money_leaves_body:
            'When money leaves, you see which pot it came from — and how much is left for that job. Not a spreadsheet after the fact.',
        assign: {
            line: 'Give money a job before you spend it.',
            body: 'Income comes in and splits over Basics, Future and Free. Split first. Spend second. Rumtelo never moves money at your bank — you do. We show the overview.',
        },
        direction: {
            body: 'Looking back is only half the story. Planning helps you move forward — skills, goals, learning, and income if you want.',
        },
    },
    wider_eyebrow: '✦ Products. One idea: grip on life.',
    wider_lead_full:
        'Open a product when you want that tool. Today you can use Money, Planning, Energy, and Mindset — and more will come. The Coach gives a tip. You decide.',
    wider_lead_core:
        'Open a product when you want that tool. Money and Planning are ready today — more will come. The Coach gives a tip. You decide.',
    portals: {
        money: {
            line: 'Grip on your money.',
            body: 'Basics, Future, Free. Income, bills, what’s left. You enter what comes in and goes out. Rumtelo shows the split — not a budget app that only counts afterwards.',
        },
        growth: {
            line: 'Grip on your growth.',
            body: 'Skills, goals, learning — and income, if you want. Money can be one path. The point is that you move forward.',
        },
        energy: {
            line: 'Grip on your energy.',
            body: 'Sleep, hours, training, food — things you can see and change. When you’re tired, money choices get harder. When you’re rested, you decide better.',
        },
        soul: {
            line: 'Grip on your why.',
            body: 'A quiet minute, gratitude, an intention, giving — small habits that keep you clear when life gets hard.',
        },
    },
    closing_title: 'You stay in control.',
    closing_body:
        'See where it went. Get grip again. New here or already on your way: clear tools, tips you can act on. Information, never shame — spent more than planned is a signal to adjust, not a judgment on you.',
    cta_jars: 'View my pots',
    cta_week_check: 'Week check',
    /** One-line Coach whisper above page content — keyed by route slug, not path. */
} as const;

export default why;
