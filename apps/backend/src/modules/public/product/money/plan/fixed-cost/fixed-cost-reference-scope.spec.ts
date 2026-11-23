import { describe, expect, it, vi } from 'vitest';

import { Cadence } from '@rumtelo/contracts';

import {
    asOwnerOf,
    fakeHouseholdEm,
    HOUSEHOLD_A,
    notFound,
    type Row,
} from '../../fake-household-em.testing';
import { FixedCost } from './fixed-cost.entity';
import { FixedCostService } from './fixed-cost.service';

/**
 * A bill is drawn from a pot, may sit in a category and may belong to a debt, all named by
 * the client. A foreign id is refused and the bill is neither created nor changed.
 */

function billRow(overrides: Partial<Row> = {}): Row {
    return {
        id: 'bill-a1',
        household: HOUSEHOLD_A,
        name: 'Rent',
        amount: 90_000,
        cadence: Cadence.MONTHLY,
        dueMonth: null,
        dueDay: 1,
        direction: 'OUT',
        isActive: true,
        jar: { id: 'jar-a-necessities' },
        category: { id: 'category-a' },
        debt: null,
        ...overrides,
    };
}

function setup(bills: Row[] = []) {
    const em = fakeHouseholdEm();
    em.tables.set(FixedCost, bills);
    const jars = {
        reconcileFixedCostCategories: vi.fn<() => Promise<void>>(async () => undefined),
    };
    const parties = {
        resolveCounterparty: vi.fn<() => Promise<Row>>(async () => ({
            id: 'unused',
            counterparty: null,
            merchantKey: null,
            party: null,
        })),
    };
    const service = new FixedCostService(
        em as never,
        jars as never,
        parties as never,
        {} as never,
        {} as never
    );
    return { em, service };
}

const input = (overrides: Record<string, unknown>) => ({
    jarId: 'jar-a-necessities',
    categoryId: 'category-a',
    name: 'Rent',
    amount: 90_000,
    ...overrides,
});

describe('FixedCostService.create', () => {
    it.each([
        ['jar', { jarId: 'jar-b-necessities' }, 'jar_not_found'],
        ['category', { categoryId: 'category-b' }, 'category_not_found'],
        ['debt', { debtId: 'debt-b' }, 'debt_not_found'],
    ])('refuses a foreign %s and writes nothing', async (_label, ids, key) => {
        const { em, service } = setup();

        await expect(asOwnerOf(HOUSEHOLD_A, () => service.create(input(ids)))).rejects.toEqual(
            notFound(key)
        );

        expect(em.create).not.toHaveBeenCalled();
        expect(em.flush).not.toHaveBeenCalled();
        expect(em.getReference).not.toHaveBeenCalled();
    });

    it('creates a bill on the own pot, category and debt', async () => {
        const { em, service } = setup();

        const bill = await asOwnerOf(HOUSEHOLD_A, () =>
            service.create(input({ debtId: 'debt-a' }))
        );

        expect(bill).toMatchObject({
            jarId: 'jar-a-necessities',
            categoryId: 'category-a',
            debtId: 'debt-a',
        });
        expect(em.flush).toHaveBeenCalled();
    });
});

describe('FixedCostService.update', () => {
    it.each([
        ['jar', { jarId: 'jar-b-necessities' }, 'jar_not_found'],
        ['category', { categoryId: 'category-b' }, 'category_not_found'],
        ['debt', { debtId: 'debt-b' }, 'debt_not_found'],
    ])('refuses a foreign %s and leaves the bill as it was', async (_label, patch, key) => {
        const row = billRow();
        const { em, service } = setup([row]);

        await expect(
            asOwnerOf(HOUSEHOLD_A, () => service.update(row.id, { name: 'Changed', ...patch }))
        ).rejects.toEqual(notFound(key));

        expect(row).toMatchObject({
            name: 'Rent',
            jar: { id: 'jar-a-necessities' },
            category: { id: 'category-a' },
            debt: null,
        });
        expect(em.flush).not.toHaveBeenCalled();
    });

    it('moves the bill to the own pot, category and debt', async () => {
        const row = billRow();
        const { service } = setup([row]);

        const bill = await asOwnerOf(HOUSEHOLD_A, () =>
            service.update(row.id, {
                jarId: 'jar-a-play',
                categoryId: 'category-a',
                debtId: 'debt-a',
            })
        );

        expect(bill).toMatchObject({
            jarId: 'jar-a-play',
            categoryId: 'category-a',
            debtId: 'debt-a',
        });
    });
});
