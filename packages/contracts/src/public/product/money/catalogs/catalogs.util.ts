/**
 * Catalogs Utils (Money)
 * Company-catalog lookups that are not household-specific: Give category pick,
 * giving cause / evaluator glossary, audience filter helper.
 */

import { GivingCause, GivingEvaluator, GivingSignalTier, JarKey } from '../enums';

/**
 * Picker filter: selected audience matches, or any baseline key (COMMON) is present.
 * Null filter = show everything.
 */
export function matchesAudience(
    keys: readonly string[],
    filter: string | null,
    baselineKeys: readonly string[] = ['COMMON']
): boolean {
    if (!filter) return true;
    if (keys.includes(filter)) return true;
    return baselineKeys.some(key => keys.includes(key));
}

/**
 * Default Give spend category: first Give-jar template by sortOrder.
 * Company seed puts Donations before Gifts.
 */
export function defaultGiveCategoryTemplate<T extends { jarKey: JarKey; sortOrder: number }>(
    categories: readonly T[]
): T | null {
    const give = categories.filter(category => category.jarKey === JarKey.GIVE);
    if (give.length === 0) return null;
    return [...give].sort((left, right) => left.sortOrder - right.sortOrder)[0] ?? null;
}

/**
 * Category for bank-account pickers.
 * Resolved by catalog display name (“Banking”) so the key can rename in seed.
 */
export function bankingCategoryTemplate<T extends { name: string }>(
    categories: readonly T[]
): T | null {
    return (
        categories.find(category => category.name.trim().toLowerCase() === 'banking') ?? null
    );
}

export type GivingCauseCatalogItem = {
    key: GivingCause;
    name: string;
    icon: string;
    /** One line the helper shows under the chip. */
    line: string;
};

export type GivingEvaluatorCatalogItem = {
    key: GivingEvaluator;
    name: string;
    tier: GivingSignalTier;
    /** What this signal actually means — one honest sentence. */
    measures: string;
    url: string;
};

/** Cause chips for Help me choose / Give goals. */
export const GIVING_CAUSE_CATALOG: readonly GivingCauseCatalogItem[] = [
    {
        key: GivingCause.GLOBAL_HEALTH,
        name: 'Health',
        icon: '🏥',
        line: 'Malaria nets, vitamin A, vaccines — the most lives saved per unit given.',
    },
    {
        key: GivingCause.POVERTY,
        name: 'Direct to people',
        icon: '🤲',
        line: 'Cash straight to families in extreme poverty. They decide what they need.',
    },
    {
        key: GivingCause.EDUCATION,
        name: 'Education',
        icon: '📚',
        line: 'Keeping children in school, and the basics that make learning possible.',
    },
    {
        key: GivingCause.WATER,
        name: 'Water',
        icon: '💧',
        line: 'Clean water and sanitation where its absence is what kills.',
    },
    {
        key: GivingCause.CLIMATE,
        name: 'Climate',
        icon: '🌍',
        line: 'Policy and technology bets with outsized effect per unit given.',
    },
    {
        key: GivingCause.ANIMALS,
        name: 'Animals',
        icon: '🐾',
        line: 'Reducing suffering at the scale where it is largest — farmed animals.',
    },
    {
        key: GivingCause.EMERGENCY,
        name: 'Emergency',
        icon: '🆘',
        line: 'When something breaks somewhere — one trusted channel, not ten.',
    },
    {
        key: GivingCause.COMMUNITY,
        name: 'Close to home',
        icon: '🏘️',
        line: 'Food banks, debt help, and neighbours you will never meet.',
    },
];

/** Evaluator glossary — what each badge proves. */
export const GIVING_EVALUATOR_CATALOG: readonly GivingEvaluatorCatalogItem[] = [
    {
        key: GivingEvaluator.GIVEWELL,
        name: 'GiveWell',
        tier: GivingSignalTier.IMPACT,
        measures:
            'Cost per life saved or improved, from published trials, plus room for more funding. Recommends only a handful of programmes; every model is public.',
        url: 'https://www.givewell.org/how-we-work/criteria',
    },
    {
        key: GivingEvaluator.GIVING_WHAT_WE_CAN,
        name: 'Giving What We Can',
        tier: GivingSignalTier.IMPACT,
        measures:
            'Re-checks evaluators’ methods (GiveWell, ACE, Founders Pledge) and relays their picks in one list. A derived signal, not new research.',
        url: 'https://www.givingwhatwecan.org/best-charities-to-donate-to-2026',
    },
    {
        key: GivingEvaluator.FOUNDERS_PLEDGE,
        name: 'Founders Pledge',
        tier: GivingSignalTier.IMPACT,
        measures:
            'In-depth cost-effectiveness research for causes GiveWell does not cover — climate policy and innovation above all.',
        url: 'https://www.founderspledge.com/research',
    },
    {
        key: GivingEvaluator.GIVING_GREEN,
        name: 'Giving Green',
        tier: GivingSignalTier.IMPACT,
        measures:
            'Climate organisations weighed on scale, feasibility, funding need and potential for systemic change; reassessed every year or two.',
        url: 'https://www.givinggreen.earth/top-climate-nonprofits',
    },
    {
        key: GivingEvaluator.ANIMAL_CHARITY_EVALUATORS,
        name: 'Animal Charity Evaluators',
        tier: GivingSignalTier.IMPACT,
        measures:
            'Impact per unit given for animal-welfare organisations — theory of change, cost per animal, room for funding, organisational health.',
        url: 'https://animalcharityevaluators.org/charity-reviews/evaluating-charities/evaluation-criteria/',
    },
    {
        key: GivingEvaluator.DONEER_EFFECTIEF,
        name: 'Doneer Effectief',
        tier: GivingSignalTier.IMPACT,
        measures:
            'Dutch platform that aggregates GiveWell, ACE and Giving Green picks with an academic jury, and passes gifts through in full with Dutch tax deduction.',
        url: 'https://doneereffectief.nl/beste-goede-doelen/',
    },
    {
        key: GivingEvaluator.CHARITY_NAVIGATOR,
        name: 'Charity Navigator',
        tier: GivingSignalTier.GOVERNANCE,
        measures:
            'US filings scored on finance, accountability, leadership and culture. Says money is handled well — not how much good it does.',
        url: 'https://www.charitynavigator.org/',
    },
    {
        key: GivingEvaluator.CBF,
        name: 'CBF Erkend Goed Doel',
        tier: GivingSignalTier.GOVERNANCE,
        measures:
            'Dutch independent audit of governance, fundraising, spending and reporting against a public norm, re-checked yearly. Process, not effectiveness.',
        url: 'https://cbf.nl/toetsing',
    },
    {
        key: GivingEvaluator.ANBI,
        name: 'ANBI',
        tier: GivingSignalTier.TAX,
        measures:
            'Dutch tax authority designation: at least 90% of spending serves the public good and the figures must be published. Makes gifts deductible; no quality judgement.',
        url: 'https://www.belastingdienst.nl/wps/wcm/connect/nl/aftrek-en-kortingen/content/anbi-status-controleren',
    },
];

export function givingCauseMeta(key: GivingCause): GivingCauseCatalogItem | null {
    return GIVING_CAUSE_CATALOG.find(cause => cause.key === key) ?? null;
}

export function givingEvaluatorMeta(key: GivingEvaluator): GivingEvaluatorCatalogItem | null {
    return GIVING_EVALUATOR_CATALOG.find(evaluator => evaluator.key === key) ?? null;
}
