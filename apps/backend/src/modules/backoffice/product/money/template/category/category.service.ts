import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';

import type { JarKey, Locale } from '@rumtelo/contracts';

import {
    catalogLocaleFromContracts,
    ENTITY_CATEGORY_TEMPLATE,
    isCatalogSourceLocale,
    TranslationService,
} from '../../../../admin/translation';
import { CATEGORY_TEMPLATE_SEED } from './seed/category.seed-data';
import { CategoryTemplate } from './category.entity';

@Injectable()
export class CategoryTemplateService {
    constructor(
        @Inject(EntityManager) private readonly em: EntityManager,
        @Inject(TranslationService) private readonly translations: TranslationService
    ) {}

    async listActive(filters?: {
        jarKey?: JarKey;
        locale?: Locale | string | null;
    }): Promise<CategoryTemplate[]> {
        const rows = await this.em.find(
            CategoryTemplate,
            {
                isActive: true,
                ...(filters?.jarKey ? { jarTemplate: { key: filters.jarKey } } : {}),
            },
            { orderBy: { sortOrder: 'ASC' }, populate: ['jarTemplate'] }
        );
        const catalogLocale = catalogLocaleFromContracts(filters?.locale);
        if (isCatalogSourceLocale(catalogLocale) || rows.length === 0) return rows;

        const fieldMap = await this.translations.fieldMapForType(
            ENTITY_CATEGORY_TEMPLATE,
            catalogLocale,
            rows.map(row => row.key)
        );
        return this.translations.applyToMany(
            rows as unknown as Array<Record<string, unknown>>,
            fieldMap,
            ['name'],
            row => String(row.key)
        ) as unknown as CategoryTemplate[];
    }

    async findByKey(key: string): Promise<CategoryTemplate | null> {
        return this.em.findOne(
            CategoryTemplate,
            { key, isActive: true },
            { populate: ['jarTemplate'] }
        );
    }

    /** EN seed name by category key — for rename-safe household overlays. */
    englishNameByKey(): Map<string, string> {
        return new Map(CATEGORY_TEMPLATE_SEED.map(row => [row.key, row.name]));
    }
}
