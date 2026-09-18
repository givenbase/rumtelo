import type { EntityManager } from '@mikro-orm/postgresql';

import { Seeder } from '@mikro-orm/seeder';

import { AssetKind } from '../../../../modules/backoffice/product/growth/preset/asset/kind/asset-kind.entity';
import { ASSET_KIND_SEED } from '../../../../modules/backoffice/product/growth/preset/asset/kind/seed/asset-kind.seed-data';
import { AssetPreset } from '../../../../modules/backoffice/product/growth/preset/asset/asset.entity';

/** First seed used kebab keys. Catalog keys are KEY, like RENT and HOME. */
const STALE_KIND_KEYS = [
    'portfolio',
    'property',
    'business',
    'cash',
    'pension',
    'vehicle',
    'valuables',
    'other',
];
const STALE_PRESET_KEYS = [
    'savings-account',
    'cash-reserve',
    'brokerage',
    'dividend-portfolio',
    'index-funds',
    'crypto-wallet',
    'home',
    'rental',
    'company',
    'stake',
    'workplace-pension',
    'private-pension',
    'car',
    'art',
    'jewellery',
    'other',
];

/** Seeds backoffice.reference_growth_asset_kind — safe to re-run. */
export class AssetKindSeeder extends Seeder {
    async run(em: EntityManager): Promise<void> {
        const keys = ASSET_KIND_SEED.map(row => row.key);
        await em.nativeDelete(AssetPreset, { key: { $in: STALE_PRESET_KEYS } });
        await em.nativeDelete(AssetKind, { key: { $in: STALE_KIND_KEYS } });
        const existingRows = await em.find(AssetKind, { key: { $in: keys } });
        const existingByKey = new Map(existingRows.map(row => [row.key, row]));
        for (const [sortOrder, row] of ASSET_KIND_SEED.entries()) {
            const existing = existingByKey.get(row.key);
            if (existing) {
                existing.name = row.name;
                existing.description = row.description;
                existing.icon = row.icon;
                existing.canPay = row.canPay;
                existing.sortOrder = sortOrder;
                existing.isActive = true;
                continue;
            }
            em.create(AssetKind, {
                key: row.key,
                name: row.name,
                description: row.description,
                icon: row.icon,
                canPay: row.canPay,
                sortOrder,
                isActive: true,
            } as never);
        }
        await em.flush();
    }
}
