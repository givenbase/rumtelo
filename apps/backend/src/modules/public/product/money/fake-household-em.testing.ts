import { expect, vi } from 'vitest';

import {
    householdStorage,
    type HouseholdContext,
} from '../../../../common/household/household.context';
import { BankAccount } from './ledger/bank-account/bank-account.entity';
import { Transaction } from './ledger/transaction/transaction.entity';
import { FixedCost } from './plan/fixed-cost/fixed-cost.entity';
import { Category } from './plan/jar/category.entity';
import { Jar } from './plan/jar/jar.entity';
import { JarShare } from './plan/jar/jar-share.entity';
import { Debt } from './targets/debt/debt.entity';
import { JarKey } from '@rumtelo/contracts';

/**
 * Test double for the MikroORM EntityManager, shared by the "ids from the client" specs.
 *
 * Rows of every household live in one table per entity class, exactly like the real
 * database, so a service that forgets the household filter finds the foreign row and the
 * spec fails. It understands the few filter shapes the services use: equality, `$in`, `$ne`.
 * `getReference` is a spy on purpose: a service must not attach a client id by reference.
 */

export const HOUSEHOLD_A = 'household-a';
export const HOUSEHOLD_B = 'household-b';

export type Row = Record<string, unknown> & { id: string };
type Where = Record<string, unknown>;

function matches(row: Row, where: Where): boolean {
    return Object.entries(where).every(([key, expected]) => {
        const actual = row[key];
        if (expected && typeof expected === 'object') {
            if ('$in' in expected) return (expected.$in as unknown[]).includes(actual);
            if ('$ne' in expected) return actual !== expected.$ne;
        }
        return actual === expected;
    });
}

/** Two households, each with its own pots, categories (one per pot), bank account, debt and fixed cost. */
export function seedTwoHouseholds(): Map<unknown, Row[]> {
    return new Map<unknown, Row[]>([
        [
            Jar,
            [
                { id: 'jar-a-necessities', household: HOUSEHOLD_A, key: JarKey.NECESSITIES },
                { id: 'jar-a-play', household: HOUSEHOLD_A, key: JarKey.PLAY },
                { id: 'jar-a-freedom', household: HOUSEHOLD_A, key: JarKey.FINANCIAL_FREEDOM },
                { id: 'jar-b-necessities', household: HOUSEHOLD_B, key: JarKey.NECESSITIES },
                { id: 'jar-b-play', household: HOUSEHOLD_B, key: JarKey.PLAY },
            ],
        ],
        [
            Category,
            [
                // A category sits inside one pot (`Category.jar` is required).
                {
                    id: 'category-a',
                    household: HOUSEHOLD_A,
                    name: 'Groceries',
                    jar: { id: 'jar-a-necessities' },
                },
                {
                    id: 'category-a-play',
                    household: HOUSEHOLD_A,
                    name: 'Coffee',
                    jar: { id: 'jar-a-play' },
                },
                {
                    id: 'category-b',
                    household: HOUSEHOLD_B,
                    name: 'Groceries',
                    jar: { id: 'jar-b-necessities' },
                },
            ],
        ],
        [
            BankAccount,
            [
                { id: 'account-a', household: HOUSEHOLD_A, bank: null },
                { id: 'account-b', household: HOUSEHOLD_B, bank: null },
            ],
        ],
        [
            Debt,
            [
                { id: 'debt-a', household: HOUSEHOLD_A, balance: 100_000, closedOn: null },
                { id: 'debt-b', household: HOUSEHOLD_B, balance: 100_000, closedOn: null },
            ],
        ],
        [
            FixedCost,
            [
                {
                    id: 'bill-a',
                    household: HOUSEHOLD_A,
                    direction: 'OUT',
                    isActive: true,
                    startedOn: null,
                    endsOn: null,
                    asset: null,
                },
                {
                    id: 'bill-b',
                    household: HOUSEHOLD_B,
                    direction: 'OUT',
                    isActive: true,
                    startedOn: null,
                    endsOn: null,
                    asset: null,
                },
            ],
        ],
    ]);
}

/** Entities whose created rows land in their table and whose removed rows leave it. */
const WRITABLE_TABLES: unknown[] = [Transaction, Jar, JarShare];

/**
 * `options.sql` answers the raw `getConnection().execute(sql, params)` reads some services make
 * (income history, totals); it receives the statement and its bound parameters and returns the
 * rows. The default answers with no rows. Every call is recorded on `em.getConnection().execute`.
 */
export function fakeHouseholdEm(
    tables: Map<unknown, Row[]> = seedTwoHouseholds(),
    options: { sql?: (sql: string, params: unknown[]) => unknown[] } = {}
) {
    const rowsOf = (entity: unknown) => tables.get(entity) ?? [];
    const created: Row[] = [];
    const flush = vi.fn<() => Promise<void>>(async () => undefined);
    const execute = vi.fn<(sql: string, params?: unknown[]) => Promise<unknown[]>>(
        async (sql, params = []) => options.sql?.(sql, params) ?? []
    );
    const emRef: { current: unknown } = { current: null };
    const em = {
        tables,
        created,
        find: vi.fn<(entity: unknown, where: Where) => Promise<Row[]>>(async (entity, where) =>
            rowsOf(entity).filter(row => matches(row, where))
        ),
        findOne: vi.fn<(entity: unknown, where: Where) => Promise<Row | null>>(
            async (entity, where) => rowsOf(entity).find(row => matches(row, where)) ?? null
        ),
        findOneOrFail: vi.fn<(entity: unknown, where: Where) => Promise<Row>>(
            async (entity, where) => {
                const found = rowsOf(entity).find(row => matches(row, where));
                if (!found) throw new Error('not found');
                return found;
            }
        ),
        count: vi.fn<(entity: unknown, where: Where) => Promise<number>>(
            async (entity, where) => rowsOf(entity).filter(row => matches(row, where)).length
        ),
        create: vi.fn<(entity: unknown, data: Where) => Row>((entity, data) => {
            const row = {
                id: `new-${created.length + 1}`,
                createdAt: new Date(),
                updatedAt: new Date(),
                ...data,
            } as Row;
            created.push(row);
            if (WRITABLE_TABLES.includes(entity)) {
                if (!tables.has(entity)) tables.set(entity, []);
                rowsOf(entity).push(row);
            }
            return row;
        }),
        persist: vi.fn<(row: unknown) => { flush: () => Promise<void> }>(() => ({
            flush,
        })),
        flush,
        populate: vi.fn<(row: unknown) => Promise<void>>(async () => undefined),
        remove: vi.fn<(row: unknown) => { flush: () => Promise<void> }>(row => {
            for (const entity of WRITABLE_TABLES) {
                const list = rowsOf(entity);
                const index = list.indexOf(row as Row);
                if (index >= 0 && entity !== Transaction) list.splice(index, 1);
            }
            return { flush };
        }),
        /** Runs the callback on the same fake: no rollback, so specs assert on the happy path. */
        transactional: vi.fn<(run: (tx: unknown) => Promise<unknown>) => Promise<unknown>>(
            async run => run(emRef.current)
        ),
        getConnection: () => ({ execute }),
        nativeDelete: vi.fn<() => Promise<number>>(async () => 0),
        getReference: vi.fn<(entity: unknown, id: string) => { id: string }>((_entity, id) => ({
            id,
        })),
    };
    emRef.current = em;
    return em;
}

export type FakeHouseholdEm = ReturnType<typeof fakeHouseholdEm>;

/** Run `run` as an OWNER of `householdId`, the way the scope interceptor would. */
export function asOwnerOf<T>(householdId: string, run: () => Promise<T>): Promise<T> {
    const context: HouseholdContext = {
        userId: 'user-1',
        householdId,
        role: 'OWNER',
        source: 'SEAT' as never,
        relation: null,
    };
    return householdStorage.run(context, run);
}

/** The error the service must throw for an id that is not this household's. */
export const notFound = (key: string) =>
    expect.objectContaining({ response: expect.objectContaining({ message: key }) });
