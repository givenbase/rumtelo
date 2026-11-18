import { describe, expect, it, vi } from 'vitest';

import {
    Currency,
    HouseholdAccessSource,
    JarKey,
    Locale,
    PlanKey,
    type OnboardingInput,
} from '@rumtelo/contracts';

import { householdStorage } from '../../../common/household/household.context';
import { BankAccount } from '../../public/product/money/ledger/bank-account/bank-account.entity';
import { Jar } from '../../public/product/money/plan/jar/jar.entity';
import { IncomeSource } from '../../public/product/money/plan/income/income-source.entity';
import { HouseholdSettings } from './household-settings/household-settings.entity';
import { AuthHousehold } from './managed/household/auth-household.entity';
import { HouseholdService } from './household.service';

type Row = Record<string, unknown>;

const TEMPLATES = [
    [JarKey.NECESSITIES, 55],
    [JarKey.FINANCIAL_FREEDOM, 10],
    [JarKey.EDUCATION, 10],
    [JarKey.LONG_TERM_SAVINGS, 10],
    [JarKey.PLAY, 10],
    [JarKey.GIVE, 5],
].map(([key, percentage], sortOrder) => ({
    key,
    name: String(key),
    subtitle: null,
    icon: null,
    percentage: String(percentage),
    sortOrder,
    capabilities: {},
}));

function input(overrides: Partial<OnboardingInput> = {}): OnboardingInput {
    return {
        currency: Currency.EUR,
        locale: Locale.NL,
        spendingStyle: 'UNKNOWN',
        incomeStability: 'STABLE',
        payoffStrategy: 'AVALANCHE',
        monthlyNetIncome: 250_000,
        why: null,
        ...overrides,
    } as OnboardingInput;
}

function setup(
    options: {
        seats?: { role: string; household: { id: string } }[];
        templates?: unknown[];
        settingsFor?: string[];
    } = {}
) {
    const created: { entity: unknown; data: Row }[] = [];
    const settingsRow: Row = { answers: {} };
    const em = {
        find: vi.fn<(entity: unknown) => Promise<unknown[]>>(async entity =>
            entity === HouseholdSettings
                ? (options.settingsFor ?? []).map(household => ({ household }))
                : (options.seats ?? [])
        ),
        findOne: vi.fn<(entity: unknown, where: Row) => Promise<unknown>>(async (entity, where) => {
            if (entity === AuthHousehold) {
                return { id: where.id, name: 'Left over', slug: 'left-over' };
            }
            return null;
        }),
        create: vi.fn<(entity: unknown, data: Row) => Row>((entity, data) => {
            const row = { id: `${(entity as { name: string }).name}-${created.length}`, ...data };
            created.push({ entity, data: row });
            return row;
        }),
        flush: vi.fn<() => Promise<void>>(async () => {}),
        clear: vi.fn<() => void>(),
    };
    const authApi = {
        createOrganization: vi.fn<
            (args: {
                body: { name: string; slug: string };
            }) => Promise<{ id: string; name: string; slug: string }>
        >(async ({ body }) => ({
            id: 'household-new',
            name: body.name,
            slug: body.slug,
        })),
        setActiveOrganization: vi.fn<() => Promise<object>>(async () => ({})),
    };
    const householdSettings = {
        create: vi.fn<(args: Row) => Row>(() => settingsRow),
    };
    const accountSettings = {
        upsertForUser: vi.fn<() => Promise<object>>(async () => ({})),
        markOnboarded: vi.fn<() => Promise<object>>(async () => ({})),
    };
    const service = new HouseholdService(
        em as never,
        { api: authApi } as never,
        { ensureAccountForUser: async () => ({}) } as never,
        accountSettings as never,
        householdSettings as never,
        {} as never,
        { listActive: async () => options.templates ?? TEMPLATES } as never,
        {} as never
    );
    const onboard = (body: OnboardingInput) =>
        householdStorage.run(
            {
                userId: 'user-1',
                householdId: null,
                role: 'OWNER',
                source: HouseholdAccessSource.SEAT,
                relation: null,
            },
            () => service.onboard(body)
        );
    const preview = (body: Parameters<HouseholdService['previewSplit']>[0]) =>
        householdStorage.run(
            {
                userId: 'user-1',
                householdId: null,
                role: 'OWNER',
                source: HouseholdAccessSource.SEAT,
                relation: null,
            },
            () => service.previewSplit(body)
        );
    const rowsOf = (entity: unknown) =>
        created.filter(row => row.entity === entity).map(row => row.data);
    return {
        onboard,
        preview,
        rowsOf,
        authApi,
        em,
        settingsRow,
        accountSettings,
        householdSettings,
    };
}

describe('HouseholdService.previewSplit', () => {
    it('splits 2,500.00 EUR into the six jars and sums to the income', async () => {
        const { preview } = setup();
        const result = await preview({ currency: Currency.EUR, monthlyNetIncome: 250_000 });
        expect(result.jars.map(jar => jar.amount)).toEqual([
            137_500, 25_000, 25_000, 25_000, 25_000, 12_500,
        ]);
        expect(result.jars.map(jar => jar.key)).toEqual(TEMPLATES.map(template => template.key));
        expect(result.currency).toBe(Currency.EUR);
    });

    it('answers the same without a household and writes nothing', async () => {
        const { preview, em, authApi } = setup();
        await preview({ currency: Currency.USD, monthlyNetIncome: 1 });
        expect(em.create).not.toHaveBeenCalled();
        expect(em.flush).not.toHaveBeenCalled();
        expect(authApi.createOrganization).not.toHaveBeenCalled();
    });

    it('fails like onboard when the jar catalog is empty', async () => {
        const { preview } = setup({ templates: [] });
        await expect(preview({ currency: Currency.EUR, monthlyNetIncome: 100 })).rejects.toThrow(
            'Jar catalog is empty'
        );
    });
});

describe('HouseholdService.onboard', () => {
    it('creates six jars, one Main account without bank or IBAN, and puts every jar on it', async () => {
        const { onboard, rowsOf } = setup();
        await onboard(input());
        const accounts = rowsOf(BankAccount);
        expect(accounts).toHaveLength(1);
        expect(accounts[0]).toMatchObject({
            household: 'household-new',
            name: 'Hoofdrekening',
            iban: null,
            bank: null,
            isPrimary: true,
        });
        const jars = rowsOf(Jar);
        expect(jars).toHaveLength(6);
        expect(new Set(jars.map(jar => jar.defaultAccount))).toEqual(new Set([accounts[0]!.id]));
    });

    it('names the account in the creator’s locale (EN fallback names included)', async () => {
        const { onboard, rowsOf } = setup();
        await onboard(input({ locale: Locale.EN }));
        expect(rowsOf(BankAccount)[0]!.name).toBe('Main account');
    });

    it('lands the income on the Main account and stores the percentages', async () => {
        const { onboard, rowsOf } = setup();
        await onboard(input());
        expect(rowsOf(IncomeSource)[0]).toMatchObject({
            amount: 250_000,
            account: rowsOf(BankAccount)[0]!.id,
        });
        expect(rowsOf(Jar).map(jar => jar.percentage)).toEqual([
            '55.00',
            '10.00',
            '10.00',
            '10.00',
            '10.00',
            '5.00',
        ]);
    });

    it('makes no income source for zero income', async () => {
        const { onboard, rowsOf } = setup();
        await onboard(input({ monthlyNetIncome: 0 }));
        expect(rowsOf(IncomeSource)).toHaveLength(0);
        expect(rowsOf(Jar)).toHaveLength(6);
    });

    it('writes jar_experience NEW and jar_bank_setup_done true in the same call', async () => {
        const { onboard, settingsRow } = setup();
        await onboard(input());
        expect(settingsRow.answers).toEqual({ jar_experience: 'NEW', jar_bank_setup_done: true });
    });

    it('falls back to a localized household name when none or a blank one is sent', async () => {
        const { onboard, authApi } = setup();
        await onboard(input({ householdName: '   ' }));
        expect(authApi.createOrganization).toHaveBeenLastCalledWith(
            expect.objectContaining({ body: expect.objectContaining({ name: 'Mijn huishouden' }) })
        );
        await onboard(input({ locale: Locale.EN }));
        expect(authApi.createOrganization).toHaveBeenLastCalledWith(
            expect.objectContaining({ body: expect.objectContaining({ name: 'My household' }) })
        );
    });

    it('uses a given name as is', async () => {
        const { onboard, authApi } = setup();
        await onboard(input({ householdName: 'Casa Loyiso' }));
        expect(authApi.createOrganization).toHaveBeenCalledWith(
            expect.objectContaining({ body: expect.objectContaining({ name: 'Casa Loyiso' }) })
        );
    });

    it('applies a valid custom split to the jars', async () => {
        const { onboard, rowsOf } = setup();
        await onboard(
            input({
                split: [
                    { key: JarKey.NECESSITIES, percentage: 50 },
                    { key: JarKey.FINANCIAL_FREEDOM, percentage: 15 },
                    { key: JarKey.EDUCATION, percentage: 10 },
                    { key: JarKey.LONG_TERM_SAVINGS, percentage: 10 },
                    { key: JarKey.PLAY, percentage: 10 },
                    { key: JarKey.GIVE, percentage: 5 },
                ],
            })
        );
        expect(rowsOf(Jar).map(jar => jar.percentage)).toEqual([
            '50.00',
            '15.00',
            '10.00',
            '10.00',
            '10.00',
            '5.00',
        ]);
    });

    it('rejects a bad split before any organization is created', async () => {
        const { onboard, authApi } = setup();
        await expect(
            onboard(
                input({
                    split: [
                        { key: JarKey.NECESSITIES, percentage: 60 },
                        { key: JarKey.FINANCIAL_FREEDOM, percentage: 15 },
                        { key: JarKey.EDUCATION, percentage: 10 },
                        { key: JarKey.LONG_TERM_SAVINGS, percentage: 10 },
                        { key: JarKey.PLAY, percentage: 10 },
                        { key: JarKey.GIVE, percentage: 5 },
                    ],
                })
            )
        ).rejects.toThrow('jar_split_total');
        expect(authApi.createOrganization).not.toHaveBeenCalled();
    });

    it('still answers already_household_member for an owner of a finished household', async () => {
        const { onboard } = setup({
            seats: [{ role: 'owner', household: { id: 'household-old' } }],
            settingsFor: ['household-old'],
        });
        await expect(onboard(input())).rejects.toThrow('already_household_member');
    });

    it('allows a VIEWER-only person to onboard their own household', async () => {
        const { onboard, authApi } = setup({
            seats: [{ role: 'viewer', household: { id: 'household-friend' } }],
            settingsFor: ['household-friend'],
        });
        await onboard(input());
        expect(authApi.createOrganization).toHaveBeenCalledTimes(1);
    });

    it('reuses an unfinished organization on retry instead of creating a second one', async () => {
        const { onboard, authApi, rowsOf } = setup({
            seats: [{ role: 'owner', household: { id: 'household-half' } }],
            settingsFor: [],
        });
        const household = await onboard(input());
        expect(authApi.createOrganization).not.toHaveBeenCalled();
        expect(household.id).toBe('household-half');
        expect(rowsOf(Jar)[0]).toMatchObject({ household: 'household-half' });
    });

    it('starts on Basic with the chosen currency', async () => {
        const { onboard, householdSettings } = setup();
        await onboard(input({ currency: Currency.GBP }));
        expect(householdSettings.create).toHaveBeenCalledWith(
            expect.objectContaining({ planKey: PlanKey.BASIC, currency: Currency.GBP })
        );
    });

    it('answers a racing retry with the household that is already there (unique jar key)', async () => {
        const { onboard, em } = setup({
            seats: [{ role: 'owner', household: { id: 'household-half' } }],
            settingsFor: [],
        });
        em.flush.mockRejectedValueOnce(
            Object.assign(
                new Error(
                    'duplicate key value violates unique constraint "money_jar_household_id_key_unique"'
                ),
                { code: '23505' }
            )
        );
        const household = await onboard(input());
        expect(household).toMatchObject({ id: 'household-half', name: 'Left over' });
        expect(em.clear).toHaveBeenCalled();
    });

    it('still surfaces any other flush failure', async () => {
        const { onboard, em } = setup();
        em.flush.mockRejectedValueOnce(new Error('connection reset'));
        await expect(onboard(input())).rejects.toThrow('connection reset');
    });
});
