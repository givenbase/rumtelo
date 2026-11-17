import { describe, expect, it, vi } from 'vitest';

import { HouseholdAccessSource } from '@rumtelo/contracts';

import { householdStorage } from '../../../../../common/household/household.context';
import { Transaction } from '../ledger/transaction/transaction.entity';
import { collectCloseBlockers } from './close-blockers.util';

/** Records every filter the blockers send, so the window itself is what is asserted. */
function recordingEm(inboxCount: number) {
    const counts: { entity: unknown; where: Record<string, unknown> }[] = [];
    const em = {
        count: vi.fn<(entity: unknown, where: Record<string, unknown>) => Promise<number>>(
            async (entity, where) => {
                counts.push({ entity, where });
                return inboxCount;
            }
        ),
        find: vi.fn<() => Promise<unknown[]>>(async () => []),
    };
    return { em, counts };
}

const asHousehold = <T>(householdId: string, run: () => Promise<T>) =>
    householdStorage.run(
        {
            userId: 'user-1',
            householdId,
            role: 'MEMBER',
            source: HouseholdAccessSource.SEAT,
            relation: null,
        },
        run
    );

describe('collectCloseBlockers', () => {
    it('counts the Inbox of the household over the whole calendar month of the period', async () => {
        const { em, counts } = recordingEm(3);
        const blockers = await asHousehold('household-a', () =>
            collectCloseBlockers(em as never, '2026-10')
        );

        expect(blockers.inboxCount).toBe(3);
        expect(counts).toHaveLength(1);
        expect(counts[0]?.entity).toBe(Transaction);
        expect(counts[0]?.where).toMatchObject({
            household: 'household-a',
            status: 'INBOX',
            bookedOn: { $gte: '2026-10-01', $lte: '2026-10-31' },
        });
    });

    it('ends on the real last day of short months and leap years', async () => {
        const { em, counts } = recordingEm(0);
        await asHousehold('household-a', async () => {
            await collectCloseBlockers(em as never, '2027-02');
            await collectCloseBlockers(em as never, '2028-02');
        });
        expect(counts.map(call => call.where.bookedOn)).toEqual([
            { $gte: '2027-02-01', $lte: '2027-02-28' },
            { $gte: '2028-02-01', $lte: '2028-02-29' },
        ]);
    });

    // `HouseholdSettings.money.periodStartDay` is stored (Settings › Preferences) but the
    // server has no period model that reads it: jar balances, `periodFromBookedOn`, month
    // scores and the close chain all treat a period as a calendar month. The blockers must
    // agree with those, so a salary-day household (e.g. the 25th) is counted as calendar
    // months too until a period-window model exists. This pins that, and fails loudly when
    // someone changes only one of the places.
    it('uses the same calendar-month window whatever the household period start day is', async () => {
        const { em, counts } = recordingEm(0);
        await asHousehold('salary-day-household', () =>
            collectCloseBlockers(em as never, '2026-10')
        );
        expect(counts[0]?.where.bookedOn).toEqual({ $gte: '2026-10-01', $lte: '2026-10-31' });
    });
});
