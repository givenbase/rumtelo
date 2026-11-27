import { describe, expect, it, vi } from 'vitest';

import { GoalKind, GoalStatus } from '@rumtelo/contracts';

import {
    asOwnerOf,
    fakeHouseholdEm,
    HOUSEHOLD_A,
    notFound,
    type Row,
} from '../../fake-household-em.testing';
import { Goal } from './goal.entity';
import { GoalService } from './goal.service';

/** A SAVE goal names its pot: a pot of another household is refused, nothing is written. */

function saveGoal(overrides: Partial<Row> = {}): Row {
    return {
        id: 'goal-a1',
        household: HOUSEHOLD_A,
        kind: GoalKind.SAVE,
        jar: { id: 'jar-a-play' },
        name: 'Trip',
        target: 100_00,
        saved: 0,
        monthlyContribution: 0,
        status: GoalStatus.ACTIVE,
        sortOrder: 0,
        targetOn: null,
        fulfilledOn: null,
        ...overrides,
    };
}

function setup(goals: Row[] = []) {
    const em = fakeHouseholdEm();
    em.tables.set(Goal, goals);
    const planAccess = {
        assertCapability: vi.fn<() => Promise<void>>(async () => undefined),
        assertWithinLimit: vi.fn<() => Promise<void>>(async () => undefined),
    };
    const service = new GoalService(em as never, planAccess as never, {} as never, {} as never);
    return { em, service };
}

describe('GoalService.create with a pot from the client', () => {
    it('refuses another household pot and writes nothing', async () => {
        const { em, service } = setup();

        await expect(
            asOwnerOf(HOUSEHOLD_A, () =>
                service.create({
                    kind: GoalKind.SAVE,
                    jarId: 'jar-b-play',
                    name: 'Trip',
                    target: 100_00,
                })
            )
        ).rejects.toEqual(notFound('jar_not_found'));

        expect(em.create).not.toHaveBeenCalled();
        expect(em.flush).not.toHaveBeenCalled();
        expect(em.getReference).not.toHaveBeenCalled();
    });

    it('creates a goal on the own pot', async () => {
        const { service } = setup();

        const goal = await asOwnerOf(HOUSEHOLD_A, () =>
            service.create({
                kind: GoalKind.SAVE,
                jarId: 'jar-a-play',
                name: 'Trip',
                target: 100_00,
            })
        );

        expect(goal.jarId).toBe('jar-a-play');
    });
});

describe('GoalService.update with a pot from the client', () => {
    it('refuses another household pot and leaves the goal where it was', async () => {
        const row = saveGoal();
        const { em, service } = setup([row]);

        await expect(
            asOwnerOf(HOUSEHOLD_A, () => service.update(row.id, { jarId: 'jar-b-play' }))
        ).rejects.toEqual(notFound('jar_not_found'));

        expect(row.jar).toEqual({ id: 'jar-a-play' });
        expect(em.flush).not.toHaveBeenCalled();
    });

    it('moves the goal to the own pot', async () => {
        const row = saveGoal();
        const { service } = setup([row]);

        const goal = await asOwnerOf(HOUSEHOLD_A, () =>
            service.update(row.id, { jarId: 'jar-a-necessities' })
        );

        expect(goal.jarId).toBe('jar-a-necessities');
    });
});
