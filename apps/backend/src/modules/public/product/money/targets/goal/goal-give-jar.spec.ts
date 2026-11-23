import { describe, expect, it, vi } from 'vitest';

import { GoalKind, GoalStatus, JarKey } from '@rumtelo/contracts';

import { householdStorage } from '../../../../../../common/household/household.context';
import { Goal } from './goal.entity';
import { GoalService } from './goal.service';

const HOUSEHOLD = 'household-1';
const OTHER_HOUSEHOLD = 'household-2';
const jarId = (key: JarKey, household = HOUSEHOLD) => `${household}-${key}`;

type GoalRow = {
    id: string;
    household: string;
    kind: GoalKind;
    jar: { id: string; key: JarKey } | null;
    name: string;
    target: number;
    saved: number;
    status: GoalStatus;
    targetOn: string | null;
    fulfilledOn: string | null;
    [field: string]: unknown;
};

/** Both households have a Give and a Play pot, so a foreign pot id is a real, wrong id. */
const JARS = [HOUSEHOLD, OTHER_HOUSEHOLD].flatMap(household =>
    [JarKey.GIVE, JarKey.PLAY, JarKey.LONG_TERM_SAVINGS].map(key => ({
        id: jarId(key, household),
        household,
        key,
    }))
);

function giveGoal(overrides: Partial<GoalRow> = {}): GoalRow {
    return {
        id: 'goal-1',
        household: HOUSEHOLD,
        kind: GoalKind.GIVE,
        jar: { id: jarId(JarKey.GIVE), key: JarKey.GIVE },
        name: 'Pledge',
        target: 500_00,
        saved: 0,
        status: GoalStatus.ACTIVE,
        targetOn: '2026-12-31',
        fulfilledOn: null,
        ...overrides,
    };
}

/**
 * Fake EntityManager: `find`/`findOne`/`count` honour the `household` the scoped repository
 * injects. `execute` is the ledger query behind `evaluateGiveGoals`; it records the jar it
 * was asked about and answers with `outflowByJar`.
 */
function buildService(goals: GoalRow[], outflowByJar: Record<string, number> = {}) {
    const executedFor: string[] = [];
    // `persist` returns the em so `persist(row).flush()` chains.
    const chain: { flush?: () => Promise<void> } = {};
    const em = {
        find: vi.fn<(entity: unknown, where: { household: string }) => Promise<unknown[]>>(
            async (entity, where) =>
                entity === Goal ? goals.filter(goal => goal.household === where.household) : []
        ),
        findOne: vi.fn<
            (entity: unknown, where: { household: string; id: string }) => Promise<unknown>
        >(async (entity, where) =>
            entity === Goal
                ? (goals.find(goal => goal.household === where.household && goal.id === where.id) ??
                  null)
                : (JARS.find(jar => jar.household === where.household && jar.id === where.id) ??
                  null)
        ),
        count: vi.fn<() => Promise<number>>(async () => 0),
        create: vi.fn<(entity: unknown, data: Record<string, unknown>) => GoalRow>(
            (_entity, data) => {
                const row = {
                    id: 'goal-new',
                    saved: 0,
                    fulfilledOn: null,
                    ...data,
                } as unknown as GoalRow;
                goals.push(row);
                return row;
            }
        ),
        persist: vi.fn<(row: unknown) => object>(() => chain),
        flush: vi.fn<() => Promise<void>>(async () => undefined),
        refresh: vi.fn<(row: unknown) => Promise<void>>(async () => undefined),
        populate: vi.fn<(rows: unknown) => Promise<void>>(async () => undefined),
        getReference: vi.fn<(entity: unknown, id: string) => { id: string; key: JarKey }>(
            (_entity, id) => ({
                id,
                key: JARS.find(jar => jar.id === id)?.key ?? JarKey.PLAY,
            })
        ),
        getConnection: () => ({
            execute: vi.fn<(sql: string, params: unknown[]) => Promise<{ total: string }[]>>(
                async (_sql, params) => {
                    const target = String(params[1]);
                    executedFor.push(target);
                    return [{ total: String(outflowByJar[target] ?? 0) }];
                }
            ),
        }),
    };
    chain.flush = em.flush;
    const service = new GoalService(
        em as never,
        {
            assertCapability: vi.fn<() => Promise<void>>(async () => undefined),
            assertWithinLimit: vi.fn<() => Promise<void>>(async () => undefined),
        } as never,
        {} as never,
        {} as never
    );
    return { service, em, executedFor };
}

function inHousehold<T>(run: () => Promise<T>): Promise<T> {
    return householdStorage.run(
        {
            userId: 'user-1',
            householdId: HOUSEHOLD,
            role: 'OWNER',
            source: 'SEAT' as never,
            relation: null,
        },
        run
    );
}

const wrongPot = () =>
    expect.objectContaining({
        response: expect.objectContaining({ message: 'goal_give_needs_give_jar' }),
    });

describe('GoalService.create GIVE needs the Give pot', () => {
    const pledge = (pot: string | null) => ({
        kind: GoalKind.GIVE,
        jarId: pot,
        name: 'Pledge',
        target: 500_00,
    });

    it('accepts a pledge on the household Give pot', async () => {
        const { service, em } = buildService([]);

        const goal = await inHousehold(() => service.create(pledge(jarId(JarKey.GIVE))));

        expect(goal).toMatchObject({ kind: GoalKind.GIVE, jarId: jarId(JarKey.GIVE) });
        expect(em.create).toHaveBeenCalledTimes(1);
    });

    it.each([
        ['Play (what the client sent with Give off)', jarId(JarKey.PLAY)],
        ['Long-term savings', jarId(JarKey.LONG_TERM_SAVINGS)],
        ["another household's Give pot", jarId(JarKey.GIVE, OTHER_HOUSEHOLD)],
        ['no pot at all', null],
        ['an unknown id', 'nope'],
    ])('rejects a pledge on %s and writes nothing', async (_label, pot) => {
        const { service, em } = buildService([]);

        await expect(inHousehold(() => service.create(pledge(pot)))).rejects.toEqual(wrongPot());
        expect(em.create).not.toHaveBeenCalled();
        expect(em.flush).not.toHaveBeenCalled();
    });

    it('does not apply the rule to a SAVE goal on Play', async () => {
        const { service } = buildService([]);

        const goal = await inHousehold(() =>
            service.create({
                kind: GoalKind.SAVE,
                jarId: jarId(JarKey.PLAY),
                name: 'Trip',
                target: 100_00,
            })
        );

        expect(goal.jarId).toBe(jarId(JarKey.PLAY));
    });
});

describe('GoalService.update keeps a GIVE goal on the Give pot', () => {
    it('rejects moving a GIVE goal to another pot, and leaves it where it was', async () => {
        const goal = giveGoal();
        const { service, em } = buildService([goal]);

        await expect(
            inHousehold(() => service.update(goal.id, { jarId: jarId(JarKey.PLAY) }))
        ).rejects.toEqual(wrongPot());
        expect(em.flush).not.toHaveBeenCalled();
    });

    it('rejects turning a goal into a GIVE goal while it sits on Play', async () => {
        const goal = giveGoal({
            kind: GoalKind.SAVE,
            jar: { id: jarId(JarKey.PLAY), key: JarKey.PLAY },
        });
        const { service } = buildService([goal]);

        await expect(
            inHousehold(() => service.update(goal.id, { kind: GoalKind.GIVE }))
        ).rejects.toEqual(wrongPot());
    });

    it('rejects clearing the pot of a GIVE goal', async () => {
        const goal = giveGoal();
        const { service } = buildService([goal]);

        await expect(inHousehold(() => service.update(goal.id, { jarId: null }))).rejects.toEqual(
            wrongPot()
        );
    });

    it('allows moving to the Give pot and a plain rename of a pledge that is already misfiled', async () => {
        const misfiled = giveGoal({ jar: { id: jarId(JarKey.PLAY), key: JarKey.PLAY } });
        const { service } = buildService([misfiled]);

        const moved = await inHousehold(() =>
            service.update(misfiled.id, { jarId: jarId(JarKey.GIVE) })
        );
        expect(moved.jarId).toBe(jarId(JarKey.GIVE));

        const stuck = giveGoal({
            id: 'goal-2',
            jar: { id: jarId(JarKey.PLAY), key: JarKey.PLAY },
        });
        const second = buildService([stuck]);
        const renamed = await inHousehold(() =>
            second.service.update(stuck.id, { name: 'Renamed' })
        );
        expect(renamed.name).toBe('Renamed');
    });
});

describe('GoalService.evaluateGiveGoals', () => {
    it('counts spending out of the Give pot for a correctly filed pledge', async () => {
        const goal = giveGoal();
        const { service, executedFor } = buildService([goal], {
            [jarId(JarKey.GIVE)]: 120_00,
            [jarId(JarKey.PLAY)]: 900_00,
        });

        await inHousehold(() => service.evaluateGiveGoals());

        expect(executedFor).toEqual([jarId(JarKey.GIVE)]);
        expect(goal.saved).toBe(120_00);
        expect(goal.status).toBe(GoalStatus.ACTIVE);
    });

    it('reaches a correctly filed pledge once it meets the target', async () => {
        const goal = giveGoal({ target: 100_00 });
        const { service } = buildService([goal], { [jarId(JarKey.GIVE)]: 100_00 });

        await inHousehold(() => service.evaluateGiveGoals());

        expect(goal.status).toBe(GoalStatus.REACHED);
    });

    it('ignores a pledge misfiled on Play: no ledger query, saved and status untouched', async () => {
        const goal = giveGoal({
            saved: 40_00,
            jar: { id: jarId(JarKey.PLAY), key: JarKey.PLAY },
        });
        const { service, executedFor, em } = buildService([goal], {
            [jarId(JarKey.PLAY)]: 900_00,
        });

        await inHousehold(() => service.evaluateGiveGoals());

        expect(executedFor).toEqual([]);
        expect(goal.saved).toBe(40_00);
        expect(goal.status).toBe(GoalStatus.ACTIVE);
        expect(em.flush).not.toHaveBeenCalled();
    });

    it('still ignores a pledge with no pot at all', async () => {
        const goal = giveGoal({ jar: null });
        const { service, executedFor } = buildService([goal]);

        await inHousehold(() => service.evaluateGiveGoals());

        expect(executedFor).toEqual([]);
        expect(goal.saved).toBe(0);
    });
});
