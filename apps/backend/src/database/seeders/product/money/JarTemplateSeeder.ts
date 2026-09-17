import type { EntityManager } from '@mikro-orm/postgresql';

import { Seeder } from '@mikro-orm/seeder';

import { JarTemplate } from '../../../../modules/backoffice/product/money/template/jar/jar.entity';
import { JAR_TEMPLATE_SEED } from '../../../../modules/backoffice/product/money/template/jar/seed/jar.seed-data';

export class JarTemplateSeeder extends Seeder {
    async run(em: EntityManager): Promise<void> {
        const keys = JAR_TEMPLATE_SEED.map(row => row.key);
        const existingRows = await em.find(JarTemplate, { key: { $in: keys } });
        const existingByKey = new Map(existingRows.map(row => [row.key, row]));
        for (const [sortOrder, row] of JAR_TEMPLATE_SEED.entries()) {
            const existing = existingByKey.get(row.key);
            if (existing) {
                existing.name = row.name;
                existing.subtitle = row.subtitle;
                existing.icon = row.icon;
                existing.defaultPercentage = row.defaultPercentage;
                existing.capabilities = { ...row.capabilities };
                existing.guidePayload = structuredClone(row.guide);
                existing.sortOrder = sortOrder;
                existing.isActive = true;
                continue;
            }
            em.create(JarTemplate, {
                key: row.key,
                name: row.name,
                subtitle: row.subtitle,
                icon: row.icon,
                defaultPercentage: row.defaultPercentage,
                capabilities: { ...row.capabilities },
                guidePayload: structuredClone(row.guide),
                sortOrder,
                isActive: true,
            } as never);
        }
        await em.flush();
    }
}
