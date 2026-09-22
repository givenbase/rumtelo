import { JarKey } from '@rumtelo/contracts';
import type { TranslateFn } from '@rumtelo/i18n';

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
    '/product/growth/net-worth': 'links.net_worth',
    '/product/growth/goals': 'links.goals',
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
