import type { EntityManager } from '@mikro-orm/postgresql';

import { Seeder } from '@mikro-orm/seeder';

import { Audience } from '../../../../modules/backoffice/product/money/catalog/audience/audience.entity';
import { AUDIENCE_SEED } from '../../../../modules/backoffice/product/money/catalog/audience/seed/audience.seed-data';

export class AudienceSeeder extends Seeder {
    async run(em: EntityManager): Promise<void> {
        const keys = AUDIENCE_SEED.map(row => row.key);
        const seedKeys = new Set<string>(keys);
        const existingRows = await em.find(Audience, {});
        const existingByKey = new Map(existingRows.map(row => [row.key, row]));
        for (const [sortOrder, row] of AUDIENCE_SEED.entries()) {
            const existing = existingByKey.get(row.key);
            if (existing) {
                existing.name = row.name;
                existing.description = row.description;
                existing.isBaseline = row.isBaseline;
                existing.icon = row.icon;
                existing.accentColor = row.accentColor;
                existing.softColor = row.softColor;
                existing.sortOrder = sortOrder;
                existing.isActive = true;
                continue;
            }
            em.create(Audience, {
                key: row.key,
                name: row.name,
                description: row.description,
                isBaseline: row.isBaseline,
                icon: row.icon,
                accentColor: row.accentColor,
                softColor: row.softColor,
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
