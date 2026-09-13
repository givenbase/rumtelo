/**
 * Giving — cause areas, evaluator glossary, and the "why" copy.
 *
 * Doctrine: Money owns the *flow* (Give jar, fixed cost, transaction);
 * Soul owns the *meaning*. The Coach connects them. Rumtelo never claims to
 * vet an organisation itself — it shows who does, and what they measure.
 * Copy is currency-neutral.
 */
import { GivingCause, GivingEvaluator } from '@rumtelo/contracts';

export type GivingCauseMeta = {
    key: GivingCause;
    label: string;
    icon: string;
    /** One line the helper shows under the chip. */
    line: string;
};

export const GIVING_CAUSES: readonly GivingCauseMeta[] = [
    {
        key: GivingCause.GLOBAL_HEALTH,
        label: 'Health',
        icon: '🏥',
        line: 'Malaria nets, vitamin A, vaccines — the most lives saved per unit given.',
    },
    {
        key: GivingCause.POVERTY,
        label: 'Direct to people',
        icon: '🤲',
        line: 'Cash straight to families in extreme poverty. They decide what they need.',
    },
    {
        key: GivingCause.EDUCATION,
        label: 'Education',
        icon: '📚',
        // No rigorous evaluator recommends an education organisation today; the
        // chip only appears once the catalog has a row for it.
        line: 'Keeping children in school, and the basics that make learning possible.',
    },
    {
        key: GivingCause.WATER,
        label: 'Water',
        icon: '💧',
        line: 'Clean water and sanitation where its absence is what kills.',
    },
    {
        key: GivingCause.CLIMATE,
        label: 'Climate',
        icon: '🌍',
        line: 'Policy and technology bets with outsized effect per unit given.',
    },
    {
        key: GivingCause.ANIMALS,
        label: 'Animals',
        icon: '🐾',
        line: 'Reducing suffering at the scale where it is largest — farmed animals.',
    },
    {
        key: GivingCause.EMERGENCY,
        label: 'Emergency',
        icon: '🆘',
        line: 'When something breaks somewhere — one trusted channel, not ten.',
    },
    {
        key: GivingCause.COMMUNITY,
        label: 'Close to home',
        icon: '🏘️',
        line: 'Food banks, debt help, and neighbours you will never meet.',
    },
];

export function givingCauseMeta(key: GivingCause): GivingCauseMeta | null {
    return GIVING_CAUSES.find(cause => cause.key === key) ?? null;
}

/**
 * What a signal is evidence *of*. Never let a governance or tax badge read as
 * proof of impact — the tiers keep that honest in the UI.
 */
export type GivingSignalTier = 'impact' | 'governance' | 'tax';

export const GIVING_SIGNAL_TIERS: Record<
    GivingSignalTier,
    { label: string; line: string; className: string }
> = {
    impact: {
        label: 'Evidence of impact',
        line: 'Someone outside checked what the work achieves per unit given.',
        className: 'border-success/30 bg-success/10 text-success',
    },
    governance: {
        label: 'Governance & transparency',
        line: 'The books, the board and the reporting were audited — not the outcomes.',
        className: 'border-accent/30 bg-accent-soft text-accent',
    },
    tax: {
        label: 'Tax status',
        line: 'A public-benefit designation. Says nothing about quality.',
        className: 'border-line bg-raised text-fg-secondary',
    },
};

/** Display order for the badge legend — strongest claim first. */
export const GIVING_SIGNAL_TIER_ORDER: readonly GivingSignalTier[] = [
    'impact',
    'governance',
    'tax',
];

export type GivingEvaluatorMeta = {
    key: GivingEvaluator;
    name: string;
    tier: GivingSignalTier;
    /** What this signal actually means — one honest sentence. */
    measures: string;
    url: string;
};

/**
 * Evaluator glossary. Each entry says what the badge *proves* so a household
 * can weigh it, rather than trusting a logo.
 */
export const GIVING_EVALUATORS: readonly GivingEvaluatorMeta[] = [
    {
        key: GivingEvaluator.GIVEWELL,
        name: 'GiveWell',
        tier: 'impact',
        measures:
            'Cost per life saved or improved, from published trials, plus room for more funding. Recommends only a handful of programmes; every model is public.',
        url: 'https://www.givewell.org/how-we-work/criteria',
    },
    {
        key: GivingEvaluator.GIVING_WHAT_WE_CAN,
        name: 'Giving What We Can',
        tier: 'impact',
        measures:
            'Re-checks evaluators’ methods (GiveWell, ACE, Founders Pledge) and relays their picks in one list. A derived signal, not new research.',
        url: 'https://www.givingwhatwecan.org/best-charities-to-donate-to-2026',
    },
    {
        key: GivingEvaluator.FOUNDERS_PLEDGE,
        name: 'Founders Pledge',
        tier: 'impact',
        measures:
            'In-depth cost-effectiveness research for causes GiveWell does not cover — climate policy and innovation above all.',
        url: 'https://www.founderspledge.com/research',
    },
    {
        key: GivingEvaluator.GIVING_GREEN,
        name: 'Giving Green',
        tier: 'impact',
        measures:
            'Climate organisations weighed on scale, feasibility, funding need and potential for systemic change; reassessed every year or two.',
        url: 'https://www.givinggreen.earth/top-climate-nonprofits',
    },
    {
        key: GivingEvaluator.ANIMAL_CHARITY_EVALUATORS,
        name: 'Animal Charity Evaluators',
        tier: 'impact',
        measures:
            'Impact per unit given for animal-welfare organisations — theory of change, cost per animal, room for funding, organisational health.',
        url: 'https://animalcharityevaluators.org/charity-reviews/evaluating-charities/evaluation-criteria/',
    },
    {
        key: GivingEvaluator.DONEER_EFFECTIEF,
        name: 'Doneer Effectief',
        tier: 'impact',
        measures:
            'Dutch platform that aggregates GiveWell, ACE and Giving Green picks with an academic jury, and passes gifts through in full with Dutch tax deduction.',
        url: 'https://doneereffectief.nl/beste-goede-doelen/',
    },
    {
        key: GivingEvaluator.CHARITY_NAVIGATOR,
        name: 'Charity Navigator',
        tier: 'governance',
        measures:
            'US filings scored on finance, accountability, leadership and culture. Says money is handled well — not how much good it does.',
        url: 'https://www.charitynavigator.org/',
    },
    {
        key: GivingEvaluator.CBF,
        name: 'CBF Erkend Goed Doel',
        tier: 'governance',
        measures:
            'Dutch independent audit of governance, fundraising, spending and reporting against a public norm, re-checked yearly. Process, not effectiveness.',
        url: 'https://cbf.nl/toetsing',
    },
    {
        key: GivingEvaluator.ANBI,
        name: 'ANBI',
        tier: 'tax',
        measures:
            'Dutch tax authority designation: at least 90% of spending serves the public good and the figures must be published. Makes gifts deductible; no quality judgement.',
        url: 'https://www.belastingdienst.nl/wps/wcm/connect/nl/aftrek-en-kortingen/content/anbi-status-controleren',
    },
];

export function givingEvaluatorMeta(key: GivingEvaluator): GivingEvaluatorMeta | null {
    return GIVING_EVALUATORS.find(evaluator => evaluator.key === key) ?? null;
}

/**
 * Why giving is in a money app — in the Rumtelo voice. No shame, no tax angle.
 * Used on Soul → Giving and in the goal helper.
 */
export const WHY_GIVE = {
    headline: 'Giving keeps money a tool and not a master.',
    body: [
        'The Give jar is the smallest of the six and the one that does the most to your relationship with money. When a fixed share leaves before you can spend it, money stops being something to hold on to.',
        'It does not have to be much. Five percent, transferred automatically, to a place you chose on purpose. The amount is not the point — the habit is.',
        'Choose where it goes the way you choose everything else here: with evidence, not with a logo. An organisation that publishes what it spends and what changed is one you can keep giving to for years.',
    ],
    /** The four checks a household can apply to any organisation. */
    checks: [
        {
            title: 'Independent proof',
            body: 'Someone outside the organisation — GiveWell, CBF, ACE — has checked the work, not just the books.',
        },
        {
            title: 'Public spending',
            body: 'A yearly report anyone can read, with the share that reached the programme and the share that ran the office.',
        },
        {
            title: 'Reporting back',
            body: 'Updates that describe what changed for the people or animals — not a thank-you card.',
        },
        {
            title: 'Room for more',
            body: 'A clear answer to “what would an extra amount do?” If they cannot say, the money sits.',
        },
    ],
} as const;
