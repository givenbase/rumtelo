/**
 * Net worth maths — shared by Growth dashboard and the net-worth board.
 *
 * Liquid spaargeld / invest-cash = Long-term savings + Financial Freedom only
 * (not Necessities/Play/…). Holdings = every asset you filed, including Cash
 * for money outside the jars. Don’t file the same euros as both a Cash asset
 * and jar balance.
 */

import { JarKey } from '../../money/enums';

/** Jars that hold wealth, not this month’s operating cash. */
export const NET_WORTH_JAR_KEYS: ReadonlySet<JarKey> = new Set([
    JarKey.LONG_TERM_SAVINGS,
    JarKey.FINANCIAL_FREEDOM,
]);

export function netWorthHoldingsCents(
    assets: ReadonlyArray<{ kindKey: string; value: number }>
): number {
    return assets.reduce((total, asset) => total + asset.value, 0);
}

export function netWorthJarsCents(jars: ReadonlyArray<{ key: string; available: number }>): number {
    return jars.reduce((total, jar) => {
        if (!NET_WORTH_JAR_KEYS.has(jar.key as JarKey)) return total;
        return total + Math.max(0, jar.available);
    }, 0);
}

export function netWorthDebtCents(debts: ReadonlyArray<{ balance: number }>): number {
    return debts.reduce((total, debt) => total + debt.balance, 0);
}

export function netWorthCents(input: {
    assets: ReadonlyArray<{ kindKey: string; value: number }>;
    jars: ReadonlyArray<{ key: string; available: number }>;
    debts: ReadonlyArray<{ balance: number }>;
}): number {
    return (
        netWorthHoldingsCents(input.assets) +
        netWorthJarsCents(input.jars) -
        netWorthDebtCents(input.debts)
    );
}
