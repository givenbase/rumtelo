/**
 * Load English copy from `translations/*.ts`.
 * Locale JSON is produced by `translate-with-deepl.ts` (`pnpm i18n:gen`).
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const packageRoot = join(fileURLToPath(import.meta.url), '../..');
export const translationsDir = join(packageRoot, 'translations');
export const languagesDir = join(packageRoot, 'languages');

const SECTIONS = ['common', 'ui', 'features', 'pages'] as const;

export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

export async function loadEnglishTranslations(): Promise<Json> {
    const out: Record<string, Json> = {};

    for (const section of SECTIONS) {
        const sectionDir = join(translationsDir, section);
        if (!existsSync(sectionDir)) continue;

        const bucket: Record<string, Json> = {};
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
                return { moduleName, value: mod.default as Json };
            })
        );

        for (const entry of loaded) {
            if (!entry) continue;
            bucket[entry.moduleName] = entry.value;
        }
    }

    return out;
}

/** Write JSON only when serialized content differs (avoids dirty mtimes / git noise). */
export function writeJsonIfChanged(filePath: string, data: Json, label?: string): boolean {
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
