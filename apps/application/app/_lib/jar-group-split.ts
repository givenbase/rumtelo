import type { JarGroup, JarKey } from '@rumtelo/contracts';

import { jarsInGroup } from '@/app/_lib/jar-group';

/** The three fields the split editor needs from a saved pot. */
export type SplitJar = { id: string; key: JarKey; percentage: number };

/** Percentages are compared and added as integer basis points (two decimals), like the server. */
export function toBasisPoints(percentage: number): number {
    return Math.round(percentage * 100);
}

/**
 * What a person typed in a share field: empty or unreadable is 0, the value stays between 0 and
 * 100 and keeps two decimals, so every edit is a whole number of basis points.
 */
export function parseShareInput(raw: string): number {
    const value = Number(raw);
    if (!Number.isFinite(value)) return 0;
    return Math.min(100, Math.max(0, toBasisPoints(value) / 100));
}

export type GroupSplitStatus = {
    /** The group's total as saved, in basis points. It never changes by editing inside the group. */
    savedBasisPoints: number;
    /** The group's total as edited. */
    editedBasisPoints: number;
    /** Edited minus saved: above 0 is too much, below 0 is still to place. */
    differenceBasisPoints: number;
    /** At least one pot of the group differs from its saved share. */
    changed: boolean;
    /** The edited pots add up to the saved group total, so the server will take it. */
    balanced: boolean;
};

/**
 * How a group's shares stand while edited: `edits` maps a pot id to its edited percentage, a pot
 * without an entry keeps its saved share. Only pots of `group` are looked at.
 */
export function groupSplitStatus(
    jars: readonly SplitJar[],
    group: JarGroup,
    edits: Readonly<Record<string, number>>
): GroupSplitStatus {
    const groupJars = jarsInGroup(jars, group);
    let savedBasisPoints = 0;
    let editedBasisPoints = 0;
    let changed = false;
    for (const jar of groupJars) {
        const saved = toBasisPoints(jar.percentage);
        const edited = toBasisPoints(edits[jar.id] ?? jar.percentage);
        savedBasisPoints += saved;
        editedBasisPoints += edited;
        if (saved !== edited) changed = true;
    }
    const differenceBasisPoints = editedBasisPoints - savedBasisPoints;
    return {
        savedBasisPoints,
        editedBasisPoints,
        differenceBasisPoints,
        changed,
        balanced: differenceBasisPoints === 0,
    };
}

/**
 * The body of `jars.updateSplit` for an edit inside one group: every pot the household has,
 * once. Pots outside `group` keep their saved share; pots in it take the edit (two decimals).
 */
export function groupSplitPayload(
    jars: readonly SplitJar[],
    group: JarGroup,
    edits: Readonly<Record<string, number>>
): { jarId: string; percentage: number }[] {
    const inGroup = new Set(jarsInGroup(jars, group).map(jar => jar.id));
    return jars.map(jar => ({
        jarId: jar.id,
        percentage: inGroup.has(jar.id)
            ? toBasisPoints(edits[jar.id] ?? jar.percentage) / 100
            : jar.percentage,
    }));
}

/** Saved share per pot id for one group, the starting point of an edit. */
export function groupSavedShares(
    jars: readonly SplitJar[],
    group: JarGroup
): Record<string, number> {
    return Object.fromEntries(jarsInGroup(jars, group).map(jar => [jar.id, jar.percentage]));
}

/** Two share maps are the same when every pot has the same value to the basis point. */
export function sameShares(
    left: Readonly<Record<string, number>>,
    right: Readonly<Record<string, number>>
): boolean {
    const ids = new Set([...Object.keys(left), ...Object.keys(right)]);
    return [...ids].every(
        id => toBasisPoints(left[id] ?? Number.NaN) === toBasisPoints(right[id] ?? Number.NaN)
    );
}
