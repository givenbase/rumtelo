import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';
import type { AssetKind as AssetKindDto } from '@rumtelo/contracts';

import { AssetKind } from './asset-kind.entity';

@Injectable()
export class AssetKindService {
    constructor(@Inject(EntityManager) private readonly em: EntityManager) {}

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    async listActive(): Promise<AssetKindDto[]> {
        const rows = await this.em.find(
            AssetKind,
            { isActive: true },
            { orderBy: { sortOrder: 'ASC' } }
        );
        return rows.map(row => ({
            key: row.key,
            name: row.name,
            sortOrder: row.sortOrder,
            description: row.description,
            icon: row.icon,
            canPay: row.canPay,
        }));
    }
}
