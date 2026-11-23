import { describe, expect, it, vi } from 'vitest';

import { BadRequestException } from '@nestjs/common';
import { JarKey, TransactionSource, TransactionStatus } from '@rumtelo/contracts';

import {
    asOwnerOf,
    fakeHouseholdEm,
    HOUSEHOLD_A,
    notFound,
    type Row,
} from '../../fake-household-em.testing';
import { Transaction } from './transaction.entity';
import { TransactionService } from './transaction.service';

/**
 * Jar, category and bank account ids come from the client. A foreign id must be refused
 * like an unknown one and leave nothing written; the same call with an own id still works.
 */

function transactionRow(overrides: Partial<Row> = {}): Row {
    return {
        id: 'transaction-a1',
        household: HOUSEHOLD_A,
        amount: -2500,
        bookedOn: '2026-11-10',
        description: 'Groceries',
        counterparty: null,
        status: TransactionStatus.INBOX,
        jar: null,
        category: null,
        debt: null,
        fixedCost: null,
        appliedMerchantKey: null,
        appliedRule: null,
        createdAt: new Date('2026-11-10T09:00:00.000Z'),
        ...overrides,
    };
}

function setup(transactions: Row[] = []) {
    const em = fakeHouseholdEm();
    // Transactions of both households live in the table, like the real one.
    em.tables.set(Transaction, transactions);
    const rules = {
        autoSort: vi.fn<() => Promise<number>>(async () => 0),
        upsertPayeeHint: vi.fn<() => Promise<{ id: string } | null>>(async () => null),
    };
    const merchants = { matchFeed: vi.fn<() => Promise<null>>(async () => null) };
    const parties = {
        resolveCounterparty: vi.fn<() => Promise<Row>>(async () => ({
            id: 'unused',
            counterparty: null,
            merchantKey: null,
            party: null,
        })),
    };
    const service = new TransactionService(
        em as never,
        rules as never,
        merchants as never,
        parties as never,
        {} as never
    );
    return { em, service, rules };
}

const create = (overrides: Record<string, unknown>) => ({
    amount: -2500,
    bookedOn: '2026-11-10',
    description: 'Groceries',
    ...overrides,
});

describe('TransactionService.create refuses ids from another household', () => {
    it.each([
        ['jar', { jarId: 'jar-b-play' }, 'jar_not_found'],
        ['category', { categoryId: 'category-b' }, 'category_not_found'],
        ['bank account', { accountId: 'account-b' }, 'bank_account_not_found'],
    ])('a foreign %s: rejected, nothing written', async (_label, ids, key) => {
        const { em, service } = setup();

        await expect(asOwnerOf(HOUSEHOLD_A, () => service.create(create(ids)))).rejects.toEqual(
            notFound(key)
        );

        expect(em.create).not.toHaveBeenCalled();
        expect(em.flush).not.toHaveBeenCalled();
        expect(em.getReference).not.toHaveBeenCalled();
    });

    it('still sorts a transaction onto the own jar, category and account', async () => {
        const { em, service } = setup();

        const created = await asOwnerOf(HOUSEHOLD_A, () =>
            service.create(
                create({ jarId: 'jar-a-play', categoryId: 'category-a', accountId: 'account-a' })
            )
        );

        expect(created).toMatchObject({
            jarId: 'jar-a-play',
            categoryId: 'category-a',
            accountId: 'account-a',
            status: TransactionStatus.SORTED,
            source: TransactionSource.MANUAL,
        });
        expect(em.flush).toHaveBeenCalled();
    });
});

describe('TransactionService.sort refuses ids from another household', () => {
    it.each([
        ['jar', 'jar-b-play', null, 'jar_not_found'],
        ['category', 'jar-a-play', 'category-b', 'category_not_found'],
    ])('a foreign %s: rejected, the row stays in the Inbox', async (_l, jarId, categoryId, key) => {
        const row = transactionRow();
        const { em, service, rules } = setup([row]);

        await expect(
            asOwnerOf(HOUSEHOLD_A, () => service.sort(row.id, jarId, categoryId))
        ).rejects.toEqual(notFound(key));

        expect(row).toMatchObject({ jar: null, category: null, status: TransactionStatus.INBOX });
        expect(rules.upsertPayeeHint).not.toHaveBeenCalled();
        expect(em.flush).not.toHaveBeenCalled();
    });

    it('sorts onto the own jar and category', async () => {
        const row = transactionRow();
        const { service } = setup([row]);

        const sorted = await asOwnerOf(HOUSEHOLD_A, () =>
            service.sort(row.id, 'jar-a-play', 'category-a')
        );

        expect(sorted).toMatchObject({ jarId: 'jar-a-play', categoryId: 'category-a' });
        expect(row.status).toBe(TransactionStatus.SORTED);
    });
});

describe('TransactionService.bulkSort', () => {
    const inbox = () => [
        transactionRow({ id: 'transaction-a1' }),
        transactionRow({ id: 'transaction-a2' }),
        // Same shape, other household.
        transactionRow({ id: 'transaction-b1', household: 'household-b' }),
    ];

    it('refuses a foreign jar and writes none of the rows', async () => {
        const rows = inbox();
        const { em, service } = setup(rows);

        await expect(
            asOwnerOf(HOUSEHOLD_A, () =>
                service.bulkSort(['transaction-a1', 'transaction-a2'], 'jar-b-play')
            )
        ).rejects.toEqual(notFound('jar_not_found'));

        expect(rows.every(row => row.jar === null)).toBe(true);
        expect(em.flush).not.toHaveBeenCalled();
    });

    it('refuses a foreign category and writes none of the rows', async () => {
        const rows = inbox();
        const { em, service } = setup(rows);

        await expect(
            asOwnerOf(HOUSEHOLD_A, () =>
                service.bulkSort(['transaction-a1', 'transaction-a2'], 'jar-a-play', 'category-b')
            )
        ).rejects.toEqual(notFound('category_not_found'));

        expect(rows.every(row => row.jar === null)).toBe(true);
        expect(em.flush).not.toHaveBeenCalled();
    });

    it('skips a transaction id of another household or a deleted one: the valid rows are sorted', async () => {
        const rows = inbox();
        const { em, service } = setup(rows);

        const result = await asOwnerOf(HOUSEHOLD_A, () =>
            service.bulkSort(
                ['transaction-a1', 'transaction-b1', 'transaction-gone', 'transaction-a2'],
                'jar-a-play'
            )
        );

        expect(result).toEqual({ updated: 2 });
        expect(rows.filter(row => row.jar !== null).map(row => row.id)).toEqual([
            'transaction-a1',
            'transaction-a2',
        ]);
        // The other household's row is untouched.
        expect(rows[2]).toMatchObject({ jar: null, status: TransactionStatus.INBOX });
        expect(em.flush).toHaveBeenCalledTimes(1);
    });

    it('stays strict on the pot when a foreign transaction id is in the set', async () => {
        const rows = inbox();
        const { em, service } = setup(rows);

        await expect(
            asOwnerOf(HOUSEHOLD_A, () =>
                service.bulkSort(['transaction-a1', 'transaction-b1'], 'jar-b-play')
            )
        ).rejects.toEqual(notFound('jar_not_found'));

        expect(rows.every(row => row.jar === null)).toBe(true);
        expect(em.flush).not.toHaveBeenCalled();
    });

    it('sorts every own row onto the own jar in one query for the set', async () => {
        const rows = inbox();
        const { em, service } = setup(rows);

        const result = await asOwnerOf(HOUSEHOLD_A, () =>
            service.bulkSort(['transaction-a1', 'transaction-a2'], 'jar-a-play', 'category-a')
        );

        expect(result).toEqual({ updated: 2 });
        expect(rows.filter(row => row.jar !== null).map(row => row.id)).toEqual([
            'transaction-a1',
            'transaction-a2',
        ]);
        expect(rows[2]!.jar).toBeNull();
        expect(em.find.mock.calls.filter(([entity]) => entity === Transaction)).toHaveLength(1);
    });
});

describe('TransactionService.update category', () => {
    it('refuses a foreign category and leaves the row as it was', async () => {
        const row = transactionRow({ note: 'before' });
        const { em, service } = setup([row]);

        await expect(
            asOwnerOf(HOUSEHOLD_A, () =>
                service.update(row.id, { note: 'after', categoryId: 'category-b' })
            )
        ).rejects.toEqual(notFound('category_not_found'));

        expect(row).toMatchObject({ note: 'before', category: null });
        expect(em.flush).not.toHaveBeenCalled();
    });

    it('sets the own category', async () => {
        const row = transactionRow();
        const { service } = setup([row]);

        const updated = await asOwnerOf(HOUSEHOLD_A, () =>
            service.update(row.id, { categoryId: 'category-a' })
        );

        expect(updated.categoryId).toBe('category-a');
    });
});

describe('TransactionService.importCsv', () => {
    const CSV = 'datum;bedrag;omschrijving\n2026-11-02;-10,00;Test';

    it('refuses a foreign bank account, even as a dry run', async () => {
        const { em, service } = setup();

        await expect(
            asOwnerOf(HOUSEHOLD_A, () => service.importCsv('account-b', CSV, true))
        ).rejects.toEqual(notFound('bank_account_not_found'));

        expect(em.create).not.toHaveBeenCalled();
        expect(em.flush).not.toHaveBeenCalled();
    });

    it('imports into the own bank account', async () => {
        const { em, service } = setup();

        const result = await asOwnerOf(HOUSEHOLD_A, () =>
            service.importCsv('account-a', CSV, false)
        );

        expect(result).toMatchObject({ detected: 1, willImport: 1 });
        expect(em.created[0]).toMatchObject({
            household: HOUSEHOLD_A,
            source: TransactionSource.CSV,
        });
    });
});

describe('transaction links to a debt or a fixed cost', () => {
    it.each([
        ['debt', { debtId: 'debt-b' }, 'debt_not_found'],
        ['fixed cost', { fixedCostId: 'bill-b' }, 'fixed_cost_not_found'],
    ])('create refuses a foreign %s before the row is written', async (_label, ids, key) => {
        const { em, service } = setup();

        await expect(asOwnerOf(HOUSEHOLD_A, () => service.create(create(ids)))).rejects.toEqual(
            notFound(key)
        );

        expect(em.create).not.toHaveBeenCalled();
        expect(em.flush).not.toHaveBeenCalled();
    });

    it.each([
        ['debt', { debtId: 'debt-b' }, 'debt_not_found'],
        ['fixed cost', { fixedCostId: 'bill-b' }, 'fixed_cost_not_found'],
    ])('update refuses a foreign %s and leaves the row as it was', async (_label, patch, key) => {
        const row = transactionRow({ note: 'before' });
        const { em, service } = setup([row]);

        await expect(
            asOwnerOf(HOUSEHOLD_A, () => service.update(row.id, { note: 'after', ...patch }))
        ).rejects.toEqual(notFound(key));

        expect(row).toMatchObject({ note: 'before', debt: null, fixedCost: null });
        expect(em.flush).not.toHaveBeenCalled();
    });

    it.each([
        ['debt', { debtId: 'debt-b' }, 'debt_not_found'],
        ['fixed cost', { fixedCostId: 'bill-b' }, 'fixed_cost_not_found'],
    ])('sort refuses a foreign %s and leaves the row in the Inbox', async (_label, ids, key) => {
        const row = transactionRow();
        const { em, service } = setup([row]);
        const links: { debtId?: string; fixedCostId?: string } = ids;

        await expect(
            asOwnerOf(HOUSEHOLD_A, () =>
                service.sort(row.id, 'jar-a-play', null, false, links.debtId, links.fixedCostId)
            )
        ).rejects.toEqual(notFound(key));

        expect(row).toMatchObject({ jar: null, status: TransactionStatus.INBOX });
        expect(em.flush).not.toHaveBeenCalled();
    });

    it('create links the own debt', async () => {
        const { service } = setup();

        const created = await asOwnerOf(HOUSEHOLD_A, () =>
            service.create(create({ debtId: 'debt-a' }))
        );

        expect(created.debtId).toBe('debt-a');
    });

    it('create links the own fixed cost', async () => {
        const { service } = setup();

        const created = await asOwnerOf(HOUSEHOLD_A, () =>
            service.create(create({ fixedCostId: 'bill-a' }))
        );

        expect(created.fixedCostId).toBe('bill-a');
    });

    it('update links the own debt and the own fixed cost', async () => {
        const first = transactionRow({ id: 'transaction-a1' });
        const second = transactionRow({ id: 'transaction-a2' });
        const { service } = setup([first, second]);

        const withDebt = await asOwnerOf(HOUSEHOLD_A, () =>
            service.update(first.id, { debtId: 'debt-a' })
        );
        const withBill = await asOwnerOf(HOUSEHOLD_A, () =>
            service.update(second.id, { fixedCostId: 'bill-a' })
        );

        expect(withDebt.debtId).toBe('debt-a');
        expect(withBill.fixedCostId).toBe('bill-a');
    });
});

describe('transaction id from the client: foreign and unknown are a clean 404', () => {
    const foreign = () => transactionRow({ id: 'transaction-b1', household: 'household-b' });

    it.each<[string, (service: TransactionService, id: string) => Promise<unknown>]>([
        ['sort', (service: TransactionService, id: string) => service.sort(id, 'jar-a-play')],
        ['update', (service: TransactionService, id: string) => service.update(id, { note: 'x' })],
        ['remove', (service: TransactionService, id: string) => service.remove(id)],
    ])('%s: another household id and an unknown id', async (_label, run) => {
        const row = foreign();
        const { em, service } = setup([row]);

        for (const id of [row.id, 'transaction-gone']) {
            await expect(asOwnerOf(HOUSEHOLD_A, () => run(service, id))).rejects.toEqual(
                notFound('transaction_not_found')
            );
        }

        expect(row.jar).toBeNull();
        expect(row).not.toHaveProperty('note');
        expect(em.remove).not.toHaveBeenCalled();
        expect(em.flush).not.toHaveBeenCalled();
    });

    it('still removes an own transaction', async () => {
        const row = transactionRow();
        const { em, service } = setup([row]);

        await asOwnerOf(HOUSEHOLD_A, () => service.remove(row.id));

        expect(em.remove).toHaveBeenCalledWith(row);
    });
});

describe('TransactionService.update re-checks the pot when the amount becomes an outflow', () => {
    const FREEDOM = { id: 'jar-a-freedom', key: JarKey.FINANCIAL_FREEDOM };
    const PLAY = { id: 'jar-a-play', key: JarKey.PLAY };

    it('refuses an outflow on a row sorted into a pot that takes no spending', async () => {
        const row = transactionRow({
            amount: 5000,
            jar: FREEDOM,
            status: TransactionStatus.SORTED,
        });
        const { em, service } = setup([row]);

        await expect(
            asOwnerOf(HOUSEHOLD_A, () => service.update(row.id, { amount: -5000 }))
        ).rejects.toBeInstanceOf(BadRequestException);

        expect(row.amount).toBe(5000);
        expect(em.flush).not.toHaveBeenCalled();
    });

    it('allows an outflow on a spending pot, an inflow on the savings pot, and a note-only edit', async () => {
        const spend = transactionRow({ id: 'transaction-a1', amount: 5000, jar: PLAY });
        const save = transactionRow({ id: 'transaction-a2', amount: -5000, jar: FREEDOM });
        const note = transactionRow({ id: 'transaction-a3', amount: -5000, jar: FREEDOM });
        const { service } = setup([spend, save, note]);

        await asOwnerOf(HOUSEHOLD_A, () => service.update(spend.id, { amount: -5000 }));
        await asOwnerOf(HOUSEHOLD_A, () => service.update(save.id, { amount: 5000 }));
        // A legacy misfiled outflow is not re-judged unless its amount is edited.
        await asOwnerOf(HOUSEHOLD_A, () => service.update(note.id, { note: 'fine' }));

        expect([spend.amount, save.amount, note.note]).toEqual([-5000, 5000, 'fine']);
    });
});
