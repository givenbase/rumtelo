/** Help sheet + Joyride tour copy — offer, chrome, per-route pages. */
const tour = {
    progress_save_failed: 'Tour progress save failed',
    offer: {
        eyebrow: 'Quick tour',
        title: 'Want a walkthrough of Rumtelo?',
        body: 'A short guided tour from Home through jars, fixed costs, and income. You can skip anytime — or open Help later to replay.',
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
        take_full_tour_prompt:
            'Want the full walkthrough? Home first, then jars, fixed costs, and income.',
        replay_full_tour_prompt: 'Replay the full walkthrough from Home?',
        take_full_tour: 'Start full tour',
        replay_full_tour: 'Replay full tour',
        no_tour: 'No guided tour on this screen yet — the brief above covers the basics.',
        helpers_label: 'Show The Coach on screens',
        helpers_hint:
            'Why-lines and jar cards from The Coach (✦ The Coach). Same as Settings → Preferences. On by default for beginners.',
        helpers_on: 'On',
        helpers_off: 'Off',
        videos_eyebrow: 'Explain videos',
        video_watch: 'Watch',
        video_level_general: 'What is Rumtelo?',
        video_level_product: 'This product',
        video_level_feature: 'This feature',
        settings: {
            eyebrow: 'Guided tour',
            blurb: 'Walk through Home, jars, fixed costs, and income again anytime.',
            row_title: 'Product tour',
            row_sub: 'Same walkthrough as after setup — starts on Home',
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
    /** Explain ladder — L1 general, L2 product, L3 feature. Empty URL hides the slot in Help until the video ships. */
    explain: {
        general: {
            title: 'What is Rumtelo?',
            url: '',
        },
        money: {
            title: 'Money — six jars',
            url: '',
        },
        growth: {
            title: 'Growth — grow in more than one direction',
            url: '',
        },
        energy: {
            title: 'Energy — capacity',
            url: '',
        },
        soul: {
            title: 'Soul — the why',
            url: '',
        },
        jars: {
            title: 'Jars — how the split works',
            url: '',
        },
        fixed: {
            title: 'Fixed costs — Planned to Paid',
            url: '',
        },
        income: {
            title: 'Income — paycheck in',
            url: '',
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
        home: {
            title: 'Home',
            sections: {
                what_for: {
                    heading: 'What you’re looking at',
                    body: 'Your grip snapshot for this month — The Coach, the money picture, and doors into Growth, Energy, and Soul. Start the full tour from Help to walk through Home, then jars, fixed costs, and income.',
                },
                how: {
                    heading: 'How to use it',
                    body: 'Use Period (top right) to switch months. Open a portal when you want that tool. Tap Help anytime to replay this walkthrough.',
                },
            },
            steps: {
                coach: {
                    title: 'The Coach',
                    content:
                        'One tip on where you stand and one move you can make. Tips — you choose. Turn the Coach on or off in Help or Settings.',
                },
                hero: {
                    title: 'This month’s money',
                    content:
                        'What landed in the jars, what’s left, and safe-to-spend for the period you’re viewing.',
                },
                portals: {
                    title: 'Your products',
                    content:
                        'Money lives in the top nav. Growth, Energy, and Soul open from here when you want that next tool — one product at a time.',
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
                    body: 'Track every income source with a start (and optional end) date, and see household monthly net for the month you are viewing. Travel back before a source started and it disappears; end it when it stops.',
                },
                now_target_gap: {
                    heading: 'Now, Target, Gap',
                    body: 'Now is your monthly net for the viewed period (sources that apply then). Target comes from your highest active Earn goal (monthly net you want). If you have no Earn goal yet, a demo target is shown. Gap is how much net still needs to rise.',
                },
                simulator: {
                    heading: 'What a raise does',
                    body: 'Drag the monthly net. The jar split stays; each jar amount moves with it. Pick a goal to see its date. A projection — not money moved yet.',
                },
                sources: {
                    heading: 'Income sources',
                    body: 'Add salary, freelance, benefits, and side income here. For a raise or new job, end the old source and create a new one — type and frequency stay locked on edit.',
                },
                earning_methods: {
                    heading: 'Earning methods (The Coach)',
                    body: 'Cutting costs has a floor; raising income does not. Typical levers: trade time or skill (freelance, raise), build a small system (productized offer), or grow asset income later. Pick one method, set an Earn goal for the net you want, then end the old source and add the new amount when the money lands.',
                },
            },
            steps: {
                summary: {
                    title: 'Now · Target · Gap',
                    content:
                        'Your monthly net for this period, the Earn-goal target, and how much is left to close the gap.',
                },
                simulator: {
                    title: 'What a raise does',
                    content:
                        'Drag income up or down. Same split, different amounts per jar — and what that buys for a goal.',
                },
                sources: {
                    title: 'Income sources',
                    content:
                        'Your pay streams for this period. For a raise, end the old one and + Add income with the new start date.',
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
                mark_paid: {
                    heading: 'Planned → Paid',
                    body: 'Each bill shows Planned or Due for this period. Tap the status chip, then confirm, to mark it Paid. Rumtelo tracks the plan — you pay at the bank.',
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
                status: {
                    title: 'Mark paid',
                    content:
                        'See Planned or Due on a bill? Tap that chip, then confirm — it becomes Paid for this period.',
                },
            },
        },
        jars: {
            title: 'My money jars',
            sections: {
                what_for: {
                    heading: 'What the jars are for',
                    body: 'Six jars give your income a destination. Each jar has a job and a set percentage. Together the percentages are 100% of your income.',
                },
                how: {
                    heading: 'How it works',
                    body: 'You enter income yourself. From your fixed percentages you see how much belongs in each jar — what you can spend or set aside for that purpose. Then work the Money pills left to right: Fixed costs → Transactions → Debt → Net worth. Rumtelo never moves money at your bank.',
                },
            },
            steps: {
                list: {
                    title: 'Your six jars',
                    content:
                        'Each row is one job for money. Tap a jar for fixed costs, spends, and what’s left this month.',
                },
                toolbar: {
                    title: 'Add · Move',
                    content:
                        'Log a transaction in or out, or move money between jars when a month needs it. Bank transfers stay at your bank.',
                },
                bank: {
                    title: 'You move the money',
                    content:
                        'Rumtelo tracks the picture. Using savings pots or sub-accounts? You move the money at your bank — Rumtelo never moves money for you.',
                },
            },
        },
        overview: {
            title: 'Money overview',
            sections: {
                what_for: {
                    heading: 'What this is for',
                    body: 'A snapshot of the current period: jars, inbox, what you already own, and how the month is tracking.',
                },
                how: {
                    heading: 'How it works',
                    body: 'Start on Overview, then go left to right: Fixed costs → Transactions → Debt → Net worth. Period (top right) switches months.',
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
                    body: 'Start on Overview, then go left to right: Income → Goals. Raise net, aim with one goal on Basic. Learn unlocks on Plus — books, courses, skills.',
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
