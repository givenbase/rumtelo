import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    Cadence,
    CoachKind,
    FIXED_COSTS_COACH_KEY_PREFIX,
    JarKey,
    MONEY_COACH_KEY_PREFIX,
    PlanKey,
} from '@rumtelo/contracts';

// DI tokens only — keeps entity/ORM imports out of this unit test.
vi.mock('../../../../auth/user/account/account.service', () => ({
    AccountService: Symbol('AccountService'),
}));
vi.mock('../../../platform/coach/coach.service', () => ({ CoachService: Symbol('CoachService') }));
vi.mock('../ledger/transaction/transaction.service', () => ({
    TransactionService: Symbol('TransactionService'),
}));
vi.mock('../plan/fixed-cost/fixed-cost.service', () => ({
    FixedCostService: Symbol('FixedCostService'),
}));
vi.mock('../plan/jar/jar.service', () => ({ JarService: Symbol('JarService') }));
vi.mock('../../growth/asset/asset.service', () => ({ AssetService: Symbol('AssetService') }));
vi.mock('../../../../auth/household/household-settings/household-settings.service', () => ({
    HouseholdSettingsService: Symbol('HouseholdSettingsService'),
}));
vi.mock('../../../../../common/capability', () => ({
    PlanAccessService: Symbol('PlanAccessService'),
}));
vi.mock('../../../../../common/household/household.context', () => ({
    currentHouseholdId: () => 'household-1',
}));

import type { CoachDraft } from '../../../platform/coach/coach.service';
import { MoneyCoachService } from './money-coach.service';

type Bill = {
    id: string;
    isActive: boolean;
    dueDay: number;
    cadence: Cadence;
    name?: string;
    jarId?: string;
    amount?: number;
    direction?: string;
    presetKey?: string | null;
    merchantKey?: string | null;
    assetId?: string | null;
};

type SetupInput = {
    bills?: Bill[];
    inbox?: number;
    necessitiesPct?: number;
    netMonthlyCents?: number;
    planKey?: PlanKey;
    assets?: { id: string; kindKey: string; name: string }[];
};

function setup(input: SetupInput) {
    const sync = vi.fn<
        (accountId: string | null, prefix: string, drafts: CoachDraft[]) => Promise<void>
    >(async () => {});
    const necessitiesPct = input.necessitiesPct ?? 55;
    const service = new MoneyCoachService(
        { ensureCurrentAccount: async () => ({ account: { id: 'account-1' } }) } as never,
        { sync, registerRefresher: vi.fn<() => void>() } as never,
        {
            list: async () =>
                (input.bills ?? []).map(entry => ({
                    name: entry.id,
                    jarId: 'jar-nec',
                    amount: 10_00,
                    direction: 'OUT',
                    startedOn: null,
                    endsOn: null,
                    counterparty: null,
                    presetKey: null,
                    merchantKey: null,
                    assetId: null,
                    ...entry,
                })),
            listSettlements: async () => [],
        } as never,
        { countInbox: async () => input.inbox ?? 0 } as never,
        {
            list: async () => [
                {
                    id: 'jar-nec',
                    key: JarKey.NECESSITIES,
                    name: 'Necessities',
                    percentage: necessitiesPct,
                },
                {
                    id: 'jar-play',
                    key: JarKey.PLAY,
                    name: 'Play',
                    percentage: 100 - necessitiesPct,
                },
            ],
            monthlyNetIncome: async () => input.netMonthlyCents ?? 0,
        } as never,
        { list: async () => input.assets ?? [] } as never,
        { planKeyForCurrentHousehold: async () => input.planKey ?? PlanKey.MAX } as never,
        { get: async () => ({ currency: 'EUR' }) } as never
    );
    return { service, sync };
}

/** The household-wide drafts (second sync call). */
function householdDrafts(sync: ReturnType<typeof setup>['sync']): CoachDraft[] {
    const call = sync.mock.calls[1]!;
    expect(call[0]).toBeNull();
    expect(call[1]).toBe(FIXED_COSTS_COACH_KEY_PREFIX);
    return call[2];
}

function bill(id: string, dueDay: number): Bill {
    return { id, isActive: true, dueDay, cadence: Cadence.MONTHLY };
}

describe('MoneyCoachService', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-10-20T12:00:00Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('nudges due bills and a full inbox under the money prefix', async () => {
        const { service, sync } = setup({
            bills: [bill('rent', 1), bill('gym', 5), bill('later', 28)],
            inbox: 4,
        });

        await service.refresh();

        expect(sync).toHaveBeenCalledTimes(2);
        const [accountId, prefix, drafts] = sync.mock.calls[0]!;
        expect(accountId).toBe('account-1');
        expect(prefix).toBe(MONEY_COACH_KEY_PREFIX);
        expect(drafts.map(draft => draft.key)).toEqual([
            'money.due_bills:2026-10:2',
            'money.inbox_unsorted:2026-10:4',
        ]);
        expect(drafts.every(draft => draft.kind === CoachKind.NUDGE && draft.ctaHref)).toBe(true);
    });

    it('stays quiet while Necessities bridges between the 55% goal and the soft ceiling', async () => {
        const { service, sync } = setup({ inbox: 2, necessitiesPct: 58 });

        await service.refresh();

        expect(sync.mock.calls[0]![2]).toEqual([]);
    });

    it('flags Necessities above the soft ceiling as an insight', async () => {
        const { service, sync } = setup({ necessitiesPct: 64 });

        await service.refresh();

        const [draft] = sync.mock.calls[0]![2];
        expect(draft?.key).toBe('money.necessities_share:2026-10:64');
        expect(draft?.kind).toBe(CoachKind.INSIGHT);
        expect(draft?.text).toContain('the goal is 55%');
    });

    describe('household-wide fixed-cost tips', () => {
        it('syncs with no account so one dismissal hides a tip for the household', async () => {
            const { service, sync } = setup({});

            await service.refresh();

            expect(sync).toHaveBeenCalledTimes(2);
            expect(householdDrafts(sync)).toEqual([]);
        });

        it('offers both moves when Necessities bills exceed the split envelope', async () => {
            // Income 1000.00 → envelope 550.00; bills 150.00 + 500.00 → 100.00 over.
            const { service, sync } = setup({
                netMonthlyCents: 1000_00,
                bills: [
                    { ...bill('gas', 5), amount: 150_00 },
                    { ...bill('rent', 1), amount: 500_00 },
                ],
            });

            await service.refresh();

            const [draft] = householdDrafts(sync);
            expect(draft?.key).toBe('money.fixed_costs.over_necessities:2026-10:10000');
            expect(draft?.identity).toBe('money.fixed_costs.over_necessities:2026-10');
            expect(draft?.text).toBe(
                'Necessities bills come to €100 a month more than the jar gets.'
            );
            expect(draft?.ctaLabel).toBe('Add income');
            expect(draft?.ctaHref).toBe('/product/money/income/create');
            expect(draft?.ctaSecondaryLabel).toBe('Open the biggest fixed cost');
            expect(draft?.ctaSecondaryHref).toBe('/product/money/fixed-costs/rent');
        });

        it('does not fire while the bills fit the envelope', async () => {
            const { service, sync } = setup({
                netMonthlyCents: 1000_00,
                bills: [{ ...bill('rent', 1), amount: 550_00 }],
            });

            await service.refresh();

            expect(householdDrafts(sync)).toEqual([]);
        });

        it('flags business costs paid from the household and links to that holding', async () => {
            const { service, sync } = setup({
                assets: [{ id: 'asset-1', kindKey: 'BUSINESS', name: 'Studio' }],
                bills: [{ ...bill('hosting', 3), amount: 40_00, assetId: 'asset-1' }],
            });

            await service.refresh();

            const [draft] = householdDrafts(sync);
            expect(draft?.key).toBe('money.fixed_costs.business_leak:2026-10:4000:1');
            expect(draft?.text).toBe('€40 a month for Studio is paid from your household.');
            expect(draft?.ctaHref).toBe('/product/money/fixed-costs?assetId=asset-1');
            expect(draft?.ctaSecondaryLabel).toBeUndefined();
        });

        it('opens the whole list when several businesses leak', async () => {
            const { service, sync } = setup({
                assets: [
                    { id: 'asset-1', kindKey: 'BUSINESS', name: 'Studio' },
                    { id: 'asset-2', kindKey: 'BUSINESS', name: 'Shop' },
                ],
                bills: [
                    { ...bill('hosting', 3), amount: 40_00, assetId: 'asset-1' },
                    { ...bill('rent-shop', 1), amount: 300_00, assetId: 'asset-2' },
                ],
            });

            await service.refresh();

            const [draft] = householdDrafts(sync);
            expect(draft?.text).toBe('€340 a month in business costs is paid from your household.');
            expect(draft?.ctaHref).toBe('/product/money/fixed-costs');
        });

        it('stays quiet about business costs on a plan without net worth', async () => {
            const { service, sync } = setup({
                planKey: PlanKey.BASIC,
                assets: [{ id: 'asset-1', kindKey: 'BUSINESS', name: 'Studio' }],
                bills: [{ ...bill('hosting', 3), amount: 40_00, assetId: 'asset-1' }],
            });

            await service.refresh();

            expect(householdDrafts(sync)).toEqual([]);
        });

        it('adds one quarterly subscription review, keyed by quarter, only with subscriptions', async () => {
            const { service, sync } = setup({
                bills: [
                    { ...bill('netflix', 5), amount: 13_00, presetKey: 'STREAMING_VIDEO' },
                    { ...bill('news', 5), amount: 12_00, presetKey: 'NEWS_SUBSCRIPTION' },
                    { ...bill('rent', 1), amount: 10_00, presetKey: 'RENT' },
                ],
            });

            await service.refresh();

            const [draft] = householdDrafts(sync);
            // Quarter (not month) in the identity: a hidden review stays hidden until Q1.
            expect(draft?.identity).toBe('money.fixed_costs.subscription_review:2026-Q4');
            expect(draft?.key).toBe('money.fixed_costs.subscription_review:2026-Q4:2:2500');
            expect(draft?.kind).toBe(CoachKind.INSIGHT);
            expect(draft?.text).toBe('2 subscriptions cost €25 a month. Still using all of them?');
            expect(draft?.ctaHref).toBe('/product/money/fixed-costs');
        });

        it('moves the subscription review to a new identity in the next quarter', async () => {
            vi.setSystemTime(new Date('2027-01-05T12:00:00Z'));
            const { service, sync } = setup({
                bills: [{ ...bill('netflix', 5), amount: 13_00, presetKey: 'STREAMING_VIDEO' }],
            });

            await service.refresh();

            const [draft] = householdDrafts(sync);
            expect(draft?.identity).toBe('money.fixed_costs.subscription_review:2027-Q1');
            expect(draft?.text).toBe('1 subscription costs €13 a month. Still using it?');
        });
    });
});
