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
    const base = `features.soul.giving.causes.${key}`;
    return {
        name: t.has(`${base}.name` as never) ? t(`${base}.name` as never) : meta.name,
        line: t.has(`${base}.line` as never) ? t(`${base}.line` as never) : meta.line,
        icon: meta.icon,
    };
}

/** Why giving is in a money app — keyed via Soul → Giving copy. */
export function whyGiveCopy(t: TranslateFn) {
    const g = (key: string) => t(`features.soul.giving.${key}` as never);
    return {
        headline: g('headline'),
        body: [g('lead'), g('coach_tip_1'), g('coach_tip_2')] as const,
        checks: [
            { title: g('check_1_title'), body: g('check_1_body') },
            { title: g('check_2_title'), body: g('check_2_body') },
            { title: g('check_3_title'), body: g('check_3_body') },
            { title: g('check_4_title'), body: g('check_4_body') },
        ] as const,
    };
}
