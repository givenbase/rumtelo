import { describe, expect, it, vi } from 'vitest';

import { BoardStage, HouseholdAccessSource, PlanKey } from '@rumtelo/contracts';

import { householdStorage } from '../../../../../common/household/household.context';
import { ProgressService } from './progress.service';

interface BoardFixture {
    hasTransactions?: boolean;
    sortedCount?: number;
    weekCheck?: { hasCompleted: boolean; doneThisWeek: boolean };
    hasClosedMonth?: boolean;
    planKey?: PlanKey;
    boardStageFloor?: BoardStage | null;
    createdAt?: string;
}

const NOW = new Date('2026-11-17T09:00:00Z');

/** One fixture per household id, so a read for B can be checked against A's data. */
function setup(boards: Record<string, BoardFixture>) {
    const completionFacts = vi.fn<
        (week: string) => Promise<{ hasCompleted: boolean; doneThisWeek: boolean }>
    >(async () => boardOf().weekCheck ?? { hasCompleted: false, doneThisWeek: false });
    const settingsGet = vi.fn<(householdId: string) => Promise<unknown>>();
    const raiseBoardStageFloor = vi.fn<(householdId: string, stage: BoardStage) => Promise<void>>(
        async () => {}
    );
    const sortedCount = vi.fn<(limit: number) => Promise<number>>();
    let current = '';
    const boardOf = (): BoardFixture => boards[current] ?? {};

    const service = new ProgressService(
        {
            hasAny: async () => boardOf().hasTransactions ?? false,
            sortedCount,
        } as never,
        { completionFacts } as never,
        { hasClosedMonth: async () => boardOf().hasClosedMonth ?? false } as never,
        { get: settingsGet, raiseBoardStageFloor } as never
    );

    sortedCount.mockImplementation(async limit => Math.min(limit, boardOf().sortedCount ?? 0));
    settingsGet.mockImplementation(async householdId => {
        const board = boards[householdId] ?? {};
        return {
            planKey: board.planKey ?? PlanKey.BASIC,
            boardStageFloor: board.boardStageFloor ?? null,
            createdAt: board.createdAt ?? NOW.toISOString(),
        };
    });

    const as = <T>(
        householdId: string,
        run: () => Promise<T>,
        source = HouseholdAccessSource.SEAT,
        role: 'OWNER' | 'MEMBER' | 'VIEWER' = 'MEMBER'
    ): Promise<T> => {
        current = householdId;
        return householdStorage.run(
            { userId: 'user-1', householdId, role, source, relation: null },
            run
        );
    };
    return { service, as, completionFacts, settingsGet, sortedCount, raiseBoardStageFloor };
}

describe('ProgressService.get', () => {
    it('a new household: SPLIT with the first step and zero facts', async () => {
        const { service, as } = setup({ 'household-a': {} });
        expect(await as('household-a', () => service.get(NOW))).toEqual({
            hasTransactions: false,
            hasCompletedWeekCheck: false,
            weekCheckDoneThisWeek: false,
            hasClosedMonth: false,
            sortedCount: 0,
            householdAgeDays: 0,
            stage: BoardStage.SPLIT,
            next: {
                stage: BoardStage.SORTING,
                trigger: 'SORT_FIVE_OR_DAY_FIVE',
                sortedRemaining: 5,
                daysRemaining: 5,
            },
        });
    });

    it('five sorted lines on day one reach SORTING; the count is capped at five', async () => {
        const { service, as, sortedCount } = setup({
            'household-a': { hasTransactions: true, sortedCount: 40 },
        });
        const progress = await as('household-a', () => service.get(NOW));
        expect(progress.stage).toBe(BoardStage.SORTING);
        expect(progress.sortedCount).toBe(5);
        expect(sortedCount).toHaveBeenCalledWith(5);
    });

    it('five days of age reach SORTING without any transaction', async () => {
        const { service, as } = setup({
            'household-a': { createdAt: '2026-11-12T08:00:00Z' },
        });
        const progress = await as('household-a', () => service.get(NOW));
        expect(progress.householdAgeDays).toBe(5);
        expect(progress.stage).toBe(BoardStage.SORTING);
    });

    it('a completed week check reaches ROUTINE', async () => {
        const { service, as } = setup({
            'household-a': { weekCheck: { hasCompleted: true, doneThisWeek: true } },
        });
        const progress = await as('household-a', () => service.get(NOW));
        expect(progress.stage).toBe(BoardStage.ROUTINE);
        expect(progress.weekCheckDoneThisWeek).toBe(true);
        expect(progress.next?.trigger).toBe('FIRST_MONTH_CLOSE');
    });

    it('a closed month reaches MONTH with nothing next', async () => {
        const { service, as } = setup({ 'household-a': { hasClosedMonth: true } });
        const progress = await as('household-a', () => service.get(NOW));
        expect(progress.stage).toBe(BoardStage.MONTH);
        expect(progress.next).toBeNull();
    });

    it('the stored MONTH floor (backfill) shows MONTH with no data', async () => {
        const { service, as } = setup({ 'household-a': { boardStageFloor: BoardStage.MONTH } });
        const progress = await as('household-a', () => service.get(NOW));
        expect(progress.stage).toBe(BoardStage.MONTH);
        expect(progress.next).toBeNull();
    });

    it.each([PlanKey.PLUS, PlanKey.MAX])(
        'a household on %s is at MONTH with nothing next',
        async plan => {
            const { service, as } = setup({ 'household-a': { planKey: plan } });
            const progress = await as('household-a', () => service.get(NOW));
            expect(progress.stage).toBe(BoardStage.MONTH);
            expect(progress.next).toBeNull();
        }
    );

    it('writes the MONTH floor once for a paid household that lacks it (survives a downgrade)', async () => {
        const { service, as, raiseBoardStageFloor } = setup({
            'household-a': { planKey: PlanKey.PLUS },
        });
        await as('household-a', () => service.get(NOW));
        expect(raiseBoardStageFloor).toHaveBeenCalledWith('household-a', BoardStage.MONTH);
    });

    it('does not write when the floor is already MONTH, or on Basic', async () => {
        const { service, as, raiseBoardStageFloor } = setup({
            'household-a': { planKey: PlanKey.MAX, boardStageFloor: BoardStage.MONTH },
            'household-b': { planKey: PlanKey.BASIC },
        });
        await as('household-a', () => service.get(NOW));
        await as('household-b', () => service.get(NOW));
        expect(raiseBoardStageFloor).not.toHaveBeenCalled();
    });

    it('a downgraded household with the written floor stays at MONTH', async () => {
        const { service, as } = setup({
            'household-a': { planKey: PlanKey.BASIC, boardStageFloor: BoardStage.MONTH },
        });
        expect((await as('household-a', () => service.get(NOW))).stage).toBe(BoardStage.MONTH);
    });

    it('asks for the ISO week that contains "now", not a selected period', async () => {
        const { service, as, completionFacts } = setup({ 'household-a': {} });
        await as('household-a', () => service.get(new Date('2026-11-17T09:00:00Z')));
        expect(completionFacts).toHaveBeenLastCalledWith('2026-W47');
        await as('household-a', () => service.get(new Date('2026-11-22T23:30:00Z')));
        expect(completionFacts).toHaveBeenLastCalledWith('2026-W47');
        await as('household-a', () => service.get(new Date('2026-11-23T00:30:00Z')));
        expect(completionFacts).toHaveBeenLastCalledWith('2026-W48');
    });

    it('reads the settings of the request household only (A at MONTH never leaks into B)', async () => {
        const { service, as, settingsGet } = setup({
            'household-a': {
                boardStageFloor: BoardStage.MONTH,
                hasClosedMonth: true,
                sortedCount: 9,
            },
            'household-b': {},
        });
        const forA = await as('household-a', () => service.get(NOW));
        const forB = await as('household-b', () => service.get(NOW));

        expect(forA.stage).toBe(BoardStage.MONTH);
        expect(forB.stage).toBe(BoardStage.SPLIT);
        expect(forB.sortedCount).toBe(0);
        expect(settingsGet).toHaveBeenNthCalledWith(1, 'household-a');
        expect(settingsGet).toHaveBeenNthCalledWith(2, 'household-b');
    });

    it('a Practice preview reads the client household the same way (read-only, no special stage)', async () => {
        const { service, as } = setup({ 'client-household': { sortedCount: 5 } });
        const progress = await as(
            'client-household',
            () => service.get(NOW),
            HouseholdAccessSource.PRACTICE,
            'VIEWER'
        );
        expect(progress.stage).toBe(BoardStage.SORTING);
    });
});
