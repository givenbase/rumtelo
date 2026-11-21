import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildHomeTodo, MAX_TODO_ROWS, type HomeTodoInput } from './home-todo';

// 2026-11-18 is a Wednesday, 2026-11-20 a Friday.
const WED = '2026-11-18';
const FRI = '2026-11-20';

type Overrides = Partial<Omit<HomeTodoInput, 'monthScore' | 'progress'>> & {
    monthScore?: Partial<HomeTodoInput['monthScore']>;
    progress?: Partial<HomeTodoInput['progress']>;
};

function input(over: Overrides = {}): HomeTodoInput {
    return {
        today: WED,
        reminderDay: null,
        weekCheckGraceOpen: false,
        inboxCount: 0,
        incomeTotal: 250_000,
        canAct: true,
        closeBlockers: null,
        hasCoachTip: false,
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

const bills = { dueBillCount: 3, dueBillNames: ['Rent', 'Gym', 'Phone'] };

describe('buildHomeTodo', () => {
    it('is empty and calm when nothing is open', () => {
        const todo = buildHomeTodo(input());
        assert.equal(todo.isEmpty, true);
        assert.equal(todo.count, 0);
        assert.equal(todo.first, null);
        assert.equal(todo.nextCheckDay, 7);
        assert.deepEqual(todo.rows, []);
    });

    it('uses the reminder day for the calm line', () => {
        // Wednesday with a Thursday reminder: the check is not due yet, so the card is calm.
        assert.equal(buildHomeTodo(input({ reminderDay: 4 })).nextCheckDay, 4);
    });

    it('puts the next move first and counts it', () => {
        const todo = buildHomeTodo(input({ inboxCount: 4 }));
        assert.equal(todo.first?.kind, 'INBOX');
        assert.equal(todo.count, 1);
        assert.deepEqual(todo.rows, []);
        assert.equal(todo.isEmpty, false);
        assert.equal(todo.nextCheckDay, null);
    });

    it('does not repeat the inbox when it is the first item', () => {
        const todo = buildHomeTodo(input({ inboxCount: 4, closeBlockers: bills }));
        assert.deepEqual(
            todo.rows.map(row => row.kind),
            ['bills']
        );
    });

    it('lists the inbox as a row behind a prior month that must close first', () => {
        const todo = buildHomeTodo(
            input({ inboxCount: 2, monthScore: { priorOpenPeriod: '2026-10' } })
        );
        assert.equal(todo.first?.kind, 'CLOSE_PRIOR');
        assert.deepEqual(
            todo.rows.map(row => row.kind),
            ['inbox']
        );
        assert.equal(todo.count, 2);
    });

    it('adds no inbox row while the first item is "add spending"', () => {
        const todo = buildHomeTodo(input({ progress: { hasTransactions: false }, inboxCount: 5 }));
        assert.equal(todo.first?.kind, 'NO_TRANSACTIONS');
        assert.deepEqual(todo.rows, []);
    });

    it('lists unpaid bills with the first names only, linking to Fixed costs', () => {
        const todo = buildHomeTodo(input({ closeBlockers: bills }));
        const row = todo.rows[0];
        assert.equal(row?.kind, 'bills');
        if (row?.kind !== 'bills') return;
        assert.equal(row.count, 3);
        assert.deepEqual(row.names, ['Rent', 'Gym']);
        assert.equal(row.href, '/product/money/fixed-costs');
        assert.equal(todo.first, null);
        assert.equal(todo.count, 1);
        assert.equal(todo.isEmpty, false);
    });

    it('skips bills on a closed month or when none are due', () => {
        assert.equal(
            buildHomeTodo(input({ closeBlockers: bills, monthScore: { isClosed: true } })).rows
                .length,
            0
        );
        assert.equal(
            buildHomeTodo(input({ closeBlockers: { dueBillCount: 0, dueBillNames: [] } })).rows
                .length,
            0
        );
    });

    it('does not repeat the close-month move or add a week check that is done', () => {
        // Close month is first (week check done), so the week check is not repeated.
        const todo = buildHomeTodo(
            input({
                monthScore: { daysLeft: 3 },
                progress: { weekCheckDoneThisWeek: true },
            })
        );
        assert.equal(todo.first?.kind, 'CLOSE_MONTH');
        assert.deepEqual(todo.rows, []);
    });

    it('lists the close-month row behind the week check', () => {
        const todo = buildHomeTodo(input({ today: FRI, monthScore: { daysLeft: 3 } }));
        assert.equal(todo.first?.kind, 'WEEK_CHECK');
        assert.deepEqual(
            todo.rows.map(row => row.kind),
            ['close_month']
        );
    });

    it('lists the week check behind a prior close, only once sorted', () => {
        const prior = { priorOpenPeriod: '2026-10' };
        const sorted = buildHomeTodo(input({ today: FRI, monthScore: prior }));
        assert.equal(sorted.first?.kind, 'CLOSE_PRIOR');
        assert.deepEqual(
            sorted.rows.map(row => row.kind),
            ['week_check']
        );
        const unsorted = buildHomeTodo(input({ today: FRI, inboxCount: 2, monthScore: prior }));
        assert.deepEqual(
            unsorted.rows.map(row => row.kind),
            ['inbox']
        );
    });

    it('never lists close-month behind a prior month', () => {
        const todo = buildHomeTodo(
            input({ monthScore: { priorOpenPeriod: '2026-10', daysLeft: 2 } })
        );
        assert.equal(
            todo.rows.some(row => row.kind === 'close_month'),
            false
        );
    });

    it('puts the Coach tip last', () => {
        const todo = buildHomeTodo(input({ closeBlockers: bills, hasCoachTip: true }));
        assert.deepEqual(
            todo.rows.map(row => row.kind),
            ['bills', 'coach']
        );
    });

    it('shows a lone Coach tip instead of the calm state', () => {
        const todo = buildHomeTodo(input({ hasCoachTip: true }));
        assert.equal(todo.isEmpty, false);
        assert.equal(todo.first, null);
        assert.equal(todo.count, 1);
    });

    it('caps the rows and counts only what is shown', () => {
        const todo = buildHomeTodo(
            input({
                today: FRI,
                inboxCount: 0,
                closeBlockers: bills,
                hasCoachTip: true,
                monthScore: { daysLeft: 2, priorOpenPeriod: null },
            })
        );
        // week check first (move), rows: bills, close month, coach = 3 = cap.
        assert.equal(todo.first?.kind, 'WEEK_CHECK');
        assert.equal(todo.rows.length, MAX_TODO_ROWS);
        assert.equal(todo.count, MAX_TODO_ROWS + 1);

        const crowded = buildHomeTodo(
            input({
                today: FRI,
                inboxCount: 2,
                closeBlockers: bills,
                hasCoachTip: true,
                monthScore: { daysLeft: 2, priorOpenPeriod: '2026-10' },
            })
        );
        // prior close first; rows: inbox, bills, coach.
        assert.deepEqual(
            crowded.rows.map(row => row.kind),
            ['inbox', 'bills', 'coach']
        );
        assert.equal(crowded.count, 4);
    });

    it('keeps the Coach tip when it is exactly the third row', () => {
        const todo = buildHomeTodo(
            input({
                today: FRI,
                inboxCount: 0,
                closeBlockers: bills,
                hasCoachTip: true,
                monthScore: { daysLeft: 2, priorOpenPeriod: '2026-10' },
            })
        );
        // prior close first; rows: week check, bills, coach: exactly the cap, tip still fits.
        assert.deepEqual(
            todo.rows.map(row => row.kind),
            ['week_check', 'bills', 'coach']
        );
    });

    it('gives a viewer text rows without links, same count', () => {
        const writer = buildHomeTodo(
            input({
                inboxCount: 2,
                monthScore: { priorOpenPeriod: '2026-10' },
                closeBlockers: bills,
            })
        );
        const viewer = buildHomeTodo(
            input({
                canAct: false,
                inboxCount: 2,
                monthScore: { priorOpenPeriod: '2026-10' },
                closeBlockers: bills,
            })
        );
        assert.equal(viewer.count, writer.count);
        for (const row of viewer.rows) {
            if (row.kind === 'inbox' || row.kind === 'bills' || row.kind === 'week_check') {
                assert.equal(row.href, null);
            }
        }
        assert.equal(
            writer.rows.every(
                row => row.kind === 'coach' || row.kind === 'close_month' || row.href !== null
            ),
            true
        );
    });
});
