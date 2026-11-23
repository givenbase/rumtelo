import { describe, expect, it, vi } from 'vitest';

import { DeviceConnection } from '@rumtelo/contracts';

import {
    asOwnerOf,
    fakeHouseholdEm,
    HOUSEHOLD_A,
    HOUSEHOLD_B,
    notFound,
    type Row,
} from '../../product/money/fake-household-em.testing';
import { AuthMember } from '../../../auth/household/managed/member/auth-member.entity';
import { Account } from '../../../auth/user/account/account.entity';
import { Device } from './device.entity';
import { DeviceService } from './device.service';

/**
 * `device.account` is a bare FK on a person. The wearer the client names must be a member
 * of this household, not any account id that exists.
 */

function setup(devices: Row[] = []) {
    const em = fakeHouseholdEm();
    em.tables.set(Account, [
        { id: 'account-a', user: { id: 'user-a' } },
        { id: 'account-b', user: { id: 'user-b' } },
    ]);
    // user-a sits in household A, user-b only in household B.
    em.tables.set(AuthMember, [
        { id: 'member-a', user: 'user-a', household: HOUSEHOLD_A },
        { id: 'member-b', user: 'user-b', household: HOUSEHOLD_B },
    ]);
    em.tables.set(Device, devices);
    const kinds = {
        findActiveByKey: vi.fn<() => Promise<Row>>(async () => ({
            id: 'kind-1',
            key: 'SCALE',
            defaultConnection: DeviceConnection.WIFI,
            defaultCapabilities: [],
        })),
    };
    const service = new DeviceService(em as never, {} as never, kinds as never);
    return { em, service };
}

function deviceRow(): Row {
    return {
        id: 'device-a1',
        household: HOUSEHOLD_A,
        name: 'Scale',
        kindKey: 'SCALE',
        connection: DeviceConnection.WIFI,
        capabilities: [],
        vendor: null,
        model: null,
        externalId: null,
        account: null,
        pairedAt: new Date('2026-11-01T08:00:00.000Z'),
        lastSeenAt: null,
        createdAt: new Date('2026-11-01T08:00:00.000Z'),
        updatedAt: new Date('2026-11-01T08:00:00.000Z'),
    };
}

describe('DeviceService wearer', () => {
    it('refuses to pair a device with a person from another household', async () => {
        const { em, service } = setup();

        await expect(
            asOwnerOf(HOUSEHOLD_A, () =>
                service.create({ name: 'Scale', kindKey: 'SCALE', accountId: 'account-b' })
            )
        ).rejects.toEqual(notFound('member_not_found'));

        expect(em.create).not.toHaveBeenCalled();
        expect(em.flush).not.toHaveBeenCalled();
    });

    it('pairs a device with a member of this household', async () => {
        const { service } = setup();

        const created = await asOwnerOf(HOUSEHOLD_A, () =>
            service.create({ name: 'Scale', kindKey: 'SCALE', accountId: 'account-a' })
        );

        expect(created.accountId).toBe('account-a');
    });

    it('refuses to move a device onto a person from another household', async () => {
        const row = deviceRow();
        const { em, service } = setup([row]);

        await expect(
            asOwnerOf(HOUSEHOLD_A, () => service.update({ id: row.id, accountId: 'account-b' }))
        ).rejects.toEqual(notFound('member_not_found'));

        expect(row.account).toBeNull();
        expect(em.flush).not.toHaveBeenCalled();
    });

    it('moves a device onto a member of this household and clears it with null', async () => {
        const row = deviceRow();
        const { service } = setup([row]);

        await asOwnerOf(HOUSEHOLD_A, () => service.update({ id: row.id, accountId: 'account-a' }));
        expect(row.account).toBe('account-a');

        await asOwnerOf(HOUSEHOLD_A, () => service.update({ id: row.id, accountId: null }));
        expect(row.account).toBeNull();
    });
});
