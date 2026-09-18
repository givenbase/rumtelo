import type { EntityManager } from '@mikro-orm/postgresql';

import { Seeder } from '@mikro-orm/seeder';

import { WATCH_PRESET_SEED } from '../../../../modules/backoffice/product/growth/preset/learn/watch/seed/watch.seed-data';
import { WatchPreset } from '../../../../modules/backoffice/product/growth/preset/learn/watch/watch.entity';

/**
 * Seeds backoffice.reference_growth_watch_preset.
 * Rumtelo-owned recommendations — no household rows.
 */
export class WatchPresetSeeder extends Seeder {
    async run(em: EntityManager): Promise<void> {
        const keys = WATCH_PRESET_SEED.map(row => row.key);
        const existingRows = await em.find(WatchPreset, { key: { $in: keys } });
        const existingByKey = new Map(existingRows.map(row => [row.key, row]));

        for (const [sortOrder, row] of WATCH_PRESET_SEED.entries()) {
            const existing = existingByKey.get(row.key);
            const fields = {
                name: row.name,
                description: row.description,
                creator: row.creator,
                skill: row.skill ?? 'MONEY',
                topic: row.topic,
                minPlan: row.minPlan,
                spendingStyles: [...row.spendingStyles],
                format: row.format,
                youtubeId: row.youtubeId,
                url: row.url,
                watchUrl: row.watchUrl,
                sortOrder,
                isActive: true,
            };
            if (existing) {
                Object.assign(existing, fields);
                continue;
            }
            em.create(WatchPreset, { key: row.key, ...fields } as never);
        }
        await em.flush();
    }
}
