import { describe, expect, it, vi } from 'vitest';

import { FixedCostSettlementSource, FlowDirection } from '@rumtelo/contracts';

vi.mock('../../../../../../common/household/household.context', () => ({
    currentHouseholdId: () => 'household-1',
}));

import { syncLinkedFixedCostLifecycle } from '../../targets/debt/debt-link.util';
import { applyFixedCostLinkChange } from './fixed-cost-link.util';

type Row = Record<string, unknown>;
type FindOne = () => Promise<Row | null>;
type FindOneOrFail = () => Promise<Row>;

type FakeEm = {
    findOne: ReturnType<typeof vi.fn<FindOne>>;
    findOneOrFail: ReturnType<typeof vi.fn<FindOneOrFail>>;
    create: ReturnType<typeof vi.fn<(entity: unknown, data: Row) => Row>>;
    persist: ReturnType<typeof vi.fn<(entity: unknown) => void>>;
    getReference: ReturnType<typeof vi.fn<(entity: unknown, id: string) => { id: string }>>;
    remove: ReturnType<typeof vi.fn<(entity: unknown) => void>>;
};

function fakeEm(overrides: Partial<FakeEm> = {}): FakeEm {
    return {
        findOne: vi.fn<FindOne>(async () => null),
        findOneOrFail: vi.fn<FindOneOrFail>(),
        create: vi.fn<(entity: unknown, data: Row) => Row>((_entity, data) => data),
        persist: vi.fn<(entity: unknown) => void>(),
        getReference: vi.fn<(entity: unknown, id: string) => { id: string }>((_entity, id) => ({
            id,
        })),
        remove: vi.fn<(entity: unknown) => void>(),
        ...overrides,
    };
}

describe('asset link guards', () => {
    it('debt lifecycle sync never touches the bill holding', async () => {
        const fixed = { isActive: true, endsOn: null, asset: 'asset-company' };
        const em = fakeEm({ findOne: vi.fn<FindOne>(async () => fixed) });
        await syncLinkedFixedCostLifecycle(
            em as never,
            {
                id: 'debt-1',
                closedOn: '2026-09-01',
                maturityOn: null,
            } as never
        );
        expect(fixed.isActive).toBe(false);
        expect(fixed.endsOn).toBe('2026-09-01');
        expect(fixed.asset).toBe('asset-company');
    });

    it('settling a linked bill attributes the transaction to the bill holding', async () => {
        const fixedCost = {
            id: 'bill-1',
            direction: FlowDirection.OUT,
            isActive: true,
            asset: 'asset-company',
        };
        const em = fakeEm({ findOneOrFail: vi.fn<FindOneOrFail>(async () => fixedCost) });
        const transaction = {
            id: 'tx-1',
            amount: -4500,
            bookedOn: '2026-09-10',
            fixedCost: null,
            asset: null as string | null,
        };
        await applyFixedCostLinkChange(em as never, transaction as never, 'bill-1', {
            source: FixedCostSettlementSource.MATCHED,
        });
        expect(transaction.asset).toBe('asset-company');
    });

    it('keeps an explicit holding on the transaction over the bill holding', async () => {
        const fixedCost = {
            id: 'bill-1',
            direction: FlowDirection.OUT,
            isActive: true,
            asset: 'asset-company',
        };
        const em = fakeEm({ findOneOrFail: vi.fn<FindOneOrFail>(async () => fixedCost) });
        const transaction = {
            id: 'tx-1',
            amount: -4500,
            bookedOn: '2026-09-10',
            fixedCost: null,
            asset: 'asset-car',
        };
        await applyFixedCostLinkChange(em as never, transaction as never, 'bill-1');
        expect(transaction.asset).toBe('asset-car');
    });
});
