import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { contract } from '../../../routers';
import { JarKey, WeekCheckStage } from './enums';

/**
 * Input bounds added in the pot-balance round (SP3-Q2): a bulk sort carries at most 500
 * transaction ids, a week check advance at most one allocation per pot (the number of pot
 * keys). Both are checked on the real procedure schemas, edge on and edge over.
 */

type WithInputSchema = {
    '~orpc': { inputSchema: { safeParse: (value: unknown) => { success: boolean } } };
};

const uuid = (index: number) => `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`;
const householdId = uuid(1);

describe('transactions.bulkSort transactionIds', () => {
    const schema = (contract.money.transactions.bulkSort as unknown as WithInputSchema)['~orpc']
        .inputSchema;
    const input = (count: number) => ({
        householdId,
        transactionIds: Array.from({ length: count }, (_, index) => uuid(100 + index)),
        jarId: uuid(2),
    });

    it('accepts 1 and 500 ids', () => {
        assert.equal(schema.safeParse(input(1)).success, true);
        assert.equal(schema.safeParse(input(500)).success, true);
    });

    it('rejects none and 501', () => {
        assert.equal(schema.safeParse(input(0)).success, false);
        assert.equal(schema.safeParse(input(501)).success, false);
    });
});

describe('weekCheck.advance allocations', () => {
    const schema = (contract.money.weekCheck.advance as unknown as WithInputSchema)['~orpc']
        .inputSchema;
    const pots = Object.values(JarKey).length;
    const input = (allocations: number | null | undefined) => ({
        householdId,
        week: '2026-W47',
        stage: WeekCheckStage.INTEND,
        ...(allocations === undefined
            ? {}
            : {
                  allocations:
                      allocations === null
                          ? null
                          : Array.from({ length: allocations }, (_, index) => ({
                                jarId: uuid(200 + index),
                                amount: 100,
                            })),
              }),
    });

    it('a household has at most 8 pots, so 8 is the bound', () => {
        assert.equal(pots, 8);
    });

    it('accepts no allocations, null, one (what the app sends) and one per pot', () => {
        for (const count of [undefined, null, 0, 1, pots]) {
            assert.equal(schema.safeParse(input(count)).success, true, `count ${String(count)}`);
        }
    });

    it('rejects more allocations than there are pots', () => {
        assert.equal(schema.safeParse(input(pots + 1)).success, false);
        assert.equal(schema.safeParse(input(100)).success, false);
    });
});
