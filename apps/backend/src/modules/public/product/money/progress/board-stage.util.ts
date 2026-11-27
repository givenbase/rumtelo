import {
    BoardStage,
    type PlanKey,
    type MoneyProgress,
    boardStageAtLeast,
    isPaidPlan,
    maxBoardStage,
} from '@rumtelo/contracts';

/** Sorted lines (or days of age) that bring a board from SPLIT to SORTING. */
export const SORTING_THRESHOLD = 5;

const MS_PER_DAY = 86_400_000;

/** What the stage is derived from: board facts, the plan, and the stored floor. */
export interface BoardStageFacts {
    hasClosedMonth: boolean;
    hasCompletedWeekCheck: boolean;
    /** SORTED transactions, capped at {@link SORTING_THRESHOLD}. */
    sortedCount: number;
    householdAgeDays: number;
    planKey: PlanKey;
    /** `HouseholdSettings.boardStageFloor` (backfill); null = none. */
    storedFloor: BoardStage | null;
}

/** Whole days since `createdAt` (elapsed 24 h blocks); a future date (clock skew) is 0. */
export function householdAgeInDays(createdAt: Date, now: Date): number {
    return Math.max(0, Math.floor((now.getTime() - createdAt.getTime()) / MS_PER_DAY));
}

/**
 * The stage the board data alone reaches, first true top down: a closed month, a completed
 * week check, five sorted lines or five days, else the split. Monotonic except "five
 * sorted", which can drop when lines are deleted, but only before day five.
 */
export function derivedBoardStage(facts: BoardStageFacts): BoardStage {
    if (facts.hasClosedMonth) return BoardStage.MONTH;
    if (facts.hasCompletedWeekCheck) return BoardStage.ROUTINE;
    if (facts.sortedCount >= SORTING_THRESHOLD || facts.householdAgeDays >= SORTING_THRESHOLD) {
        return BoardStage.SORTING;
    }
    return BoardStage.SPLIT;
}

/**
 * Lowest stage this board shows whatever its data says: the stored floor, and MONTH while
 * the plan is paid (Plus / Max). The paid floor is also written to the stored floor when a
 * household starts paid or upgrades (`raiseBoardStageFloor`), so a later downgrade keeps it
 * and the menu never shrinks; deriving it here as well covers any path that missed the write.
 */
export function boardStageFloor(facts: BoardStageFacts): BoardStage | null {
    return isPaidPlan(facts.planKey) ? BoardStage.MONTH : facts.storedFloor;
}

/** `max(derived, floor)`. The plan is an input only through the paid floor. */
export function boardStage(facts: BoardStageFacts): BoardStage {
    return maxBoardStage(derivedBoardStage(facts), boardStageFloor(facts));
}

/** The next stage and what reaches it; null at MONTH. */
export function nextBoardStep(stage: BoardStage, facts: BoardStageFacts): MoneyProgress['next'] {
    if (boardStageAtLeast(stage, BoardStage.MONTH)) return null;
    if (boardStageAtLeast(stage, BoardStage.ROUTINE)) {
        return {
            stage: BoardStage.MONTH,
            trigger: 'FIRST_MONTH_CLOSE',
            sortedRemaining: null,
            daysRemaining: null,
        };
    }
    if (boardStageAtLeast(stage, BoardStage.SORTING)) {
        return {
            stage: BoardStage.ROUTINE,
            trigger: 'FIRST_WEEK_CHECK',
            sortedRemaining: null,
            daysRemaining: null,
        };
    }
    return {
        stage: BoardStage.SORTING,
        trigger: 'SORT_FIVE_OR_DAY_FIVE',
        sortedRemaining: Math.max(0, SORTING_THRESHOLD - facts.sortedCount),
        daysRemaining: Math.max(0, SORTING_THRESHOLD - facts.householdAgeDays),
    };
}
