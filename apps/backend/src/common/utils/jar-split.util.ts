import type { JarKey } from '@rumtelo/contracts';

import { apiBadRequest } from '../errors/api-user-error';
import { splitByPercentage } from './money.util';

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

/** Why a custom split was refused; the same keys the API answers with. */
export type JarSplitFailure =
    | { reason: 'jar_split_keys' }
    | { reason: 'jar_split_total'; total: number };

export type JarSplitCheck = { ok: true; shares: JarShare[] } | ({ ok: false } & JarSplitFailure);

/**
 * The one rule for a custom split, as a value instead of a throw: every template jar
 * exactly once (`jar_split_keys`), each share within 0..100, and a total of exactly
 * 100.00 compared in basis points (`jar_split_total`). Callers that must not abort
 * (the archive restore previews and skips a bad split) use this; `resolveJarSplit`
 * throws on the same outcome, so the two can never disagree.
 */
export function checkJarSplit(
    templates: readonly JarSplitTemplate[],
    custom: readonly JarShare[]
): JarSplitCheck {
    const ordered = [...templates].sort((left, right) => left.sortOrder - right.sortOrder);

    const byKey = new Map<JarKey, number>();
    for (const share of custom) {
        if (byKey.has(share.key)) return { ok: false, reason: 'jar_split_keys' };
        byKey.set(share.key, share.percentage);
    }
    const hasEveryJar =
        byKey.size === ordered.length && ordered.every(template => byKey.has(template.key));
    if (!hasEveryJar) return { ok: false, reason: 'jar_split_keys' };

    const totalBasisPoints = [...byKey.values()].reduce(
        (sum, percentage) => sum + Math.round(percentage * 100),
        0
    );
    // A share outside 0..100 (or NaN) can still total 100.00 against a negative
    // partner, so it is refused on its own; it surfaces as the total error.
    const inRange = [...byKey.values()].every(
        percentage => Number.isFinite(percentage) && percentage >= 0 && percentage <= 100
    );
    if (!inRange || totalBasisPoints !== 10_000) {
        return { ok: false, reason: 'jar_split_total', total: totalBasisPoints / 100 };
    }

    return {
        ok: true,
        shares: ordered.map(template => ({
            key: template.key,
            percentage: byKey.get(template.key)!,
        })),
    };
}

/**
 * Shares for the six jars, in template `sortOrder`: the custom split when given, else
 * each template's default. Shared by `previewSplit`, `onboard`, `JarService.updateSplit`
 * and the archive restore so the preview and the board always agree.
 *
 * A custom split is validated by `checkJarSplit` and throws its failure as
 * `jar_split_keys` / `jar_split_total`.
 */
export function resolveJarSplit(
    templates: readonly JarSplitTemplate[],
    custom?: readonly JarShare[]
): JarShare[] {
    if (!custom) {
        return [...templates]
            .sort((left, right) => left.sortOrder - right.sortOrder)
            .map(template => ({
                key: template.key,
                percentage: Number(template.percentage),
            }));
    }

    const checked = checkJarSplit(templates, custom);
    if (checked.ok) return checked.shares;
    if (checked.reason === 'jar_split_total') {
        throw apiBadRequest('jar_split_total', { total: checked.total });
    }
    throw apiBadRequest('jar_split_keys');
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
