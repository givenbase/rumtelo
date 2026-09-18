import type { EntityManager } from '@mikro-orm/postgresql';

import { Seeder } from '@mikro-orm/seeder';

import { GoalPreset } from '../../../../modules/backoffice/product/money/preset/goal/goal.entity';
import { GOAL_PRESET_SEED } from '../../../../modules/backoffice/product/money/preset/goal/seed/goal.seed-data';
import {
    jarTemplateFromMap,
    loadJarTemplateMap,
} from '../../../../modules/backoffice/product/money/require-jar-template';

import { loadCategoryTemplates } from './catalog-lookups';

/** Seeds backoffice.reference_money_goal_preset. Requires Jar + Category templates first. */
export class GoalPresetSeeder extends Seeder {
    async run(em: EntityManager): Promise<void> {
        const jarByKey = await loadJarTemplateMap(em);
        const categoryByKey = await loadCategoryTemplates(em, 'GoalPresetSeeder');
        const keys = GOAL_PRESET_SEED.map(row => row.key);
        const existingRows = await em.find(GoalPreset, { key: { $in: keys } });
        const existingByKey = new Map(existingRows.map(row => [row.key, row]));
        for (const [sortOrder, row] of GOAL_PRESET_SEED.entries()) {
            const jarTemplate = jarTemplateFromMap(jarByKey, row.jarKey);
            const categoryTemplate = row.categoryTemplateKey
                ? categoryByKey(row.categoryTemplateKey)
                : null;
            const existing = existingByKey.get(row.key);
            if (existing) {
                existing.name = row.name;
                existing.jarTemplate = jarTemplate;
                existing.categoryTemplate = categoryTemplate;
                existing.icon = row.icon ?? null;
                existing.sortOrder = sortOrder;
                existing.isActive = true;
                continue;
            }
            em.create(GoalPreset, {
                key: row.key,
                name: row.name,
                jarTemplate,
                categoryTemplate,
                icon: row.icon ?? null,
                sortOrder,
                isActive: true,
            } as never);
        }
        await em.flush();
    }
}
