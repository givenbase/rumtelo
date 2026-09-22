import type { EntityManager } from '@mikro-orm/postgresql';

import { Seeder } from '@mikro-orm/seeder';

import {
    ENTITY_AUDIENCE,
    ENTITY_CATEGORY_TEMPLATE,
    ENTITY_DEBT_PRESET,
    ENTITY_FIXED_COST_PRESET,
    ENTITY_GOAL_PRESET,
    ENTITY_INCOME_SOURCE_PRESET,
    ENTITY_JAR_TEMPLATE,
    ENTITY_TRANSACTION_IN_PRESET,
    Translation,
} from '../../../../modules/backoffice/admin/translation';
import { AUDIENCE_TRANSLATIONS } from '../../../../modules/backoffice/product/money/catalog/audience/seed/audience-translations';
import { CATEGORY_TEMPLATE_TRANSLATIONS } from '../../../../modules/backoffice/product/money/template/category/seed/category-translations';
import { JAR_TEMPLATE_TRANSLATIONS } from '../../../../modules/backoffice/product/money/template/jar/seed/jar-translations';
import { DEBT_PRESET_TRANSLATIONS } from '../../../../modules/backoffice/product/money/preset/debt/seed/debt-translations';
import { FIXED_COST_PRESET_TRANSLATIONS } from '../../../../modules/backoffice/product/money/preset/fixed-cost/seed/fixed-cost-translations';
import { GOAL_PRESET_TRANSLATIONS } from '../../../../modules/backoffice/product/money/preset/goal/seed/goal-translations';
import { INCOME_SOURCE_PRESET_TRANSLATIONS } from '../../../../modules/backoffice/product/money/preset/income/seed/income-translations';
import { TRANSACTION_IN_PRESET_TRANSLATIONS } from '../../../../modules/backoffice/product/money/preset/transaction-in/seed/transaction-in-translations';

/**
 * Upserts catalog translations for every locale in the seed maps.
 * Safe to re-run; English stays on the template/preset rows themselves.
 */
export class CatalogTranslationSeeder extends Seeder {
    async run(em: EntityManager): Promise<void> {
        await Promise.all([
            ...nameMaps(ENTITY_JAR_TEMPLATE, flattenJarCopy, JAR_TEMPLATE_TRANSLATIONS).map(job =>
                upsertFieldMap(em, job.entityType, job.locale, job.fields)
            ),
            ...nameMaps(ENTITY_CATEGORY_TEMPLATE, asNameFields, CATEGORY_TEMPLATE_TRANSLATIONS).map(
                job => upsertFieldMap(em, job.entityType, job.locale, job.fields)
            ),
            ...nameMaps(ENTITY_FIXED_COST_PRESET, asNameFields, FIXED_COST_PRESET_TRANSLATIONS).map(
                job => upsertFieldMap(em, job.entityType, job.locale, job.fields)
            ),
            ...nameMaps(ENTITY_GOAL_PRESET, asNameFields, GOAL_PRESET_TRANSLATIONS).map(job =>
                upsertFieldMap(em, job.entityType, job.locale, job.fields)
            ),
            ...nameMaps(ENTITY_DEBT_PRESET, asNameFields, DEBT_PRESET_TRANSLATIONS).map(job =>
                upsertFieldMap(em, job.entityType, job.locale, job.fields)
            ),
            ...nameMaps(
                ENTITY_INCOME_SOURCE_PRESET,
                asNameFields,
                INCOME_SOURCE_PRESET_TRANSLATIONS
            ).map(job => upsertFieldMap(em, job.entityType, job.locale, job.fields)),
            ...nameMaps(
                ENTITY_TRANSACTION_IN_PRESET,
                asObjectFields,
                TRANSACTION_IN_PRESET_TRANSLATIONS
            ).map(job => upsertFieldMap(em, job.entityType, job.locale, job.fields)),
            ...nameMaps(ENTITY_AUDIENCE, asObjectFields, AUDIENCE_TRANSLATIONS).map(job =>
                upsertFieldMap(em, job.entityType, job.locale, job.fields)
            ),
        ]);
        await em.flush();
    }
}

type LocaleMaps = Partial<Record<string, Record<string, unknown>>>;

function nameMaps(
    entityType: string,
    flatten: (byKey: Record<string, unknown>) => Record<string, Record<string, string>>,
    maps: LocaleMaps
): Array<{ entityType: string; locale: string; fields: Record<string, Record<string, string>> }> {
    return Object.entries(maps).map(([locale, byKey]) => ({
        entityType,
        locale,
        fields: flatten(byKey ?? {}),
    }));
}

function asNameFields(byKey: Record<string, unknown>): Record<string, Record<string, string>> {
    const out: Record<string, Record<string, string>> = {};
    for (const [entityKey, name] of Object.entries(byKey)) {
        if (typeof name !== 'string') continue;
        out[entityKey] = { name };
    }
    return out;
}

/** Object-shaped copy maps (`{ name, … }` per key) — jar / audience / transaction-in. */
function asObjectFields(byKey: Record<string, unknown>): Record<string, Record<string, string>> {
    const out: Record<string, Record<string, string>> = {};
    for (const [entityKey, copy] of Object.entries(byKey)) {
        if (!copy || typeof copy !== 'object') continue;
        const fields: Record<string, string> = {};
        for (const [fieldName, text] of Object.entries(copy as Record<string, unknown>)) {
            if (typeof text === 'string' && text.length > 0) fields[fieldName] = text;
        }
        if (Object.keys(fields).length > 0) out[entityKey] = fields;
    }
    return out;
}

function flattenJarCopy(byKey: Record<string, unknown>): Record<string, Record<string, string>> {
    return asObjectFields(byKey);
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
