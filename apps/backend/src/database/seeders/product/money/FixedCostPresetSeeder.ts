import type { EntityManager } from '@mikro-orm/postgresql';

import { Seeder } from '@mikro-orm/seeder';

import { FixedCostPreset } from '../../../../modules/backoffice/product/money/preset/fixed-cost/fixed-cost.entity';
import { FIXED_COST_PRESET_SEED } from '../../../../modules/backoffice/product/money/preset/fixed-cost/seed/fixed-cost.seed-data';
import { SUGGESTED_MERCHANTS_BY_PRESET } from '../../../../modules/backoffice/product/money/preset/fixed-cost/seed/suggested-merchants';
import {
    jarTemplateFromMap,
    loadJarTemplateMap,
} from '../../../../modules/backoffice/product/money/require-jar-template';

export class FixedCostPresetSeeder extends Seeder {
    async run(em: EntityManager): Promise<void> {
        const jarByKey = await loadJarTemplateMap(em);
        const keys = FIXED_COST_PRESET_SEED.map(row => row.key);
        const existingRows = await em.find(FixedCostPreset, { key: { $in: keys } });
        const existingByKey = new Map(existingRows.map(row => [row.key, row]));
        for (const [sortOrder, row] of FIXED_COST_PRESET_SEED.entries()) {
            const jarTemplate = jarTemplateFromMap(jarByKey, row.jarKey);
            const suggestedMerchantKeys = [...(SUGGESTED_MERCHANTS_BY_PRESET[row.key] ?? [])];
            const existing = existingByKey.get(row.key);
            if (existing) {
                existing.name = row.name;
                existing.jarTemplate = jarTemplate;
                existing.categoryTemplateKey = row.categoryTemplateKey;
                existing.audienceTags = [...row.audienceTags];
                existing.suggestedMerchantKeys = suggestedMerchantKeys;
                existing.sortOrder = sortOrder;
                existing.isActive = true;
                continue;
            }
            em.create(FixedCostPreset, {
                key: row.key,
                name: row.name,
                jarTemplate,
                categoryTemplateKey: row.categoryTemplateKey,
                audienceTags: [...row.audienceTags],
                suggestedMerchantKeys,
                sortOrder,
                isActive: true,
            } as never);
        }
        await em.flush();
    }
}
