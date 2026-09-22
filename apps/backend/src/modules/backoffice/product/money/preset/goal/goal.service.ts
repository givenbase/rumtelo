import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';

import type { JarKey, Locale } from '@rumtelo/contracts';

import {
    catalogLocaleFromContracts,
    ENTITY_GOAL_PRESET,
    isCatalogSourceLocale,
    TranslationService,
} from '../../../../admin/translation';
import { GoalPreset } from './goal.entity';

@Injectable()
export class GoalPresetService {
    constructor(
        @Inject(EntityManager) private readonly em: EntityManager,
        @Inject(TranslationService) private readonly translations: TranslationService
    ) {}

    async listActive(filters?: {
        jarKey?: JarKey;
        locale?: Locale | string | null;
    }): Promise<GoalPreset[]> {
        const rows = await this.em.find(
            GoalPreset,
            {
                isActive: true,
                ...(filters?.jarKey ? { jarTemplate: { key: filters.jarKey } } : {}),
            },
            { orderBy: { sortOrder: 'ASC' }, populate: ['jarTemplate', 'categoryTemplate'] }
        );
        return this.applyNameTranslations(rows, filters?.locale);
    }

    private async applyNameTranslations(
        rows: GoalPreset[],
        locale?: Locale | string | null
    ): Promise<GoalPreset[]> {
        const catalogLocale = catalogLocaleFromContracts(locale);
        if (isCatalogSourceLocale(catalogLocale) || rows.length === 0) return rows;

        const fieldMap = await this.translations.fieldMapForType(
            ENTITY_GOAL_PRESET,
            catalogLocale,
            rows.map(row => row.key)
        );
        return this.translations.applyToMany(
            rows as unknown as Array<Record<string, unknown>>,
            fieldMap,
            ['name'],
            row => String(row.key)
        ) as unknown as GoalPreset[];
    }
}
