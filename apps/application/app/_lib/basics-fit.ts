import { JAR_MAIN_KEY_BY_GROUP, JarGroup, JarKey } from '@rumtelo/contracts';

/**
 * "Does Basics fit the real fixed costs?" — pure logic for the split settings.
 *
 * Basics is for what MUST be paid. This compares the monthly fixed costs that sit on Basics
 * pots with the share of income the bills pot (Basics' main pot) gets, and prepares ONE next
 * move as a share map the form can be filled with. Nothing here is saved or stored: the
 * household still presses Save.
 *
 * While Daily is off the bills pot is the whole Basics group and also pays groceries and
 * transport, so fixed costs below its share are NOT room: only "over" is ever said then. With
 * Daily on, everyday spending has its own pot, the bills pot holds bills only, and spare share
 * on it can go to Future (Daily is never touched).
 *
 * Everything runs on integers: amounts are minor units, shares are basis points (0.01 %),
 * so the totals the server checks (exactly 10 000 bp) can never drift.
 */

/** The bills pot may be this many whole points above what fixed costs need before we mention it. */
export const BASICS_ROOM_THRESHOLD_BP = 500;

/** The pots the fit needs: id and key only, so any jar-like row (list, balances) works. */
export type BasicsFitJar = { id: string; key: JarKey };

export type BasicsFitInput = {
    /** Every pot the household has. */
    jars: readonly BasicsFitJar[];
    /** The shares as they stand now (unsaved edits included), in percent, by jar id. */
    shares: Readonly<Record<string, number>>;
    /** The period income in minor units. */
    incomeMinor: number;
    /** Monthly fixed costs on Basics pots, in minor units. */
    basicsCostsMinor: number;
};

type FitMove = {
    /** Fixed costs as a share of income, rounded UP to a whole percent. */
    neededPercent: number;
    /**
     * What the bills pot has now, in percent. With Daily off that is the whole Basics group.
     * This is the figure the fixed costs are compared with.
     */
    currentPercent: number;
    /** Points that change hands when the move is applied. */
    deltaPercent: number;
    /** The new share of every pot by jar id: the form is filled with this, totals unchanged. */
    shares: Record<string, number>;
};

export type BasicsFit =
    /** There is no income yet, so there is nothing to compare. */
    | { kind: 'no_income' }
    /** Basics fits (or there are no fixed costs to judge by): show nothing. */
    | { kind: 'fits'; neededPercent: number | null }
    /**
     * The bills pot gets less than the fixed costs need. `fromFuturePercent` is the part Free
     * could not cover. `applicable` is false when there is nothing left to take from (no button).
     */
    | (FitMove & { kind: 'over'; fromFuturePercent: number; applicable: boolean })
    /** Daily is on and the bills pot has at least 5 points more than the fixed costs need. */
    | (FitMove & { kind: 'room' });

/** Percent to basis points, rounded so a value typed as 12.5 never becomes 1249.999. */
function toBasisPoints(percentage: number): number {
    return Math.round(percentage * 100);
}

/**
 * Fixed costs as a whole percent of income, rounded UP (54.01 % needs 55). Integer arithmetic
 * only: the quotient is taken from the remainder so no float division decides the rounding.
 * Null when there is no income to compare with.
 */
export function neededPercent(costsMinor: number, incomeMinor: number): number | null {
    if (!(incomeMinor > 0)) return null;
    const costs = Math.max(0, Math.round(costsMinor));
    const income = Math.round(incomeMinor);
    const numerator = costs * 100;
    const remainder = numerator % income;
    const quotient = (numerator - remainder) / income;
    return remainder === 0 ? quotient : quotient + 1;
}

function basisPointsToShares(basisPoints: Record<string, number>): Record<string, number> {
    return Object.fromEntries(Object.entries(basisPoints).map(([id, bp]) => [id, bp / 100]));
}

/** Compare the bills pot's share with the real fixed costs and prepare the one move, if any. */
export function planBasicsFit(input: BasicsFitInput): BasicsFit {
    const needed = neededPercent(input.basicsCostsMinor, input.incomeMinor);
    if (needed === null) return { kind: 'no_income' };
    // No fixed costs on Basics yet: nothing real to compare, so no advice (never "Basics → 0").
    if (!(input.basicsCostsMinor > 0)) return { kind: 'fits', neededPercent: needed };

    // The rounded-up whole percent is only the TARGET. Whether the pot is short, or has room, is
    // judged on the exact need: costs / income against the pot's basis points, cross-multiplied
    // so no division (and no rounding) decides it. 54.2 % needed against a pot at 54.5 % fits.
    const targetBp = needed * 100;
    const basisPoints: Record<string, number> = Object.fromEntries(
        input.jars.map(jar => [jar.id, toBasisPoints(input.shares[jar.id] ?? 0)])
    );
    const mainOf = (group: JarGroup) =>
        input.jars.find(jar => jar.key === JAR_MAIN_KEY_BY_GROUP[group]);
    const bills = mainOf(JarGroup.BASIS);
    const free = mainOf(JarGroup.FREE);
    const future = mainOf(JarGroup.FUTURE);
    if (!bills) return { kind: 'fits', neededPercent: needed };
    const dailyOn = input.jars.some(jar => jar.key === JarKey.DAILY);
    const billsBp = basisPoints[bills.id] ?? 0;

    const costsTimes10k = Math.round(input.basicsCostsMinor) * 10_000;
    const potTimesIncome = billsBp * Math.round(input.incomeMinor);
    if (costsTimes10k > potTimesIncome) {
        // The increase lands on the bills pot. It is paid for by Free first (what the household
        // chooses), then Future's main pot; neither goes below 0.
        const wantedBp = targetBp - billsBp;
        const fromFreeBp = Math.min(wantedBp, free ? (basisPoints[free.id] ?? 0) : 0);
        const fromFutureBp = Math.min(
            wantedBp - fromFreeBp,
            future ? (basisPoints[future.id] ?? 0) : 0
        );
        const movedBp = fromFreeBp + fromFutureBp;
        const next = { ...basisPoints };
        // Only what could actually be taken is added, so the total stays exactly the same.
        next[bills.id] = billsBp + movedBp;
        if (free) next[free.id] = (next[free.id] ?? 0) - fromFreeBp;
        if (future) next[future.id] = (next[future.id] ?? 0) - fromFutureBp;
        return {
            kind: 'over',
            neededPercent: needed,
            currentPercent: billsBp / 100,
            deltaPercent: movedBp / 100,
            fromFuturePercent: fromFutureBp / 100,
            shares: basisPointsToShares(next),
            applicable: movedBp > 0,
        };
    }

    // Room is only a fact once Daily carries everyday spending; without it the spare share is
    // what pays groceries and transport.
    // Room: at least 500 bp above the exact need (costs × 10 000 + 500 × income ≤ pot × income).
    const hasRoom =
        costsTimes10k + BASICS_ROOM_THRESHOLD_BP * Math.round(input.incomeMinor) <= potTimesIncome;
    if (dailyOn && future && hasRoom) {
        const movedBp = billsBp - targetBp;
        const next = { ...basisPoints };
        next[bills.id] = billsBp - movedBp;
        next[future.id] = (next[future.id] ?? 0) + movedBp;
        return {
            kind: 'room',
            neededPercent: needed,
            currentPercent: billsBp / 100,
            deltaPercent: movedBp / 100,
            shares: basisPointsToShares(next),
        };
    }

    return { kind: 'fits', neededPercent: needed };
}
