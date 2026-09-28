import type { EntityManager } from '@mikro-orm/postgresql';

import { Seeder } from '@mikro-orm/seeder';

import { MerchantPreset } from '../../../../modules/backoffice/product/money/preset/merchant/merchant.entity';
import { WATCH_PRESET_SEED } from '../../../../modules/backoffice/product/growth/preset/learn/watch/seed/watch.seed-data';
import { WatchPreset } from '../../../../modules/backoffice/product/growth/preset/learn/watch/watch.entity';

/**
 * Seeds backoffice.reference_growth_watch_preset.
 * Rumtelo-owned recommendations — no household rows.
 * merchantKey on a seed row must already exist as MerchantPreset.key.
 */
export class WatchPresetSeeder extends Seeder {
    async run(em: EntityManager): Promise<void> {
        const keys = WATCH_PRESET_SEED.map(row => row.key);
        const merchantKeys = [
            ...new Set(
                WATCH_PRESET_SEED.map(row => row.merchantKey).filter((key): key is string =>
                    Boolean(key)
                )
            ),
        ];
        const merchants = await em.find(MerchantPreset, { key: { $in: merchantKeys } });
        const merchantByKey = new Map(merchants.map(row => [row.key, row]));
        for (const key of merchantKeys) {
            const merchant = merchantByKey.get(key);
            if (!merchant) {
                throw new Error(
                    `WatchPresetSeeder: unknown MerchantPreset key "${key}" — seed money merchants first`
                );
            }
        }

        const existingRows = await em.find(WatchPreset, { key: { $in: keys } });
        const existingByKey = new Map(existingRows.map(row => [row.key, row]));

        for (const [sortOrder, row] of WATCH_PRESET_SEED.entries()) {
            const existing = existingByKey.get(row.key);
            const merchant = row.merchantKey ? (merchantByKey.get(row.merchantKey) ?? null) : null;
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
                merchant,
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
