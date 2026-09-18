import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';
import type { AssetPreset as AssetPresetDto } from '@rumtelo/contracts';

import { AssetPreset } from './asset.entity';

@Injectable()
export class AssetPresetService {
    constructor(@Inject(EntityManager) private readonly em: EntityManager) {}

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    async listActive(): Promise<AssetPresetDto[]> {
        const rows = await this.em.find(
            AssetPreset,
            { isActive: true },
            { orderBy: { sortOrder: 'ASC' }, populate: ['kind'] }
        );
        return rows.map(row => ({
            key: row.key,
            name: row.name,
            sortOrder: row.sortOrder,
            description: row.description,
            kindKey: row.kind.key,
            kindName: row.kind.name,
            canPay: row.kind.canPay,
        }));
    }
}
