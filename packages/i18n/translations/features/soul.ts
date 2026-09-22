/** Soul portal — page headings and empty states. */
const soul = {
    hub: {
        eyebrow: 'Soul · the why',
        title: 'The why under the numbers.',
        line: 'Without this, steering is just bookkeeping.',
        fallback_coach_kind: 'START SMALL',
        fallback_coach_text:
            'One minute of stillness or one line of gratitude — both protect the jars.',
        fallback_coach_cta: 'Open stillness',
        cards: {
            stillness: {
                name: 'Stillness',
                note: 'days in a row',
            },
            gratitude: {
                name: 'Gratitude',
                note: 'things noted this week',
            },
            giving: {
                name: 'Giving',
                no_pledge: 'no pledge yet',
                reached_by_then: 'reached by then · of {target}',
                now_of_target: '{saved} now · of {target}',
                pledged_this_year: 'of {target} pledged this year',
            },
            intent: {
                name: 'Intent',
                set: 'Set',
                note_empty: 'for this week',
            },
            centres: {
                name: 'Centres',
                note: 'centres named today',
            },
        },
    },
    stillness: {
        eyebrow: 'Stillness',
        title: 'Control is a rhythm, not a mood.',
        lead: 'The only practice here that costs nothing and protects everything else.',
        minutes_per_day: 'Minutes per day',
        streak_label: 'In a row',
        mark_done: 'Mark as done',
        done_today: '✓ Done today',
        minutes_suffix: '{minutes} min',
        why_title: '✦ Why this is in a money app',
        mind_tie:
            'A restless mind does not steer money — it spends it and calls that a decision. Stillness ' +
            'is not meditative, it is strategic: the only practice here that costs nothing and protects ' +
            'everything else. Every coin you do not spend impulsively is a coin that chooses a jar.',
        practices: {
            breathing: {
                meta: '2–5 min',
                name: 'Breathing',
                desc: 'Four counts in, hold seven, out eight. One minute is enough when the day is already full.',
            },
            walk: {
                meta: '10–20 min',
                name: 'Walk',
                desc: 'Without a goal or phone. The mind clears when the feet move.',
            },
            meditation: {
                meta: '5–20 min',
                name: 'Meditation',
                desc: 'Eyes closed, attention on the breath. Thoughts come and go — you are not your thoughts.',
            },
            journaling: {
                meta: '5–10 min',
                name: 'Journaling',
                desc: 'Write down three things that caught your attention. No analysis, just noting.',
            },
        },
    },
    gratitude: {
        eyebrow: 'Gratitude',
        title: 'One thing per day.',
        lead: 'Not because it changes your balance, but because it changes how you see it.',
        placeholder: 'What are you grateful for?',
        add: 'Add',
        empty_title: 'Nothing written yet.',
        empty_body: 'The week check will ask you here.',
        delete_aria: 'Delete',
        this_week_eyebrow: 'This week',
        this_week_body:
            'One line per week during the week check. No more than that — it is a check-in, not a journal.',
    },
    intent: {
        eyebrow: 'Intention',
        title: 'One sentence for this week.',
        lead: 'Not a resolution. An instruction to yourself, small enough to keep.',
        placeholder: 'Write one sentence for this week…',
        example: 'Ten minutes of stillness before I open my inbox.',
        my_intention: 'My intention',
        set_for_week: '✦ Set for this week',
        tip: 'A good intention is small, concrete, and about behaviour — not an outcome. "I check my jars every Sunday" works better than "I am more financially aware."',
        stillness_link: 'Go to stillness →',
    },
    centres: {
        eyebrow: 'The centres',
        title: 'Where does it feel stuck?',
        lead: 'Not an esoteric score — a map to name where things feel stuck this week, so your intention has somewhere to land.',
        set_intent: 'Set as intention →',
        items: {
            root: {
                name: 'Root',
                gov: 'Survival',
                ask: 'What would make you one step safer today?',
            },
            sacral: {
                name: 'Sacral',
                gov: 'Creativity',
                ask: 'Where are you saying yes when you mean no?',
            },
            solar: {
                name: 'Solar plexus',
                gov: 'Willpower',
                ask: 'Which decision are you postponing because you are tired?',
            },
            heart: {
                name: 'Heart',
                gov: 'Love',
                ask: 'To whom do you give today without keeping score?',
            },
            throat: {
                name: 'Throat',
                gov: 'Expression',
                ask: 'Which truth would lighten your week if you spoke it?',
            },
            third: {
                name: 'Third eye',
                gov: 'Insight',
                ask: 'Which pattern do you already see but not yet name?',
            },
            crown: {
                name: 'Crown',
                gov: 'Connection',
                ask: 'Why are you really doing this — beyond the numbers?',
            },
        },
    },
    giving: {
        eyebrow: 'Giving',
        headline: 'Giving keeps money a tool and not a master.',
        lead: 'The Give jar is the smallest of the six and the one that does the most to your relationship with money. When a fixed share leaves before you can spend it, money stops being something to hold on to.',
        add_recurring: '+ Add a recurring gift',
        open_jar: 'Open the Give jar',
        this_year: 'This year',
        jar_pct: 'Give jar · {pct}%',
        pledged_of: 'of {amount} pledged',
        reached_by: 'Reached {when}. The jar keeps flowing — that was the point.',
        reached_by_fallback: 'by then',
        pledge_met: 'Pledge met. The jar keeps flowing — that was the point.',
        pledge_on_track:
            '{planned} leaves every month — enough to land the pledge with {months} month to go.',
        pledge_on_track_plural:
            '{planned} leaves every month — enough to land the pledge with {months} months to go.',
        pledge_gap:
            '{needed} a month would land it; {planned} is planned. The gap is a choice, not a failure.',
        pledge_no_date: 'No date on this pledge yet.',
        open_pledge: 'Open pledge ›',
        given_so_far: 'given so far',
        pledge_pitch:
            'A pledge gives the jar a finish line for the year. Every sorted amount that leaves Give counts toward it — nothing to move by hand.',
        set_pledge: 'Set a pledge for this year',
        where_goes: 'Where it goes',
        planned_mo: '{amount}/mo planned',
        empty_auto_title: 'Nothing leaves Give automatically yet.',
        empty_auto_body: 'Add a fixed cost on the Give jar to plan monthly gifts.',
        empty_ledger_title: 'No sorted giving this year.',
        empty_ledger_body: 'Gifts that leave Give show up here once sorted.',
        no_org: 'No organisation named yet',
        received_year: 'Received this year',
        to_whom: 'To whom',
        pick_who: 'How do you want to pick who receives this gift?',
        pick_aria: 'How do you want to pick?',
        pick_known: 'I know who',
        pick_coach: 'Help me choose',
        pick_hint:
            'I know who — type whoever you already give to. Help me choose — Coach shortlist with independent checks (Doneer Effectief, GiveWell, ACE, CBF).',
        checks_heading: 'Four checks for any organisation',
        checks_aria: 'The Coach: four checks for any organisation',
        check_1_title: 'Independent proof',
        check_1_body:
            'Someone outside the organisation — GiveWell, CBF, ACE — has checked the work, not just the books.',
        check_2_title: 'Public spending',
        check_2_body:
            'A yearly report anyone can read, with the share that reached the programme and the share that ran the office.',
        check_3_title: 'Reporting back',
        check_3_body:
            'Updates that describe what changed for the people or animals — not a thank-you card.',
        check_4_title: 'Room for more',
        check_4_body:
            'A clear answer to “what would an extra amount do?” If they cannot say, the money sits.',
        coach_tip_title: 'Why this is in a money app',
        coach_tip_1:
            'It does not have to be much. Five percent, transferred automatically, to a place you chose on purpose. The amount is not the point — the habit is.',
        coach_tip_2:
            'Choose where it goes the way you choose everything else here: with evidence, not with a logo. An organisation that publishes what it spends and what changed is one you can keep giving to for years.',
        causes: {
            GLOBAL_HEALTH: {
                name: 'Health',
                line: 'Malaria nets, vitamin A, vaccines — the most lives saved per unit given.',
            },
            POVERTY: {
                name: 'Direct to people',
                line: 'Cash straight to families in extreme poverty. They decide what they need.',
            },
            EDUCATION: {
                name: 'Education',
                line: 'Keeping children in school, and the basics that make learning possible.',
            },
            WATER: {
                name: 'Water',
                line: 'Clean water and sanitation where its absence is what kills.',
            },
            CLIMATE: {
                name: 'Climate',
                line: 'Policy and technology bets with outsized effect per unit given.',
            },
            ANIMALS: {
                name: 'Animals',
                line: 'Reducing suffering at the scale where it is largest — farmed animals.',
            },
            EMERGENCY: {
                name: 'Emergency',
                line: 'When something breaks somewhere — one trusted channel, not ten.',
            },
            COMMUNITY: {
                name: 'Close to home',
                line: 'Food banks, debt help, and neighbours you will never meet.',
            },
        },
    },
} as const;

export default soul;
