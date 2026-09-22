/**
 * Merge translations TypeScript modules into languages/en.json, then sync
 * other locale JSON files: fill missing keys from English and drop keys that
 * no longer exist in EN (does not call DeepL).
 *
 * Prefer adding English under translations/ first. For other locales: run
 * `pnpm --filter @rumtelo/i18n translate:locales` after generate — it translates
 * leaves still identical to EN via DeepL and keeps existing overrides.
 *
 * Run: pnpm --filter @rumtelo/i18n generate
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { locales } from './next-intl';
import { DEFAULT_INTL_LOCALE } from '@rumtelo/contracts';

const packageRoot = join(fileURLToPath(import.meta.url), '../..');
const translationsDir = join(packageRoot, 'translations');
const languagesDir = join(packageRoot, 'languages');

const SECTIONS = ['common', 'ui', 'features', 'pages'] as const;

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

async function loadTranslations(): Promise<Record<string, Record<string, unknown>>> {
    const out: Record<string, Record<string, unknown>> = {};

    for (const section of SECTIONS) {
        const sectionDir = join(translationsDir, section);
        if (!existsSync(sectionDir)) continue;

        const bucket: Record<string, unknown> = {};
        out[section] = bucket;
        const files = readdirSync(sectionDir)
            .filter(file => file.endsWith('.ts') && file !== 'index.ts')
            .sort((left, right) => left.localeCompare(right));

        // Load in parallel, then assign in sorted file order so en.json key
        // order is stable across runs (Promise settlement order is not).
        const loaded = await Promise.all(
            files.map(async file => {
                const moduleName = basename(file, '.ts');
                const modulePath = join(sectionDir, file);
                const mod = await import(pathToFileURL(modulePath).href);
                if (!mod.default) {
                    console.warn(`No default export: ${section}/${file}`);
                    return null;
                }
                console.log(`Loaded ${section}.${moduleName}`);
                return { moduleName, value: mod.default as unknown };
            })
        );

        for (const entry of loaded) {
            if (!entry) continue;
            bucket[entry.moduleName] = entry.value;
        }
    }

    return out;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Keep `existing` values for keys present in `fallback`, add missing from `fallback`,
 * and drop keys that no longer exist in English (prevents stale NL orphans).
 */
function fillMissing(existing: Json, fallback: Json): Json {
    if (!isPlainObject(fallback)) return existing ?? fallback;
    if (!isPlainObject(existing)) return structuredClone(fallback);

    const result: Record<string, Json> = {};
    for (const [key, value] of Object.entries(fallback)) {
        if (!(key in existing) || existing[key] === undefined || existing[key] === null) {
            result[key] = structuredClone(value);
        } else {
            result[key] = fillMissing(existing[key], value);
        }
    }
    return result;
}

/** Write JSON only when serialized content differs (avoids dirty mtimes / git noise). */
function writeJsonIfChanged(filePath: string, data: Json, label?: string): boolean {
    const next = `${JSON.stringify(data, null, 4)}\n`;
    if (existsSync(filePath)) {
        const prev = readFileSync(filePath, 'utf8');
        if (prev === next) {
            console.log(`Unchanged ${filePath}`);
            return false;
        }
    }
    writeFileSync(filePath, next, 'utf8');
    console.log(label ?? `Wrote ${filePath}`);
    return true;
}

async function main() {
    mkdirSync(languagesDir, { recursive: true });

    const english = (await loadTranslations()) as unknown as Json;
    const enPath = join(languagesDir, `${DEFAULT_INTL_LOCALE}.json`);
    writeJsonIfChanged(enPath, english);

    for (const locale of locales) {
        if (locale === DEFAULT_INTL_LOCALE) continue;
        const path = join(languagesDir, `${locale}.json`);
        let current: Json = {};
        if (existsSync(path)) {
            current = JSON.parse(readFileSync(path, 'utf8')) as Json;
        }
        const merged = fillMissing(current, english);
        writeJsonIfChanged(
            path,
            merged,
            `Wrote ${path} (synced from en — filled missing, pruned orphans)`
        );
    }
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
