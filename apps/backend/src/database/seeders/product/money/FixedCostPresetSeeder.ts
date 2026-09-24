import type { EntityManager } from '@mikro-orm/postgresql';

import { Seeder } from '@mikro-orm/seeder';
import { Cadence } from '@rumtelo/contracts';

import { FixedCostPresetMerchant } from '../../../../modules/backoffice/product/money/preset/fixed-cost/fixed-cost-merchant.entity';
import { FixedCostPreset } from '../../../../modules/backoffice/product/money/preset/fixed-cost/fixed-cost.entity';
import { CADENCE_BY_PRESET } from '../../../../modules/backoffice/product/money/preset/fixed-cost/seed/cadences';
import { DUE_DAY_BY_PRESET } from '../../../../modules/backoffice/product/money/preset/fixed-cost/seed/due-days';
import { FIXED_COST_PRESET_SEED } from '../../../../modules/backoffice/product/money/preset/fixed-cost/seed/fixed-cost.seed-data';
import { MERCHANT_KEYS_BY_PRESET } from '../../../../modules/backoffice/product/money/preset/fixed-cost/seed/merchant-keys';
import {
    jarTemplateFromMap,
    loadJarTemplateMap,
} from '../../../../modules/backoffice/product/money/require-jar-template';

import {
    loadAudiences,
    loadCategoryTemplates,
    loadMerchantPresets,
    syncOrderedMerchantLinks,
} from './catalog-lookups';

const OWNER = 'FixedCostPresetSeeder';

/**
 * Seeds backoffice.reference_money_fixed_cost_preset, its audience N:M and its
 * ordered merchant links. Requires JarTemplate, CategoryTemplate, Audience and
 * MerchantPreset seeded first.
 */
export class FixedCostPresetSeeder extends Seeder {
    async run(em: EntityManager): Promise<void> {
        const jarByKey = await loadJarTemplateMap(em);
        const categoryByKey = await loadCategoryTemplates(em, OWNER);
        const audienceByKey = await loadAudiences(em, OWNER);
        const merchantByKey = await loadMerchantPresets(em, OWNER);

        const keys = FIXED_COST_PRESET_SEED.map(row => row.key);
        const existingRows = await em.find(
            FixedCostPreset,
            { key: { $in: keys } },
            { populate: ['audiences', 'merchantLinks.merchant'] }
        );
        const existingByKey = new Map(existingRows.map(row => [row.key, row]));

        for (const [sortOrder, row] of FIXED_COST_PRESET_SEED.entries()) {
            const jarTemplate = jarTemplateFromMap(jarByKey, row.jarKey);
            const categoryTemplate = categoryByKey(row.categoryTemplateKey);
            const audiences = row.audienceKeys.map(audienceByKey);
            const merchantKeys = MERCHANT_KEYS_BY_PRESET[row.key] ?? [];
            const dueDay = DUE_DAY_BY_PRESET[row.key] ?? null;
            const cadence = CADENCE_BY_PRESET[row.key] ?? Cadence.MONTHLY;

            const existing = existingByKey.get(row.key);
            if (existing) {
                existing.name = row.name;
                existing.jarTemplate = jarTemplate;
                existing.categoryTemplate = categoryTemplate;
                existing.dueDay = dueDay;
                existing.cadence = cadence;
                existing.sortOrder = sortOrder;
                existing.isActive = true;
            }
            const preset: FixedCostPreset =
                existing ??
                em.create(FixedCostPreset, {
                    key: row.key,
                    name: row.name,
                    jarTemplate,
                    categoryTemplate,
                    dueDay,
                    cadence,
                    sortOrder,
                    isActive: true,
                } as never);
            preset.audiences.set(audiences);

            syncOrderedMerchantLinks(
                preset.merchantLinks,
                merchantKeys.map(merchantByKey),
                (merchant, merchantSortOrder) =>
                    em.create(FixedCostPresetMerchant, {
                        preset,
                        merchant,
                        sortOrder: merchantSortOrder,
                    } as never)
            );
        }
        await em.flush();
    }
}
