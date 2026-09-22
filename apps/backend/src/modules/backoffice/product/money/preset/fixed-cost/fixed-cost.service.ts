import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';

import type { JarKey, Locale } from '@rumtelo/contracts';

import {
    catalogLocaleFromContracts,
    ENTITY_FIXED_COST_PRESET,
    isCatalogSourceLocale,
    TranslationService,
} from '../../../../admin/translation';
import { FixedCostPreset } from './fixed-cost.entity';

@Injectable()
export class FixedCostPresetService {
    constructor(
        @Inject(EntityManager) private readonly em: EntityManager,
        @Inject(TranslationService) private readonly translations: TranslationService
    ) {}

    /** Active presets, all filters applied in SQL; relations populated for DTO mapping. */
    async listActive(filters?: {
        jarKey?: JarKey;
        categoryTemplateKey?: string;
        audienceKey?: string;
        locale?: Locale | string | null;
    }): Promise<FixedCostPreset[]> {
        const rows = await this.em.find(
            FixedCostPreset,
            {
                isActive: true,
                ...(filters?.jarKey ? { jarTemplate: { key: filters.jarKey } } : {}),
                ...(filters?.categoryTemplateKey
                    ? { categoryTemplate: { key: filters.categoryTemplateKey } }
                    : {}),
                ...(filters?.audienceKey ? { audiences: { key: filters.audienceKey } } : {}),
            },
            {
                orderBy: { sortOrder: 'ASC' },
                populate: [
                    'jarTemplate',
                    'categoryTemplate',
                    'audiences',
                    'merchantLinks.merchant',
                ],
            }
        );
        return this.applyNameTranslations(rows, filters?.locale);
    }

    private async applyNameTranslations(
        rows: FixedCostPreset[],
        locale?: Locale | string | null
    ): Promise<FixedCostPreset[]> {
        const catalogLocale = catalogLocaleFromContracts(locale);
        if (isCatalogSourceLocale(catalogLocale) || rows.length === 0) return rows;

        const fieldMap = await this.translations.fieldMapForType(
            ENTITY_FIXED_COST_PRESET,
            catalogLocale,
            rows.map(row => row.key)
        );
        return this.translations.applyToMany(
            rows as unknown as Array<Record<string, unknown>>,
            fieldMap,
            ['name'],
            row => String(row.key)
        ) as unknown as FixedCostPreset[];
    }
}
