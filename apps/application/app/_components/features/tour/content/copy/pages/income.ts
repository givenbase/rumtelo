/** Income help + tour — future `features.tour.pages.income.*`. */
const income = {
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
} as const;

export default income;
