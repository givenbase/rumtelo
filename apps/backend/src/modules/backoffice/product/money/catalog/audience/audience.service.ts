import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';

import type { Locale } from '@rumtelo/contracts';

import {
    catalogLocaleFromContracts,
    ENTITY_AUDIENCE,
    isCatalogSourceLocale,
    TranslationService,
} from '../../../../admin/translation';
import { Audience } from './audience.entity';

@Injectable()
export class AudienceService {
    constructor(
        @Inject(EntityManager) private readonly em: EntityManager,
        @Inject(TranslationService) private readonly translations: TranslationService
    ) {}

    async listActive(locale?: Locale | string | null): Promise<Audience[]> {
        const rows = await this.em.find(
            Audience,
            { isActive: true },
            { orderBy: { sortOrder: 'ASC' } }
        );
        return this.applyTranslations(rows, locale);
    }

    private async applyTranslations(
        rows: Audience[],
        locale?: Locale | string | null
    ): Promise<Audience[]> {
        const catalogLocale = catalogLocaleFromContracts(locale);
        if (isCatalogSourceLocale(catalogLocale) || rows.length === 0) return rows;

        const fieldMap = await this.translations.fieldMapForType(
            ENTITY_AUDIENCE,
            catalogLocale,
            rows.map(row => row.key)
        );
        return this.translations.applyToMany(
            rows as unknown as Array<Record<string, unknown>>,
            fieldMap,
            ['name', 'description'],
            row => String(row.key)
        ) as unknown as Audience[];
    }
}
