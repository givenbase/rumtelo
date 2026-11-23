import { describe, expect, it } from 'vitest';

import { asOwnerOf, fakeHouseholdEm, HOUSEHOLD_A, notFound } from './fake-household-em.testing';
import {
    requireOwnBankAccount,
    requireOwnCategory,
    requireOwnDebt,
    requireOwnFixedCost,
    requireOwnJar,
    requireOwnJars,
} from './own-reference.util';

type Resolve = (em: never, id: string) => Promise<unknown>;

describe('own-reference util', () => {
    it.each<[string, Resolve, string, string, string]>([
        ['jar', requireOwnJar, 'jar-a-play', 'jar-b-play', 'jar_not_found'],
        ['category', requireOwnCategory, 'category-a', 'category-b', 'category_not_found'],
        ['debt', requireOwnDebt, 'debt-a', 'debt-b', 'debt_not_found'],
        ['fixed cost', requireOwnFixedCost, 'bill-a', 'bill-b', 'fixed_cost_not_found'],
        ['bank account', requireOwnBankAccount, 'account-a', 'account-b', 'bank_account_not_found'],
    ])(
        '%s: returns the own row, refuses a foreign or unknown id',
        async (_l, resolve, own, foreign, key) => {
            const em = fakeHouseholdEm();

            await expect(
                asOwnerOf(HOUSEHOLD_A, () => resolve(em as never, own))
            ).resolves.toMatchObject({
                id: own,
            });
            await expect(
                asOwnerOf(HOUSEHOLD_A, () => resolve(em as never, foreign))
            ).rejects.toEqual(notFound(key));
            await expect(
                asOwnerOf(HOUSEHOLD_A, () => resolve(em as never, 'nope'))
            ).rejects.toEqual(notFound(key));
        }
    );

    it('requireOwnJars resolves a set (duplicates allowed) in one query, all or nothing', async () => {
        const em = fakeHouseholdEm();

        const jars = await asOwnerOf(HOUSEHOLD_A, () =>
            requireOwnJars(em as never, ['jar-a-play', 'jar-a-necessities', 'jar-a-play'])
        );
        expect([...jars.keys()].sort()).toEqual(['jar-a-necessities', 'jar-a-play']);
        expect(em.find).toHaveBeenCalledTimes(1);

        await expect(
            asOwnerOf(HOUSEHOLD_A, () => requireOwnJars(em as never, ['jar-a-play', 'jar-b-play']))
        ).rejects.toEqual(notFound('jar_not_found'));
    });

    it('requireOwnJars with no ids asks nothing', async () => {
        const em = fakeHouseholdEm();
        const jars = await asOwnerOf(HOUSEHOLD_A, () => requireOwnJars(em as never, []));
        expect(jars.size).toBe(0);
        expect(em.find).not.toHaveBeenCalled();
    });
});
