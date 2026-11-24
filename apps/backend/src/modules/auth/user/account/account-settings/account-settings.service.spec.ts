import { describe, expect, it } from 'vitest';

import { AccountSettings as AccountSettingsSchema } from '@rumtelo/contracts';

import { householdStorage } from '../../../../../common/household/household.context';
import { Account } from '../account.entity';
import { AccountSettings } from './account-settings.entity';
import { AccountSettingsService } from './account-settings.service';

type Row = {
    id: string;
    userId: string;
    direction: string | null;
    directionWhy: string | null;
};

/**
 * A fake EntityManager holding one settings row per person. It answers the three lookups the
 * service makes (`Account` by user, `AccountSettings` by id + owning user) the way Postgres
 * would, so the specs prove which row the service asks for, not how MikroORM is wired.
 */
function buildService(people: string[]) {
    const rows: Row[] = people.map(userId => ({
        id: `settings-${userId}`,
        userId,
        direction: null,
        directionWhy: null,
    }));
    const entityOf = (row: Row) => ({
        id: row.id,
        account: { id: `account-${row.userId}` },
        get direction() {
            return row.direction;
        },
        set direction(value: string | null) {
            row.direction = value;
        },
        get directionWhy() {
            return row.directionWhy;
        },
        set directionWhy(value: string | null) {
            row.directionWhy = value;
        },
        locale: 'NL',
        theme: 'LIGHT',
        spendingStyle: 'UNKNOWN',
        workSituation: null,
        yearIntention: null,
        tour: { offer: 'idle', tours: {}, seriesActive: false, seriesIndex: 0 },
        isShowingAllSurfaces: false,
        onboardedAt: null,
    });
    const removed: string[] = [];
    const em = {
        findOne: async (entity: unknown, where: Record<string, unknown>) => {
            if (entity === Account) {
                const row = rows.find(candidate => candidate.userId === where.user);
                return row ? { id: `account-${row.userId}`, settings: entityOf(row) } : null;
            }
            if (entity === AccountSettings) {
                const owner = (where.account as { user: string }).user;
                const row = rows.find(
                    candidate => candidate.id === where.id && candidate.userId === owner
                );
                return row ? entityOf(row) : null;
            }
            return null;
        },
        flush: async () => undefined,
        persist: () => em,
        remove: (entity: { id: string }) => {
            removed.push(entity.id);
            return em;
        },
    };
    const service = new AccountSettingsService(em as never);
    const asPerson = <T>(userId: string, run: () => Promise<T>) =>
        householdStorage.run(
            {
                userId,
                householdId: 'household-1',
                role: 'OWNER',
                source: 'SEAT' as never,
                relation: null,
            },
            run
        );
    return { service, rows, removed, asPerson };
}

describe('AccountSettingsService direction', () => {
    it('sets direction and why on the signed-in person only', async () => {
        const { service, rows, asPerson } = buildService(['ann', 'ben']);

        const result = await asPerson('ann', () =>
            service.update({ direction: 'Debt free', directionWhy: 'So we can breathe' })
        );

        expect(result.direction).toBe('Debt free');
        expect(result.directionWhy).toBe('So we can breathe');
        expect(rows.find(row => row.userId === 'ann')?.direction).toBe('Debt free');
        expect(rows.find(row => row.userId === 'ben')?.direction).toBeNull();
    });

    it('leaves a field alone when the patch does not carry it', async () => {
        const { service, asPerson } = buildService(['ann']);
        await asPerson('ann', () =>
            service.update({ direction: 'Debt free', directionWhy: 'Calm' })
        );

        const result = await asPerson('ann', () => service.update({ directionWhy: 'Calm home' }));

        expect(result.direction).toBe('Debt free');
        expect(result.directionWhy).toBe('Calm home');
    });

    it('clears a field with null', async () => {
        const { service, asPerson } = buildService(['ann']);
        await asPerson('ann', () =>
            service.update({ direction: 'Debt free', directionWhy: 'Calm' })
        );

        const result = await asPerson('ann', () => service.update({ directionWhy: null }));

        expect(result.direction).toBe('Debt free');
        expect(result.directionWhy).toBeNull();
    });

    it('trims, and stores empty after trim as null', async () => {
        const { service, asPerson } = buildService(['ann']);

        const trimmed = await asPerson('ann', () => service.update({ direction: '  Debt free  ' }));
        expect(trimmed.direction).toBe('Debt free');

        const cleared = await asPerson('ann', () => service.update({ direction: '   ' }));
        expect(cleared.direction).toBeNull();
    });

    it('reads another person direction only as their own: never through get()', async () => {
        const { service, asPerson } = buildService(['ann', 'ben']);
        await asPerson('ann', () => service.update({ direction: 'Ann private' }));

        const bens = await asPerson('ben', () => service.get());

        expect(bens.direction).toBeNull();
        expect(JSON.stringify(bens)).not.toContain('Ann private');
    });

    it('cannot find or delete another person settings row by id', async () => {
        const { service, rows, removed, asPerson } = buildService(['ann', 'ben']);
        const annsRowId = rows.find(row => row.userId === 'ann')!.id;

        await expect(asPerson('ben', () => service.findOne(annsRowId))).rejects.toBeDefined();
        await expect(asPerson('ben', () => service.delete(annsRowId))).rejects.toBeDefined();
        expect(removed).toEqual([]);

        await expect(asPerson('ann', () => service.delete(annsRowId))).resolves.toEqual({
            ok: true,
        });
        expect(removed).toEqual([annsRowId]);
    });
});

describe('AccountSettings contract schema direction', () => {
    const base = {
        accountId: '3f1b2c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
        locale: 'NL',
        theme: 'LIGHT',
        spendingStyle: 'UNKNOWN',
        workSituation: null,
        yearIntention: null,
        direction: null,
        directionWhy: null,
        tour: { offer: 'idle', tours: {}, seriesActive: false, seriesIndex: 0 },
        showAllSurfaces: false,
        onboardedAt: null,
    };

    it('accepts 280 characters and rejects 281', () => {
        expect(
            AccountSettingsSchema.safeParse({ ...base, direction: 'a'.repeat(280) }).success
        ).toBe(true);
        expect(
            AccountSettingsSchema.safeParse({ ...base, direction: 'a'.repeat(281) }).success
        ).toBe(false);
        expect(
            AccountSettingsSchema.safeParse({ ...base, directionWhy: 'a'.repeat(281) }).success
        ).toBe(false);
    });
});
