import type { Jar } from '@rumtelo/contracts';
import { JarKey, SpendingStyle } from '@rumtelo/contracts';

import {
    DEFAULT_JAR_SPLIT,
    SPLIT_SOFT_CEILING,
    SPLIT_SOFT_FLOOR,
    type SplitPctByKey,
    type SplitTip,
} from './types';

/**
 * Rule-based split coach (Phase A + B spending-style hooks).
 * Pure — no I/O. Pass declared spendingStyle from account settings.
 */
export function evaluateSplitCoach(
    pct: SplitPctByKey,
    spendingStyle: SpendingStyle = SpendingStyle.UNKNOWN
): SplitTip[] {
    const tips: SplitTip[] = [];
    const play = pct[JarKey.PLAY] ?? DEFAULT_JAR_SPLIT[JarKey.PLAY];
    const give = pct[JarKey.GIVE] ?? DEFAULT_JAR_SPLIT[JarKey.GIVE];
    const edu = pct[JarKey.EDUCATION] ?? DEFAULT_JAR_SPLIT[JarKey.EDUCATION];
    const ff = pct[JarKey.FINANCIAL_FREEDOM] ?? DEFAULT_JAR_SPLIT[JarKey.FINANCIAL_FREEDOM];
    const lts = pct[JarKey.LONG_TERM_SAVINGS] ?? DEFAULT_JAR_SPLIT[JarKey.LONG_TERM_SAVINGS];
    const nec = pct[JarKey.NECESSITIES] ?? DEFAULT_JAR_SPLIT[JarKey.NECESSITIES];

    const futureFirst = ff + lts;
    const futureDefault =
        DEFAULT_JAR_SPLIT[JarKey.FINANCIAL_FREEDOM] + DEFAULT_JAR_SPLIT[JarKey.LONG_TERM_SAVINGS];

    if (play > SPLIT_SOFT_CEILING[JarKey.PLAY]) {
        tips.push({
            id: 'play-above-default',
            severity: 'warn',
            jars: [JarKey.PLAY, JarKey.FINANCIAL_FREEDOM, JarKey.LONG_TERM_SAVINGS],
            message:
                spendingStyle === SpendingStyle.SAVER
                    ? 'Play above 10% can be healthy if you under-spend joy — just don’t fund it by cutting Financial Freedom.'
                    : 'Play above 10% usually comes from Financial Freedom or Long Term Savings. Those two buy your future; Play spends this month.',
        });
    }

    if (give > SPLIT_SOFT_CEILING[JarKey.GIVE]) {
        tips.push({
            id: 'give-above-default',
            severity: 'info',
            jars: [JarKey.GIVE, JarKey.FINANCIAL_FREEDOM],
            message:
                'Give above 5% is generous — keep Financial Freedom at least at 10% so giving doesn’t replace paying yourself first.',
        });
    }

    if (edu > SPLIT_SOFT_CEILING[JarKey.EDUCATION]) {
        tips.push({
            id: 'edu-above-soft',
            severity: 'info',
            jars: [JarKey.EDUCATION, JarKey.FINANCIAL_FREEDOM],
            message:
                'Education raises earning power — still protect Financial Freedom at 10% so learning doesn’t crowd out investing.',
        });
    }

    if (ff < SPLIT_SOFT_FLOOR[JarKey.FINANCIAL_FREEDOM]) {
        tips.push({
            id: 'ff-below-default',
            severity: 'warn',
            jars: [JarKey.FINANCIAL_FREEDOM],
            message:
                'Financial Freedom under 10% means you’re paying everyone else first. Put yourself back in the split before raising Play or Give.',
        });
    }

    if (lts < SPLIT_SOFT_FLOOR[JarKey.LONG_TERM_SAVINGS]) {
        tips.push({
            id: 'lts-below-default',
            severity: 'warn',
            jars: [JarKey.LONG_TERM_SAVINGS],
            message:
                'Long Term Savings under 10% leaves no buffer for planned big things. Raise this before expanding Play.',
        });
    }

    if (
        futureFirst < futureDefault &&
        (play > DEFAULT_JAR_SPLIT[JarKey.PLAY] || give > DEFAULT_JAR_SPLIT[JarKey.GIVE])
    ) {
        tips.push({
            id: 'future-vs-fun',
            severity: 'warn',
            jars: [JarKey.PLAY, JarKey.GIVE, JarKey.FINANCIAL_FREEDOM, JarKey.LONG_TERM_SAVINGS],
            message:
                'You’re funding today (Play / Give) while shrinking tomorrow (Freedom + Long Term). Prefer raising those two before fun.',
        });
    }

    // Soft ceiling — see money README → “When Necessities can’t fit in 55%”.
    // Prefer cutting fixed costs / raising income over starving FF.
    if (nec > SPLIT_SOFT_CEILING[JarKey.NECESSITIES]) {
        tips.push({
            id: 'nec-high',
            severity: 'info',
            jars: [JarKey.NECESSITIES],
            message:
                'Necessity above 60% squeezes every other jar. Cutting fixed costs usually helps more than cutting Freedom.',
        });
    }

    if (nec < SPLIT_SOFT_FLOOR[JarKey.NECESSITIES]) {
        tips.push({
            id: 'nec-low',
            severity: 'warn',
            jars: [JarKey.NECESSITIES],
            message:
                'Necessity under 45% is tight for most households — check rent, insurance and debt instalments still fit.',
        });
    }

    // Spending-style nudges — works once spendingStyle ≠ UNKNOWN
    if (
        spendingStyle === SpendingStyle.SPENDER &&
        play >= DEFAULT_JAR_SPLIT[JarKey.PLAY] &&
        ff <= DEFAULT_JAR_SPLIT[JarKey.FINANCIAL_FREEDOM]
    ) {
        tips.push({
            id: 'spender-ff',
            severity: 'info',
            jars: [JarKey.PLAY, JarKey.FINANCIAL_FREEDOM],
            message:
                'Your pattern leans spender — try +1–2% into Financial Freedom before adding more Play.',
        });
    }

    if (spendingStyle === SpendingStyle.SAVER && play < 5 && ff + lts >= 25) {
        tips.push({
            id: 'saver-play',
            severity: 'info',
            jars: [JarKey.PLAY],
            message:
                'Your pattern leans saver — a little more Play can make the plan sustainable. Joy that is planned is not waste.',
        });
    }

    return dedupeTips(tips);
}

function dedupeTips(tips: SplitTip[]): SplitTip[] {
    const seen = new Set<string>();
    return tips.filter(tip => {
        if (seen.has(tip.id)) return false;
        seen.add(tip.id);
        return true;
    });
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
