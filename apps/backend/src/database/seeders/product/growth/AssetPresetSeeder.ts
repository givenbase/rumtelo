import type { EntityManager } from '@mikro-orm/postgresql';

import { Seeder } from '@mikro-orm/seeder';

import { AssetKind } from '../../../../modules/backoffice/product/growth/preset/asset/kind/asset-kind.entity';
import { AssetPreset } from '../../../../modules/backoffice/product/growth/preset/asset/asset.entity';
import { ASSET_PRESET_SEED } from '../../../../modules/backoffice/product/growth/preset/asset/seed/asset.seed-data';

/** Seeds backoffice.reference_growth_asset_preset — safe to re-run. Kinds must exist. */
export class AssetPresetSeeder extends Seeder {
    async run(em: EntityManager): Promise<void> {
        const kinds = await em.find(AssetKind, {
            key: { $in: [...new Set(ASSET_PRESET_SEED.map(row => row.kindKey))] },
        });
        const kindByKey = new Map(kinds.map(kind => [kind.key, kind]));
        const keys = ASSET_PRESET_SEED.map(row => row.key);
        const existingRows = await em.find(
            AssetPreset,
            { key: { $in: keys } },
            { populate: ['kind'] }
        );
        const existingByKey = new Map(existingRows.map(row => [row.key, row]));
        for (const [sortOrder, row] of ASSET_PRESET_SEED.entries()) {
            const kind = kindByKey.get(row.kindKey);
            if (!kind) continue;
            const existing = existingByKey.get(row.key);
            if (existing) {
                existing.name = row.name;
                existing.description = row.description;
                existing.kind = kind;
                existing.sortOrder = sortOrder;
                existing.isActive = true;
                continue;
            }
            em.create(AssetPreset, {
                key: row.key,
                name: row.name,
                description: row.description,
                kind,
                sortOrder,
                isActive: true,
            } as never);
        }
        await em.flush();
    }
}
