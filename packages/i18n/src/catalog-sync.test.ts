/**
 * Guard: the generated catalogs match the TypeScript source.
 *
 * - `languages/en.json` equals what `translations/**` builds (catches a source
 *   edit without `pnpm i18n:gen`, the usual cause of MISSING_MESSAGE);
 * - every EN message exists in every other locale;
 * - every override in `translations/overrides.ts` points at an EN message and
 *   keeps its `{placeholders}`.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { TRANSLATION_OVERRIDES } from '../translations/overrides';
import { languagesDir, loadEnglishTranslations } from './generate-languages';
import { buildCatalog } from './key-usage';
import { locales } from './next-intl';

const REGEN = 'run `DEEPL_API_KEY= pnpm i18n:gen` (keyless) and commit languages/*.json';

const readLocale = (locale: string) =>
    JSON.parse(readFileSync(join(languagesDir, `${locale}.json`), 'utf8')) as unknown;

function flatten(tree: unknown, path: string[] = [], out = new Map<string, string>()) {
    if (typeof tree === 'string') out.set(path.join('.'), tree);
    else if (tree && typeof tree === 'object') {
        for (const [key, value] of Object.entries(tree)) flatten(value, [...path, key], out);
    }
    return out;
}

/** Simple `{name}` arguments and ICU argument names (`{count, plural, …}`). */
function placeholders(text: string): string {
    return [...new Set([...text.matchAll(/\{\s*([A-Za-z0-9_]+)\s*[,}]/g)].map(m => m[1]!))]
        .sort()
        .join(',');
}

describe('translations/ ↔ languages/*.json', async () => {
    const source = flatten(await loadEnglishTranslations({ quiet: true }));

    it('en.json is regenerated from translations/', () => {
        const en = flatten(readLocale('en'));
        const missing = [...source.keys()].filter(path => !en.has(path));
        const stale = [...en.keys()].filter(path => !source.has(path));
        const changed = [...source.keys()].filter(
            path => en.has(path) && en.get(path) !== source.get(path)
        );
        assert.deepEqual(
            { missing, stale, changed },
            { missing: [], stale: [], changed: [] },
            `en.json is out of date — ${REGEN}`
        );
    });

    for (const locale of locales) {
        it(`${locale}.json has every EN message`, () => {
            const catalog = buildCatalog(readLocale(locale));
            const missing = [...source.keys()].filter(path => catalog.nodes.get(path) !== 'string');
            assert.deepEqual(missing, [], `${locale}.json is missing messages — ${REGEN}`);
        });
    }

    it('every override points at an EN message and keeps its placeholders', () => {
        const problems: string[] = [];
        for (const [locale, overrides] of Object.entries(TRANSLATION_OVERRIDES)) {
            for (const [path, text] of Object.entries(overrides)) {
                const english = source.get(path);
                if (english === undefined) {
                    problems.push(`${locale} ${path}: no EN source message (orphan override)`);
                } else if (placeholders(english) !== placeholders(text)) {
                    problems.push(
                        `${locale} ${path}: placeholders {${placeholders(text)}} ≠ EN {${placeholders(english)}}`
                    );
                }
            }
        }
        assert.deepEqual(problems, [], problems.join('\n'));
    });
});
