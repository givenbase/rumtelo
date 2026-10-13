import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Cadence, CoachKind, JarKey, MONEY_COACH_KEY_PREFIX } from '@rumtelo/contracts';

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

import type { CoachDraft } from '../../../platform/coach/coach.service';
import { MoneyCoachService } from './money-coach.service';

type Bill = { id: string; isActive: boolean; dueDay: number; cadence: Cadence };

function setup(input: { bills?: Bill[]; inbox?: number; necessitiesPct?: number }) {
    const sync = vi.fn<(accountId: string, prefix: string, drafts: CoachDraft[]) => Promise<void>>(
        async () => {}
    );
    const service = new MoneyCoachService(
        { ensureCurrentAccount: async () => ({ account: { id: 'account-1' } }) } as never,
        { sync, registerRefresher: vi.fn<() => void>() } as never,
        {
            list: async () => input.bills ?? [],
            listSettlements: async () => [],
        } as never,
        { countInbox: async () => input.inbox ?? 0 } as never,
        {
            list: async () => [{ key: JarKey.NECESSITIES, percentage: input.necessitiesPct ?? 55 }],
        } as never
    );
    return { service, sync };
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

        expect(sync).toHaveBeenCalledOnce();
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
});
