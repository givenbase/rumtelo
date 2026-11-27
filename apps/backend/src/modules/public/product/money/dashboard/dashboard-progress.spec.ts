import { describe, expect, it, vi } from 'vitest';

import { DashboardService } from './dashboard.service';

describe('DashboardService.progress', () => {
    it('is the board progress read: same object, as of the given moment', async () => {
        const progress = { stage: 'SPLIT' } as never;
        const get = vi.fn<(now: Date) => Promise<unknown>>(async () => progress);
        const service = new DashboardService(
            {} as never,
            {} as never,
            {} as never,
            {} as never,
            {} as never,
            {} as never,
            {} as never,
            {} as never,
            { get } as never
        );
        const now = new Date('2026-11-17T09:00:00Z');

        expect(await service.progress(now)).toBe(progress);
        expect(get).toHaveBeenCalledWith(now);
    });
});
