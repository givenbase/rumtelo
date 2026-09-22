/**
 * Translate identical EN→NL leaf strings in languages/nl.json via DeepL.
 *
 * Only replaces values that still match English (post-`generate` fill).
 * Preserves `{placeholders}` with XML ignore tags.
 *
 * Requires DEEPL_API_KEY in packages/i18n/.env (or env).
 * Run: pnpm --filter @rumtelo/i18n translate:nl
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as deepl from 'deepl-node';

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

/** Swap ICU placeholders for opaque tokens DeepL won't touch. */
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

/** Skip proper nouns / brand / jar short codes / already-Dutch-looking short tokens. */
function shouldSkip(text: string, path: string[]): boolean {
    const trimmed = text.trim();
    if (!trimmed) return true;
    if (trimmed.length <= 1) return true;
    // Jar short codes stay English (PLAY, NEC, …)
    if (path.at(-1) === 'short' && path.includes('jars')) return true;
    // Pure numbers / currency / punctuation
    if (/^[\d€$£.,\s/%+\-–—·▸←→✦◇]+$/u.test(trimmed)) return true;
    // Brand / plan product names alone
    if (/^(Rumtelo|Basic|Plus|Max|MasterClass|Masterclass)$/i.test(trimmed)) return true;
    return false;
}

async function main() {
    loadEnvFile();
    const authKey = process.env.DEEPL_API_KEY?.trim();
    if (!authKey) {
        console.error('Missing DEEPL_API_KEY (set in packages/i18n/.env or env)');
        process.exit(1);
    }

    const enPath = join(languagesDir, 'en.json');
    const nlPath = join(languagesDir, 'nl.json');
    const en = JSON.parse(readFileSync(enPath, 'utf8')) as Json;
    const nl = JSON.parse(readFileSync(nlPath, 'utf8')) as Record<string, Json>;

    type Job = { path: string[]; text: string };
    const jobs: Job[] = [];

    walkStrings(en, [], (path, enText) => {
        if (shouldSkip(enText, path)) return;
        const nlValue = getAt(nl, path);
        if (typeof nlValue !== 'string') return;
        // Only translate still-identical EN fills
        if (nlValue !== enText) return;
        jobs.push({ path, text: enText });
    });

    console.log(`Found ${jobs.length} identical EN/NL leaves to translate`);
    if (jobs.length === 0) return;

    const client = new deepl.DeepLClient(authKey);
    const batchSize = 40;
    let done = 0;

    for (let i = 0; i < jobs.length; i += batchSize) {
        const batch = jobs.slice(i, i + batchSize);
        const prepared = batch.map(job => protectPlaceholders(job.text));
        const results = await client.translateText(
            prepared.map(item => item.masked),
            'en',
            'nl',
            { preserveFormatting: true }
        );
        const list = Array.isArray(results) ? results : [results];
        for (let j = 0; j < batch.length; j++) {
            const job = batch[j]!;
            const translated = restorePlaceholders(list[j]!.text, prepared[j]!.keys);
            if (placeholderSignature(job.text) !== placeholderSignature(translated)) {
                console.warn(`Keeping EN (placeholder mismatch): ${job.path.join('.')}`);
                continue;
            }
            setAt(nl, job.path, translated);
        }
        done += batch.length;
        console.log(`Translated ${done}/${jobs.length}`);
        // Persist after each batch so a mid-run failure keeps progress
        writeJsonIfChanged(nlPath, nl);
    }

    console.log(`Done — ${jobs.length} leaf(s) considered`);
}

/** Write JSON only when serialized content differs (avoids dirty mtimes / git noise). */
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

main().catch(error => {
    console.error(error);
    process.exit(1);
});
