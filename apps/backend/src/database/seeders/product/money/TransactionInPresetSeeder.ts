import type { EntityManager } from '@mikro-orm/postgresql';

import { Seeder } from '@mikro-orm/seeder';

import { TransactionInPreset } from '../../../../modules/backoffice/product/money/preset/transaction-in/transaction-in.entity';
import { TRANSACTION_IN_PRESET_SEED } from '../../../../modules/backoffice/product/money/preset/transaction-in/seed/transaction-in.seed-data';

export class TransactionInPresetSeeder extends Seeder {
    async run(em: EntityManager): Promise<void> {
        const keys = TRANSACTION_IN_PRESET_SEED.map(row => row.key);
        const seedKeys = new Set<string>(keys);
        const existingRows = await em.find(TransactionInPreset, {});
        const existingByKey = new Map(existingRows.map(row => [row.key, row]));
        for (const [sortOrder, row] of TRANSACTION_IN_PRESET_SEED.entries()) {
            const existing = existingByKey.get(row.key);
            if (existing) {
                existing.name = row.name;
                existing.groupLabel = row.groupLabel;
                existing.icon = row.icon;
                existing.jarKey = row.jarKey;
                existing.sortOrder = sortOrder;
                existing.isActive = true;
                continue;
            }
            em.create(TransactionInPreset, {
                key: row.key,
                name: row.name,
                groupLabel: row.groupLabel,
                icon: row.icon,
                jarKey: row.jarKey,
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
