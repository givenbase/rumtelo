import type { EntityManager } from '@mikro-orm/postgresql';

import { Seeder } from '@mikro-orm/seeder';

import { MerchantPreset } from '../../../../modules/backoffice/product/money/preset/merchant/merchant.entity';
import { MERCHANT_PRESET_SEED } from '../../../../modules/backoffice/product/money/preset/merchant/seed';
import {
    jarTemplateFromMap,
    loadJarTemplateMap,
} from '../../../../modules/backoffice/product/money/require-jar-template';

export class MerchantPresetSeeder extends Seeder {
    async run(em: EntityManager): Promise<void> {
        const jarByKey = await loadJarTemplateMap(em);
        const keys = MERCHANT_PRESET_SEED.map(row => row.key);
        const existingRows = await em.find(MerchantPreset, { key: { $in: keys } });
        const existingByKey = new Map(existingRows.map(row => [row.key, row]));
        for (const [sortOrder, row] of MERCHANT_PRESET_SEED.entries()) {
            const jarTemplate = jarTemplateFromMap(jarByKey, row.jarKey);
            const isActive = row.isActive ?? true;
            const highlight = row.highlight ?? null;
            const logoDomain = row.logoDomain;
            const website = row.website ?? null;
            const markets = row.markets?.length ? [...row.markets] : ['NL'];
            const matchPriority = row.matchPriority ?? 0;
            const providerIds = { ...row.providerIds };
            const existing = existingByKey.get(row.key);
            if (existing) {
                existing.name = row.name;
                existing.matchValue = row.matchValue;
                existing.aliases = [...row.aliases];
                existing.mcc = row.mcc;
                existing.jarTemplate = jarTemplate;
                existing.categoryTemplateKey = row.categoryTemplateKey;
                existing.logoDomain = logoDomain;
                existing.website = website;
                existing.highlight = highlight;
                existing.markets = markets;
                existing.matchPriority = matchPriority;
                existing.providerIds = providerIds;
                existing.sortOrder = sortOrder;
                existing.isActive = isActive;
                continue;
            }
            em.create(MerchantPreset, {
                key: row.key,
                name: row.name,
                matchValue: row.matchValue,
                aliases: [...row.aliases],
                mcc: row.mcc,
                jarTemplate,
                categoryTemplateKey: row.categoryTemplateKey,
                logoDomain,
                website,
                highlight,
                markets,
                matchPriority,
                providerIds,
                sortOrder,
                isActive,
            } as never);
        }
        await em.flush();
    }
}
