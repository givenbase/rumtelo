import type { EntityManager } from '@mikro-orm/postgresql';

import { Seeder } from '@mikro-orm/seeder';

import { MerchantBanking } from '../../../../modules/backoffice/product/money/preset/merchant/merchant-banking.entity';
import { MerchantBranding } from '../../../../modules/backoffice/product/money/preset/merchant/merchant-branding.entity';
import { MerchantMatching } from '../../../../modules/backoffice/product/money/preset/merchant/merchant-matching.entity';
import { MerchantPreset } from '../../../../modules/backoffice/product/money/preset/merchant/merchant.entity';
import { MERCHANT_PRESET_SEED } from '../../../../modules/backoffice/product/money/preset/merchant/seed';
import {
    jarTemplateFromMap,
    loadJarTemplateMap,
} from '../../../../modules/backoffice/product/money/require-jar-template';

import { loadCategoryTemplates, loadGivingOrganisations, loadMarkets } from './catalog-lookups';

const DEFAULT_MARKETS = ['NL'] as const;
const OWNER = 'MerchantPresetSeeder';

/**
 * Seeds backoffice.reference_money_merchant_preset and its 1:1 children.
 * Requires JarTemplate, CategoryTemplate, Market and GivingOrganisation seeded first.
 */
export class MerchantPresetSeeder extends Seeder {
    async run(em: EntityManager): Promise<void> {
        const jarByKey = await loadJarTemplateMap(em);
        const categoryByKey = await loadCategoryTemplates(em, OWNER);
        const marketByKey = await loadMarkets(em, OWNER);
        const organisationByKey = await loadGivingOrganisations(em, OWNER);

        const seedKeys = new Set(MERCHANT_PRESET_SEED.map(row => row.key));
        const existingRows = await em.find(
            MerchantPreset,
            {},
            { populate: ['matching', 'branding', 'banking', 'markets'] }
        );
        const existingByKey = new Map(existingRows.map(row => [row.key, row]));

        for (const [sortOrder, row] of MERCHANT_PRESET_SEED.entries()) {
            const jarTemplate = jarTemplateFromMap(jarByKey, row.jarKey);
            const categoryTemplate = categoryByKey(row.categoryTemplateKey);
            const givingOrganisation = row.givingOrganisationKey
                ? organisationByKey(row.givingOrganisationKey)
                : null;
            const markets = (row.markets?.length ? row.markets : DEFAULT_MARKETS).map(marketByKey);
            const isActive = row.isActive ?? true;
            const highlight = row.highlight ?? null;
            const matchPriority = row.matchPriority ?? 0;
            const providerIds = { ...row.providerIds };
            const logoDomain = row.logoDomain;
            const website = row.website ?? null;
            const ibanBankCode = row.ibanBankCode?.trim().toUpperCase() || null;

            const existing = existingByKey.get(row.key);
            if (existing) {
                existing.name = row.name;
                existing.jarTemplate = jarTemplate;
                existing.categoryTemplate = categoryTemplate;
                existing.givingOrganisation = givingOrganisation;
                existing.markets.set(markets);
                existing.highlight = highlight;
                existing.sortOrder = sortOrder;
                existing.isActive = isActive;

                const matching =
                    existing.matching ?? em.create(MerchantMatching, { preset: existing } as never);
                matching.matchValue = row.matchValue;
                matching.aliases = [...row.aliases];
                matching.mcc = row.mcc;
                matching.matchPriority = matchPriority;
                matching.providerIds = providerIds;
                if (!existing.matching) {
                    existing.matching = matching;
                    em.persist(matching);
                }

                const branding =
                    existing.branding ?? em.create(MerchantBranding, { preset: existing } as never);
                branding.logoDomain = logoDomain;
                branding.website = website;
                if (!existing.branding) {
                    existing.branding = branding;
                    em.persist(branding);
                }

                if (ibanBankCode) {
                    const banking =
                        existing.banking ??
                        em.create(MerchantBanking, { preset: existing } as never);
                    banking.ibanBankCode = ibanBankCode;
                    if (!existing.banking) {
                        existing.banking = banking;
                        em.persist(banking);
                    }
                } else if (existing.banking) {
                    em.remove(existing.banking);
                    existing.banking = null;
                }
                continue;
            }

            const preset = em.create(MerchantPreset, {
                key: row.key,
                name: row.name,
                jarTemplate,
                categoryTemplate,
                givingOrganisation,
                highlight,
                sortOrder,
                isActive,
            } as never);
            preset.markets.set(markets);

            preset.matching = em.create(MerchantMatching, {
                preset,
                matchValue: row.matchValue,
                aliases: [...row.aliases],
                mcc: row.mcc,
                matchPriority,
                providerIds,
            } as never);

            preset.branding = em.create(MerchantBranding, {
                preset,
                logoDomain,
                website,
            } as never);

            if (ibanBankCode) {
                preset.banking = em.create(MerchantBanking, { preset, ibanBankCode } as never);
            }
        }

        for (const row of existingRows) {
            if (!seedKeys.has(row.key)) row.isActive = false;
        }
        await em.flush();
    }
}
