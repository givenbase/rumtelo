import { describe, expect, it } from 'vitest';

import { WeekCheckStage } from '@rumtelo/contracts';

import { asOwnerOf, fakeHouseholdEm, HOUSEHOLD_A, notFound } from '../fake-household-em.testing';
import { WeekCheckService } from './week-check.service';

/**
 * The week check redirects surplus to pots the client names. One pot of another household
 * refuses the whole call: no week check row, no allocation, no flush.
 */

function setup() {
    const em = fakeHouseholdEm();
    const planAccess = { planKeyForCurrentHousehold: async () => 'BASIC' };
    return { em, service: new WeekCheckService(em as never, planAccess as never) };
}

const advance = (jarIds: string[]) => ({
    week: '2026-W47',
    stage: WeekCheckStage.REDIRECT,
    allocations: jarIds.map(jarId => ({ jarId, amount: 1000 })),
});

describe('WeekCheckService.advance allocations', () => {
    it('refuses the whole call when one pot belongs to another household', async () => {
        const { em, service } = setup();

        await expect(
            asOwnerOf(HOUSEHOLD_A, () =>
                service.advance(advance(['jar-a-play', 'jar-b-play', 'jar-a-necessities']))
            )
        ).rejects.toEqual(notFound('jar_not_found'));

        expect(em.create).not.toHaveBeenCalled();
        expect(em.nativeDelete).not.toHaveBeenCalled();
        expect(em.flush).not.toHaveBeenCalled();
        expect(em.getReference).not.toHaveBeenCalled();
    });

    it('resolves the set of pots in a single query and allocates to the own pots', async () => {
        const { em, service } = setup();

        await asOwnerOf(HOUSEHOLD_A, () =>
            service.advance(advance(['jar-a-play', 'jar-a-necessities', 'jar-a-play']))
        );

        const allocations = em.created.filter(row => 'jar' in row);
        expect(allocations.map(row => (row.jar as { id: string }).id)).toEqual([
            'jar-a-play',
            'jar-a-necessities',
            'jar-a-play',
        ]);
        expect(em.flush).toHaveBeenCalled();
        const jarQueries = em.find.mock.calls.filter(([, where]) => 'id' in where);
        expect(jarQueries).toHaveLength(1);
    });

    it('still advances without allocations', async () => {
        const { em, service } = setup();

        await asOwnerOf(HOUSEHOLD_A, () =>
            service.advance({ week: '2026-W47', stage: WeekCheckStage.INTEND, intention: 'Walk' })
        );

        expect(em.flush).toHaveBeenCalled();
    });
});
