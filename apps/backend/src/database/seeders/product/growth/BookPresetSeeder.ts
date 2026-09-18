import type { EntityManager } from '@mikro-orm/postgresql';

import { Seeder } from '@mikro-orm/seeder';

import { BookPreset } from '../../../../modules/backoffice/product/growth/preset/learn/book/book.entity';
import { BOOK_PRESET_SEED } from '../../../../modules/backoffice/product/growth/preset/learn/book/seed/book.seed-data';

/**
 * Seeds backoffice.reference_growth_book_preset.
 * Rumtelo-owned recommendations — no household rows.
 */
export class BookPresetSeeder extends Seeder {
    async run(em: EntityManager): Promise<void> {
        const keys = BOOK_PRESET_SEED.map(row => row.key);
        const existingRows = await em.find(BookPreset, { key: { $in: keys } });
        const existingByKey = new Map(existingRows.map(row => [row.key, row]));

        for (const [sortOrder, row] of BOOK_PRESET_SEED.entries()) {
            const existing = existingByKey.get(row.key);
            const fields = {
                name: row.name,
                description: row.description,
                author: row.author,
                skill: row.skill ?? 'MONEY',
                topic: row.topic,
                minPlan: row.minPlan,
                spendingStyles: [...row.spendingStyles],
                coverId: row.coverId,
                isbn13: row.isbn13,
                url: row.url,
                sortOrder,
                isActive: true,
            };
            if (existing) {
                Object.assign(existing, fields);
                continue;
            }
            em.create(BookPreset, { key: row.key, ...fields } as never);
        }
        await em.flush();
    }
}
