import { describe, expect, it } from 'vitest';

import { HouseholdAccessSource } from '@rumtelo/contracts';

import { householdStorage } from '../../../../../common/household/household.context';
import { TransactionService } from '../ledger/transaction/transaction.service';
import { MonthScoreService } from '../month-score/month-score.service';

type Row = Record<string, unknown>;

/** Rows of every household in one list; equality filters only. */
function fakeEm(rows: Row[]) {
    return {
        find: async (_entity: unknown, where: Row, options?: { limit?: number }) =>
            rows
                .filter(row => Object.entries(where).every(([key, value]) => row[key] === value))
                .slice(0, options?.limit),
    };
}

function asHousehold<T>(householdId: string, run: () => Promise<T>): Promise<T> {
    return householdStorage.run(
        {
            userId: 'user-1',
            householdId,
            role: 'MEMBER',
            source: HouseholdAccessSource.SEAT,
            relation: null,
        },
        run
    );
}

describe('TransactionService.hasAny', () => {
    const rows = [{ household: 'household-a', id: 'transaction-1' }];

    it('is true for the household that has a transaction', async () => {
        const service = new TransactionService(
            fakeEm(rows) as never,
            {} as never,
            {} as never,
            {} as never,
            {} as never
        );
        expect(await asHousehold('household-a', () => service.hasAny())).toBe(true);
    });

    it('is false for a household without one, even when another household has some', async () => {
        const service = new TransactionService(
            fakeEm(rows) as never,
            {} as never,
            {} as never,
            {} as never,
            {} as never
        );
        expect(await asHousehold('household-b', () => service.hasAny())).toBe(false);
    });
});

describe('TransactionService.sortedCount', () => {
    const rows = [
        ...Array.from({ length: 7 }, (_, index) => ({
            household: 'household-a',
            id: `a-${index}`,
            status: 'SORTED',
        })),
        { household: 'household-a', id: 'a-inbox', status: 'INBOX' },
        { household: 'household-a', id: 'a-ignored', status: 'IGNORED' },
        { household: 'household-b', id: 'b-0', status: 'SORTED' },
        { household: 'household-b', id: 'b-1', status: 'SORTED' },
    ];
    const serviceFor = () =>
        new TransactionService(
            fakeEm(rows) as never,
            {} as never,
            {} as never,
            {} as never,
            {} as never
        );

    it('stops at the limit instead of counting everything', async () => {
        expect(await asHousehold('household-a', () => serviceFor().sortedCount(5))).toBe(5);
    });

    it('counts only SORTED lines (INBOX and IGNORED do not)', async () => {
        const few = [
            { household: 'household-c', status: 'SORTED' },
            { household: 'household-c', status: 'INBOX' },
            { household: 'household-c', status: 'IGNORED' },
        ];
        const service = new TransactionService(
            fakeEm(few) as never,
            {} as never,
            {} as never,
            {} as never,
            {} as never
        );
        expect(await asHousehold('household-c', () => service.sortedCount(5))).toBe(1);
    });

    it('never reads another household’s lines', async () => {
        expect(await asHousehold('household-b', () => serviceFor().sortedCount(5))).toBe(2);
        expect(await asHousehold('household-z', () => serviceFor().sortedCount(5))).toBe(0);
    });
});

describe('MonthScoreService.hasClosedMonth', () => {
    const rows = [
        { household: 'household-a', period: '2026-10', isClosed: true },
        { household: 'household-b', period: '2026-10', isClosed: false },
    ];

    it('is true when the household closed a month', async () => {
        const service = new MonthScoreService(fakeEm(rows) as never, {} as never);
        expect(await asHousehold('household-a', () => service.hasClosedMonth())).toBe(true);
    });

    it('is false for another household that only has an open month', async () => {
        const service = new MonthScoreService(fakeEm(rows) as never, {} as never);
        expect(await asHousehold('household-b', () => service.hasClosedMonth())).toBe(false);
    });

    it('is false for a household with no month scores at all', async () => {
        const service = new MonthScoreService(fakeEm(rows) as never, {} as never);
        expect(await asHousehold('household-c', () => service.hasClosedMonth())).toBe(false);
    });
});
