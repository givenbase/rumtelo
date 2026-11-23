import {
    jarGroupFor,
    JAR_ORDER_IN_GROUP,
    resolveJarKeyForHousehold,
    type JarKey,
} from '@rumtelo/contracts';

/**
 * The household's pot for `key`: the pot itself when it has it, else the main pot of that
 * key's group, else `undefined` (only when the household has no pot in the group at all).
 *
 * A household has three to eight pots; a preset, category or suggestion that points at an
 * optional pot the household has not turned on must land in the group's main pot, never
 * in "whatever is selected" or the first pot of the list.
 */
export function jarForKey<T extends { key: JarKey }>(
    jars: readonly T[],
    key: JarKey
): T | undefined {
    const resolvedKey = resolveJarKeyForHousehold(
        key,
        jars.map(jar => jar.key)
    );
    return jars.find(jar => jar.key === resolvedKey);
}

/**
 * Every key a pot with this key stands in for: the key itself, and — when the pot is the
 * main pot of its group and no other pot of that group exists — all other keys of its group,
 * because that one pot now covers them (a Basics pot alone carries the DAILY categories).
 * Used to filter catalog entries (categories, presets) by the selected pot.
 */
export function jarKeysCoveredBy(jars: readonly { key: JarKey }[], key: JarKey): JarKey[] {
    const group = jarGroupFor(key);
    const present = new Set(jars.map(jar => jar.key));
    const groupKeys = JAR_ORDER_IN_GROUP[group];
    // Keys of the group the household does not have fall back to the group's main pot, so the
    // main pot covers exactly those; any other pot covers itself.
    return groupKeys.filter(
        groupKey => groupKey === key || resolveJarKeyForHousehold(groupKey, present) === key
    );
}
