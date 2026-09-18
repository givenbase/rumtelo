import type { EntityManager } from '@mikro-orm/postgresql';

import { Seeder } from '@mikro-orm/seeder';

import { WealthStage } from '../../../../modules/backoffice/product/growth/catalog/wealth-stage/wealth-stage.entity';
import { WEALTH_STAGE_SEED } from '../../../../modules/backoffice/product/growth/catalog/wealth-stage/seed/wealth-stage.seed-data';

/** Seeds backoffice.reference_growth_wealth_stage — safe to re-run. */
export class WealthStageSeeder extends Seeder {
    async run(em: EntityManager): Promise<void> {
        const keys = WEALTH_STAGE_SEED.map(row => row.key);
        const existingRows = await em.find(WealthStage, { key: { $in: keys } });
        const existingByKey = new Map(existingRows.map(row => [row.key, row]));
        for (const [sortOrder, row] of WEALTH_STAGE_SEED.entries()) {
            const existing = existingByKey.get(row.key);
            if (existing) {
                existing.name = row.name;
                existing.description = row.description;
                existing.badgeLabel = row.badgeLabel;
                existing.minNetWorth = row.minNetWorth;
                existing.sortOrder = sortOrder;
                existing.isActive = true;
                continue;
            }
            em.create(WealthStage, {
                key: row.key,
                name: row.name,
                description: row.description,
                badgeLabel: row.badgeLabel,
                minNetWorth: row.minNetWorth,
                sortOrder,
                isActive: true,
            } as never);
        }
        await em.flush();
    }
}
