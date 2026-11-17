/**
 * Website `/practices` page — the practice door (CL-11).
 * Prices are never written here: they come from contracts and are passed in as ICU values.
 * Plan lines shared with the pricing copy live in `pages.landing.practice_plan.*`.
 */
const practices = {
    meta: {
        title: 'Rumtelo for practices',
        description:
            'One desk for every client’s jars and week check — only after they say yes. Rumtelo never moves money.',
    },
    hero: {
        eyebrow: 'FOR COACHES & ADVISORS',
        headline: 'Stop wondering where your clients stand.',
        lead: 'One desk for every client’s jars and week check — only after they say yes. Rumtelo never moves money.',
        microline: 'Looking along is free for your clients.',
    },
    how: {
        eyebrow: 'HOW IT WORKS',
        headline: 'Invite. They say yes. One desk.',
        steps_aria: 'How a practice works',
        steps: {
            invite: {
                title: 'Invite a client',
                body: 'Create your practice and invite a client by email. New to Rumtelo? They get a sign-up link. Already here? They accept in Settings.',
            },
            yes: {
                title: 'They say yes',
                body: 'Every link starts as an invite. Nothing is shared until the household owner accepts.',
            },
            desk: {
                title: 'One desk',
                body: 'See every accepted client’s board, read-only, with a snapshot per client: income, jars, spending, week check.',
            },
        },
    },
    proof: {
        eyebrow: 'WHY PRACTICES USE IT',
        headline: 'Sessions on decisions, not on collecting numbers.',
        points: {
            picture: {
                title: 'A current picture before every session',
                body: 'Your clients keep six jars, their fixed costs and a ten-minute week check. You open their board and start where they are.',
            },
            between: {
                title: 'Progress continues between sessions',
                body: 'The week check and The Coach’s small tips, like a bill still due or an Inbox to sort, keep clients moving without you chasing them. The Coach nudges. You guide the decisions.',
            },
            yes: {
                title: 'Their yes comes first',
                body: 'Nothing is shared until the client accepts, and either side can end it. Calm for them, clear for you.',
            },
        },
    },
    detail: {
        desk_title: 'What your desk gives you',
        consent_title: 'What your clients agree to',
        consent: {
            c1: 'Every link starts as an invite. Nothing is shared until the household owner accepts.',
            c2: 'You see their board read-only. Their numbers stay theirs.',
            c3: 'Either side can end the link at any time. The client keeps their own board and data.',
            c4: 'Rumtelo never moves money. Data stays in the EU, hosted in Amsterdam.',
        },
    },
    pricing: {
        eyebrow: 'PRICING',
        headline: 'One price for your practice. Clients who look along are free.',
        lead: 'Billed per practice, per month. Add colleagues as staff seats. You decide which clients you sponsor on Plus.',
        /** Worked example — look-along clients only; the total is computed from contracts. */
        example:
            'Example: you as the first staff seat + {clients} clients who look along = {total} / month in total.',
        example_sponsor: 'Sponsor {sponsored} of them on Plus: + {amount} / month.',
    },
    faq: {
        eyebrow: 'QUESTIONS',
        headline: 'What practices ask us.',
        replace: {
            question: 'Does this replace me?',
            answer: 'No. The Coach gives small, rule-based nudges between sessions. You bring the judgement and the relationship.',
        },
        privacy: {
            question: 'Who can see my client’s data?',
            answer: 'Only you and your staff, and only after the client accepts your invite. Access is read-only, either side can end it at any time, and data stays in the EU, hosted in Amsterdam.',
        },
        bank: {
            question: 'Do clients have to connect their bank?',
            answer: 'No. Entering amounts by hand works. Plus, which you can sponsor, adds bank-statement import.',
        },
        edit: {
            question: 'Can I change a client’s board?',
            answer: 'No. Access is read-only today. You guide; the client makes the change.',
        },
        money: {
            question: 'Does Rumtelo move money?',
            answer: 'Never. Clients pay and transfer at their own bank, and Rumtelo is not a tool for managing a client’s money for them.',
        },
        cost: {
            question: 'What does it cost?',
            answer: 'A practice costs {basePrice} a month plus {staffPrice} per staff seat, and you count as the first. Clients who look along are free. Sponsoring a client’s Plus is {clientPrice} a month each, {discount}% less than the {retail} a month they would pay themselves.',
        },
    },
    closing: {
        headline: 'Ready to see where your clients stand?',
        lead: 'Start a practice, invite your first client and open their board once they say yes.',
    },
} as const;

export default practices;
