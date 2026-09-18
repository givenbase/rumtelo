import type { EntityManager } from '@mikro-orm/postgresql';

import { Seeder } from '@mikro-orm/seeder';

import { DebtPresetMerchant } from '../../../../modules/backoffice/product/money/preset/debt/debt-merchant.entity';
import { DebtPreset } from '../../../../modules/backoffice/product/money/preset/debt/debt.entity';
import { DEBT_PRESET_SEED } from '../../../../modules/backoffice/product/money/preset/debt/seed/debt.seed-data';

import { loadMerchantPresets } from './catalog-lookups';

/**
 * Seeds backoffice.reference_money_debt_preset and its ordered merchant links.
 * Requires MerchantPreset seeded first.
 */
export class DebtPresetSeeder extends Seeder {
    async run(em: EntityManager): Promise<void> {
        const merchantByKey = await loadMerchantPresets(em, 'DebtPresetSeeder');
        const seedKeys = new Set<string>(DEBT_PRESET_SEED.map(row => row.key));
        const existingRows = await em.find(DebtPreset, {}, { populate: ['merchantLinks'] });
        const existingByKey = new Map(existingRows.map(row => [row.key, row]));

        for (const [sortOrder, row] of DEBT_PRESET_SEED.entries()) {
            const existing = existingByKey.get(row.key);
            if (existing) {
                existing.name = row.name;
                existing.kind = row.kind;
                existing.icon = row.icon;
                existing.sortOrder = sortOrder;
                existing.isActive = true;
                existing.merchantLinks.removeAll();
            }
            const preset: DebtPreset =
                existing ??
                em.create(DebtPreset, {
                    key: row.key,
                    name: row.name,
                    kind: row.kind,
                    icon: row.icon,
                    sortOrder,
                    isActive: true,
                } as never);

            for (const [linkOrder, merchantKey] of row.merchantKeys.entries()) {
                preset.merchantLinks.add(
                    em.create(DebtPresetMerchant, {
                        preset,
                        merchant: merchantByKey(merchantKey),
                        sortOrder: linkOrder,
                    } as never)
                );
            }
        }
        for (const row of existingRows) {
            if (!seedKeys.has(row.key)) row.isActive = false;
        }
        await em.flush();
    }
}
