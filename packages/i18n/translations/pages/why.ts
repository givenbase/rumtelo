/** In-app Why manifesto — L1 grip on life + L2 each product (align with docs/explain/). */
const why = {
    title: 'Why',
    eyebrow: '✦ Why Rumtelo',
    stand_on: 'What we stand on',
    lead: 'Wondering what? All of it — your money, your life, your energy, your time. Rumtelo helps you see where it went, so nothing stays a mystery. From there you get grip again: control over what matters. Clear tools for that, and we’ll keep adding more. The Coach can give a tip. You choose what to do next.',
    meaning_eyebrow: '✦ How Rumtelo helps you',
    meaning: {
        money_leaves_body:
            'When money leaves, you see which jar it came from — and how much is left for that job. Not a spreadsheet after the fact.',
        assign: {
            line: 'Give money a job before you spend it.',
            body: 'Income comes in and goes into six jars. Split first. Spend second. Rumtelo never moves money at your bank — you do. We show the overview.',
        },
        direction: {
            body: 'Looking back is only half the story. Growth helps you move forward — skills, goals, learning, and income if you want.',
        },
    },
    wider_eyebrow: '✦ Products. One idea: grip on life.',
    wider_lead_full:
        'Open a product when you want that tool. Today you can use Money, Growth, Energy, and Soul — and more will come. The Coach gives a tip. You decide.',
    wider_lead_core:
        'Open a product when you want that tool. Money and Growth are ready today — more will come. The Coach gives a tip. You decide.',
    portals: {
        money: {
            line: 'Grip on your money.',
            body: 'Six jars. Income, bills, what’s left. You enter what comes in and goes out. Rumtelo shows the plan — not a budget app that only counts afterwards.',
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
    cta_jars: 'View my jars',
    cta_week_check: 'Week check',
    /** One-line Coach whisper above page content — keyed by route slug, not path. */
    routes: {
        home: 'One look: where did it go this month — and do you have grip again?',
        money_jars:
            'This month, divided before it starts. Money with a job never has to be defended.',
        money_transactions:
            'You do not track spending to judge yourself — you track it to see where your life leaks.',
        money_debt:
            'Debt is rented time. Every coin of interest is an hour of your life someone else directs.',
        money_fixed_costs:
            'Fixed costs are decisions you made once and pay for monthly. Review them like decisions.',
        growth_goals:
            "A goal turns this month's surplus into something that lasts. With a date and a jar it is a plan.",
        growth_net_worth:
            'What you already own is working — or costing — every month. That is not a wish.',
        energy_week:
            'Your hours are your capacity. Divided on purpose, or by whoever asks loudest.',
        energy_sleep:
            'Sleep is the floor the jars stand on. Cut it and every other number quietly drops.',
        soul_stillness:
            'A calm mind directs money. A restless one spends it and calls that a decision.',
        soul_gratitude: 'Someone who sees what he already has buys less to fill a hole.',
        soul_giving:
            'A fixed share that leaves before you can hold it keeps money a tool, not a master.',
        soul_intent: 'An intention is an instruction to yourself. A resolution is a hope.',
        soul_centers: 'Name where it feels stuck, and the next step usually names itself.',
        growth_income: 'Cutting costs has a floor. Raising income does not.',
        growth_learn: 'A book you cannot name a use for was Play spending, not Education.',
        growth_learn_library:
            'We recommend what to get and who to support. We never host the work.',
        energy_training: 'Training is the only spend that raises the value of every other hour.',
        energy_food: 'Food is fuel for the week your jars divide. Fuel is bought, not willed.',
        money_week_check:
            'Ten minutes a week — look, redirect, set intention. Beats worrying every day.',
        why: 'Rumtelo — grip on life. Clear tools that help you stay in control — product by product.',
    },
} as const;

export default why;
