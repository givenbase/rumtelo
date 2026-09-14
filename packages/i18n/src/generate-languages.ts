/**
 * Merge translations TypeScript modules into languages/en.json, then fill
 * missing keys in other locale JSON files from English (does not call DeepL).
 *
 * Galighticus uses DeepL for non-English; Rumtelo starts with a local merge so
 * we never spend API quota from automation. Prefer adding English under
 * translations/ first; Dutch overrides live in languages/nl.json until DeepL.
 *
 * Run: pnpm --filter @rumtelo/i18n generate
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { locales, LocalesEnum } from './next-intl';

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
        const files = readdirSync(sectionDir).filter(
            file => file.endsWith('.ts') && file !== 'index.ts'
        );

        await Promise.all(
            files.map(async file => {
                const moduleName = basename(file, '.ts');
                const modulePath = join(sectionDir, file);
                // Prefer file URL without query/hash — language keys off the path.
                const mod = await import(pathToFileURL(modulePath).href);
                if (!mod.default) {
                    console.warn(`No default export: ${section}/${file}`);
                    return;
                }
                bucket[moduleName] = mod.default;
                console.log(`Loaded ${section}.${moduleName}`);
            })
        );
    }

    return out;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Deep-merge: keep `existing` values, add missing keys from `fallback`. */
function fillMissing(existing: Json, fallback: Json): Json {
    if (!isPlainObject(fallback)) return existing ?? fallback;
    if (!isPlainObject(existing)) return structuredClone(fallback);

    const result: Record<string, Json> = { ...(existing as Record<string, Json>) };
    for (const [key, value] of Object.entries(fallback)) {
        if (!(key in result) || result[key] === undefined || result[key] === null) {
            result[key] = structuredClone(value);
        } else {
            result[key] = fillMissing(result[key], value);
        }
    }
    return result;
}

async function main() {
    mkdirSync(languagesDir, { recursive: true });

    const english = (await loadTranslations()) as unknown as Json;
    const enPath = join(languagesDir, `${LocalesEnum.English}.json`);
    writeFileSync(enPath, `${JSON.stringify(english, null, 4)}\n`, 'utf8');
    console.log(`Wrote ${enPath}`);

    for (const locale of locales) {
        if (locale === LocalesEnum.English) continue;
        const path = join(languagesDir, `${locale}.json`);
        let current: Json = {};
        if (existsSync(path)) {
            current = JSON.parse(readFileSync(path, 'utf8')) as Json;
        }
        const merged = fillMissing(current, english);
        writeFileSync(path, `${JSON.stringify(merged, null, 4)}\n`, 'utf8');
        console.log(`Wrote ${path} (filled missing from en)`);
    }
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
