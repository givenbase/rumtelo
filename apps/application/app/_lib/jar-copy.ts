import { JarKey, jarGroupFor } from '@rumtelo/contracts';
import type { TranslateFn } from '@rumtelo/i18n';

import { isAloneInGroup } from '@/app/_lib/jar-group';

const JAR_KEYS = new Set<string>(Object.values(JarKey));

function jarGuideText(t: TranslateFn, jarKey: string, suffix: string, apiText: string): string {
    if (!JAR_KEYS.has(jarKey)) return apiText;
    const key = `guides.${jarKey}.${suffix}`;
    return t.has(key) ? t(key) : apiText;
}

/** Maps seed label → i18n key suffix under guides.<jarKey>.allowed.* */
const ALLOWED_LABEL_SUFFIX: Record<string, Record<string, string>> = {
    [JarKey.NECESSITIES]: {
        Rent: 'allowed.rent',
        'Energy & water': 'allowed.energy_water',
        Groceries: 'allowed.groceries',
        'Transport & fuel': 'allowed.transport_fuel',
        Insurance: 'allowed.insurance',
        'Debt instalments': 'allowed.debt_instalments',
        'Phone & internet': 'allowed.phone_internet',
    },
    [JarKey.FINANCIAL_FREEDOM]: {
        'Index funds & ETFs': 'allowed.index_funds',
        'Long-term stocks': 'allowed.long_term_stocks',
        Bonds: 'allowed.bonds',
        'Property deposit': 'allowed.property_deposit',
        'Your own business': 'allowed.own_business',
    },
    [JarKey.LONG_TERM_SAVINGS]: {
        'Emergency fund': 'allowed.emergency_fund',
        'Car or big purchase': 'allowed.car_purchase',
        'Down payment': 'allowed.down_payment',
        Renovation: 'allowed.renovation',
        'Tax bill': 'allowed.tax_bill',
    },
    [JarKey.EDUCATION]: {
        Books: 'allowed.books',
        'Courses & training': 'allowed.courses',
        'Mentor or coach': 'allowed.mentor',
        'Tools & software': 'allowed.tools',
        Conferences: 'allowed.conferences',
    },
    [JarKey.PLAY]: {
        'Eating & drinking out': 'allowed.eating_out',
        'Outings & concerts': 'allowed.outings',
        Clothes: 'allowed.clothes',
        'Spontaneous buys': 'allowed.spontaneous',
        'Gifts to yourself': 'allowed.gifts_self',
    },
    // Optional pots: the seed labels (`jar.seed-data.ts`) plus the wording of the guide copy, so a
    // label tweak on either side still finds its translation.
    [JarKey.DAILY]: {
        Groceries: 'allowed.groceries',
        'Drugstore & pharmacy': 'allowed.pharmacy',
        'Pharmacy & drugstore': 'allowed.pharmacy',
        'Household supplies': 'allowed.household',
        'Household things': 'allowed.household',
        'Transport & fuel': 'allowed.transport_fuel',
    },
    [JarKey.GOALS]: {
        'Car or big purchase': 'allowed.big_purchase',
        'Down payment': 'allowed.home_deposit',
        'Home deposit': 'allowed.home_deposit',
        'A planned trip': 'allowed.trip',
        'A trip': 'allowed.trip',
        Renovation: 'allowed.renovation',
    },
    [JarKey.GIVE]: {
        'Your foundation': 'allowed.foundation',
        Charities: 'allowed.charities',
        'Church or community': 'allowed.church_community',
        'Helping someone who needs it': 'allowed.helping',
    },
};

const LINK_HREF_SUFFIX: Record<string, string> = {
    '/product/money/fixed-costs': 'links.fixed_costs',
    '/product/money/debt': 'links.debt',
    '/product/money/transactions': 'links.transactions',
    '/product/money/net-worth': 'links.net_worth',
    '/product/growth/net-worth': 'links.net_worth',
    '/product/growth/goals': 'links.goals',
    '/product/growth/learn': 'links.learn',
    '/product/growth/learn/library': 'links.library',
    '/product/soul/giving': 'links.giving',
};

const SUB_LABEL_SUFFIX: Record<string, Record<string, string>> = {
    [JarKey.FINANCIAL_FREEDOM]: {
        'Index funds': 'subs.index_funds',
        Crypto: 'subs.crypto',
        'Trading & experiments': 'subs.trading',
    },
};

/** Prefer client i18n for catalog guide notes; fall back to API seed text. */
export function jarGuideNote(t: TranslateFn, jarKey: string, apiNote: string): string {
    return jarGuideText(t, jarKey, 'note', apiNote);
}

/** Prefer client i18n for allowed-spend chips; fall back to API seed label. */
export function jarGuideAllowedLabel(t: TranslateFn, jarKey: string, apiLabel: string): string {
    const suffix = ALLOWED_LABEL_SUFFIX[jarKey]?.[apiLabel];
    if (!suffix) return apiLabel;
    return jarGuideText(t, jarKey, suffix, apiLabel);
}

/** Prefer client i18n for not-allowed line; fall back to API seed text. */
export function jarGuideNotAllowed(t: TranslateFn, jarKey: string, apiText: string): string {
    return jarGuideText(t, jarKey, 'not_allowed', apiText);
}

/** Prefer client i18n for guide link labels; fall back to API seed label. */
export function jarGuideLinkLabel(
    t: TranslateFn,
    jarKey: string,
    href: string,
    apiLabel: string
): string {
    const suffix = LINK_HREF_SUFFIX[href];
    if (!suffix) return apiLabel;
    return jarGuideText(t, jarKey, suffix, apiLabel);
}

/** Prefer client i18n for in-jar split labels; fall back to API seed label. */
export function jarGuideSubLabel(t: TranslateFn, jarKey: string, apiLabel: string): string {
    const suffix = SUB_LABEL_SUFFIX[jarKey]?.[apiLabel];
    if (!suffix) return apiLabel;
    return jarGuideText(t, jarKey, suffix, apiLabel);
}

/** Prefer client i18n for in-jar split note; fall back to API seed text. */
export function jarGuideSubNote(t: TranslateFn, jarKey: string, apiText: string): string {
    return jarGuideText(t, jarKey, 'sub_note', apiText);
}

/** Prefer client i18n for catalog subtitles; fall back to API seed text. */
export function jarCatalogSubtitle(
    t: TranslateFn,
    jarKey: string,
    apiSubtitle: string | null | undefined
): string {
    if (!JAR_KEYS.has(jarKey)) return apiSubtitle ?? '';
    const key = `guides.${jarKey}.subtitle`;
    return t.has(key) ? t(key) : (apiSubtitle ?? '');
}

/** Household override wins; otherwise i18n over catalog API subtitle. */
export function resolveJarSubtitle(
    t: TranslateFn,
    jarKey: string,
    householdSubtitle: string | null | undefined,
    catalogSubtitle: string | null | undefined
): string {
    if (householdSubtitle) return householdSubtitle;
    return jarCatalogSubtitle(t, jarKey, catalogSubtitle);
}

/**
 * Every default name the backend has ever copied onto a household's jars at onboarding:
 * the English template (`jar.seed-data.ts`) and the localised templates
 * (`jar-translations.ts`: nl, es, fr), plus the short English labels the UI used before.
 * Households are seeded once, in the language of the day, so a Dutch household still holds
 * "Noodzakelijk" and not "Necessity". A jar carrying any of these was never renamed by hand,
 * so it follows the app's current pot names; any other stored name is the household's own.
 * Keep in sync with the two backend seed files when a default name is added.
 */
const LEGACY_DEFAULT_JAR_NAMES: Record<JarKey, readonly string[]> = {
    [JarKey.NECESSITIES]: ['Necessity', 'Noodzakelijk', 'Necesidades', 'Nécessités'],
    [JarKey.FINANCIAL_FREEDOM]: [
        'Financial Freedom',
        'Financiële vrijheid',
        'Libertad financiera',
        'Liberté financière',
    ],
    [JarKey.LONG_TERM_SAVINGS]: [
        'Long Term Savings',
        'Langetermijn sparen',
        'Ahorro a largo plazo',
        'Épargne long terme',
    ],
    [JarKey.EDUCATION]: ['Education', 'Opleiding', 'Educación', 'Éducation'],
    [JarKey.PLAY]: ['Play', 'Plezier', 'Ocio', 'Plaisir'],
    [JarKey.GIVE]: [
        'Give / foundation',
        'Give',
        'Geven / stichting',
        'Dar / fundación',
        'Donner / fondation',
    ],
    // The two newest optional pots: English template plus nl, es, fr (`jar-translations.ts`).
    [JarKey.DAILY]: ['Daily', 'Dagelijks', 'Diario', 'Quotidien'],
    [JarKey.GOALS]: ['Goals', 'Doelen', 'Metas', 'Objectifs'],
};

function normalizeJarName(name: string): string {
    return name.trim().toLowerCase();
}

/** True when the stored name is one of the defaults a jar is seeded with, in any language. */
export function isDefaultJarName(jarKey: string, storedName: string): boolean {
    if (!JAR_KEYS.has(jarKey)) return false;
    const stored = normalizeJarName(storedName);
    return LEGACY_DEFAULT_JAR_NAMES[jarKey as JarKey].some(
        defaultName => normalizeJarName(defaultName) === stored
    );
}

/** Jar name for display: i18n over the stored name only while the stored name is a seed default. */
export function resolveJarName(t: TranslateFn, jarKey: string, storedName: string): string {
    if (!isDefaultJarName(jarKey, storedName)) return storedName;
    const key = `names.${jarKey}`;
    return t.has(key) ? t(key) : storedName;
}

/** The two translators the pot copy needs: `features.money.jars` and `features.money.groups`. */
export type PotCopyTranslators = { jars: TranslateFn; groups: TranslateFn };

/**
 * Pot name for display, given the pots the household has. A name the household typed wins.
 * Otherwise the main pot of a group that is not refined (no other pot of its group present)
 * is named after the GROUP ("Basics"); in every other case it is the per-pot name
 * ("Fixed costs", "Daily"). `presentKeys` empty (list still loading) gives the per-pot name.
 */
export function resolvePotName(
    translators: PotCopyTranslators,
    jarKey: string,
    storedName: string,
    presentKeys: readonly string[]
): string {
    if (!isDefaultJarName(jarKey, storedName)) return storedName;
    if (presentKeys.length > 0 && isAloneInGroup(jarKey, presentKeys)) {
        return translators.groups(`${jarGroupFor(jarKey as JarKey)}.title`);
    }
    return resolveJarName(translators.jars, jarKey, storedName);
}

/** The one literal line under a pot name: the group's purpose while the pot stands for its group. */
export function resolvePotPurpose(
    translators: PotCopyTranslators,
    jarKey: string,
    presentKeys: readonly string[]
): string {
    if (presentKeys.length > 0 && isAloneInGroup(jarKey, presentKeys)) {
        return translators.groups(`${jarGroupFor(jarKey as JarKey)}.purpose`);
    }
    return translators.jars(`purpose.${jarKey}`);
}
