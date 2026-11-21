import { jarCoverage } from '@rumtelo/utils';

/** The four balance fields a jar tile needs — a subset of `JarBalance`. */
export type JarTileMoney = {
    allocated: number;
    credited: number;
    spent: number;
    committedOut: number;
};

export type JarTileFigures = {
    /** What is left this month (negative when overspent). Integer minor units. */
    available: number;
    /** This month's envelope: allocated + credited. */
    envelope: number;
    overspent: boolean;
    /** 0..100 width of the single meter. Overspent is a full meter, never an empty one. */
    meterPct: number;
};

/** Tile numbers from the API balance fields — `jarCoverage` stays the one source of the maths. */
export function jarTileFigures(jar: JarTileMoney): JarTileFigures {
    const coverage = jarCoverage(jar);
    const meterPct = coverage.overspent
        ? 100
        : coverage.progress === null
          ? 0
          : Math.round(coverage.progress * 100);
    return {
        available: coverage.available,
        envelope: jar.allocated + jar.credited,
        overspent: coverage.overspent,
        meterPct,
    };
}

/** Header line: what is left across all jars against what the jars were given. */
export function jarsMonthSummary(jars: readonly JarTileMoney[]): {
    available: number;
    envelope: number;
} {
    let available = 0;
    let envelope = 0;
    for (const jar of jars) {
        const figures = jarTileFigures(jar);
        available += figures.available;
        envelope += figures.envelope;
    }
    return { available, envelope };
}
