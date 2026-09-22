import type { TranslateFn } from '@rumtelo/i18n';

/** Tailwind bg-* jar color → CSS variable for inline accents. */
export function bgClassToCssVar(bgClass: string): string {
    return bgClass.replace('bg-', 'var(--color-') + ')';
}

const CADENCE_KEYS: Record<string, { title: string; lower: string }> = {
    WEEKLY: { title: 'cadence_weekly', lower: 'cadence_weekly_lc' },
    MONTHLY: { title: 'cadence_monthly', lower: 'cadence_monthly_lc' },
    QUARTERLY: { title: 'cadence_quarterly', lower: 'cadence_quarterly_lc' },
    YEARLY: { title: 'cadence_yearly', lower: 'cadence_yearly_lc' },
    ONCE: { title: 'cadence_once', lower: 'cadence_once_lc' },
};

type CadenceLabelOptions = { case?: 'title' | 'lower' };

/** Human labels for Cadence enum members — scoped to `features.money.chips`. */
export function cadenceLabel(
    cadence: string,
    /** Scoped to `features.money.chips`. */
    t: TranslateFn,
    options?: CadenceLabelOptions
): string {
    const keys = CADENCE_KEYS[cadence];
    if (!keys) return cadence;
    const key = options?.case === 'lower' ? keys.lower : keys.title;
    return t(key);
}
