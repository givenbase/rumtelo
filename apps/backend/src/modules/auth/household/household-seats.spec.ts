import { describe, expect, it, vi } from 'vitest';

import { HouseholdAccessSource, PlanKey } from '@rumtelo/contracts';

import { householdStorage } from '../../../common/household/household.context';
import { AuthInvitation } from './managed/invitation/auth-invitation.entity';
import { AuthMember } from './managed/member/auth-member.entity';
import { HouseholdService } from './household.service';

const NOW = new Date('2026-11-17T09:00:00Z');
const FUTURE = new Date('2026-11-24T09:00:00Z');
const PAST = new Date('2026-11-10T09:00:00Z');

type Seat = { household: string; role: string };
type Invite = { household: string; role: string; status: string; expiresAt: Date };

/**
 * Applies the same equality / `$gt` filters the service sends, so the spec proves what the
 * query asks for (expired and non-pending invitations excluded), not what a stub returns.
 */
function setup(options: {
    members: Seat[];
    invites: Invite[];
    planKey?: PlanKey;
    extras?: { extraContributorSeats: number; extraViewerSeats: number };
}) {
    const em = {
        find: vi.fn<(entity: unknown, where: Record<string, unknown>) => Promise<unknown[]>>(
            async (entity, where) => {
                if (entity === AuthMember) {
                    return options.members.filter(row => row.household === where.household);
                }
                if (entity === AuthInvitation) {
                    const cutoff = (where.expiresAt as { $gt: Date }).$gt;
                    return options.invites.filter(
                        row =>
                            row.household === where.household &&
                            row.status === where.status &&
                            row.expiresAt > cutoff
                    );
                }
                return [];
            }
        ),
    };
    const service = new HouseholdService(
        em as never,
        {} as never,
        {} as never,
        {} as never,
        { get: async () => ({ planKey: options.planKey ?? PlanKey.BASIC }) } as never,
        {
            getSnapshot: async () =>
                options.extras ?? { extraContributorSeats: 0, extraViewerSeats: 0 },
        } as never,
        {} as never,
        {} as never
    );
    const as = <T>(
        householdId: string,
        role: 'OWNER' | 'MEMBER' | 'VIEWER',
        run: () => Promise<T>
    ): Promise<T> =>
        householdStorage.run(
            {
                userId: 'user-1',
                householdId,
                role,
                source: HouseholdAccessSource.SEAT,
                relation: null,
            },
            run
        );
    return { service, as };
}

const owner = (household: string): Seat => ({ household, role: 'owner' });
const pendingViewer = (household: string, expiresAt = FUTURE): Invite => ({
    household,
    role: 'viewer',
    status: 'pending',
    expiresAt,
});

describe('HouseholdService.seats', () => {
    it('counts members and pending invites by role against the Basic caps', async () => {
        const { service, as } = setup({
            members: [owner('household-a')],
            invites: [pendingViewer('household-a')],
        });
        const seats = await as('household-a', 'OWNER', () => service.seats('household-a', NOW));

        expect(seats).toMatchObject({
            members: 1,
            pendingInvites: 1,
            writableUsed: 1,
            viewerUsed: 1,
            maxMembers: 2,
            maxWritable: 1,
            maxViewer: 1,
        });
    });

    it('ignores expired invitations: they hold no seat', async () => {
        const { service, as } = setup({
            members: [owner('household-a')],
            invites: [pendingViewer('household-a', PAST)],
        });
        const seats = await as('household-a', 'OWNER', () => service.seats('household-a', NOW));

        expect(seats.pendingInvites).toBe(0);
        expect(seats.viewerUsed).toBe(0);
    });

    it('ignores accepted and cancelled invitations', async () => {
        const { service, as } = setup({
            members: [owner('household-a')],
            invites: [
                { ...pendingViewer('household-a'), status: 'accepted' },
                { ...pendingViewer('household-a'), status: 'canceled' },
            ],
        });
        const seats = await as('household-a', 'OWNER', () => service.seats('household-a', NOW));
        expect(seats.pendingInvites).toBe(0);
    });

    it('adds member and viewer seats the household bought', async () => {
        const { service, as } = setup({
            members: [owner('household-a')],
            invites: [],
            extras: { extraContributorSeats: 1, extraViewerSeats: 2 },
        });
        const seats = await as('household-a', 'OWNER', () => service.seats('household-a', NOW));
        expect(seats.maxWritable).toBe(2);
        expect(seats.maxViewer).toBe(3);
    });

    it('a MEMBER may read it', async () => {
        const { service, as } = setup({ members: [owner('household-a')], invites: [] });
        await expect(
            as('household-a', 'MEMBER', () => service.seats('household-a', NOW))
        ).resolves.toMatchObject({ members: 1 });
    });

    it('a VIEWER is rejected', async () => {
        const { service, as } = setup({ members: [owner('household-a')], invites: [] });
        await expect(
            as('household-a', 'VIEWER', () => service.seats('household-a', NOW))
        ).rejects.toThrow('role_permission_denied');
    });

    it('never counts another household’s invites or members, and returns counts only', async () => {
        const { service, as } = setup({
            members: [
                owner('household-a'),
                owner('household-b'),
                { household: 'household-b', role: 'member' },
            ],
            invites: [pendingViewer('household-a'), pendingViewer('household-a')],
        });
        const forB = await as('household-b', 'OWNER', () => service.seats('household-b', NOW));

        expect(forB.members).toBe(2);
        expect(forB.pendingInvites).toBe(0);
        expect(Object.keys(forB).sort()).toEqual([
            'maxMembers',
            'maxViewer',
            'maxWritable',
            'members',
            'pendingInvites',
            'viewerUsed',
            'writableUsed',
        ]);
    });
});
