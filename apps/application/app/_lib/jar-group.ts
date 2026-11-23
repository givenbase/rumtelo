import {
    JAR_GROUP_ORDER,
    JAR_MAIN_KEY_BY_GROUP,
    JAR_ORDER_IN_GROUP,
    JarGroup,
    JarKey,
    defaultJarSplitFor,
    jarGroupFor,
} from '@rumtelo/contracts';

import { JAR_CHROME } from '@/app/_lib/jar-meta';

/** Search param that selects one group on the pots board (`?group=basis`). Absent = all. */
export const GROUP_PARAM = 'group';

const SLUG_BY_GROUP: Record<JarGroup, string> = {
    [JarGroup.BASIS]: 'basis',
    [JarGroup.FUTURE]: 'future',
    [JarGroup.FREE]: 'free',
};

export function groupSlug(group: JarGroup): string {
    return SLUG_BY_GROUP[group];
}

/** The group a `?group=` value names; anything else (missing, misspelled, old link) is "all". */
export function parseGroupParam(value: string | null | undefined): JarGroup | null {
    return JAR_GROUP_ORDER.find(group => SLUG_BY_GROUP[group] === value) ?? null;
}

/**
 * One colour per group, borrowed from an existing jar token so no new token is needed:
 * Basics = Necessities, Future = Long-term savings, Free = Play.
 */
export const GROUP_CHROME: Record<JarGroup, { color: string; text: string }> = {
    [JarGroup.BASIS]: JAR_CHROME[JarKey.NECESSITIES],
    [JarGroup.FUTURE]: JAR_CHROME[JarKey.LONG_TERM_SAVINGS],
    [JarGroup.FREE]: JAR_CHROME[JarKey.PLAY],
};

/** A group's pots, in the fixed order of the group. A pot the data does not hold is skipped. */
export function jarsInGroup<T extends { key: JarKey }>(jars: readonly T[], group: JarGroup): T[] {
    const ordered: T[] = [];
    for (const key of JAR_ORDER_IN_GROUP[group]) {
        const jar = jars.find(candidate => candidate.key === key);
        if (jar) ordered.push(jar);
    }
    return ordered;
}

/** Every pot in group order (Basics, then Future, then Free). */
export function orderJarsByGroup<T extends { key: JarKey }>(jars: readonly T[]): T[] {
    return JAR_GROUP_ORDER.flatMap(group => jarsInGroup(jars, group));
}

const JAR_KEY_BY_VALUE = new Map<string, JarKey>(Object.values(JarKey).map(key => [key, key]));

/**
 * True when `key` is the main pot of its group and no other pot of that group is present: the
 * group is "not refined", so the one pot stands for the whole group (and takes its name).
 * A key that is not a pot key is never alone.
 */
export function isAloneInGroup(key: string, presentKeys: readonly string[]): boolean {
    const jarKey = JAR_KEY_BY_VALUE.get(key);
    if (!jarKey) return false;
    const group = jarGroupFor(jarKey);
    if (JAR_MAIN_KEY_BY_GROUP[group] !== jarKey) return false;
    return JAR_ORDER_IN_GROUP[group].every(
        groupKey => groupKey === jarKey || !presentKeys.includes(groupKey)
    );
}

/** A group that has at least one pot, as the Home grid and the pots board draw it. */
export type JarGroupView<T extends { key: JarKey }> = {
    group: JarGroup;
    /** 1, 2, 3 — the group's place in the money flow, whether or not it has a heading. */
    position: number;
    jars: T[];
    /** Only the main pot exists: one tile named after the group, no separate group heading. */
    single: boolean;
};

/** Groups with their pots in display order; a group without pots is left out. */
export function groupViews<T extends { key: JarKey }>(jars: readonly T[]): JarGroupView<T>[] {
    const presentKeys = jars.map(jar => jar.key);
    return JAR_GROUP_ORDER.flatMap(group => {
        const groupJars = jarsInGroup(jars, group);
        if (groupJars.length === 0) return [];
        return [
            {
                group,
                position: JAR_GROUP_ORDER.indexOf(group) + 1,
                jars: groupJars,
                single: groupJars.length === 1 && isAloneInGroup(groupJars[0]!.key, presentKeys),
            },
        ];
    });
}

/**
 * Consecutive single-pot groups share one row of tiles (three unrefined groups = one row of
 * three); a refined group is its own block with its heading. Order is always Basics, Future, Free.
 */
export type JarGroupBlock<T extends { key: JarKey }> =
    | { kind: 'tiles'; views: JarGroupView<T>[] }
    | { kind: 'group'; view: JarGroupView<T> };

export function groupBlocks<T extends { key: JarKey }>(
    views: readonly JarGroupView<T>[]
): JarGroupBlock<T>[] {
    const blocks: JarGroupBlock<T>[] = [];
    for (const view of views) {
        const last = blocks.at(-1);
        if (view.single) {
            if (last?.kind === 'tiles') last.views.push(view);
            else blocks.push({ kind: 'tiles', views: [view] });
        } else {
            blocks.push({ kind: 'group', view });
        }
    }
    return blocks;
}

/**
 * "Reset to default" for the pots a household has: share per jar id, from the default split of
 * its keys (so it adds up to 100 for 3, 6 or 8 pots). A pot the default does not cover keeps
 * its current share.
 */
export function defaultSharesById(
    jars: readonly { id: string; key: JarKey; percentage: number }[]
): Record<string, number> {
    const defaults = defaultJarSplitFor(jars.map(jar => jar.key));
    return Object.fromEntries(jars.map(jar => [jar.id, defaults[jar.key] ?? jar.percentage]));
}

/** Id of a group's section on the split settings screen; the pots board links to it (`#…`). */
export function splitGroupAnchor(group: JarGroup): string {
    return `split-${SLUG_BY_GROUP[group]}`;
}

/** Sum of an integer minor-unit amount over a group's pots — display only, nothing stored. */
export function sumGroupAmount<T extends { key: JarKey }>(
    jars: readonly T[],
    group: JarGroup,
    amountOf: (jar: T) => number
): number {
    return jarsInGroup(jars, group).reduce((total, jar) => total + amountOf(jar), 0);
}

/** A share with at most two decimals and no trailing zeros ("55", "12.5"), in the locale. */
export function formatShare(value: number, locale: string): string {
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value);
}
