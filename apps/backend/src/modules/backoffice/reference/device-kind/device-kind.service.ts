import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';
import type { DeviceCapability, DeviceKindCatalogItem } from '@rumtelo/contracts';

import { DeviceKindCatalog } from './device-kind.entity';

@Injectable()
export class DeviceKindService {
    constructor(@Inject(EntityManager) private readonly em: EntityManager) {}

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    async listActive(): Promise<DeviceKindCatalogItem[]> {
        const rows = await this.em.find(
            DeviceKindCatalog,
            { isActive: true },
            { orderBy: { sortOrder: 'ASC' } }
        );
        return rows.map(toDto);
    }

    async findActiveByKey(key: string): Promise<DeviceKindCatalog | null> {
        return this.em.findOne(DeviceKindCatalog, { key, isActive: true });
    }
}

function toDto(row: DeviceKindCatalog): DeviceKindCatalogItem {
    return {
        key: row.key,
        name: row.name,
        sortOrder: row.sortOrder,
        icon: row.icon,
        defaultConnection: row.defaultConnection,
        defaultCapabilities: row.defaultCapabilities as DeviceCapability[],
    };
}
