/**
 * Guard: every message key the apps use exists in every `languages/*.json`.
 *
 * Fails on a static key that does not resolve (MISSING_MESSAGE in the browser),
 * on a namespace that does not exist, and on a template-literal key that matches
 * no message at all. Keys built from variables cannot be checked statically;
 * they are printed as "unchecked" so a reviewer sees them.
 *
 * Fix a failure in `translations/` (EN) + `translations/overrides.ts` (NL), then
 * `DEEPL_API_KEY= pnpm i18n:gen` (keyless; es/fr fall back to EN until Given runs DeepL).
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { languagesDir, packageRoot } from './generate-languages';
import {
    buildCatalog,
    checkUse,
    listSourceFiles,
    scanFile,
    type KeyUse,
    type NamespaceHints,
} from './key-usage';
import { locales } from './next-intl';

const repoRoot = join(packageRoot, '../..');
const SCANNED_DIRS = ['apps/application', 'apps/website', 'packages/ui'] as const;

/**
 * Translators passed in as plain `(key: string) => string` parameters. Without a
 * hint they are checked loosely (key must end some message path); with one, exactly.
 */
const NAMESPACE_HINTS: NamespaceHints = {
    'apps/application/app/_lib/coach-message-copy.ts': { t: 'features.coach' },
};

const uses: KeyUse[] = listSourceFiles(repoRoot, SCANNED_DIRS).flatMap(file =>
    scanFile(file, repoRoot, NAMESPACE_HINTS)
);

const catalogs = locales.map(locale => ({
    locale,
    catalog: buildCatalog(JSON.parse(readFileSync(join(languagesDir, `${locale}.json`), 'utf8'))),
}));

describe('message keys used in code ↔ languages/*.json', () => {
    it('finds key uses (scanner sanity)', () => {
        assert.ok(uses.filter(use => use.kind === 'static').length > 1000);
        assert.ok(
            uses.some(
                use =>
                    use.kind === 'static' &&
                    use.namespace === 'features.coach' &&
                    use.key === 'money_coach.fixed_costs.subscription_review.text_one'
            ),
            'coach-message-copy.ts keys should be scanned with the features.coach hint'
        );
    });

    for (const { locale, catalog } of catalogs) {
        it(`every used key resolves in ${locale}.json`, () => {
            const failures = uses
                .map(use => ({ use, problem: checkUse(use, catalog) }))
                .filter(({ problem }) => problem !== null)
                .map(({ use, problem }) => `${use.file}:${use.line}  ${problem}`);
            const unique = [...new Set(failures)];
            assert.deepEqual(
                unique,
                [],
                `${unique.length} key(s) missing in ${locale}.json — add them to translations/ and run \`DEEPL_API_KEY= pnpm i18n:gen\`:\n${unique.join('\n')}`
            );
        });
    }

    it('lists dynamic keys that are only pattern-checked or unchecked', () => {
        const dynamic = uses.filter(use => use.kind === 'pattern' || use.kind === 'unchecked');
        const lines = dynamic.map(
            use =>
                `  ${use.kind === 'pattern' ? 'pattern  ' : 'unchecked'} ${use.file}:${use.line}  ${use.namespace ?? '*'} · ${use.text}`
        );
        // Report only: a variable key cannot be resolved statically.
        console.log(`Dynamic message keys (${dynamic.length}):\n${lines.join('\n')}`);
        assert.ok(true);
    });
});
