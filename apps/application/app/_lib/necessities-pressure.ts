import type { JarBalance } from '@rumtelo/contracts';
import { DEFAULT_JAR_SPLIT, JarKey } from '@rumtelo/contracts';

/**
 * When fixed costs / Necessities blow past the Eker envelope.
 *
 * Why we coach simplify + earn more (never raid FF):
 * `apps/backend/src/modules/public/product/money/README.md`
 * → “When Necessities can’t fit in 55%”
 */

export const NECESSITIES_TARGET_PCT = DEFAULT_JAR_SPLIT[JarKey.NECESSITIES];

export type NecessitiesPressureInput = {
    /** Monthly-normalised active income (cents). */
    netMonthlyCents: number;
    /** Monthly-normalised fixed OUT total (cents). */
    fixedOutMonthlyCents: number;
    /** Fixed OUT on the Necessities jar only (cents). */
    necessitiesFixedMonthlyCents: number;
    /** Household Necessities split % (defaults to Eker 55). */
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

/** From jar balances — overspent Necessities (fixed + spend ate the envelope). */
export function necessitiesPressureFromJar(
    jar: Pick<
        JarBalance,
        'key' | 'percentage' | 'allocated' | 'committedOut' | 'available' | 'overspent'
    >
): NecessitiesPressure | null {
    if (jar.key !== JarKey.NECESSITIES) return null;
    const shortfallCents = Math.max(0, -jar.available);
    const active = jar.overspent || jar.committedOut > jar.allocated;
    if (!active && shortfallCents <= 0) {
        return {
            active: false,
            necessitiesPct: jar.percentage,
            commitmentRatio: 0,
            envelopeCents: jar.allocated,
            shortfallCents: 0,
        };
    }
    return {
        active: true,
        necessitiesPct: jar.percentage,
        commitmentRatio: 0,
        envelopeCents: jar.allocated,
        shortfallCents:
            shortfallCents > 0 ? shortfallCents : Math.max(0, jar.committedOut - jar.allocated),
    };
}
