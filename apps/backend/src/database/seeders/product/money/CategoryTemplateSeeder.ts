import type { EntityManager } from '@mikro-orm/postgresql';

import { Seeder } from '@mikro-orm/seeder';

import { CategoryTemplate } from '../../../../modules/backoffice/product/money/template/category/category.entity';
import { CATEGORY_TEMPLATE_SEED } from '../../../../modules/backoffice/product/money/template/category/seed/category.seed-data';
import {
    jarTemplateFromMap,
    loadJarTemplateMap,
} from '../../../../modules/backoffice/product/money/require-jar-template';

export class CategoryTemplateSeeder extends Seeder {
    async run(em: EntityManager): Promise<void> {
        const jarByKey = await loadJarTemplateMap(em);
        const keys = CATEGORY_TEMPLATE_SEED.map(row => row.key);
        const seedKeys = new Set(keys);
        const existingRows = await em.find(CategoryTemplate, { key: { $in: keys } });
        const existingByKey = new Map(existingRows.map(row => [row.key, row]));
        for (const [sortOrder, row] of CATEGORY_TEMPLATE_SEED.entries()) {
            const jarTemplate = jarTemplateFromMap(jarByKey, row.jarKey);
            const existing = existingByKey.get(row.key);
            if (existing) {
                existing.name = row.name;
                existing.icon = row.icon;
                existing.jarTemplate = jarTemplate;
                existing.sortOrder = sortOrder;
                existing.isActive = true;
                continue;
            }
            em.create(CategoryTemplate, {
                key: row.key,
                name: row.name,
                icon: row.icon,
                jarTemplate,
                sortOrder,
                isActive: true,
            } as never);
        }
        // Soft-remove templates no longer in the English spine (e.g. CARE → Pharmacy/…).
        const orphaned = await em.find(CategoryTemplate, { key: { $nin: [...seedKeys] } });
        for (const row of orphaned) {
            row.isActive = false;
        }
        await em.flush();
    }
}
