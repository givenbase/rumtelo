import { describe, expect, it } from 'vitest';

import {
    AccountKind,
    Cadence,
    DebtKind,
    FlowDirection,
    GoalKind,
    IncomeKind,
    JarKey,
    PlanKey,
    RuleField,
    RuleMatcher,
    type ArchiveRestorePayload,
} from '@rumtelo/contracts';

import { apiBadRequest } from '../../../../../common/errors/api-user-error';
import { householdStorage } from '../../../../../common/household/household.context';
import { ArchiveService } from './archive.service';

/**
 * The restore must be all-or-nothing. These specs use a fake database whose `transactional`
 * snapshots the tables and restores them when the callback throws. That proves ArchiveService
 * opens one transaction around every write and lets a failure travel through it; it cannot
 * prove Postgres or MikroORM roll back (savepoints for the pot-split lock, row locks) -
 * that only staging shows.
 */

const ORDER = [
    JarKey.NECESSITIES,
    JarKey.FINANCIAL_FREEDOM,
    JarKey.EDUCATION,
    JarKey.LONG_TERM_SAVINGS,
    JarKey.PLAY,
    JarKey.GIVE,
];
const VALID_IBAN = 'NL91 ABNA 0417 1643 00';

const LOCAL_JARS = ORDER.map((key, index) => ({
    id: `jar-${key}`,
    key,
    sortOrder: index,
    percentage: 10,
    capabilities: {
        allowsFixedCosts: key !== JarKey.FINANCIAL_FREEDOM && key !== JarKey.LONG_TERM_SAVINGS,
    },
}));

type Table =
    | 'settings'
    | 'parties'
    | 'accounts'
    | 'income'
    | 'debts'
    | 'fixedCosts'
    | 'goals'
    | 'rules'
    | 'transactions';
type Row = Record<string, unknown> & { id?: string; name?: string };

/** Fake database + the services ArchiveService calls, all writing into it. */
function buildFakes(options: { failOn?: Table; failSplit?: boolean } = {}) {
    const tables: Record<Table, Row[]> = {
        settings: [],
        parties: [],
        accounts: [],
        income: [],
        debts: [],
        fixedCosts: [],
        goals: [],
        rules: [],
        transactions: [],
    };
    let depth = 0;
    let transactionsOpened = 0;
    /** Every write ever attempted, kept across a rollback. */
    const writes: Array<{ table: Table; insideTransaction: boolean }> = [];
    const settlementUpdates: Row[] = [];
    /** The stored pot split: rolled back with the tables, so a spec can read what survived. */
    let split: 'old' | 'new' = 'old';
    /** How many other writes had happened when the split was written (null = never written). */
    let writesBeforeSplit: number | null = null;
    let counter = 0;

    const write = (table: Table, row: Row): Row => {
        writes.push({ table, insideTransaction: depth > 0 });
        if (options.failOn === table) throw apiBadRequest('due_month_required');
        const saved = { id: `${table}-${(counter += 1)}`, ...row };
        tables[table].push(saved);
        return saved;
    };
    const section = (table: Table) => ({
        list: async () => [...tables[table]],
        create: async (row: Row) => write(table, row),
    });

    const em = {
        find: async () => [],
        create: (_entity: unknown, row: Row) => write('transactions', row),
        persist: () => undefined,
        flush: async () => undefined,
        getReference: (_entity: unknown, id: string) => ({ id }),
        transactional: async (run: () => Promise<unknown>) => {
            transactionsOpened += 1;
            const snapshot = Object.fromEntries(
                Object.entries(tables).map(([name, rows]) => [name, [...rows]])
            );
            const splitSnapshot = split;
            depth += 1;
            try {
                return await run();
            } catch (error) {
                split = splitSnapshot;
                for (const name of Object.keys(tables) as Table[]) {
                    tables[name] = snapshot[name] as Row[];
                }
                throw error;
            } finally {
                depth -= 1;
            }
        },
    };
    const accounts = {
        ...section('accounts'),
        update: async (row: Row) => {
            settlementUpdates.push(row);
            return row;
        },
    };

    const service = new ArchiveService(
        em as never,
        {
            planKeyForCurrentHousehold: async () => PlanKey.MAX,
            assertWithinLimit: async () => undefined,
        } as never,
        {
            list: async () => LOCAL_JARS,
            updateSplit: async () => {
                if (options.failSplit) throw apiBadRequest('jar_split_keys');
                writesBeforeSplit = writes.length;
                split = 'new';
                return LOCAL_JARS;
            },
        } as never,
        section('parties') as never,
        section('income') as never,
        section('fixedCosts') as never,
        section('debts') as never,
        section('goals') as never,
        section('rules') as never,
        accounts as never,
        { update: async (_id: string, patch: Row) => write('settings', patch) } as never,
        { update: async () => undefined } as never
    );

    return {
        service,
        tables,
        writes,
        settlementUpdates,
        opened: () => transactionsOpened,
        splitState: () => ({ split, writesBeforeSplit }),
    };
}

const jarId = (key: JarKey) => `export-${ORDER.indexOf(key)}`;

/** One row of every section, all valid. */
function fullPayload(overrides: Partial<ArchiveRestorePayload> = {}): ArchiveRestorePayload {
    return {
        settings: { why: 'restore me' },
        parties: [{ name: 'Landlord' }],
        accounts: [{ name: 'Joint', kind: AccountKind.CHECKING, iban: VALID_IBAN }],
        jars: ORDER.map((key, index) => ({
            id: jarId(key),
            key,
            percentage: [50, 15, 10, 10, 10, 5][index]!,
        })),
        assets: [],
        income: [{ name: 'Salary', kind: IncomeKind.SALARY, amount: 3_000_00 }],
        fixedCosts: [
            {
                name: 'Rent',
                amount: 900_00,
                jarId: jarId(JarKey.NECESSITIES),
                cadence: Cadence.MONTHLY,
                direction: FlowDirection.OUT,
            },
        ],
        debts: [
            {
                name: 'Car loan',
                kind: DebtKind.LOAN,
                balance: 5_000_00,
                interestRate: 4,
                paymentCadence: Cadence.MONTHLY,
            },
        ],
        goals: [{ name: 'Holiday', kind: GoalKind.SAVE, target: 1_000_00 }],
        rules: [
            {
                field: RuleField.DESCRIPTION,
                matcher: RuleMatcher.CONTAINS,
                matchValue: 'rent',
                jarId: jarId(JarKey.NECESSITIES),
            },
        ],
        transactions: [{ bookedOn: '2026-11-01', amount: -900_00, description: 'Rent November' }],
        ...overrides,
    };
}

function restore(service: ArchiveService, payload: ArchiveRestorePayload, dryRun: boolean) {
    return householdStorage.run(
        {
            userId: 'user-1',
            householdId: 'household-1',
            role: 'OWNER',
            source: 'SEAT' as never,
            relation: null,
        },
        () => service.restore({ payload, dryRun, applyJarSplit: true, applySettings: true })
    );
}

const rowCount = (tables: Record<Table, Row[]>) =>
    Object.values(tables).reduce((sum, rows) => sum + rows.length, 0);

describe('ArchiveService.restore is all-or-nothing', () => {
    it('writes every section inside one transaction', async () => {
        const { service, tables, writes, opened } = buildFakes();

        const result = await restore(service, fullPayload(), false);

        expect(result.income.willImport).toBe(1);
        expect(opened()).toBe(1);
        expect(
            Object.fromEntries(Object.entries(tables).map(([name, rows]) => [name, rows.length]))
        ).toEqual({
            settings: 1,
            parties: 1,
            accounts: 1,
            income: 1,
            debts: 1,
            fixedCosts: 1,
            goals: 1,
            rules: 1,
            transactions: 1,
        });
        expect(writes.length).toBeGreaterThanOrEqual(9);
        expect(writes.every(entry => entry.insideTransaction)).toBe(true);
    });

    it.each(['income', 'debts', 'fixedCosts', 'goals', 'rules', 'transactions'] as const)(
        'leaves no row from earlier sections when %s fails',
        async failOn => {
            const { service, tables, writes } = buildFakes({ failOn });

            await expect(restore(service, fullPayload(), false)).rejects.toMatchObject({
                response: { message: 'due_month_required' },
            });

            // Earlier sections did write before the failure; the rollback took them back.
            expect(writes.some(entry => entry.table !== failOn)).toBe(true);
            expect(rowCount(tables)).toBe(0);
            expect(writes.every(entry => entry.insideTransaction)).toBe(true);
        }
    );

    it('writes the pot split after every other section', async () => {
        const { service, writes, splitState } = buildFakes();

        const result = await restore(service, fullPayload(), false);

        expect(result.jarsSplitUpdated).toBe(true);
        // The split row-locks every pot until commit, so it goes last: all nine other
        // writes (settings through transactions) were already done when it ran.
        expect(splitState()).toEqual({ split: 'new', writesBeforeSplit: writes.length });
        expect(writes.length).toBeGreaterThanOrEqual(9);
    });

    it('keeps the old split when a later section fails', async () => {
        const { service, splitState } = buildFakes({ failOn: 'transactions' });

        await expect(restore(service, fullPayload(), false)).rejects.toBeDefined();

        expect(splitState()).toEqual({ split: 'old', writesBeforeSplit: null });
    });

    it('rolls every section back when the split itself is refused', async () => {
        const { service, tables, splitState } = buildFakes({ failSplit: true });

        await expect(restore(service, fullPayload(), false)).rejects.toMatchObject({
            response: { message: 'jar_split_keys' },
        });

        expect(rowCount(tables)).toBe(0);
        expect(splitState().split).toBe('old');
    });

    it('still reports the split in the dry run without writing it', async () => {
        const { service, splitState } = buildFakes();

        const result = await restore(service, fullPayload(), true);

        expect(result.jarsSplitUpdated).toBe(true);
        expect(splitState()).toEqual({ split: 'old', writesBeforeSplit: null });
    });

    it('writes nothing and opens no transaction in the dry run', async () => {
        const { service, tables, writes, opened } = buildFakes();

        const result = await restore(service, fullPayload(), true);

        expect(result.dryRun).toBe(true);
        expect(result.goals.willImport).toBe(1);
        expect(writes).toEqual([]);
        expect(rowCount(tables)).toBe(0);
        expect(opened()).toBe(0);
    });

    it('reports the same counts and warnings in the dry run and the real run', async () => {
        const payload = fullPayload({
            accounts: [
                { name: 'Joint', kind: AccountKind.CHECKING },
                {
                    name: 'Card',
                    kind: AccountKind.CREDIT,
                    settlementAccountName: 'Joint',
                    wasConnected: true,
                },
                { name: 'Card two', kind: AccountKind.CREDIT, settlementAccountName: 'Nowhere' },
            ],
        });

        const dry = await restore(buildFakes().service, payload, true);
        const real = await restore(buildFakes().service, payload, false);

        const { dryRun: dryFlag, ...dryRest } = dry;
        const { dryRun: realFlag, ...realRest } = real;
        expect(dryFlag).toBe(true);
        expect(realFlag).toBe(false);
        expect(dryRest).toEqual(realRest);
        expect(real.warnings).toEqual(
            expect.arrayContaining(['account_reconnect_needed', 'settlement_account_missing'])
        );
    });

    it('links a card to the account it settles from in the real run', async () => {
        const { service, settlementUpdates } = buildFakes();

        await restore(
            service,
            fullPayload({
                accounts: [
                    { name: 'Joint', kind: AccountKind.CHECKING },
                    { name: 'Card', kind: AccountKind.CREDIT, settlementAccountName: 'Joint' },
                ],
            }),
            false
        );

        expect(settlementUpdates).toHaveLength(1);
    });
});

/**
 * Rules the services enforce on a row that the dry run used to pass: the preview now refuses
 * them with the same key the real run uses, and the real run refuses before its first write.
 */
describe('ArchiveService.restore dry run and real run agree on what is refused', () => {
    const REFUSED: Array<[string, string, Partial<ArchiveRestorePayload>]> = [
        [
            'an IBAN that is not valid',
            'invalid_iban',
            {
                accounts: [
                    { name: 'Joint', kind: AccountKind.CHECKING, iban: 'NL00 0000 0000 00' },
                ],
            },
        ],
        [
            'a yearly bill without a due month',
            'due_month_required',
            {
                fixedCosts: [
                    {
                        name: 'Insurance',
                        amount: 600_00,
                        jarId: jarId(JarKey.NECESSITIES),
                        cadence: Cadence.YEARLY,
                    },
                ],
            },
        ],
        [
            'a yearly bill with a month outside 1-12',
            'due_month_required',
            {
                fixedCosts: [
                    {
                        name: 'Insurance',
                        amount: 600_00,
                        jarId: jarId(JarKey.NECESSITIES),
                        cadence: Cadence.YEARLY,
                        dueMonth: 13,
                    },
                ],
            },
        ],
        [
            'a quarterly debt without a due month',
            'due_month_required',
            {
                debts: [
                    {
                        name: 'Tax debt',
                        kind: DebtKind.LOAN,
                        balance: 1_000_00,
                        interestRate: 0,
                        paymentCadence: Cadence.QUARTERLY,
                    },
                ],
            },
        ],
        [
            'a card that settles from another card',
            'settlement_account_invalid',
            {
                accounts: [
                    { name: 'Card one', kind: AccountKind.CREDIT },
                    {
                        name: 'Card two',
                        kind: AccountKind.CREDIT,
                        settlementAccountName: 'Card one',
                    },
                ],
            },
        ],
        [
            'a card that settles from itself',
            'settlement_account_invalid',
            {
                accounts: [
                    {
                        name: 'Card',
                        kind: AccountKind.CREDIT,
                        settlementAccountName: 'card',
                    },
                ],
            },
        ],
    ];

    it.each(REFUSED)('%s', async (_label, key, overrides) => {
        const payload = fullPayload(overrides);
        const dry = buildFakes();
        const real = buildFakes();

        await expect(restore(dry.service, payload, true)).rejects.toMatchObject({
            response: { message: key },
        });
        await expect(restore(real.service, payload, false)).rejects.toMatchObject({
            response: { message: key },
        });

        expect(rowCount(dry.tables)).toBe(0);
        expect(rowCount(real.tables)).toBe(0);
    });

    it('accepts the same valid rows in both modes', async () => {
        const payload = fullPayload({
            fixedCosts: [
                {
                    name: 'Insurance',
                    amount: 600_00,
                    jarId: jarId(JarKey.NECESSITIES),
                    cadence: Cadence.YEARLY,
                    dueMonth: 6,
                },
            ],
        });

        const dry = await restore(buildFakes().service, payload, true);
        const real = await restore(buildFakes().service, payload, false);

        expect(dry.fixedCosts).toEqual(real.fixedCosts);
        expect(real.fixedCosts.willImport).toBe(1);
    });

    it('skips an account whose IBAN is the same in another notation, as the service would refuse it', async () => {
        const { service, tables } = buildFakes();
        tables.accounts.push({
            id: 'existing',
            name: 'Old',
            iban: 'NL91ABNA0417164300',
            kind: AccountKind.CHECKING,
        });

        const result = await restore(
            service,
            fullPayload({
                accounts: [{ name: 'Joint', kind: AccountKind.CHECKING, iban: VALID_IBAN }],
            }),
            false
        );

        expect(result.accounts).toMatchObject({ willImport: 0, skipped: 1 });
    });

    it('skips a party whose name differs only in spacing or case', async () => {
        const { service, tables } = buildFakes();
        tables.parties.push({ id: 'existing', name: 'Big Landlord' });

        const result = await restore(
            service,
            fullPayload({ parties: [{ name: ' big   LANDLORD ' }] }),
            false
        );

        expect(result.parties).toMatchObject({ willImport: 0, skipped: 1 });
    });
});

/**
 * The pre-validation must not be stricter than the services: files that restored before this
 * change (no IBAN, a non-Dutch IBAN, monthly rows with no due month, a debt without a cadence)
 * must still restore, in the preview and in the real run.
 */
describe('ArchiveService.restore still accepts what the services accept', () => {
    const ACCEPTED: Array<[string, Partial<ArchiveRestorePayload>]> = [
        [
            'an account without an IBAN',
            { accounts: [{ name: 'Joint', kind: AccountKind.CHECKING }] },
        ],
        [
            'an account with an empty IBAN',
            { accounts: [{ name: 'Joint', kind: AccountKind.CHECKING, iban: '   ' }] },
        ],
        [
            'a valid non-Dutch IBAN',
            {
                accounts: [
                    {
                        name: 'Joint',
                        kind: AccountKind.CHECKING,
                        iban: 'DE89 3704 0044 0532 0130 00',
                    },
                ],
            },
        ],
        [
            'a monthly bill and debt without a due month, and a weekly bill',
            {
                fixedCosts: [
                    {
                        name: 'Rent',
                        amount: 900_00,
                        jarId: jarId(JarKey.NECESSITIES),
                        cadence: Cadence.MONTHLY,
                    },
                    {
                        name: 'Paper',
                        amount: 5_00,
                        jarId: jarId(JarKey.NECESSITIES),
                        cadence: Cadence.WEEKLY,
                    },
                    { name: 'No cadence', amount: 5_00, jarId: jarId(JarKey.NECESSITIES) },
                ],
                debts: [
                    { name: 'Old loan', kind: DebtKind.LOAN, balance: 100_00, interestRate: 0 },
                ],
            },
        ],
        [
            'a quarterly bill with month 3 and a yearly bill with month 12',
            {
                fixedCosts: [
                    {
                        name: 'Water',
                        amount: 50_00,
                        jarId: jarId(JarKey.NECESSITIES),
                        cadence: Cadence.QUARTERLY,
                        dueMonth: 3,
                    },
                    {
                        name: 'Road tax',
                        amount: 400_00,
                        jarId: jarId(JarKey.NECESSITIES),
                        cadence: Cadence.YEARLY,
                        dueMonth: 12,
                    },
                ],
            },
        ],
        [
            'a card that settles from a savings account in the same file',
            {
                accounts: [
                    { name: 'Savings', kind: AccountKind.SAVINGS },
                    { name: 'Card', kind: AccountKind.CREDIT, settlementAccountName: ' savings ' },
                ],
            },
        ],
        [
            'an invalid IBAN on an account that is skipped anyway because its bank is unknown',
            {
                accounts: [
                    {
                        name: 'Foreign',
                        kind: AccountKind.CHECKING,
                        iban: 'NL00 0000 0000 00',
                        bankKey: 'no-such-bank',
                    },
                ],
            },
        ],
    ];

    it.each(ACCEPTED)('%s', async (_label, overrides) => {
        const payload = fullPayload(overrides);

        const dry = await restore(buildFakes().service, payload, true);
        const real = await restore(buildFakes().service, payload, false);

        const { dryRun: _dry, ...dryRest } = dry;
        const { dryRun: _real, ...realRest } = real;
        expect(dryRest).toEqual(realRest);
    });

    it('a card that settles from an account already in the household is linked', async () => {
        const { service, tables, settlementUpdates } = buildFakes();
        tables.accounts.push({ id: 'existing', name: 'Old checking', kind: AccountKind.CHECKING });

        const result = await restore(
            service,
            fullPayload({
                accounts: [
                    {
                        name: 'Card',
                        kind: AccountKind.CREDIT,
                        settlementAccountName: 'old CHECKING',
                    },
                ],
            }),
            false
        );

        expect(result.warnings).not.toContain('settlement_account_missing');
        expect(settlementUpdates).toHaveLength(1);
    });

    it('names an unknown bank in the warning and skips only that account', async () => {
        const result = await restore(
            buildFakes().service,
            fullPayload({
                accounts: [
                    { name: 'Joint', kind: AccountKind.CHECKING },
                    { name: 'Abroad', kind: AccountKind.CHECKING, bankKey: 'nowhere' },
                ],
            }),
            true
        );

        expect(result.accounts).toMatchObject({ willImport: 1, skipped: 1 });
        expect(result.warnings).toContain('bank_unknown_key:nowhere');
    });
});
