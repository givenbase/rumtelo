import type { EntityManager } from '@mikro-orm/postgresql';

import { Seeder } from '@mikro-orm/seeder';

import { FixedCostPreset } from '../../../../modules/backoffice/product/money/preset/fixed-cost/fixed-cost.entity';
import { FIXED_COST_PRESET_SEED } from '../../../../modules/backoffice/product/money/preset/fixed-cost/seed/fixed-cost.seed-data';
import { SUGGESTED_DUE_DAY_BY_PRESET } from '../../../../modules/backoffice/product/money/preset/fixed-cost/seed/suggested-due-days';
import { SUGGESTED_MERCHANTS_BY_PRESET } from '../../../../modules/backoffice/product/money/preset/fixed-cost/seed/suggested-merchants';
import { AUDIENCE_SEED } from '../../../../modules/backoffice/product/money/catalog/audience/seed/audience.seed-data';
import {
    jarTemplateFromMap,
    loadJarTemplateMap,
} from '../../../../modules/backoffice/product/money/require-jar-template';

const AUDIENCE_KEYS = new Set<string>(AUDIENCE_SEED.map(row => row.key));

function assertAudienceKeys(presetKey: string, audienceKeys: readonly string[]): void {
    const unknown = audienceKeys.filter(key => !AUDIENCE_KEYS.has(key));
    if (unknown.length > 0) {
        throw new Error(
            `FixedCostPresetSeeder: ${presetKey} references unknown audience key(s): ${unknown.join(', ')}`
        );
    }
}

export class FixedCostPresetSeeder extends Seeder {
    async run(em: EntityManager): Promise<void> {
        const jarByKey = await loadJarTemplateMap(em);
        const keys = FIXED_COST_PRESET_SEED.map(row => row.key);
        const existingRows = await em.find(FixedCostPreset, { key: { $in: keys } });
        const existingByKey = new Map(existingRows.map(row => [row.key, row]));
        for (const [sortOrder, row] of FIXED_COST_PRESET_SEED.entries()) {
            assertAudienceKeys(row.key, row.audienceKeys);
            const jarTemplate = jarTemplateFromMap(jarByKey, row.jarKey);
            const suggestedMerchantKeys = [...(SUGGESTED_MERCHANTS_BY_PRESET[row.key] ?? [])];
            const suggestedDueDay = SUGGESTED_DUE_DAY_BY_PRESET[row.key] ?? null;
            const existing = existingByKey.get(row.key);
            if (existing) {
                existing.name = row.name;
                existing.jarTemplate = jarTemplate;
                existing.categoryTemplateKey = row.categoryTemplateKey;
                existing.audienceKeys = [...row.audienceKeys];
                existing.suggestedMerchantKeys = suggestedMerchantKeys;
                existing.suggestedDueDay = suggestedDueDay;
                existing.sortOrder = sortOrder;
                existing.isActive = true;
                continue;
            }
            em.create(FixedCostPreset, {
                key: row.key,
                name: row.name,
                jarTemplate,
                categoryTemplateKey: row.categoryTemplateKey,
                audienceKeys: [...row.audienceKeys],
                suggestedMerchantKeys,
                suggestedDueDay,
                sortOrder,
                isActive: true,
            } as never);
        }
        await em.flush();
    }
}
