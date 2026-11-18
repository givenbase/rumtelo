import { WeekCheckStage, type WeekCheck } from '@rumtelo/contracts';

import { shiftWeek, weekKeyOf } from './week-key';

/** What the resolver needs to know about one week's Money check (null = no row yet). */
export type WeekCheckFacts = {
    stage: WeekCheckStage;
    completedAt: string | null;
    allocationCount: number;
} | null;

/**
 * Monday grace (S-4.1, decision 2). From Monday to Saturday, last week's check opens when it
 * was started and is not done, and this week's has no row yet (or is still a bare Look).
 * Sunday and an untouched last week open the current week.
 */
export function resolveMoneyWeek({
    today,
    lastWeek,
    thisWeek,
}: {
    today: string;
    lastWeek: WeekCheckFacts;
    thisWeek: WeekCheckFacts;
}): { moneyWeek: string; graceOpen: boolean } {
    const currentWeek = weekKeyOf(today);
    const weekday = new Date(`${today}T00:00:00Z`).getUTCDay();
    const isSunday = weekday === 0;

    const lastOpen =
        Boolean(lastWeek) && !lastWeek!.completedAt && lastWeek!.stage !== WeekCheckStage.DONE;
    const thisNotStarted =
        !thisWeek ||
        (thisWeek.stage === WeekCheckStage.LOOK &&
            thisWeek.allocationCount === 0 &&
            !thisWeek.completedAt);

    const graceOpen = !isSunday && lastOpen && thisNotStarted;
    return { moneyWeek: graceOpen ? shiftWeek(currentWeek, -1) : currentWeek, graceOpen };
}

/** Facts the resolver needs from a stored check (`undefined` = the week has no row). */
export function weekCheckFactsOf(row: WeekCheck | undefined): WeekCheckFacts {
    if (!row) return null;
    return {
        stage: row.stage,
        completedAt: row.completedAt,
        allocationCount: row.allocations.length,
    };
}
