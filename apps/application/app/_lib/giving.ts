/**
 * Giving — Soul meaning copy and badge styling.
 *
 * Cause / evaluator glossary lives in @rumtelo/contracts (company catalog).
 * Doctrine: Money owns the *flow* (Give jar, fixed cost, transaction);
 * Soul owns the *meaning*. The Coach connects them. Rumtelo never claims to
 * vet an organisation itself — it shows who does, and what they measure.
 */
import { GivingSignalTier } from '@rumtelo/contracts';

export {
    GIVING_CAUSE_CATALOG,
    GIVING_EVALUATOR_CATALOG,
    givingCauseMeta,
    givingEvaluatorMeta,
} from '@rumtelo/contracts';

/** Display order for the badge legend — strongest claim first. */
export const GIVING_SIGNAL_TIER_ORDER: readonly GivingSignalTier[] = [
    GivingSignalTier.IMPACT,
    GivingSignalTier.GOVERNANCE,
    GivingSignalTier.TAX,
];

/**
 * What a signal is evidence *of*. className stays here — presentation, not catalog.
 */
export const GIVING_SIGNAL_TIERS: Record<
    GivingSignalTier,
    { label: string; line: string; className: string }
> = {
    [GivingSignalTier.IMPACT]: {
        label: 'Evidence of impact',
        line: 'Someone outside checked what the work achieves per unit given.',
        className: 'border-success/30 bg-success/10 text-success',
    },
    [GivingSignalTier.GOVERNANCE]: {
        label: 'Governance & transparency',
        line: 'The books, the board and the reporting were audited — not the outcomes.',
        className: 'border-accent/30 bg-accent-soft text-accent',
    },
    [GivingSignalTier.TAX]: {
        label: 'Tax status',
        line: 'A public-benefit designation. Says nothing about quality.',
        className: 'border-line bg-raised text-fg-secondary',
    },
};

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
