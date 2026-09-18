import type { EntityManager } from '@mikro-orm/postgresql';

import { Seeder } from '@mikro-orm/seeder';

import { IncomePosture } from '../../../../modules/backoffice/product/growth/catalog/income-posture/income-posture.entity';
import { INCOME_POSTURE_SEED } from '../../../../modules/backoffice/product/growth/catalog/income-posture/seed/income-posture.seed-data';

/** Seeds backoffice.reference_growth_income_posture — safe to re-run. */
export class IncomePostureSeeder extends Seeder {
    async run(em: EntityManager): Promise<void> {
        const keys = INCOME_POSTURE_SEED.map(row => row.key);
        const existingRows = await em.find(IncomePosture, { key: { $in: keys } });
        const existingByKey = new Map(existingRows.map(row => [row.key, row]));
        for (const [sortOrder, row] of INCOME_POSTURE_SEED.entries()) {
            const existing = existingByKey.get(row.key);
            if (existing) {
                existing.name = row.name;
                existing.description = row.description;
                existing.sortOrder = sortOrder;
                existing.isActive = true;
                continue;
            }
            em.create(IncomePosture, {
                key: row.key,
                name: row.name,
                description: row.description,
                sortOrder,
                isActive: true,
            } as never);
        }
        await em.flush();
    }
}
