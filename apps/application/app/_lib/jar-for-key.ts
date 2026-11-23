import {
    jarGroupFor,
    JAR_MAIN_KEY_BY_GROUP,
    JAR_ORDER_IN_GROUP,
    JarGroup,
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
 * The pot a bill for `key` lands in. Starts from {@link jarForKey}; when that pot cannot carry
 * bills (Future's main pot for an Education bill in a three-pot household, Daily) it falls back
 * to Basics' bills pot — a bill that must be paid belongs in Basics. `undefined` only when the
 * household has no pot that can carry bills at all.
 *
 * `billJars` are the pots the server accepts bills on; `allJars` is every pot the household has.
 * Every place that sets a bill's pot from a catalog key goes through here, so the pot select can
 * never end up on a pot it does not list (and Save never meets "this pot takes no bills").
 */
export function billJarForKey<T extends { id: string; key: JarKey }>(
    billJars: readonly T[],
    allJars: readonly T[],
    key: JarKey
): T | undefined {
    const resolved = jarForKey(allJars, key);
    const carrying = resolved ? billJars.find(jar => jar.id === resolved.id) : undefined;
    if (carrying) return carrying;
    return jarForKey(billJars, JAR_MAIN_KEY_BY_GROUP[JarGroup.BASIS]);
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
