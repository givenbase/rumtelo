/**
 * Translate identical EN→{locale} leaf strings via DeepL for every non-English
 * locale in `languages/*.json` (nl, es, fr, …).
 *
 * Only replaces values that still match English (post-`generate` fill).
 * Preserves `{placeholders}` with opaque tokens.
 *
 * Requires DEEPL_API_KEY in packages/i18n/.env (or env).
 * Run: pnpm --filter @rumtelo/i18n translate:locales
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as deepl from 'deepl-node';

import { DEFAULT_INTL_LOCALE, type IntlLocale } from '@rumtelo/contracts';

import { locales } from './next-intl';

const packageRoot = join(fileURLToPath(import.meta.url), '../..');
const languagesDir = join(packageRoot, 'languages');

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

function loadEnvFile() {
    const envPath = join(packageRoot, '.env');
    if (!existsSync(envPath)) return;
    for (const line of readFileSync(envPath, 'utf8').split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq < 0) continue;
        const key = trimmed.slice(0, eq).trim();
        let value = trimmed.slice(eq + 1).trim();
        if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }
        if (!(key in process.env)) process.env[key] = value;
    }
}

function walkStrings(node: Json, path: string[], visit: (path: string[], value: string) => void) {
    if (typeof node === 'string') {
        visit(path, node);
        return;
    }
    if (!node || typeof node !== 'object' || Array.isArray(node)) return;
    for (const [key, value] of Object.entries(node)) {
        walkStrings(value, [...path, key], visit);
    }
}

function getAt(root: Json, path: string[]): Json | undefined {
    let current: Json | undefined = root;
    for (const key of path) {
        if (!current || typeof current !== 'object' || Array.isArray(current)) return undefined;
        current = current[key];
    }
    return current;
}

function setAt(root: Record<string, Json>, path: string[], value: string) {
    let current: Record<string, Json> = root;
    for (let i = 0; i < path.length - 1; i++) {
        const key = path[i]!;
        const next = current[key];
        if (!next || typeof next !== 'object' || Array.isArray(next)) {
            current[key] = {};
        }
        current = current[key] as Record<string, Json>;
    }
    current[path[path.length - 1]!] = value;
}

function protectPlaceholders(text: string): { masked: string; keys: string[] } {
    const keys: string[] = [];
    const masked = text.replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, key: string) => {
        const index = keys.length;
        keys.push(key);
        return `{{${index}}}`;
    });
    return { masked, keys };
}

function restorePlaceholders(text: string, keys: string[]): string {
    return text.replace(/\{\{(\d+)\}\}/g, (_match, index: string) => {
        const key = keys[Number(index)];
        return key ? `{${key}}` : _match;
    });
}

function placeholderSignature(text: string): string {
    return [...text.matchAll(/\{([a-zA-Z0-9_]+)\}/g)]
        .map(match => match[1])
        .sort((left, right) => left!.localeCompare(right!))
        .join(',');
}

function shouldSkip(text: string, path: string[]): boolean {
    const trimmed = text.trim();
    if (!trimmed) return true;
    if (trimmed.length <= 1) return true;
    if (path.at(-1) === 'short' && path.includes('jars')) return true;
    if (/^[\d€$£.,\s/%+\-–—·▸←→✦◇]+$/u.test(trimmed)) return true;
    if (/^(Rumtelo|Basic|Plus|Max|MasterClass|Masterclass)$/i.test(trimmed)) return true;
    return false;
}

function writeJsonIfChanged(filePath: string, data: Json): boolean {
    const next = `${JSON.stringify(data, null, 4)}\n`;
    if (existsSync(filePath)) {
        const prev = readFileSync(filePath, 'utf8');
        if (prev === next) {
            console.log(`Unchanged ${filePath}`);
            return false;
        }
    }
    writeFileSync(filePath, next, 'utf8');
    console.log(`Wrote ${filePath}`);
    return true;
}

async function translateLocale(
    client: deepl.DeepLClient,
    en: Json,
    locale: IntlLocale
): Promise<void> {
    // DeepL target codes match our intl tags (nl / es / fr).
    const target = locale as deepl.TargetLanguageCode;
    const path = join(languagesDir, `${locale}.json`);
    if (!existsSync(path)) {
        console.warn(`Skip ${locale}: missing ${path} (run generate first)`);
        return;
    }
    const tree = JSON.parse(readFileSync(path, 'utf8')) as Record<string, Json>;

    type Job = { path: string[]; text: string };
    const jobs: Job[] = [];

    walkStrings(en, [], (leafPath, enText) => {
        if (shouldSkip(enText, leafPath)) return;
        const current = getAt(tree, leafPath);
        if (typeof current !== 'string') return;
        if (current !== enText) return;
        jobs.push({ path: leafPath, text: enText });
    });

    console.log(`[${locale}] ${jobs.length} identical EN leaves to translate → ${target}`);
    if (jobs.length === 0) return;

    const batchSize = 40;
    let done = 0;

    for (let i = 0; i < jobs.length; i += batchSize) {
        const batch = jobs.slice(i, i + batchSize);
        const prepared = batch.map(job => protectPlaceholders(job.text));
        const results = await client.translateText(
            prepared.map(item => item.masked),
            'en',
            target,
            { preserveFormatting: true }
        );
        const list = Array.isArray(results) ? results : [results];
        for (let j = 0; j < batch.length; j++) {
            const job = batch[j]!;
            const translated = restorePlaceholders(list[j]!.text, prepared[j]!.keys);
            if (placeholderSignature(job.text) !== placeholderSignature(translated)) {
                console.warn(
                    `[${locale}] Keeping EN (placeholder mismatch): ${job.path.join('.')}`
                );
                continue;
            }
            setAt(tree, job.path, translated);
        }
        done += batch.length;
        console.log(`[${locale}] Translated ${done}/${jobs.length}`);
        writeJsonIfChanged(path, tree);
    }

    console.log(`[${locale}] Done — ${jobs.length} leaf(s) considered`);
}

async function main() {
    loadEnvFile();
    const authKey = process.env.DEEPL_API_KEY?.trim();
    if (!authKey) {
        console.error('Missing DEEPL_API_KEY (set in packages/i18n/.env or env)');
        process.exit(1);
    }

    const enPath = join(languagesDir, 'en.json');
    if (!existsSync(enPath)) {
        console.error(`Missing ${enPath} — run generate first`);
        process.exit(1);
    }
    const en = JSON.parse(readFileSync(enPath, 'utf8')) as Json;
    const client = new deepl.DeepLClient(authKey);

    for (const locale of locales) {
        if (locale === DEFAULT_INTL_LOCALE) continue;
        await translateLocale(client, en, locale);
    }
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
