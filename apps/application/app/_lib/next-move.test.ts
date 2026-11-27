import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { inboxMinutes, isWeekCheckDue, resolveNextMove, type NextMoveInput } from './next-move';

// 2026-11-16 is a Monday.
const MON = '2026-11-16';
const WED = '2026-11-18';
const FRI = '2026-11-20';
const SUN = '2026-11-22';

function input(over: Partial<NextMoveInput> = {}): NextMoveInput {
    return {
        today: WED,
        reminderDay: null,
        weekCheckGraceOpen: false,
        inboxCount: 0,
        incomeTotal: 250_000,
        ...over,
        monthScore: {
            period: '2026-11',
            isClosed: false,
            daysLeft: 12,
            priorOpenPeriod: null,
            ...over.monthScore,
        },
        progress: {
            hasTransactions: true,
            weekCheckDoneThisWeek: false,
            ...over.progress,
        },
    };
}

describe('isWeekCheckDue', () => {
    it('is not due Monday to Thursday without a reminder day', () => {
        assert.equal(isWeekCheckDue(MON, null), false);
        assert.equal(isWeekCheckDue(WED, null), false);
        assert.equal(isWeekCheckDue('2026-11-19', null), false);
    });
    it('is due Friday, Saturday and Sunday', () => {
        assert.equal(isWeekCheckDue(FRI, null), true);
        assert.equal(isWeekCheckDue('2026-11-21', null), true);
        assert.equal(isWeekCheckDue(SUN, null), true);
    });
    it('is due from the reminder day onward', () => {
        assert.equal(isWeekCheckDue(WED, 3), true);
        assert.equal(isWeekCheckDue(WED, 4), false);
        assert.equal(isWeekCheckDue(MON, 1), true);
    });
    it('is due from Monday when last week was left open', () => {
        assert.equal(isWeekCheckDue(MON, null, true), true);
    });
});

describe('inboxMinutes', () => {
    it('is ceil(n / 6), at least 1', () => {
        assert.equal(inboxMinutes(1), 1);
        assert.equal(inboxMinutes(6), 1);
        assert.equal(inboxMinutes(7), 2);
        assert.equal(inboxMinutes(13), 3);
    });
});

describe('resolveNextMove', () => {
    it('row 1: a prior month still open wins over everything', () => {
        const move = resolveNextMove(
            input({
                inboxCount: 4,
                progress: { hasTransactions: false, weekCheckDoneThisWeek: false },
                monthScore: {
                    period: '2026-11',
                    isClosed: false,
                    daysLeft: 3,
                    priorOpenPeriod: '2026-10',
                },
            })
        );
        assert.deepEqual(move, { kind: 'CLOSE_PRIOR', month: '2026-10' });
    });

    it('row 2: no transactions yet, with and without income', () => {
        const empty = { hasTransactions: false, weekCheckDoneThisWeek: false };
        assert.deepEqual(resolveNextMove(input({ progress: empty })), {
            kind: 'NO_TRANSACTIONS',
            zeroIncome: false,
        });
        assert.deepEqual(resolveNextMove(input({ progress: empty, incomeTotal: 0 })), {
            kind: 'NO_TRANSACTIONS',
            zeroIncome: true,
        });
    });

    it('row 2 beats the week check on a Friday and the close on a month end', () => {
        const move = resolveNextMove(
            input({
                today: FRI,
                progress: { hasTransactions: false, weekCheckDoneThisWeek: false },
                monthScore: {
                    period: '2026-11',
                    isClosed: false,
                    daysLeft: 2,
                    priorOpenPeriod: null,
                },
            })
        );
        assert.equal(move.kind, 'NO_TRANSACTIONS');
    });

    it('row 3: inbox lines with minutes', () => {
        assert.deepEqual(resolveNextMove(input({ inboxCount: 13 })), {
            kind: 'INBOX',
            count: 13,
            minutes: 3,
        });
    });

    it('row 4: week check once the inbox is clear and the check is due', () => {
        assert.deepEqual(resolveNextMove(input({ today: FRI })), { kind: 'WEEK_CHECK' });
        assert.deepEqual(resolveNextMove(input({ today: MON, weekCheckGraceOpen: true })), {
            kind: 'WEEK_CHECK',
        });
    });

    it('row 4 is skipped once this week is done', () => {
        const move = resolveNextMove(
            input({
                today: SUN,
                progress: { hasTransactions: true, weekCheckDoneThisWeek: true },
            })
        );
        assert.equal(move.kind, 'CALM');
    });

    it('row 5: close the month in the last six days', () => {
        const base = { period: '2026-11', isClosed: false, priorOpenPeriod: null };
        assert.deepEqual(resolveNextMove(input({ monthScore: { ...base, daysLeft: 6 } })), {
            kind: 'CLOSE_MONTH',
            month: '2026-11',
            daysLeft: 6,
        });
        assert.equal(resolveNextMove(input({ monthScore: { ...base, daysLeft: 7 } })).kind, 'CALM');
    });

    it('row 5 is skipped for a closed month', () => {
        const move = resolveNextMove(
            input({
                monthScore: {
                    period: '2026-11',
                    isClosed: true,
                    daysLeft: 1,
                    priorOpenPeriod: null,
                },
            })
        );
        assert.equal(move.kind, 'CALM');
    });

    it('row 6: calm names the reminder day, or Sunday', () => {
        assert.deepEqual(resolveNextMove(input()), { kind: 'CALM', nextCheckDay: 7 });
        assert.deepEqual(resolveNextMove(input({ reminderDay: 5 })), {
            kind: 'CALM',
            nextCheckDay: 5,
        });
    });

    it('row 4 comes before row 5 on a Friday at month end', () => {
        const move = resolveNextMove(
            input({
                today: FRI,
                monthScore: {
                    period: '2026-11',
                    isClosed: false,
                    daysLeft: 3,
                    priorOpenPeriod: null,
                },
            })
        );
        assert.equal(move.kind, 'WEEK_CHECK');
    });
});
