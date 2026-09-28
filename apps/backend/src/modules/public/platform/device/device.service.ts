import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';
import {
    type Device as DeviceDto,
    type DeviceCapability,
    type DeviceCreate,
    type DeviceKindCatalogItem,
    type DeviceUpdate,
} from '@rumtelo/contracts';

import { apiBadRequest, apiNotFound } from '../../../../common/errors/api-user-error';
import { HouseholdScopedRepository } from '../../../../common/household/household-scoped.repository';
import { currentHouseholdId } from '../../../../common/household/household.context';
import { AccountService } from '../../../auth/user/account/account.service';
import { DeviceKindService } from '../../../backoffice/reference/device-kind/device-kind.service';
import { Device } from './device.entity';

/** Kinds that default to the current member when accountId is omitted. */
const WEARABLE_KIND_KEYS = new Set(['WRISTBAND', 'RING', 'WATCH']);

@Injectable()
export class DeviceService {
    private readonly repo: HouseholdScopedRepository<Device>;

    constructor(
        @Inject(EntityManager) private readonly em: EntityManager,
        @Inject(AccountService) private readonly accounts: AccountService,
        @Inject(DeviceKindService) private readonly kinds: DeviceKindService
    ) {
        this.repo = new HouseholdScopedRepository(em, Device);
    }

    // ====================================================================
    // ? CREATE Operations
    // ====================================================================

    async create(input: DeviceCreate): Promise<DeviceDto> {
        const kind = await this.kinds.findActiveByKey(input.kindKey);
        if (!kind) throw apiBadRequest('device_kind_invalid');

        const connection = input.connection ?? kind.defaultConnection;
        const capabilities = input.capabilities ?? (kind.defaultCapabilities as DeviceCapability[]);

        let accountId: string | null;
        if (input.accountId === undefined) {
            if (WEARABLE_KIND_KEYS.has(kind.key)) {
                const { account } = await this.accounts.ensureCurrentAccount();
                accountId = account.id;
            } else {
                accountId = null;
            }
        } else {
            accountId = input.accountId;
        }

        const entity = this.repo.create({
            name: input.name,
            kindKey: kind.key,
            connection,
            capabilities: [...capabilities],
            vendor: input.vendor ?? null,
            model: input.model ?? null,
            externalId: input.externalId?.trim() || null,
            pairedAt: new Date(),
            lastSeenAt: null,
            account: accountId,
        });
        await this.em.persist(entity).flush();
        return toDto(entity);
    }

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    async list(capability?: DeviceCapability): Promise<DeviceDto[]> {
        const rows = await this.repo.find({}, { orderBy: { pairedAt: 'DESC' } });
        const filtered = capability
            ? rows.filter(row => row.capabilities.includes(capability))
            : rows;
        return filtered.map(toDto);
    }

    async kindsList(): Promise<DeviceKindCatalogItem[]> {
        return this.kinds.listActive();
    }

    // ====================================================================
    // ? UPDATE Operations
    // ====================================================================

    async update(input: DeviceUpdate): Promise<DeviceDto> {
        const entity = await this.repo.findOne({ id: input.id });
        if (!entity) throw apiNotFound('device_not_found');

        if (input.name !== undefined) entity.name = input.name;
        if (input.accountId !== undefined) entity.account = input.accountId;
        if (input.capabilities !== undefined) {
            entity.capabilities = [...input.capabilities];
        }
        if (input.vendor !== undefined) entity.vendor = input.vendor;
        if (input.model !== undefined) entity.model = input.model;
        if (input.lastSeenAt !== undefined) {
            entity.lastSeenAt = input.lastSeenAt ? new Date(input.lastSeenAt) : null;
        }

        await this.em.flush();
        return toDto(entity);
    }

    // ====================================================================
    // ? DELETE Operations
    // ====================================================================

    async delete(id: string): Promise<{ ok: true }> {
        const entity = await this.repo.findOne({ id });
        if (!entity) throw apiNotFound('device_not_found');
        this.repo.remove(entity);
        await this.em.flush();
        return { ok: true };
    }
}

function toDto(entity: Device): DeviceDto {
    return {
        id: entity.id,
        householdId: entity.household || currentHouseholdId(),
        accountId: entity.account,
        name: entity.name,
        kindKey: entity.kindKey,
        connection: entity.connection,
        capabilities: entity.capabilities as DeviceCapability[],
        vendor: entity.vendor,
        model: entity.model,
        externalId: entity.externalId,
        pairedAt: entity.pairedAt.toISOString(),
        lastSeenAt: entity.lastSeenAt?.toISOString() ?? null,
        createdAt: entity.createdAt.toISOString(),
        updatedAt: entity.updatedAt.toISOString(),
    };
}
