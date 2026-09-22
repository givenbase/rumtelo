import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable, Logger } from '@nestjs/common';

import type { JarKey, Locale } from '@rumtelo/contracts';

import {
    catalogLocaleFromContracts,
    ENTITY_JAR_TEMPLATE,
    isCatalogSourceLocale,
    TranslationService,
} from '../../../../admin/translation';
import { JAR_TEMPLATE_SEED } from './seed/jar.seed-data';
import { JarTemplate } from './jar.entity';

/**
 * Jar Template Service
 *
 * Catalog of jar definitions we publish. Households never write these rows.
 */
@Injectable()
export class JarTemplateService {
    private readonly logger = new Logger(JarTemplateService.name);

    constructor(
        @Inject(EntityManager) private readonly em: EntityManager,
        @Inject(TranslationService) private readonly translations: TranslationService
    ) {}

    /** Idempotent seed / staff upsert of catalog rows. */
    async ensureDefaults(rows: Array<Partial<JarTemplate> & { key: JarTemplate['key'] }>) {
        const keys = rows.map(row => row.key);
        const existingRows = await this.em.find(JarTemplate, { key: { $in: keys } });
        const existingKeys = new Set(existingRows.map(row => row.key));
        for (const [sortOrder, row] of rows.entries()) {
            if (existingKeys.has(row.key)) continue;
            this.em.create(JarTemplate, {
                sortOrder: row.sortOrder ?? sortOrder,
                isActive: true,
                ...row,
            } as never);
        }
        await this.em.flush();
        this.logger.log(`Ensured ${rows.length} jar templates`);
    }

    /**
     * Active templates in display order — used by onboard to seed money.jar.
     * Pass a locale to overlay catalog translations (onboard should omit for EN seed copy).
     */
    async listActive(locale?: Locale | string | null): Promise<JarTemplate[]> {
        const rows = await this.em.find(
            JarTemplate,
            { isActive: true },
            { orderBy: { sortOrder: 'ASC' } }
        );
        const catalogLocale = catalogLocaleFromContracts(locale);
        if (isCatalogSourceLocale(catalogLocale) || rows.length === 0) return rows;

        const fieldMap = await this.translations.fieldMapForType(
            ENTITY_JAR_TEMPLATE,
            catalogLocale,
            rows.map(row => row.key)
        );
        return this.translations.applyToMany(
            rows as unknown as Array<Record<string, unknown>>,
            fieldMap,
            ['name', 'subtitle'],
            row => String(row.key)
        ) as unknown as JarTemplate[];
    }

    /** EN seed name/subtitle for rename-safe overlays on household jars. */
    englishDefaultsFor(key: JarKey): { name: string; subtitle: string } | null {
        const seed = JAR_TEMPLATE_SEED.find(row => row.key === key);
        return seed ? { name: seed.name, subtitle: seed.subtitle } : null;
    }
}
