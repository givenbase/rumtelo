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
                categoryId: 'category-a-play',
                debtId: 'debt-a',
            })
        );

        expect(bill).toMatchObject({
            jarId: 'jar-a-play',
            categoryId: 'category-a-play',
            debtId: 'debt-a',
        });
    });
});

/**
 * A category is a line inside one pot: a bill that names a pot and a category of another pot
 * (own household) is refused with "pick another category". `category-a` sits in the Basics
 * main pot, `category-a-play` in Play.
 */
describe('FixedCostService refuses a category that belongs to another pot', () => {
    const badRequest = (key: string) =>
        expect.objectContaining({ response: expect.objectContaining({ message: key }) });

    it('create: writes nothing', async () => {
        const { em, service } = setup();

        await expect(
            asOwnerOf(HOUSEHOLD_A, () => service.create(input({ categoryId: 'category-a-play' })))
        ).rejects.toEqual(badRequest('category_not_found'));

        expect(em.create).not.toHaveBeenCalled();
        expect(em.flush).not.toHaveBeenCalled();
    });

    it('update: a new category must sit in the current pot when the pot is not changed', async () => {
        const row = billRow();
        const { em, service } = setup([row]);

        await expect(
            asOwnerOf(HOUSEHOLD_A, () => service.update(row.id, { categoryId: 'category-a-play' }))
        ).rejects.toEqual(badRequest('category_not_found'));

        expect(row.category).toEqual({ id: 'category-a' });
        expect(em.flush).not.toHaveBeenCalled();
    });

    it('update: moving the pot while keeping the old category is refused; sending a category of the new pot works', async () => {
        const row = billRow();
        const { em, service } = setup([row]);

        await expect(
            asOwnerOf(HOUSEHOLD_A, () => service.update(row.id, { jarId: 'jar-a-play' }))
        ).rejects.toEqual(badRequest('category_not_found'));
        expect(row.jar).toEqual({ id: 'jar-a-necessities' });
        expect(em.flush).not.toHaveBeenCalled();

        const moved = await asOwnerOf(HOUSEHOLD_A, () =>
            service.update(row.id, { jarId: 'jar-a-play', categoryId: 'category-a-play' })
        );
        expect(moved).toMatchObject({ jarId: 'jar-a-play', categoryId: 'category-a-play' });
    });

    it('update: an edit that touches neither pot nor category is not re-judged', async () => {
        // A legacy bill whose category sits in another pot still saves a rename.
        const row = billRow({ category: { id: 'category-a-play' } });
        const { service } = setup([row]);

        const bill = await asOwnerOf(HOUSEHOLD_A, () =>
            service.update(row.id, { name: 'Renamed' })
        );

        expect(bill).toMatchObject({ name: 'Renamed', categoryId: 'category-a-play' });
    });
    it('update: a legacy bill saves once the form sends its pot with the category cleared or re-picked', async () => {
        // The bill form always sends pot and category together, so a stale category has to be
        // replaced or cleared by the person; both exits must save.
        const cleared = billRow({ id: 'bill-legacy-1', category: { id: 'category-a-play' } });
        const repicked = billRow({ id: 'bill-legacy-2', category: { id: 'category-a-play' } });
        const { em, service } = setup([cleared, repicked]);
        // Clearing the category makes the service re-link it by preset name, then refresh the row.
        Object.assign(em, { refresh: vi.fn<() => Promise<void>>(async () => undefined) });

        await expect(
            asOwnerOf(HOUSEHOLD_A, () =>
                service.update(cleared.id, { jarId: 'jar-a-necessities', categoryId: null })
            )
        ).resolves.toMatchObject({ categoryId: null });
        await expect(
            asOwnerOf(HOUSEHOLD_A, () =>
                service.update(repicked.id, {
                    jarId: 'jar-a-necessities',
                    categoryId: 'category-a',
                })
            )
        ).resolves.toMatchObject({ categoryId: 'category-a' });
    });
});
