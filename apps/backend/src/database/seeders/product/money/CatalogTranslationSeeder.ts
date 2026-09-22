import type { EntityManager } from '@mikro-orm/postgresql';

import { Seeder } from '@mikro-orm/seeder';

import {
    ENTITY_CATEGORY_TEMPLATE,
    ENTITY_JAR_TEMPLATE,
    Translation,
} from '../../../../modules/backoffice/admin/translation';
import { CATEGORY_TEMPLATE_TRANSLATIONS } from '../../../../modules/backoffice/product/money/template/category/seed/category-translations';
import { JAR_TEMPLATE_TRANSLATIONS } from '../../../../modules/backoffice/product/money/template/jar/seed/jar-translations';

/**
 * Upserts catalog translations for every locale in the seed maps.
 * Safe to re-run; English stays on the template rows themselves.
 * Adding a language = add a locale key under JAR_/CATEGORY_TEMPLATE_TRANSLATIONS.
 */
export class CatalogTranslationSeeder extends Seeder {
    async run(em: EntityManager): Promise<void> {
        await Promise.all(
            Object.entries(JAR_TEMPLATE_TRANSLATIONS).map(([locale, byKey]) =>
                upsertFieldMap(em, ENTITY_JAR_TEMPLATE, locale, flattenJarCopy(byKey ?? {}))
            )
        );
        await Promise.all(
            Object.entries(CATEGORY_TEMPLATE_TRANSLATIONS).map(([locale, byKey]) =>
                upsertFieldMap(
                    em,
                    ENTITY_CATEGORY_TEMPLATE,
                    locale,
                    Object.fromEntries(
                        Object.entries(byKey ?? {}).map(([key, name]) => [key, { name }] as const)
                    )
                )
            )
        );
        await em.flush();
    }
}

function flattenJarCopy(
    byKey: Record<string, { name: string; subtitle: string } | undefined>
): Record<string, Record<string, string>> {
    const out: Record<string, Record<string, string>> = {};
    for (const [entityKey, copy] of Object.entries(byKey)) {
        if (!copy) continue;
        out[entityKey] = { name: copy.name, subtitle: copy.subtitle };
    }
    return out;
}

async function upsertFieldMap(
    em: EntityManager,
    entityType: string,
    locale: string,
    byKey: Record<string, Record<string, string>>
): Promise<void> {
    const keys = Object.keys(byKey);
    if (keys.length === 0) return;

    const existing = await em.find(Translation, {
        entityType,
        locale,
        entityKey: { $in: keys },
    });
    const byKeyField = new Map(
        existing.map(row => [`${row.entityKey}:${row.fieldName}`, row] as const)
    );

    for (const [entityKey, fields] of Object.entries(byKey)) {
        for (const [fieldName, text] of Object.entries(fields)) {
            const hit = byKeyField.get(`${entityKey}:${fieldName}`);
            if (hit) {
                hit.text = text;
                continue;
            }
            em.create(Translation, {
                entityType,
                entityKey,
                fieldName,
                locale,
                text,
            } as never);
        }
    }
}
