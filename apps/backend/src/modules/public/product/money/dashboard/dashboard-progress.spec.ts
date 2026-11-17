import { describe, expect, it, vi } from 'vitest';

import { DashboardService } from './dashboard.service';

type Facts = {
    hasTransactions: boolean;
    weekCheck: { hasCompleted: boolean; doneThisWeek: boolean };
    hasClosedMonth: boolean;
};

function setup(facts: Facts) {
    const completionFacts = vi.fn<(week: string) => Promise<Facts['weekCheck']>>(
        async () => facts.weekCheck
    );
    const service = new DashboardService(
        {} as never,
        { hasClosedMonth: async () => facts.hasClosedMonth } as never,
        {} as never,
        { hasAny: async () => facts.hasTransactions } as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        { completionFacts } as never
    );
    return { service, completionFacts };
}

const NOTHING_YET: Facts = {
    hasTransactions: false,
    weekCheck: { hasCompleted: false, doneThisWeek: false },
    hasClosedMonth: false,
};

describe('DashboardService.progress', () => {
    it('is all false for a brand-new household', async () => {
        const { service } = setup(NOTHING_YET);
        expect(await service.progress()).toEqual({
            hasTransactions: false,
            hasCompletedWeekCheck: false,
            weekCheckDoneThisWeek: false,
            hasClosedMonth: false,
        });
    });

    it('maps each owning service’s fact onto its own flag', async () => {
        const { service } = setup({
            hasTransactions: true,
            weekCheck: { hasCompleted: true, doneThisWeek: false },
            hasClosedMonth: true,
        });
        expect(await service.progress()).toEqual({
            hasTransactions: true,
            hasCompletedWeekCheck: true,
            weekCheckDoneThisWeek: false,
            hasClosedMonth: true,
        });
    });

    it('asks for the ISO week that contains "now", not a selected period', async () => {
        const { service, completionFacts } = setup(NOTHING_YET);
        await service.progress(new Date('2026-11-17T09:00:00Z'));
        expect(completionFacts).toHaveBeenCalledWith('2026-W47');
        // Sunday 22 Nov still belongs to W47; Monday 23 Nov starts W48.
        await service.progress(new Date('2026-11-22T23:30:00Z'));
        await service.progress(new Date('2026-11-23T00:30:00Z'));
        expect(completionFacts).toHaveBeenNthCalledWith(2, '2026-W47');
        expect(completionFacts).toHaveBeenNthCalledWith(3, '2026-W48');
    });
});
