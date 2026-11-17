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
