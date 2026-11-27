import { describe, expect, it, vi } from 'vitest';

import { CoachKind } from '@rumtelo/contracts';

// DI token + entity class only — keeps ORM metadata out of this unit test.
vi.mock('../../../auth/user/account/account.service', () => ({
    AccountService: Symbol('AccountService'),
}));
vi.mock('./coach-message.entity', () => ({ CoachMessage: Symbol('CoachMessage') }));
vi.mock('../../../../common/household/household.context', () => ({
    currentHouseholdId: () => 'household-1',
}));

import { CoachService } from './coach.service';
import type { CoachDraft } from './coach.service';

type Row = {
    key: string | null;
    kind: CoachKind;
    text: string;
    ctaLabel: string | null;
    ctaHref: string | null;
    ctaSecondaryLabel: string | null;
    ctaSecondaryHref: string | null;
    period: string;
    dismissedAt: Date | null;
};

function row(overrides: Partial<Row>): Row {
    return {
        key: null,
        kind: CoachKind.NUDGE,
        text: 'old',
        ctaLabel: null,
        ctaHref: null,
        ctaSecondaryLabel: null,
        ctaSecondaryHref: null,
        period: '2026-10',
        dismissedAt: null,
        ...overrides,
    };
}

function setup(existing: Row[]) {
    const find = vi.fn<(...args: unknown[]) => Promise<Row[]>>(async () => existing);
    const create = vi.fn<(data: Row & { account: string | null }) => Row>(data => data);
    const em = {
        find,
        create,
        persist: vi.fn<(entity: unknown) => void>(),
        remove: vi.fn<(entity: unknown) => void>(),
        flush: vi.fn<() => Promise<void>>(async () => {}),
    };
    const service = new CoachService(em as never, {} as never);
    return { service, em };
}

const baseDraft: CoachDraft = {
    key: 'money.fixed_costs.over_necessities:2026-11:12500',
    identity: 'money.fixed_costs.over_necessities:2026-11',
    kind: CoachKind.NUDGE,
    text: 'text',
    ctaLabel: 'Add income',
    ctaHref: '/product/money/income/create',
    ctaSecondaryLabel: 'Open the biggest fixed cost',
    ctaSecondaryHref: '/product/money/fixed-costs/abc',
};

describe('CoachService.sync', () => {
    it('writes household-wide rows with both calls to action when accountId is null', async () => {
        const { service, em } = setup([]);

        await service.sync(null, 'money.fixed_costs.', [baseDraft]);

        expect(em.find.mock.calls[0]![1]).toMatchObject({
            account: null,
            household: 'household-1',
        });
        const [created] = em.create.mock.calls[0]!.slice(1) as [Row & { account: string | null }];
        expect(created.account).toBeNull();
        expect(created.ctaSecondaryLabel).toBe('Open the biggest fixed cost');
        expect(created.ctaSecondaryHref).toBe('/product/money/fixed-costs/abc');
    });

    it('updates a tip in place when only the numbers in its key changed', async () => {
        const stored = row({ key: 'money.fixed_costs.over_necessities:2026-11:9000' });
        const { service, em } = setup([stored]);

        await service.sync(null, 'money.fixed_costs.', [baseDraft]);

        expect(stored.key).toBe(baseDraft.key);
        expect(stored.ctaSecondaryHref).toBe('/product/money/fixed-costs/abc');
        expect(em.create).not.toHaveBeenCalled();
        expect(em.remove).not.toHaveBeenCalled();
    });

    it('keeps a dismissed tip hidden while the amounts move', async () => {
        const stored = row({
            key: 'money.fixed_costs.over_necessities:2026-11:9000',
            dismissedAt: new Date('2026-11-02T10:00:00Z'),
        });
        const { service, em } = setup([stored]);

        await service.sync(null, 'money.fixed_costs.', [baseDraft]);

        expect(em.create).not.toHaveBeenCalled();
        expect(stored.key).toBe('money.fixed_costs.over_necessities:2026-11:9000');
        expect(stored.text).toBe('old');
    });

    it('retracts an undismissed tip whose rule no longer applies', async () => {
        const stored = row({ key: 'money.fixed_costs.over_necessities:2026-11:9000' });
        const { service, em } = setup([stored]);

        await service.sync(null, 'money.fixed_costs.', []);

        expect(em.remove).toHaveBeenCalledWith(stored);
    });

    it('treats a different identity as a different tip (new month, new tip)', async () => {
        const stored = row({
            key: 'money.fixed_costs.over_necessities:2026-10:9000',
            dismissedAt: new Date('2026-10-20T10:00:00Z'),
        });
        const { service, em } = setup([stored]);

        await service.sync(null, 'money.fixed_costs.', [baseDraft]);

        expect(em.create).toHaveBeenCalledOnce();
    });
});
