import { GoalKind, JarKey } from '@rumtelo/contracts';

import { jarForKey } from '@/app/_lib/jar-for-key';

/**
 * The pot a goal of this kind is saved in, from the household's pots.
 *
 * - SAVE: Future's main pot (a goal sits in the main pot when no better pot was picked).
 * - GIVE: the Give pot or nothing. Never a fallback: a pledge in another Free pot would make
 *   the server count that pot's outflow as giving. `null` means "turn Giving on first".
 * - EARN: no pot.
 */
export function goalJarFor<T extends { key: JarKey }>(
    jars: readonly T[],
    kind: GoalKind
): T | null {
    if (kind === GoalKind.EARN) return null;
    if (kind === GoalKind.GIVE) return jars.find(jar => jar.key === JarKey.GIVE) ?? null;
    return jarForKey(jars, JarKey.LONG_TERM_SAVINGS) ?? null;
}

/** A goal preset's suggested pot: the pot itself, its group's main pot — except Give, which has no fallback. */
export function goalPresetJarFor<T extends { key: JarKey }>(
    jars: readonly T[],
    presetKey: JarKey
): T | null {
    if (presetKey === JarKey.GIVE) return jars.find(jar => jar.key === JarKey.GIVE) ?? null;
    return jarForKey(jars, presetKey) ?? null;
}

/** True when a Give pledge cannot be saved yet: the household has not turned the Give pot on. */
export function giveNeedsPot(jars: readonly { key: JarKey }[], kind: GoalKind): boolean {
    return kind === GoalKind.GIVE && goalJarFor(jars, kind) === null;
}
