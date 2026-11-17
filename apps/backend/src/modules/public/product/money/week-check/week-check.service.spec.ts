import { describe, expect, it, vi } from 'vitest';

import { HouseholdAccessSource, PlanKey, WeekCheckStage } from '@rumtelo/contracts';

import {
    householdStorage,
    type HouseholdContext,
} from '../../../../../common/household/household.context';
import { MoneyWeekCheck } from './money-week-check.entity';
import { WeekCheckService } from './week-check.service';

type Row = Record<string, unknown>;

/** Matches the few filter shapes the service uses: equality and `{ $ne: null }`. */
function matches(row: Row, where: Row): boolean {
    return Object.entries(where).every(([key, expected]) => {
        if (expected && typeof expected === 'object' && '$ne' in expected) {
            return row[key] !== expected.$ne;
        }
        return row[key] === expected;
    });
}

/** In-memory stand-in for the MikroORM entity manager; rows of every household live in one list. */
function fakeEm(rows: Row[] = []) {
    const em = {
        rows,
        find: vi.fn<(entity: unknown, where: Row, options?: { limit?: number }) => Promise<Row[]>>(
            async (_entity, where, options) =>
                rows.filter(row => matches(row, where)).slice(0, options?.limit)
        ),
        findOne: vi.fn<(entity: unknown, where: Row) => Promise<Row | null>>(
            async (_entity, where) => rows.find(row => matches(row, where)) ?? null
        ),
        create: vi.fn<(entity: unknown, data: Row) => Row>((entity, data) => {
            const row = {
                id: `week-check-${rows.length + 1}`,
                stage: WeekCheckStage.LOOK,
                surplus: 0,
                intention: null,
                completedAt: null,
                ...data,
            };
            // Mirrors em.create(): an entity is tracked as soon as it exists.
            if (entity === MoneyWeekCheck) rows.push(row);
            return row;
        }),
        persist: vi.fn<() => { flush: () => Promise<void> }>(() => ({ flush: async () => {} })),
        flush: vi.fn<() => Promise<void>>(async () => {}),
        nativeDelete: vi.fn<() => Promise<number>>(async () => 0),
        getReference: vi.fn<(entity: unknown, id: string) => { id: string }>((_entity, id) => ({
            id,
        })),
    };
    return em;
}

function setup(input: { rows?: Row[]; planKey?: PlanKey }) {
    const em = fakeEm(input.rows);
    const planAccess = { planKeyForCurrentHousehold: async () => input.planKey ?? PlanKey.BASIC };
    const service = new WeekCheckService(em as never, planAccess as never);
    return { em, service };
}

function asSeat(role: HouseholdContext['role'], householdId: string, run: () => Promise<unknown>) {
    return householdStorage.run(
        { userId: 'user-1', householdId, role, source: HouseholdAccessSource.SEAT, relation: null },
        run
    );
}

function asPracticePreview(householdId: string, run: () => Promise<unknown>) {
    return householdStorage.run(
        {
            userId: 'staff-1',
            householdId,
            role: 'VIEWER',
            source: HouseholdAccessSource.PRACTICE,
            relation: null,
        },
        run
    );
}

const COMPLETED = new Date('2026-11-15T10:00:00.000Z');

describe('WeekCheckService.completionFacts', () => {
    it('reports only this household: another household completing a check does not leak', async () => {
        const { service } = setup({
            rows: [
                { household: 'household-b', week: '2026-W46', completedAt: COMPLETED },
                { household: 'household-b', week: '2026-W47', completedAt: COMPLETED },
            ],
        });
        const facts = (await asSeat('OWNER', 'household-a', () =>
            service.completionFacts('2026-W47')
        )) as { hasCompleted: boolean; doneThisWeek: boolean };
        expect(facts).toEqual({ hasCompleted: false, doneThisWeek: false });
    });

    it('splits "ever completed" from "done this week"', async () => {
        const { service } = setup({
            rows: [
                { household: 'household-a', week: '2026-W45', completedAt: COMPLETED },
                { household: 'household-a', week: '2026-W47', completedAt: null },
            ],
        });
        const facts = await asSeat('OWNER', 'household-a', () =>
            service.completionFacts('2026-W47')
        );
        expect(facts).toEqual({ hasCompleted: true, doneThisWeek: false });
    });

    it('sees this week done once completedAt is set', async () => {
        const { service } = setup({
            rows: [{ household: 'household-a', week: '2026-W47', completedAt: COMPLETED }],
        });
        const facts = await asSeat('MEMBER', 'household-a', () =>
            service.completionFacts('2026-W47')
        );
        expect(facts).toEqual({ hasCompleted: true, doneThisWeek: true });
    });

    it('never creates a row', async () => {
        const { service, em } = setup({});
        await asSeat('OWNER', 'household-a', () => service.completionFacts('2026-W47'));
        expect(em.create).not.toHaveBeenCalled();
    });
});

describe('WeekCheckService.advance', () => {
    it('keeps the first completedAt when DONE is sent twice (retry-safe)', async () => {
        const { service } = setup({
            rows: [
                {
                    id: 'week-check-1',
                    household: 'household-a',
                    week: '2026-W47',
                    stage: WeekCheckStage.DONE,
                    completedAt: COMPLETED,
                    surplus: 0,
                    intention: null,
                },
            ],
        });
        const result = (await asSeat('OWNER', 'household-a', () =>
            service.advance({ week: '2026-W47', stage: WeekCheckStage.DONE })
        )) as { completedAt: string };
        expect(result.completedAt).toBe(COMPLETED.toISOString());
    });

    it('stamps completedAt the first time DONE is reached', async () => {
        const { service } = setup({
            rows: [
                {
                    id: 'week-check-1',
                    household: 'household-a',
                    week: '2026-W47',
                    stage: WeekCheckStage.INTEND,
                    completedAt: null,
                    surplus: 0,
                    intention: 'Cook at home',
                },
            ],
        });
        const result = (await asSeat('OWNER', 'household-a', () =>
            service.advance({ week: '2026-W47', stage: WeekCheckStage.DONE })
        )) as { completedAt: string | null };
        expect(result.completedAt).not.toBeNull();
    });
});

describe('WeekCheckService.current', () => {
    it('lazily creates the week for an OWNER or MEMBER', async () => {
        const { service, em } = setup({});
        await asSeat('MEMBER', 'household-a', () => service.current('2026-W47'));
        expect(em.create).toHaveBeenCalledTimes(1);
    });

    it('does not create a row for a VIEWER and returns a blank LOOK summary', async () => {
        const { service, em } = setup({ planKey: PlanKey.PLUS });
        const result = (await asSeat('VIEWER', 'household-a', () =>
            service.current('2026-W47')
        )) as {
            stage: WeekCheckStage;
            completedAt: string | null;
            courseApplies: boolean;
        };
        expect(em.create).not.toHaveBeenCalled();
        expect(result).toMatchObject({
            stage: WeekCheckStage.LOOK,
            completedAt: null,
            courseApplies: false,
        });
    });

    it('does not create a row in a Practice preview either', async () => {
        const { service, em } = setup({});
        await asPracticePreview('household-a', () => service.current('2026-W47'));
        expect(em.create).not.toHaveBeenCalled();
    });

    it('returns the real row to a VIEWER when the week was started', async () => {
        const { service } = setup({
            rows: [
                {
                    id: 'week-check-1',
                    household: 'household-a',
                    week: '2026-W47',
                    stage: WeekCheckStage.DONE,
                    completedAt: COMPLETED,
                    surplus: 0,
                    intention: null,
                },
            ],
        });
        const result = (await asSeat('VIEWER', 'household-a', () =>
            service.current('2026-W47')
        )) as {
            completedAt: string;
        };
        expect(result.completedAt).toBe(COMPLETED.toISOString());
    });

    it('does not read another household’s check for the same week', async () => {
        const { service } = setup({
            rows: [
                {
                    id: 'week-check-b',
                    household: 'household-b',
                    week: '2026-W47',
                    stage: WeekCheckStage.DONE,
                    completedAt: COMPLETED,
                    surplus: 0,
                    intention: null,
                },
            ],
        });
        const result = (await asSeat('VIEWER', 'household-a', () =>
            service.current('2026-W47')
        )) as {
            id: string;
            completedAt: string | null;
        };
        expect(result.id).not.toBe('week-check-b');
        expect(result.completedAt).toBeNull();
    });
});

describe('WeekCheckService courseApplies', () => {
    async function courseAppliesFor(planKey: PlanKey, role: HouseholdContext['role']) {
        const { service } = setup({ planKey });
        const result = (await asSeat(role, 'household-a', () => service.current('2026-W47'))) as {
            courseApplies: boolean;
        };
        return result.courseApplies;
    }

    it('is false on Basic', async () => {
        expect(await courseAppliesFor(PlanKey.BASIC, 'OWNER')).toBe(false);
    });

    it.each([PlanKey.PLUS, PlanKey.MAX])('is true on %s for an OWNER or MEMBER', async planKey => {
        expect(await courseAppliesFor(planKey, 'OWNER')).toBe(true);
        expect(await courseAppliesFor(planKey, 'MEMBER')).toBe(true);
    });

    it('is false for a VIEWER even on Max (no Growth for viewers)', async () => {
        expect(await courseAppliesFor(PlanKey.MAX, 'VIEWER')).toBe(false);
    });
});
