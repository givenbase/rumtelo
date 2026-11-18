import type { JarKey } from '@rumtelo/contracts';

import { apiBadRequest } from '../../../common/errors/api-user-error';
import { splitByPercentage } from '../../../common/utils/money.util';

/** A catalog jar template reduced to what the split needs. */
export interface JarSplitTemplate {
    key: JarKey;
    sortOrder: number;
    /** Template default as a decimal string (0–100). */
    percentage: string | number;
}

/** One jar's share, in template `sortOrder`. */
export interface JarShare {
    key: JarKey;
    /** Percent with at most 2 decimals. */
    percentage: number;
}

/**
 * Shares for the six jars, in template `sortOrder`: the custom split when given, else
 * each template's default. Shared by `previewSplit` and `onboard` so the preview and
 * the board always agree.
 *
 * Custom splits must list each template jar exactly once (`jar_split_keys`) and total
 * exactly 100.00, compared in basis points (`jar_split_total`).
 */
export function resolveJarSplit(
    templates: readonly JarSplitTemplate[],
    custom?: readonly JarShare[]
): JarShare[] {
    const ordered = [...templates].sort((left, right) => left.sortOrder - right.sortOrder);
    if (!custom) {
        return ordered.map(template => ({
            key: template.key,
            percentage: Number(template.percentage),
        }));
    }

    const byKey = new Map<JarKey, number>();
    for (const share of custom) {
        if (byKey.has(share.key)) throw apiBadRequest('jar_split_keys');
        byKey.set(share.key, share.percentage);
    }
    const hasEveryJar =
        byKey.size === ordered.length && ordered.every(template => byKey.has(template.key));
    if (!hasEveryJar) throw apiBadRequest('jar_split_keys');

    const totalBasisPoints = [...byKey.values()].reduce(
        (sum, percentage) => sum + Math.round(percentage * 100),
        0
    );
    if (totalBasisPoints !== 10_000) {
        throw apiBadRequest('jar_split_total', { total: totalBasisPoints / 100 });
    }

    return ordered.map(template => ({
        key: template.key,
        percentage: byKey.get(template.key)!,
    }));
}

/**
 * Net monthly income (minor units) across the shares. The amounts always sum to the
 * income: the rounding remainder goes to the largest share, first in order on a tie.
 */
export function splitIncomeByJar(
    monthlyNetIncome: number,
    shares: readonly JarShare[]
): { key: JarKey; percentage: number; amount: number }[] {
    const amounts = splitByPercentage(
        monthlyNetIncome,
        shares.map(share => ({ id: share.key, percentage: share.percentage }))
    );
    return shares.map((share, index) => ({
        key: share.key,
        percentage: share.percentage,
        amount: amounts[index]!.amount,
    }));
}
