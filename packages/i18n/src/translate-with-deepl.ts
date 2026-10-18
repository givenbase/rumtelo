/**
 * Rebuild `languages/*.json` from `translations/*.ts`.
 *
 * Galighticus pattern: English TypeScript is the source. Each other locale is
 * generated from that tree. A cache keyed by the English text reuses unchanged
 * sentences. A changed English sentence misses the cache and is sent to DeepL.
 * Wrong machine translations are corrected in `translations/overrides.ts`,
 * not by editing `languages/*.json`.
 *
 * Run: pnpm i18n:gen
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import * as deepl from 'deepl-node';
import { DEFAULT_INTL_LOCALE, type IntlLocale } from '@rumtelo/contracts';

import { TRANSLATION_OVERRIDES } from '../translations/overrides';
import {
    languagesDir,
    loadEnglishTranslations,
    packageRoot,
    type Json,
    writeJsonIfChanged,
} from './generate-languages';
import { normalizeLocaleTerms } from './locale-term-normalize';
import { locales } from './next-intl';
import { planLeaf, translationCacheKey, type LeafPlan } from './translation-cache';

const cacheDir = join(packageRoot, 'cache');

type Job = { path: string[]; english: string; cacheKey: string };

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

function readJson(filePath: string): Json | undefined {
    if (!existsSync(filePath)) return undefined;
    return JSON.parse(readFileSync(filePath, 'utf8')) as Json;
}

function loadCache(locale: string): Record<string, string> {
    const filePath = join(cacheDir, `${locale}.json`);
    const parsed = readJson(filePath);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const cache: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
        if (typeof value === 'string') cache[key] = value;
    }
    return cache;
}

function saveCache(locale: string, cache: Record<string, string>) {
    mkdirSync(cacheDir, { recursive: true });
    const filePath = join(cacheDir, `${locale}.json`);
    const next = `${JSON.stringify(cache, null, 2)}\n`;
    const prev = existsSync(filePath) ? readFileSync(filePath, 'utf8') : '';
    if (prev === next) return;
    writeFileSync(filePath, next, 'utf8');
    console.log(`Wrote ${filePath}`);
}

function getAt(root: Json | undefined, path: string[]): Json | undefined {
    let current: Json | undefined = root;
    for (const key of path) {
        if (Array.isArray(current)) {
            current = current[Number(key)];
            continue;
        }
        if (!current || typeof current !== 'object') return undefined;
        current = current[key];
    }
    return current;
}

function setAt(root: Json, path: string[], value: string) {
    let current: Json = root;
    for (let i = 0; i < path.length - 1; i++) {
        const key = path[i]!;
        if (Array.isArray(current)) {
            current = current[Number(key)] as Json;
            continue;
        }
        if (!current || typeof current !== 'object') return;
        current = (current as Record<string, Json>)[key] as Json;
    }
    const last = path[path.length - 1]!;
    if (Array.isArray(current)) {
        current[Number(last)] = value;
        return;
    }
    if (current && typeof current === 'object') {
        (current as Record<string, Json>)[last] = value;
    }
}

function shouldSkip(text: string, path: string[]): boolean {
    const trimmed = text.trim();
    if (!trimmed) return true;
    if (trimmed.length <= 1) return true;
    if (path.at(-1) === 'short' && path.includes('jars')) return true;
    if (/^[\d€$£.,\s/%+\-–—·▸←→✦◇]+$/u.test(trimmed)) return true;
    if (/^(Rumtelo|Basic|Plus|Max|MasterClass|Masterclass)$/i.test(trimmed)) return true;
    // DeepL mangles ICU (`{count, plural, one {…} other {…}}`) into broken locale copy.
    if (/\{[a-zA-Z0-9_]+,\s*(plural|select)\b/.test(trimmed)) return true;
    return false;
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

function applyPlan(plan: LeafPlan, cache: Record<string, string>): string {
    if (plan.kind === 'use') {
        if (plan.remember) cache[plan.remember.key] = plan.remember.text;
        return plan.text;
    }
    return plan.english;
}

function rebuildLocale(input: {
    english: Json;
    previousEnglish: Json | undefined;
    existing: Json | undefined;
    locale: string;
    cache: Record<string, string>;
}): { tree: Json; jobs: Job[] } {
    const jobs: Job[] = [];
    const overrides = TRANSLATION_OVERRIDES[input.locale] ?? {};

    function walk(node: Json, path: string[]): Json {
        if (typeof node === 'string') {
            const previous = getAt(input.previousEnglish, path);
            const dotPath = path.join('.');
            const plan = planLeaf({
                english: node,
                locale: input.locale,
                path: dotPath,
                previousEnglish: typeof previous === 'string' ? previous : undefined,
                existing: getAt(input.existing, path),
                cached: input.cache[translationCacheKey(node, input.locale, dotPath)],
                override: overrides[dotPath],
                skip: shouldSkip(node, path),
            });
            if (plan.kind === 'translate') {
                jobs.push({ path, english: plan.english, cacheKey: plan.cacheKey });
            }
            return applyPlan(plan, input.cache);
        }
        if (Array.isArray(node)) {
            return node.map((item, index) => walk(item, [...path, String(index)]));
        }
        if (!node || typeof node !== 'object') return node;
        const out: Record<string, Json> = {};
        for (const [key, value] of Object.entries(node)) {
            out[key] = walk(value, [...path, key]);
        }
        return out;
    }

    return { tree: walk(input.english, []), jobs };
}

async function translateJobs(
    client: deepl.DeepLClient,
    locale: IntlLocale,
    tree: Json,
    jobs: Job[],
    cache: Record<string, string>
) {
    const target = locale as deepl.TargetLanguageCode;
    const batchSize = 40;
    let done = 0;
    for (let i = 0; i < jobs.length; i += batchSize) {
        const batch = jobs.slice(i, i + batchSize);
        const prepared = batch.map(job => protectPlaceholders(job.english));
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
            if (placeholderSignature(job.english) !== placeholderSignature(translated)) {
                console.warn(
                    `[${locale}] Keeping EN (placeholder mismatch): ${job.path.join('.')}`
                );
                continue;
            }
            if (translated === job.english) continue;
            cache[job.cacheKey] = translated;
            setAt(tree, job.path, translated);
        }
        done += batch.length;
        console.log(`[${locale}] Translated ${done}/${jobs.length}`);
    }
}

async function main() {
    loadEnvFile();
    mkdirSync(languagesDir, { recursive: true });

    const enPath = join(languagesDir, `${DEFAULT_INTL_LOCALE}.json`);
    const previousEnglish = readJson(enPath);
    const english = await loadEnglishTranslations();
    writeJsonIfChanged(enPath, english);

    const authKey = process.env.DEEPL_API_KEY?.trim();
    const client = authKey ? new deepl.DeepLClient(authKey) : null;

    for (const locale of locales) {
        if (locale === DEFAULT_INTL_LOCALE) continue;
        const localePath = join(languagesDir, `${locale}.json`);
        const cache = loadCache(locale);
        const { tree, jobs } = rebuildLocale({
            english,
            previousEnglish,
            existing: readJson(localePath),
            locale,
            cache,
        });
        console.log(`[${locale}] ${jobs.length} changed or new English leaves`);
        if (jobs.length > 0 && !client) {
            console.error(
                `[${locale}] Missing DEEPL_API_KEY — left ${jobs.length} leaf(s) in English`
            );
        } else if (jobs.length > 0 && client) {
            await translateJobs(client, locale, tree, jobs, cache);
        }
        const next = normalizeLocaleTerms(locale, tree);
        writeJsonIfChanged(localePath, next);
        saveCache(locale, cache);
    }
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
