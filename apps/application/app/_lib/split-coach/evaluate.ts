import type { Jar } from '@rumtelo/contracts';
import { JarGroup, JarKey, sumPercentageByGroup } from '@rumtelo/contracts';

import { GROUP_SOFT_CEILING, GROUP_SOFT_FLOOR, type SplitPctByKey, type SplitTip } from './types';

/**
 * Rule-based split coach at group level, pure — no I/O. A household has three to eight pots,
 * so the coach looks at what each group holds in total, never at one pot against a six-pot
 * default. A pot the household does not have is not in `pct` and counts as 0 %.
 *
 * - Basics above `GROUP_SOFT_CEILING.BASIS` → `basics-high`: what must be paid takes most of
 *   the income; look at the biggest fixed cost, not at squeezing the split.
 * - Future below `GROUP_SOFT_FLOOR.FUTURE` → `future-low`: little is left to build with.
 */
export function evaluateSplitCoach(pct: SplitPctByKey): SplitTip[] {
    const entries = Object.entries(pct) as [JarKey, number][];
    // No pots yet (list still loading): nothing to coach, and "0 % Future" would be a false alarm.
    if (entries.length === 0) return [];

    const groupShare = sumPercentageByGroup(
        entries.map(([key, percentage]) => ({ key, percentage }))
    );
    const tips: SplitTip[] = [];

    const basicsCeiling = GROUP_SOFT_CEILING[JarGroup.BASIS];
    if (basicsCeiling !== undefined && groupShare[JarGroup.BASIS] > basicsCeiling) {
        tips.push({
            id: 'basics-high',
            severity: 'info',
            jars: [JarKey.NECESSITIES, JarKey.DAILY],
        });
    }

    const futureFloor = GROUP_SOFT_FLOOR[JarGroup.FUTURE];
    if (futureFloor !== undefined && groupShare[JarGroup.FUTURE] < futureFloor) {
        tips.push({
            id: 'future-low',
            severity: 'warn',
            jars: [
                JarKey.LONG_TERM_SAVINGS,
                JarKey.GOALS,
                JarKey.FINANCIAL_FREEDOM,
                JarKey.EDUCATION,
            ],
        });
    }

    return tips;
}

/** Map jar list rows → % by key for the evaluator. */
export function pctByJarKey(
    jars: ReadonlyArray<Pick<Jar, 'id' | 'key' | 'percentage'>>,
    pctById: Record<string, number>
): SplitPctByKey {
    const out: SplitPctByKey = {};
    for (const jar of jars) {
        out[jar.key] = pctById[jar.id] ?? jar.percentage;
    }
    return out;
}

/** Warnings before information, then the order the rules fire in (stable sort). */
export function orderSplitTips(tips: readonly SplitTip[]): SplitTip[] {
    const rank = (tip: SplitTip) => (tip.severity === 'warn' ? 0 : 1);
    return tips.slice().sort((left, right) => rank(left) - rank(right));
}
