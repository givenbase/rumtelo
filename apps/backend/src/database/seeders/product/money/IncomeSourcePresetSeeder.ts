import type { EntityManager } from '@mikro-orm/postgresql';

import { Seeder } from '@mikro-orm/seeder';

import { IncomeSourcePreset } from '../../../../modules/backoffice/product/money/preset/income/income.entity';
import { INCOME_SOURCE_PRESET_SEED } from '../../../../modules/backoffice/product/money/preset/income/seed/income.seed-data';

export class IncomeSourcePresetSeeder extends Seeder {
    async run(em: EntityManager): Promise<void> {
        const keys = INCOME_SOURCE_PRESET_SEED.map(row => row.key);
        const seedKeys = new Set<string>(keys);
        const existingRows = await em.find(IncomeSourcePreset, {});
        const existingByKey = new Map(existingRows.map(row => [row.key, row]));
        for (const [sortOrder, row] of INCOME_SOURCE_PRESET_SEED.entries()) {
            const existing = existingByKey.get(row.key);
            if (existing) {
                existing.name = row.name;
                existing.kind = row.kind;
                existing.cadence = row.cadence;
                existing.icon = row.icon;
                existing.sortOrder = sortOrder;
                existing.isActive = true;
                continue;
            }
            em.create(IncomeSourcePreset, {
                key: row.key,
                name: row.name,
                kind: row.kind,
                cadence: row.cadence,
                icon: row.icon,
                sortOrder,
                isActive: true,
            } as never);
        }
        for (const row of existingRows) {
            if (!seedKeys.has(row.key)) row.isActive = false;
        }
        await em.flush();
    }
}
