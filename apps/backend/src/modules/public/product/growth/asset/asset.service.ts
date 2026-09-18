import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';
import type { Asset as AssetDto } from '@rumtelo/contracts';

import { HouseholdScopedRepository } from '../../../../../common/household/household-scoped.repository';
import { Asset } from './asset.entity';

@Injectable()
export class AssetService {
    private readonly assets: HouseholdScopedRepository<Asset>;

    constructor(@Inject(EntityManager) em: EntityManager) {
        this.assets = new HouseholdScopedRepository(em, Asset);
    }

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    async list(): Promise<AssetDto[]> {
        const rows = await this.assets.find({}, { orderBy: { name: 'ASC' } });
        return rows.map(row => ({
            id: row.id,
            householdId: row.household,
            name: row.name,
            kindKey: row.kindKey,
            presetKey: row.presetKey,
            value: row.value,
            flow: row.flow,
        }));
    }
}
