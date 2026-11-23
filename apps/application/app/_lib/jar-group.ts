import { JAR_GROUP_ORDER, JAR_ORDER_IN_GROUP, JarGroup, JarKey } from '@rumtelo/contracts';

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
