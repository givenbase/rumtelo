/** Help sheet + Joyride tour copy — offer, chrome, per-route pages. */
const tour = {
    progress_save_failed: 'Tour progress save failed',
    offer: {
        eyebrow: 'Quick tour',
        title: 'Want a walkthrough of Rumtelo?',
        body: 'A short guided tour of nav, jars, fixed costs, and income. You can skip anytime — or open Help later to replay a screen.',
        accept: 'Start the tour',
        dismiss: 'Not now',
    },
    chrome: {
        help_trigger: 'Help',
        sheet_eyebrow: 'Feature help',
        sheet_description: 'A short brief for this screen',
        take_tour_prompt: 'Want a quick walkthrough of this screen?',
        replay_tour_prompt: 'Replay the walkthrough for this screen?',
        take_tour: 'Take a tour',
        replay_tour: 'Replay tour',
        no_tour: 'No guided tour on this screen yet — the brief above covers the basics.',
        helpers_label: 'Show The Coach on screens',
        helpers_hint:
            'Why-lines and jar cards from The Coach (✦ The Coach). Same as Settings → Account. On by default for beginners.',
        helpers_on: 'On',
        helpers_off: 'Off',
        settings: {
            eyebrow: 'Guided tour',
            blurb: 'Walk through nav, jars, fixed costs, and income again anytime.',
            row_title: 'Product tour',
            row_sub: 'Same walkthrough as after setup',
            restart: 'Start full tour',
        },
        joyride: {
            back: 'Back',
            close: 'Close',
            last: 'Done',
            next: 'Next',
            skip: 'Skip',
        },
    },
    pages: {
        fallback: {
            title: 'This screen',
            sections: {
                looking_at: {
                    heading: 'What you’re looking at',
                    body: 'This page is part of your household money and growth setup. Use Period (top right) to switch months. Numbers follow the jars split you set in Settings.',
                },
            },
        },
        shell: {
            steps: {
                brand: {
                    title: 'Home',
                    content:
                        'Tap the wordmark anytime to return home. Money and Growth live in the portals along the top (or bottom on mobile).',
                },
                period: {
                    title: 'Period',
                    content:
                        'Switch the month you’re looking at. Jar totals and spends follow this period.',
                },
                help: {
                    title: 'Help',
                    content:
                        'Open The Coach for this screen anytime — and replay a short tour if you want.',
                },
            },
        },
        income: {
            title: 'Income',
            sections: {
                what_for: {
                    heading: 'What this page is for',
                    body: 'Track every income source and see household monthly net. Editing an amount keeps history — raises and cuts become dated periods, so you can see how net moved over time.',
                },
                now_target_gap: {
                    heading: 'Now, Target, Gap',
                    body: 'Now is your current monthly net (all active sources). Target comes from your highest active Earn goal (monthly net you want). If you have no Earn goal yet, a demo target is shown. Gap is how much net still needs to rise.',
                },
                simulator: {
                    heading: 'What a raise does',
                    body: 'Drag the monthly net. The jar split stays; each jar amount moves with it. Pick a goal to see its date. A projection — not money moved yet.',
                },
                sources: {
                    heading: 'Income sources',
                    body: 'Add salary, freelance, benefits, and side income here. Tap a row to change amount (with an effective date), cadence, or type.',
                },
                earning_methods: {
                    heading: 'Earning methods (The Coach)',
                    body: 'Cutting costs has a floor; raising income does not. Typical levers: trade time or skill (freelance, raise), build a small system (productized offer), or grow asset income later. Pick one method, set an Earn goal for the net you want, then raise a source when the money lands — the gap and jar projection update with you.',
                },
            },
            steps: {
                summary: {
                    title: 'Now · Target · Gap',
                    content:
                        'Your monthly net today, the Earn-goal target, and how much is left to close the gap.',
                },
                simulator: {
                    title: 'What a raise does',
                    content:
                        'Drag income up or down. Same split, different amounts per jar — and what that buys for a goal.',
                },
                sources: {
                    title: 'Income sources',
                    content:
                        'Your pay streams. Tap a row to change amount (with an effective date) or add another with + Add income.',
                },
            },
        },
        fixed: {
            title: 'Fixed costs & income',
            sections: {
                what_for: {
                    heading: 'What this page is for',
                    body: 'OUT is recurring bills linked to jars. IN is the same income sources that feed the split. Set them once; jar coverage and leftover update automatically.',
                },
                out_vs_in: {
                    heading: 'OUT vs IN',
                    body: 'OUT lists active fixed costs (rent, insurance, subscriptions). IN lists pay that lands every period. Leftover after costs is monthly net minus fixed OUT.',
                },
                jars_use: {
                    heading: 'How jars use this',
                    body: 'Fixed OUT reduces available in that jar. Income is split by percentage into jars when money arrives — this screen is the plan, not the ledger.',
                },
            },
            steps: {
                tabs: {
                    title: 'Out vs In',
                    content:
                        'Switch between monthly bills (Out) and income sources (In). Leftover after costs shows next to + Add fixed cost / + Add income.',
                },
                list: {
                    title: 'The list',
                    content:
                        'Out: fixed costs by jar. In: pay that funds the split. Tap a row to edit.',
                },
            },
        },
        jars: {
            title: 'Jars',
            sections: {
                what_for: {
                    heading: 'What this is for',
                    body: 'Six jars hold your monthly money by purpose. Percentages must add to 100%. Allocated, spent, and fixed commitments decide what is still available.',
                },
                how: {
                    heading: 'How it works',
                    body: 'Available = allocated − spent − fixed OUT on that jar. Overspent means commitments and spending already ate the envelope. To ask what a raise would do to these jars, use the simulator on Growth → Income.',
                },
            },
            steps: {
                toolbar: {
                    title: 'Add · Move',
                    content:
                        'Log a transaction in or out, or move money between jars when a month needs it.',
                },
                list: {
                    title: 'Your six jars',
                    content:
                        'Each row is a job for money. Tap for fixed costs, spends, and what’s left.',
                },
            },
        },
        overview: {
            title: 'Money overview',
            sections: {
                what_for: {
                    heading: 'What this is for',
                    body: 'A snapshot of the current period: jars, inbox, and how the month is tracking.',
                },
                how: {
                    heading: 'How it works',
                    body: 'Drill into Jars, Transactions, Debt, or Fixed costs for detail. Period (top right) switches months.',
                },
            },
        },
        goals: {
            title: 'Goals',
            sections: {
                save_vs_earn: {
                    heading: 'Save vs Earn',
                    body: 'Save goals fill a jar toward a pile of money. Earn goals track household monthly net — when net hits the target, the goal marks itself reached.',
                },
                pace: {
                    heading: 'Pace',
                    body: 'Save goals need a monthly contribution to project a finish date. Earn goals show current net versus the monthly net you want.',
                },
            },
        },
        growth: {
            title: 'Growth',
            sections: {
                what_for: {
                    heading: 'What this area is for',
                    body: 'Goals, income, and (on higher plans) learning and net worth. Start with income and goals — they connect: raise net, fund jars, hit Save targets faster.',
                },
            },
        },
        transactions: {
            title: 'Transactions',
            sections: {
                what_for: {
                    heading: 'What this is for',
                    body: 'The ledger for money that already moved — Out for spend, In for gifts, refunds, and jar top-ups. Sorting here keeps each jar honest.',
                },
                how: {
                    heading: 'How it works',
                    body: 'Pick Out or In, say what it was, choose a jar, and save. Inbox items wait until you sort them. Edits update the same period’s available balance.',
                },
            },
        },
        debt: {
            title: 'Debt',
            sections: {
                what_for: {
                    heading: 'What this is for',
                    body: 'Track what you still owe and the monthly bite it takes. Debt instalments usually leave from Necessity — this page keeps the balance in view.',
                },
                how: {
                    heading: 'How it works',
                    body: 'Add each debt with balance and payment. Review them like fixed costs: if the payment hurts the jar, the jar plan needs a rethink.',
                },
            },
        },
    },
} as const;

export default tour;
