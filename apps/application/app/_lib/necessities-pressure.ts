import type { JarBalance } from '@rumtelo/contracts';
import { DEFAULT_GROUP_SPLIT, JarGroup, JarKey, jarGroupFor } from '@rumtelo/contracts';

/**
 * When fixed costs / Necessities blow past the Basics envelope.
 *
 * Why we coach simplify + earn more (never raid FF):
 * `apps/backend/src/modules/public/product/money/README.md`
 * → “When Necessities can’t fit in 55%”
 */

/** What the Basics group gets by default (Necessities, plus Daily when it is turned on). */
export const NECESSITIES_TARGET_PCT = DEFAULT_GROUP_SPLIT[JarGroup.BASIS];

export type NecessitiesPressureInput = {
    /** Monthly-normalised active income (cents). */
    netMonthlyCents: number;
    /** Monthly-normalised fixed OUT total (cents). */
    fixedOutMonthlyCents: number;
    /** Fixed OUT on the Necessities jar only (cents). */
    necessitiesFixedMonthlyCents: number;
    /** Household Necessities split % (group default 55). */
    necessitiesPct?: number;
};

export type NecessitiesPressure = {
    active: boolean;
    necessitiesPct: number;
    /** Fixed OUT as % of income (all jars). */
    commitmentRatio: number;
    /** What Necessities is allocated this month (cents). */
    envelopeCents: number;
    /** How far Necessities fixed OUT exceeds its envelope (cents). */
    shortfallCents: number;
};

export function evaluateNecessitiesPressure(input: NecessitiesPressureInput): NecessitiesPressure {
    const necessitiesPct = input.necessitiesPct ?? NECESSITIES_TARGET_PCT;
    const net = Math.max(0, input.netMonthlyCents);
    const fixedOut = Math.max(0, input.fixedOutMonthlyCents);
    const necFixed = Math.max(0, input.necessitiesFixedMonthlyCents);
    const envelopeCents = net > 0 ? Math.round((net * necessitiesPct) / 100) : 0;
    const commitmentRatio = net > 0 ? Math.round((fixedOut / net) * 100) : 0;
    const shortfallCents = Math.max(0, necFixed - envelopeCents);
    const active = net > 0 && (shortfallCents > 0 || commitmentRatio > necessitiesPct);

    return {
        active,
        necessitiesPct,
        commitmentRatio,
        envelopeCents,
        shortfallCents,
    };
}

type PressureJar = Pick<
    JarBalance,
    'key' | 'percentage' | 'allocated' | 'committedOut' | 'available'
>;

/**
 * From jar balances — is Basics overspent (fixed costs + spend ate the envelope)? Measured over
 * the whole Basics group: Necessities, plus Daily when the household turned it on, because Daily
 * is carved out of the same envelope and its spend comes out of the same money. Null when the
 * household has no Necessities pot in the list.
 */
export function necessitiesPressureFromJars(
    jars: readonly PressureJar[]
): NecessitiesPressure | null {
    if (!jars.some(jar => jar.key === JarKey.NECESSITIES)) return null;
    const basics = jars.filter(jar => jarGroupFor(jar.key) === JarGroup.BASIS);
    const sum = (pick: (jar: PressureJar) => number) =>
        basics.reduce((total, jar) => total + pick(jar), 0);
    const allocated = sum(jar => jar.allocated);
    const committedOut = sum(jar => jar.committedOut);
    const available = sum(jar => jar.available);
    // Share in basis points so 55 − 20 + 20 never drifts.
    const necessitiesPct = sum(jar => Math.round(jar.percentage * 100)) / 100;
    const shortfallCents = Math.max(0, -available);
    const active = available < 0 || committedOut > allocated;
    return {
        active,
        necessitiesPct,
        commitmentRatio: 0,
        envelopeCents: allocated,
        shortfallCents: !active
            ? 0
            : shortfallCents > 0
              ? shortfallCents
              : Math.max(0, committedOut - allocated),
    };
}
