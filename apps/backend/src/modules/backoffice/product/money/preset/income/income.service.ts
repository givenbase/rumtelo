import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';

import type { IncomeKind, Locale } from '@rumtelo/contracts';

import {
    catalogLocaleFromContracts,
    ENTITY_INCOME_SOURCE_PRESET,
    isCatalogSourceLocale,
    TranslationService,
} from '../../../../admin/translation';
import { IncomeSourcePreset } from './income.entity';

@Injectable()
export class IncomeSourcePresetService {
    constructor(
        @Inject(EntityManager) private readonly em: EntityManager,
        @Inject(TranslationService) private readonly translations: TranslationService
    ) {}

    async listActive(filters?: {
        kind?: IncomeKind;
        locale?: Locale | string | null;
    }): Promise<IncomeSourcePreset[]> {
        const rows = await this.em.find(
            IncomeSourcePreset,
            {
                isActive: true,
                ...(filters?.kind ? { kind: filters.kind } : {}),
            },
            { orderBy: { sortOrder: 'ASC' } }
        );
        return this.applyNameTranslations(rows, filters?.locale);
    }

    private async applyNameTranslations(
        rows: IncomeSourcePreset[],
        locale?: Locale | string | null
    ): Promise<IncomeSourcePreset[]> {
        const catalogLocale = catalogLocaleFromContracts(locale);
        if (isCatalogSourceLocale(catalogLocale) || rows.length === 0) return rows;

        const fieldMap = await this.translations.fieldMapForType(
            ENTITY_INCOME_SOURCE_PRESET,
            catalogLocale,
            rows.map(row => row.key)
        );
        return this.translations.applyToMany(
            rows as unknown as Array<Record<string, unknown>>,
            fieldMap,
            ['name'],
            row => String(row.key)
        ) as unknown as IncomeSourcePreset[];
    }
}
