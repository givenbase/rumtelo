import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable, Logger } from '@nestjs/common';

import {
    catalogLocaleFromContracts,
    isCatalogSourceLocale,
    type CatalogLocale,
} from './catalog-locale';
import { Translation } from './translation.entity';

export {
    catalogLocaleFromContracts,
    isCatalogSourceLocale,
    CATALOG_SOURCE_LOCALE,
} from './catalog-locale';
export type { CatalogLocale } from './catalog-locale';

export const ENTITY_JAR_TEMPLATE = 'jar_template';
export const ENTITY_CATEGORY_TEMPLATE = 'category_template';
export const ENTITY_FIXED_COST_PRESET = 'fixed_cost_preset';
export const ENTITY_GOAL_PRESET = 'goal_preset';
export const ENTITY_DEBT_PRESET = 'debt_preset';
export const ENTITY_INCOME_SOURCE_PRESET = 'income_source_preset';
export const ENTITY_TRANSACTION_IN_PRESET = 'transaction_in_preset';
export const ENTITY_AUDIENCE = 'audience';
export const ENTITY_GIVING_CAUSE = 'giving_cause';

function asComparableString(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
        return value.toString();
    }
    return '';
}

/**
 * Batch helpers for catalog translations.
 * English is the template row itself — skip DB lookups for the source locale.
 * Any other locale code (`nl`, `es`, `fr`, …) loads matching rows when present.
 */
@Injectable()
export class TranslationService {
    private readonly logger = new Logger(TranslationService.name);

    constructor(@Inject(EntityManager) private readonly em: EntityManager) {}

    /**
     * Map entityKey → fieldName → text for one entity type + locale.
     */
    async fieldMapForType(
        entityType: string,
        locale: CatalogLocale,
        keys?: string[]
    ): Promise<Map<string, Map<string, string>>> {
        const out = new Map<string, Map<string, string>>();
        const catalogLocale = catalogLocaleFromContracts(locale);
        if (isCatalogSourceLocale(catalogLocale)) return out;

        let rows: Translation[];
        try {
            rows = await this.em.find(Translation, {
                entityType,
                locale: catalogLocale,
                ...(keys?.length ? { entityKey: { $in: keys } } : {}),
            });
        } catch (error) {
            // Table missing / migration lag — serve EN catalog copy rather than 500.
            this.logger.warn(
                `Catalog translations unavailable for ${entityType}/${catalogLocale}: ${
                    error instanceof Error ? error.message : String(error)
                }`
            );
            return out;
        }

        for (const row of rows) {
            let fields = out.get(row.entityKey);
            if (!fields) {
                fields = new Map();
                out.set(row.entityKey, fields);
            }
            fields.set(row.fieldName, row.text);
        }
        return out;
    }

    /**
     * Overlay translated fields onto items when a translation exists.
     * `keyOf` returns the stable catalog key; optional `englishOf` skips a field
     * when the household renamed away from the EN seed for that field.
     */
    applyToMany<T extends Record<string, unknown>>(
        items: T[],
        fieldMap: Map<string, Map<string, string>>,
        fields: readonly string[],
        keyOf: (item: T) => string,
        options?: {
            /** EN defaults per field — only patch when current value still matches. */
            englishOf?: (item: T) => Partial<Record<string, string | null | undefined>>;
        }
    ): T[] {
        if (!items.length || fieldMap.size === 0) return items;

        return items.map(item => {
            const fieldsForKey = fieldMap.get(keyOf(item));
            if (!fieldsForKey) return item;

            const english = options?.englishOf?.(item);
            const patched = { ...item };
            for (const field of fields) {
                const translated = fieldsForKey.get(field);
                if (!translated) continue;
                if (english && field in english) {
                    const expected = english[field];
                    if (asComparableString(item[field]) !== asComparableString(expected)) {
                        continue;
                    }
                }
                patched[field as keyof T] = translated as T[keyof T];
            }
            return patched;
        });
    }

    /**
     * EN display name → translated name for category templates (household
     * categories have no catalog key — match on the seeded English label).
     */
    nameByEnglish(
        fieldMap: Map<string, Map<string, string>>,
        englishNameByKey: Map<string, string>
    ): Map<string, string> {
        const out = new Map<string, string>();
        for (const [key, fields] of fieldMap) {
            const english = englishNameByKey.get(key);
            const translated = fields.get('name');
            if (english && translated) out.set(english, translated);
        }
        return out;
    }
}
