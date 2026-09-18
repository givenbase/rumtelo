import type { EntityManager } from '@mikro-orm/postgresql';

import { Seeder } from '@mikro-orm/seeder';

import { Market } from '../../../../modules/backoffice/product/money/catalog/market/market.entity';
import { MARKET_SEED } from '../../../../modules/backoffice/product/money/catalog/market/seed/market.seed-data';

/** Seeds backoffice.reference_money_market — safe to re-run. */
export class MarketSeeder extends Seeder {
    async run(em: EntityManager): Promise<void> {
        const seedKeys = new Set(MARKET_SEED.map(row => row.key));
        const existingRows = await em.find(Market, {});
        const existingByKey = new Map(existingRows.map(row => [row.key, row]));
        for (const [sortOrder, row] of MARKET_SEED.entries()) {
            const isActive = row.isActive ?? true;
            const existing = existingByKey.get(row.key);
            if (existing) {
                existing.name = row.name;
                existing.sortOrder = sortOrder;
                existing.isActive = isActive;
                continue;
            }
            em.create(Market, { key: row.key, name: row.name, sortOrder, isActive } as never);
        }
        for (const row of existingRows) {
            if (!seedKeys.has(row.key)) row.isActive = false;
        }
        await em.flush();
    }
}
