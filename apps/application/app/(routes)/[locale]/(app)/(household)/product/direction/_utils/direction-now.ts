import { JAR_GROUP_ORDER, JarKey, sumPercentageByGroup, type JarGroup } from '@rumtelo/contracts';

import { jarsInGroup, sumGroupAmount } from '@/app/_lib/jar-group';

/** The few fields of a pot (a dashboard `JarBalance`) the "now" block reads. */
export type NowJar = {
    key: JarKey;
    percentage: number;
    /** This month's share of the income, minor units. */
    allocated: number;
    /** Saved so far in the pot, minor units. */
    potBalance: number;
};

export type NowGroup = {
    group: JarGroup;
    /** The group's share of the split, in percent (two decimals at most). */
    percent: number;
    /** This month's amount for the group, minor units. */
    allocated: number;
};

export type DirectionNow =
    /** No income on the board: one line and one next move, nothing to split. */
    | { kind: 'no_income' }
    | {
          kind: 'split';
          groups: NowGroup[];
          /** The Future main pot, only when something is saved in it. */
          buffer: { jarKey: JarKey; saved: number } | null;
          /** `YYYY-MM-DD` the debts are cleared, only when debts count for this plan. */
          debtFreeOn: string | null;
      };

/**
 * "Where you are now", read from the dashboard and never asked: this month's split per group,
 * what the Buffer holds, the debt-free date. Neutral by design: no score, no verdict, and a
 * pot that is empty or below zero is left out rather than shown as a gap.
 *
 * Nothing is computed here that the board does not already show: group shares come from
 * `sumPercentageByGroup` (basis points), group amounts from `sumGroupAmount`.
 */
export function buildDirectionNow(input: {
    jars: readonly NowJar[];
    incomeTotal: number;
    debtFreeOn: string | null;
    /** Debt is part of the plan and the role may see it. */
    includeDebt: boolean;
}): DirectionNow {
    if (input.incomeTotal <= 0) return { kind: 'no_income' };

    const percents = sumPercentageByGroup(input.jars);
    // A household with no pot in a group (none today, three main pots always exist) gets no row.
    const groups = JAR_GROUP_ORDER.filter(group => jarsInGroup(input.jars, group).length > 0).map(
        (group): NowGroup => ({
            group,
            percent: percents[group],
            allocated: sumGroupAmount(input.jars, group, jar => jar.allocated),
        })
    );

    // The Buffer is the Future main pot, found by its key and never by its stored name.
    const bufferJar = input.jars.find(jar => jar.key === JarKey.LONG_TERM_SAVINGS);
    const buffer =
        bufferJar && bufferJar.potBalance > 0
            ? { jarKey: bufferJar.key, saved: bufferJar.potBalance }
            : null;

    return {
        kind: 'split',
        groups,
        buffer,
        debtFreeOn: input.includeDebt ? input.debtFreeOn : null,
    };
}
