/** Coach hub — common copy. */
const coach = {
    page_title: 'The Coach',
    eyebrow: 'Across every portal',
    lead: 'Suggestions and next moves from money, growth, energy, and soul — one tip at a time, never shame.',
    empty_title: 'Nothing to coach yet',
    empty_body: 'Log income, jars, or sleep — the Coach speaks when there is enough to see.',
    empty_quiet:
        'No open tips right now. The Coach speaks when a jar, habit, or week needs a nudge.',
    open_week: 'Open my week →',
    open_week_check: 'Open the week check →',
    verdict: {
        eyebrow: '✦ The Coach',
        kind_nudge: 'Attention',
        kind_win: 'Win',
        kind_warning: 'Warning',
        kind_insight: 'Insight',
        kind_week_check: 'Week check',
        kind_on_track: 'On track',
        kind_alert: 'Alert',
        share: 'Share',
        open: 'Open',
        detail: 'Detail',
        message_n: 'Message {n}',
        previous: 'Previous',
        next: 'Next',
    },
    dismiss: 'Dismiss',
    got_it: 'Got it',
    split_tips: {
        'play-above-default':
            'Play above 10% usually comes from Financial Freedom or Long Term Savings. Those two buy your future; Play spends this month.',
        'play-above-default-saver':
            'Play above 10% can be healthy if you under-spend joy — just don’t fund it by cutting Financial Freedom.',
        'give-above-default':
            'Give above 5% is generous — keep Financial Freedom at least at 10% so giving doesn’t replace paying yourself first.',
        'edu-above-soft':
            'Education raises earning power — still protect Financial Freedom at 10% so learning doesn’t crowd out investing.',
        'ff-below-default':
            'Financial Freedom under 10% means you’re paying everyone else first. Put yourself back in the split before raising Play or Give.',
        'lts-below-default':
            'Long Term Savings under 10% leaves no buffer for planned big things. Raise this before expanding Play.',
        'future-vs-fun':
            'You’re funding today (Play / Give) while shrinking tomorrow (Freedom + Long Term). Prefer raising those two before fun.',
        'nec-high':
            'Necessity above 60% squeezes every other jar. Cutting fixed costs usually helps more than cutting Freedom.',
        'nec-low':
            'Necessity under 45% is tight for most households — check rent, insurance and debt instalments still fit.',
        'spender-ff':
            'Your pattern leans spender — try +1–2% into Financial Freedom before adding more Play.',
        'saver-play':
            'Your pattern leans saver — a little more Play can make the plan sustainable. Joy that is planned is not waste.',
    },
    helpers: {
        mark_title: 'From The Coach — turn on-screen tips on or off in Settings → Account',
        mark_label: 'The Coach',
        tip_aria: 'The Coach: {title}',
        locked_cta: '🔒 {cta}',
        open_coach: 'Open The Coach',
        why_aria: 'The Coach',
    },
    jar_guide: {
        aria: 'The Coach for this jar',
        heading: 'What can I use this for?',
        allowed: 'This may go to',
        give_who: 'Who should receive it?',
        give_hint:
            'Pick a cause, then an organisation with independent checks — same Coach shortlist as on Why & where.',
        give_recurring_hint:
            'Choosing an organisation opens a recurring gift (fixed cost). For a one-time gift, use',
        add_transaction: 'Add transaction',
        split_inside: 'Split inside this jar',
        footer: 'The Coach — tips without shame.',
        turn_off: 'Turn tips off',
    },
    /** Rule-based tips from the energy time-week coach (`energy.time.*` keys). */
    time_coach: {
        needs_setup: {
            text: 'Three screens and logging a day becomes one tap. Set how your week mostly looks.',
            cta: 'Set up my typical week',
        },
        catch_up: {
            text: '{count} days this week are not logged. Tap typical under each to catch up in one go.',
        },
        work_ceiling: {
            text: 'At your typical shape this week lands at {workHours} of work. Above 55h, WHO/ILO found +35% stroke risk.',
        },
        exercise_floor: {
            text: 'Your typical week has {movingHours} of movement in it. WHO’s floor is {floorHours}.',
        },
        free_unsplit: {
            text: '{freeDaily} a day you steer, none of it named. Worth splitting once — the sweet spot only holds when it is social or purposeful.',
        },
        social_jetlag: {
            text: 'You sleep in {jetlagHours} on days off. That gap is social jetlag — it tracks with mood and metabolic outcomes on its own.',
        },
        work_drift: {
            text: 'You set {statedHours} of work; your last {dayCount} workdays median {typicalHours}.',
        },
        week_in_range: {
            text: '168 hours, every band in range. Rare.',
        },
        cta: {
            open_week: 'Open my week',
            see_week: 'See the week',
            setup_typical: 'Set up my typical week',
            change_typical: 'Change my typical week',
        },
    },
    /** Looking Ahead / Looking Back coach line on money dashboard & portal hub. */
    period_travel: {
        looking_back_one:
            'Looking back at {stamp} ({relativeLabel}): about {money} moved through your jars across {horizon} month.',
        looking_back_other:
            'Looking back at {stamp} ({relativeLabel}): about {money} moved through your jars across {horizon} months.',
        looking_ahead_one:
            'By {stamp}, if you keep this plan, about {money} will have moved through your jars across {horizon} month.',
        looking_ahead_other:
            'By {stamp}, if you keep this plan, about {money} will have moved through your jars across {horizon} months.',
        pace_needed: '{name} still needs pace — roughly {money}/mo net to make the date.',
        past_note: 'Lifetime goal saved and live debt are not rewound for past months.',
        jar_highlight: '{name} {from} → {to}',
    },
} as const;

export default coach;
