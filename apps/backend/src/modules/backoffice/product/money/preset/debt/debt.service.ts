import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';

import type { DebtKind, Locale } from '@rumtelo/contracts';

import {
    catalogLocaleFromContracts,
    ENTITY_DEBT_PRESET,
    isCatalogSourceLocale,
    TranslationService,
} from '../../../../admin/translation';
import { DebtPreset } from './debt.entity';

@Injectable()
export class DebtPresetService {
    constructor(
        @Inject(EntityManager) private readonly em: EntityManager,
        @Inject(TranslationService) private readonly translations: TranslationService
    ) {}

    async listActive(filters?: {
        kind?: DebtKind;
        locale?: Locale | string | null;
    }): Promise<DebtPreset[]> {
        const rows = await this.em.find(
            DebtPreset,
            {
                isActive: true,
                ...(filters?.kind ? { kind: filters.kind } : {}),
            },
            { orderBy: { sortOrder: 'ASC' }, populate: ['merchantLinks.merchant'] }
        );
        return this.applyNameTranslations(rows, filters?.locale);
    }

    private async applyNameTranslations(
        rows: DebtPreset[],
        locale?: Locale | string | null
    ): Promise<DebtPreset[]> {
        const catalogLocale = catalogLocaleFromContracts(locale);
        if (isCatalogSourceLocale(catalogLocale) || rows.length === 0) return rows;

        const fieldMap = await this.translations.fieldMapForType(
            ENTITY_DEBT_PRESET,
            catalogLocale,
            rows.map(row => row.key)
        );
        return this.translations.applyToMany(
            rows as unknown as Array<Record<string, unknown>>,
            fieldMap,
            ['name'],
            row => String(row.key)
        ) as unknown as DebtPreset[];
    }
}
