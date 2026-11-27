import { JAR_GROUP_ORDER, JAR_ORDER_IN_GROUP, type JarKey } from '@rumtelo/contracts';

import { jarForKey } from '@/app/_lib/jar-for-key';
import { orderJarsByGroup } from '@/app/_lib/jar-group';

/** What the fixed-costs list needs of a pot to head a group. */
export type FixedCostPot = { key: JarKey; name: string; icon: string | null };

/**
 * The pots that can head a group on the fixed-costs page, in group order (Basics, Future, Free).
 * Follows the household's real pots (three to eight). Until they have loaded it falls back to the
 * keys the bills themselves sit under, so the list never flashes empty.
 */
export function fixedCostPots(
    householdJars: readonly { key: JarKey; name: string; icon: string | null }[],
    billJarKeys: readonly JarKey[]
): FixedCostPot[] {
    if (householdJars.length > 0) {
        return orderJarsByGroup(householdJars).map(jar => ({
            key: jar.key,
            name: jar.name,
            icon: jar.icon,
        }));
    }
    const used = new Set(billJarKeys);
    return JAR_GROUP_ORDER.flatMap(group => JAR_ORDER_IN_GROUP[group])
        .filter(key => used.has(key))
        .map(key => ({ key, name: key, icon: null }));
}

/**
 * A bill whose pot the household has not turned on is listed under its group's main pot,
 * never dropped. Bills already in a pot of the household are returned as they are.
 */
export function assignFixedCostsToPots<T extends { jarKey: JarKey }>(
    pots: readonly FixedCostPot[],
    items: readonly T[]
): T[] {
    return items.map(item => {
        const pot = jarForKey(pots, item.jarKey);
        return pot && pot.key !== item.jarKey ? { ...item, jarKey: pot.key } : item;
    });
}
