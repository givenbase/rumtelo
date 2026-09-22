/** In-app Why manifesto — slogan decode and portal widen. */
const why = {
    title: 'Why',
    eyebrow: '✦ Why Rumtelo',
    stand_on: 'The line we stand on',
    lead: 'That is not a clever phrase. It is the problem we refuse to leave unsolved — mystery spending, foggy paychecks, and the quiet stress of not knowing. We end the mystery. Then we widen the picture.',
    meaning_eyebrow: '✦ What we mean',
    meaning: {
        money_leaves_body:
            'Not a spreadsheet after the fact. When an amount leaves, you see the jar it came from — so “where did it go?” has an answer.',
        assign: {
            line: 'Assign it before you wonder where it went.',
            body: 'Income lands and gets a job across six jars the same second. Split first. Spend second. Money with a job does not need defending all month.',
        },
        direction: {
            body: 'Looking back without a direction is only half the picture. Goals, debt payoff, and Financial Freedom point the next paycheck forward.',
        },
    },
    wider_eyebrow: '✦ Bigger than the balance',
    wider_lead_full:
        'Money is the door. Energy, growth, and soul complete the overview — so you stop wondering where it went, what you’re running on, and why it matters.',
    wider_lead_core:
        'Money is the door. Growth completes the overview — so you stop wondering where it went and where the next paycheck is going.',
    portals: {
        money: {
            line: 'Money gets a job.',
            body: 'Six jars. One calm overview. Fixed costs, inbox, and the week check keep the picture current.',
        },
        growth: {
            line: 'Ambition with a plan — not a guess.',
            body: 'Income, goals, and net worth so “earn more” has a map, not a vibe.',
        },
        energy: {
            line: 'A tired head spends. A rested head decides.',
            body: 'Sleep, training, food — the floor under every money choice. Life leaks too, not only the balance.',
        },
        soul: {
            line: 'Know the why — not only the spend.',
            body: 'Intention and stillness so the plan survives a hard week. Direction, not only discipline.',
        },
    },
    closing_title: 'Don’t chase the number. Own the direction.',
    closing_body:
        'Built for people who are doing well — and for people who are ready to. Six jars. One calm overview. Information, never shame: a jar over its line is a signal with a next move, not a verdict on who you are.',
    cta_jars: 'Open the jars',
    cta_week_check: 'Weekly check',
    /** One-line Coach whisper above page content — keyed by route slug, not path. */
    routes: {
        home: 'One look, one question: do I have the reins this month?',
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
            'Money is this month. Net worth is the years. You are wealthy the day it pays for your life.',
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
        soul_centres: 'Name where it feels stuck, and the next step usually names itself.',
        growth_income: 'Cutting costs has a floor. Raising income does not.',
        growth_learn: 'A book you cannot name a use for was Play spending, not Education.',
        growth_learn_library:
            'We recommend what to get and who to support. We never host the work.',
        energy_training: 'Training is the only spend that raises the value of every other hour.',
        energy_food: 'Food is fuel for the week your jars divide. Fuel is bought, not willed.',
        money_week_check:
            'Ten minutes a week — look, redirect, set intention. Beats worrying every day.',
        why: 'Stop wondering where it went — what that line means, and how the four portals keep the picture clear.',
    },
} as const;

export default why;
