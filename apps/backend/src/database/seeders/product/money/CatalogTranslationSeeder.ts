import type { EntityManager } from '@mikro-orm/postgresql';
import { FlushMode } from '@mikro-orm/postgresql';

import { Seeder } from '@mikro-orm/seeder';

import {
    ENTITY_AUDIENCE,
    ENTITY_CATEGORY_TEMPLATE,
    ENTITY_DEBT_PRESET,
    ENTITY_FIXED_COST_PRESET,
    ENTITY_GIVING_CAUSE,
    ENTITY_GOAL_PRESET,
    ENTITY_INCOME_SOURCE_PRESET,
    ENTITY_JAR_TEMPLATE,
    ENTITY_TRANSACTION_IN_PRESET,
    Translation,
} from '../../../../modules/backoffice/admin/translation';
import { AUDIENCE_TRANSLATIONS } from '../../../../modules/backoffice/product/money/catalog/audience/seed/audience-translations';
import { GIVING_CAUSE_TRANSLATIONS } from '../../../../modules/backoffice/product/money/catalog/giving-organisation/seed/giving-cause-translations';
import { CATEGORY_TEMPLATE_TRANSLATIONS } from '../../../../modules/backoffice/product/money/template/category/seed/category-translations';
import { JAR_TEMPLATE_TRANSLATIONS } from '../../../../modules/backoffice/product/money/template/jar/seed/jar-translations';
import { DEBT_PRESET_TRANSLATIONS } from '../../../../modules/backoffice/product/money/preset/debt/seed/debt-translations';
import { FIXED_COST_PRESET_TRANSLATIONS } from '../../../../modules/backoffice/product/money/preset/fixed-cost/seed/fixed-cost-translations';
import { GOAL_PRESET_TRANSLATIONS } from '../../../../modules/backoffice/product/money/preset/goal/seed/goal-translations';
import { INCOME_SOURCE_PRESET_TRANSLATIONS } from '../../../../modules/backoffice/product/money/preset/income/seed/income-translations';
import { TRANSACTION_IN_PRESET_TRANSLATIONS } from '../../../../modules/backoffice/product/money/preset/transaction-in/seed/transaction-in-translations';

type UpsertStats = { created: number; updated: number; skipped: number };

/**
 * Upserts catalog translations for every locale in the seed maps.
 * Safe to re-run: identical text is skipped (no dirty write / no flush churn).
 * English stays on the template/preset rows themselves.
 */
export class CatalogTranslationSeeder extends Seeder {
    async run(em: EntityManager): Promise<void> {
        const totals: UpsertStats = { created: 0, updated: 0, skipped: 0 };
        try {
            // One transaction + COMMIT flush mode: finds must not auto-flush mid-upsert.
            await em.transactional(
                async tem => {
                    const jobs = [
                        ...nameMaps(ENTITY_JAR_TEMPLATE, flattenJarCopy, JAR_TEMPLATE_TRANSLATIONS),
                        ...nameMaps(
                            ENTITY_CATEGORY_TEMPLATE,
                            asNameFields,
                            CATEGORY_TEMPLATE_TRANSLATIONS
                        ),
                        ...nameMaps(
                            ENTITY_FIXED_COST_PRESET,
                            asNameFields,
                            FIXED_COST_PRESET_TRANSLATIONS
                        ),
                        ...nameMaps(ENTITY_GOAL_PRESET, asNameFields, GOAL_PRESET_TRANSLATIONS),
                        ...nameMaps(ENTITY_DEBT_PRESET, asNameFields, DEBT_PRESET_TRANSLATIONS),
                        ...nameMaps(
                            ENTITY_INCOME_SOURCE_PRESET,
                            asNameFields,
                            INCOME_SOURCE_PRESET_TRANSLATIONS
                        ),
                        ...nameMaps(
                            ENTITY_TRANSACTION_IN_PRESET,
                            asObjectFields,
                            TRANSACTION_IN_PRESET_TRANSLATIONS
                        ),
                        ...nameMaps(ENTITY_AUDIENCE, asObjectFields, AUDIENCE_TRANSLATIONS),
                        ...nameMaps(ENTITY_GIVING_CAUSE, asObjectFields, GIVING_CAUSE_TRANSLATIONS),
                    ];
                    // Sequential — EntityManager is not safe for concurrent find/create.
                    for (const job of jobs) {
                        const stats = await upsertFieldMap(
                            tem,
                            job.entityType,
                            job.locale,
                            job.fields
                        );
                        totals.created += stats.created;
                        totals.updated += stats.updated;
                        totals.skipped += stats.skipped;
                    }
                },
                { flushMode: FlushMode.COMMIT }
            );
        } catch (error: unknown) {
            const detail = formatSeedError(error);
            console.error(`[CatalogTranslationSeeder] failed: ${detail}`);
            throw error instanceof Error
                ? error
                : new Error(`CatalogTranslationSeeder failed: ${detail}`);
        }

        console.log(
            `[CatalogTranslationSeeder] created=${totals.created} updated=${totals.updated} skipped=${totals.skipped}`
        );
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
): Promise<UpsertStats> {
    const stats: UpsertStats = { created: 0, updated: 0, skipped: 0 };
    const keys = Object.keys(byKey);
    if (keys.length === 0) return stats;

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
                if (hit.text === text) {
                    stats.skipped += 1;
                    continue;
                }
                hit.text = text;
                stats.updated += 1;
                continue;
            }
            em.create(Translation, {
                entityType,
                entityKey,
                fieldName,
                locale,
                text,
            } as never);
            stats.created += 1;
        }
    }
    return stats;
}

function formatSeedError(error: unknown): string {
    if (error instanceof Error) {
        return error.stack ?? error.message;
    }
    try {
        return JSON.stringify(error);
    } catch {
        return String(error);
    }
}
