/**
 * Giving — Soul meaning copy and badge styling.
 *
 * Cause / evaluator glossary lives in @rumtelo/contracts (company catalog).
 * Doctrine: Money owns the *flow* (Give jar, fixed cost, transaction);
 * Soul owns the *meaning*. The Coach connects them. Rumtelo never claims to
 * vet an organisation itself — it shows who does, and what they measure.
 */
import {
    type GivingCause,
    GivingSignalTier,
    GIVING_CAUSE_CATALOG,
    GIVING_EVALUATOR_CATALOG,
    givingCauseMeta,
    givingEvaluatorMeta,
} from '@rumtelo/contracts';
import type { TranslateFn } from '@rumtelo/i18n';

export { GIVING_CAUSE_CATALOG, GIVING_EVALUATOR_CATALOG, givingCauseMeta, givingEvaluatorMeta };

const resolveGivingCauseMeta = givingCauseMeta;

/** Display order for the badge legend — strongest claim first. */
export const GIVING_SIGNAL_TIER_ORDER: readonly GivingSignalTier[] = [
    GivingSignalTier.IMPACT,
    GivingSignalTier.GOVERNANCE,
    GivingSignalTier.TAX,
];

const SIGNAL_CLASS: Record<GivingSignalTier, string> = {
    [GivingSignalTier.IMPACT]: 'border-success/30 bg-success/10 text-success',
    [GivingSignalTier.GOVERNANCE]: 'border-accent/30 bg-accent-soft text-accent',
    [GivingSignalTier.TAX]: 'border-line bg-raised text-fg-secondary',
};

/**
 * What a signal is evidence *of*. className stays here — presentation, not catalog.
 */
export function givingSignalTiers(
    t: TranslateFn
): Record<GivingSignalTier, { label: string; line: string; className: string }> {
    return {
        [GivingSignalTier.IMPACT]: {
            label: t('features.money.giving_signals.impact.label'),
            line: t('features.money.giving_signals.impact.line'),
            className: SIGNAL_CLASS[GivingSignalTier.IMPACT],
        },
        [GivingSignalTier.GOVERNANCE]: {
            label: t('features.money.giving_signals.governance.label'),
            line: t('features.money.giving_signals.governance.line'),
            className: SIGNAL_CLASS[GivingSignalTier.GOVERNANCE],
        },
        [GivingSignalTier.TAX]: {
            label: t('features.money.giving_signals.tax.label'),
            line: t('features.money.giving_signals.tax.line'),
            className: SIGNAL_CLASS[GivingSignalTier.TAX],
        },
    };
}

/** Prefer client i18n for cause chips; fall back to contracts catalog. */
export function givingCauseCopy(
    t: TranslateFn,
    key: GivingCause
): { name: string; line: string; icon: string } {
    const meta = resolveGivingCauseMeta(key);
    if (!meta) return { name: key, line: '', icon: '💛' };
    const nameKey = `features.soul.giving.causes.${key}.name`;
    const lineKey = `features.soul.giving.causes.${key}.line`;
    return {
        name: t.has(nameKey) ? t(nameKey) : meta.name,
        line: t.has(lineKey) ? t(lineKey) : meta.line,
        icon: meta.icon,
    };
}

/** Why giving is in a money app — keyed via Soul → Giving copy. */
export function whyGiveCopy(t: TranslateFn) {
    const giveKey = (key: string) => t(`features.soul.giving.${key}`);
    return {
        headline: giveKey('headline'),
        body: [giveKey('lead'), giveKey('coach_tip_1'), giveKey('coach_tip_2')] as const,
        checks: [
            { title: giveKey('check_1_title'), body: giveKey('check_1_body') },
            { title: giveKey('check_2_title'), body: giveKey('check_2_body') },
            { title: giveKey('check_3_title'), body: giveKey('check_3_body') },
            { title: giveKey('check_4_title'), body: giveKey('check_4_body') },
        ] as const,
    };
}
