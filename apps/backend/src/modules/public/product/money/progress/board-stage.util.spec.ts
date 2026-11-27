import { describe, expect, it } from 'vitest';

import { BoardStage, PlanKey } from '@rumtelo/contracts';

import {
    type BoardStageFacts,
    boardStage,
    boardStageFloor,
    derivedBoardStage,
    householdAgeInDays,
    nextBoardStep,
} from './board-stage.util';

const NEW_BOARD: BoardStageFacts = {
    hasClosedMonth: false,
    hasCompletedWeekCheck: false,
    sortedCount: 0,
    householdAgeDays: 0,
    planKey: PlanKey.BASIC,
    storedFloor: null,
};

const facts = (overrides: Partial<BoardStageFacts>): BoardStageFacts => ({
    ...NEW_BOARD,
    ...overrides,
});

describe('derivedBoardStage', () => {
    it('is SPLIT for a brand-new board', () => {
        expect(derivedBoardStage(NEW_BOARD)).toBe(BoardStage.SPLIT);
    });

    it('stays SPLIT below five sorted lines and five days', () => {
        expect(derivedBoardStage(facts({ sortedCount: 4, householdAgeDays: 4 }))).toBe(
            BoardStage.SPLIT
        );
    });

    it('reaches SORTING with five sorted lines on day one', () => {
        expect(derivedBoardStage(facts({ sortedCount: 5, householdAgeDays: 1 }))).toBe(
            BoardStage.SORTING
        );
    });

    it('reaches SORTING at five days of age with no transactions', () => {
        expect(derivedBoardStage(facts({ householdAgeDays: 5 }))).toBe(BoardStage.SORTING);
    });

    it('reaches ROUTINE with a completed week check, even with fewer than five sorted lines', () => {
        expect(derivedBoardStage(facts({ hasCompletedWeekCheck: true, sortedCount: 1 }))).toBe(
            BoardStage.ROUTINE
        );
    });

    it('reaches MONTH with a closed month', () => {
        expect(derivedBoardStage(facts({ hasClosedMonth: true }))).toBe(BoardStage.MONTH);
    });

    it('reaches MONTH with a closed month and no week check at all', () => {
        expect(
            derivedBoardStage(facts({ hasClosedMonth: true, hasCompletedWeekCheck: false }))
        ).toBe(BoardStage.MONTH);
    });
});

describe('boardStage', () => {
    it('a stored MONTH floor wins over empty data (backfilled households)', () => {
        const backfilled = facts({ storedFloor: BoardStage.MONTH });
        expect(boardStage(backfilled)).toBe(BoardStage.MONTH);
        expect(nextBoardStep(boardStage(backfilled), backfilled)).toBeNull();
    });

    it('a floor never lowers a stage the data already reached', () => {
        expect(boardStage(facts({ hasClosedMonth: true, storedFloor: BoardStage.SORTING }))).toBe(
            BoardStage.MONTH
        );
    });

    it.each([PlanKey.PLUS, PlanKey.MAX])('a %s board is at MONTH from day one', plan => {
        const paid = facts({ planKey: plan });
        expect(boardStage(paid)).toBe(BoardStage.MONTH);
        expect(nextBoardStep(boardStage(paid), paid)).toBeNull();
    });

    it('Basic has no paid floor: only the stored floor counts', () => {
        expect(boardStageFloor(NEW_BOARD)).toBeNull();
        expect(boardStageFloor(facts({ storedFloor: BoardStage.ROUTINE }))).toBe(
            BoardStage.ROUTINE
        );
        expect(boardStageFloor(facts({ planKey: PlanKey.PLUS }))).toBe(BoardStage.MONTH);
    });

    it('a downgraded household keeps the written MONTH floor: the menu never shrinks', () => {
        const downgraded = facts({ planKey: PlanKey.BASIC, storedFloor: BoardStage.MONTH });
        expect(boardStage(downgraded)).toBe(BoardStage.MONTH);
    });

    it('below the paid floor the plan is not an input: Basic derives from data only', () => {
        expect(boardStage(facts({ sortedCount: 5, planKey: PlanKey.BASIC }))).toBe(
            BoardStage.SORTING
        );
    });
});

describe('nextBoardStep', () => {
    it('SPLIT: sort five or wait five days, with live numbers', () => {
        const board = facts({ sortedCount: 2, householdAgeDays: 1 });
        expect(nextBoardStep(boardStage(board), board)).toEqual({
            stage: BoardStage.SORTING,
            trigger: 'SORT_FIVE_OR_DAY_FIVE',
            sortedRemaining: 3,
            daysRemaining: 4,
        });
    });

    it('SPLIT on day zero with nothing sorted: 5 and 5', () => {
        expect(nextBoardStep(BoardStage.SPLIT, NEW_BOARD)).toEqual({
            stage: BoardStage.SORTING,
            trigger: 'SORT_FIVE_OR_DAY_FIVE',
            sortedRemaining: 5,
            daysRemaining: 5,
        });
    });

    it('SORTING: the first week check', () => {
        const board = facts({ sortedCount: 5 });
        expect(nextBoardStep(boardStage(board), board)).toEqual({
            stage: BoardStage.ROUTINE,
            trigger: 'FIRST_WEEK_CHECK',
            sortedRemaining: null,
            daysRemaining: null,
        });
    });

    it('ROUTINE: the first month close', () => {
        const board = facts({ hasCompletedWeekCheck: true });
        expect(nextBoardStep(boardStage(board), board)).toEqual({
            stage: BoardStage.MONTH,
            trigger: 'FIRST_MONTH_CLOSE',
            sortedRemaining: null,
            daysRemaining: null,
        });
    });

    it('MONTH: nothing next', () => {
        expect(nextBoardStep(BoardStage.MONTH, facts({ hasClosedMonth: true }))).toBeNull();
    });
});

describe('householdAgeInDays', () => {
    const created = new Date('2026-11-10T12:00:00Z');

    it('counts whole elapsed days', () => {
        expect(householdAgeInDays(created, new Date('2026-11-10T23:59:00Z'))).toBe(0);
        expect(householdAgeInDays(created, new Date('2026-11-15T12:00:00Z'))).toBe(5);
    });

    it('is 0 when createdAt is in the future (clock skew)', () => {
        expect(householdAgeInDays(created, new Date('2026-11-01T00:00:00Z'))).toBe(0);
    });
});
