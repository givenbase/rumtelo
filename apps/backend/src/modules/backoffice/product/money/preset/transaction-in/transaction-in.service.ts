import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';

import type { Locale } from '@rumtelo/contracts';

import {
    catalogLocaleFromContracts,
    ENTITY_TRANSACTION_IN_PRESET,
    isCatalogSourceLocale,
    TranslationService,
} from '../../../../admin/translation';
import { TransactionInPreset } from './transaction-in.entity';

@Injectable()
export class TransactionInPresetService {
    constructor(
        @Inject(EntityManager) private readonly em: EntityManager,
        @Inject(TranslationService) private readonly translations: TranslationService
    ) {}

    async listActive(locale?: Locale | string | null): Promise<TransactionInPreset[]> {
        const rows = await this.em.find(
            TransactionInPreset,
            { isActive: true },
            { orderBy: { sortOrder: 'ASC' } }
        );
        return this.applyTranslations(rows, locale);
    }

    private async applyTranslations(
        rows: TransactionInPreset[],
        locale?: Locale | string | null
    ): Promise<TransactionInPreset[]> {
        const catalogLocale = catalogLocaleFromContracts(locale);
        if (isCatalogSourceLocale(catalogLocale) || rows.length === 0) return rows;

        const fieldMap = await this.translations.fieldMapForType(
            ENTITY_TRANSACTION_IN_PRESET,
            catalogLocale,
            rows.map(row => row.key)
        );
        return this.translations.applyToMany(
            rows as unknown as Array<Record<string, unknown>>,
            fieldMap,
            ['name', 'groupName'],
            row => String(row.key)
        ) as unknown as TransactionInPreset[];
    }
}
