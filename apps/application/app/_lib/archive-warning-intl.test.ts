import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import en from '@rumtelo/i18n/languages/en.json' with { type: 'json' };
import nl from '@rumtelo/i18n/languages/nl.json' with { type: 'json' };
import { createTranslator } from 'next-intl';

import {
    archiveWarningCopy,
    archiveWarningLines,
    KNOWN_ARCHIVE_WARNINGS,
} from './archive-warning-copy';

/**
 * The warning lines go through next-intl exactly as the import panel does. These specs prove
 * the shipped EN and NL messages exist for every id, and that a bank name from the user's file
 * is a value (printed as text), never message syntax.
 */

const BACKEND_ARCHIVE_SERVICE = new URL(
    '../../../backend/src/modules/public/product/money/archive/archive.service.ts',
    import.meta.url
);

function translatorFor(locale: 'en' | 'nl') {
    return createTranslator({
        locale,
        messages: (locale === 'en' ? en : nl) as never,
    }) as unknown as (key: string, values?: Record<string, string>) => string;
}

function render(locale: 'en' | 'nl', warning: string): string {
    const { key, values } = archiveWarningCopy(warning);
    return translatorFor(locale)(key, values);
}

test('every warning id the backend can push is known to the panel', () => {
    const source = readFileSync(BACKEND_ARCHIVE_SERVICE, 'utf8');
    const literal = [...source.matchAll(/warnings\.push\('([a-z_]+)'\)/g)].map(match => match[1]!);
    // The pot-split ids are chosen by a ternary on `checked.reason`.
    const ternary = ['jar_split_incomplete', 'jar_split_not_100'];
    for (const id of [...literal, ...ternary]) {
        assert.ok(KNOWN_ARCHIVE_WARNINGS.has(id), `archive.service.ts pushes ${id}`);
    }
    assert.ok(literal.length >= 7, 'the scan found the warning pushes');
    assert.ok(source.includes('bank_unknown_key:'), 'the bank warning still carries a key');
});

test('every known id has English and Dutch copy that is not the raw key', () => {
    for (const locale of ['en', 'nl'] as const) {
        const ids = [...KNOWN_ARCHIVE_WARNINGS, 'bank_unknown_key:ing', 'bank_unknown_key:', 'x'];
        for (const id of ids) {
            const text = render(locale, id);
            assert.ok(text.length > 20, `${locale}: ${id} renders copy`);
            assert.ok(!text.includes('pages.settings'), `${locale}: ${id} is not a raw key`);
            assert.ok(!text.includes('MISSING_MESSAGE'), `${locale}: ${id} has a message`);
        }
    }
});

test('the panel titles exist in both languages', () => {
    for (const locale of ['en', 'nl'] as const) {
        const t = translatorFor(locale);
        for (const key of ['title_preview', 'title_done']) {
            const text = t(`pages.settings.panels.import.warnings.${key}`);
            assert.ok(text && !text.includes('pages.settings'), `${locale}: ${key}`);
        }
    }
});

test('a bank name from the file prints as plain text, whatever characters it holds', () => {
    const hostile = [
        '{',
        '}{',
        '{count, plural, other {x}}',
        '<b>x</b>',
        "it's {a}",
        "' {",
        '</',
        '{bank}',
    ];
    for (const locale of ['en', 'nl'] as const) {
        for (const bank of hostile) {
            const text = render(locale, `bank_unknown_key:${bank}`);
            assert.ok(
                text.includes(`"${bank}"`),
                `${locale}: ${JSON.stringify(bank)} printed as is`
            );
        }
    }
});

test('no line of user-facing copy says "jar" (the file name jars.csv aside)', () => {
    for (const locale of ['en', 'nl'] as const) {
        const ids = [...KNOWN_ARCHIVE_WARNINGS, 'bank_unknown_key:ing', 'bank_unknown_key:', 'x'];
        for (const id of ids) {
            const text = render(locale, id).replaceAll('jars.csv', '');
            assert.ok(!/\bjars?\b/i.test(text), `${locale}: ${id} says jar`);
        }
    }
});

test('two unknown ids and one repeated id each show once', () => {
    const lines = archiveWarningLines([
        'new_a',
        'new_b',
        'debts_skipped_plan',
        'debts_skipped_plan',
    ]);
    assert.equal(lines.length, 2);
});

test('the file-specific restore errors and the "and N more" line exist in both languages', () => {
    for (const locale of ['en', 'nl'] as const) {
        const t = translatorFor(locale);
        for (const key of ['invalid_iban', 'due_month_required', 'settlement_account_invalid']) {
            const text = t(`pages.settings.panels.import.errors.${key}`);
            assert.ok(text.length > 40 && !text.includes('pages.settings'), `${locale}: ${key}`);
            assert.ok(!/\bjars?\b/i.test(text), `${locale}: ${key} says jar`);
        }
        const more = createTranslator({
            locale,
            messages: (locale === 'en' ? en : nl) as never,
        }) as unknown as (key: string, values?: Record<string, string>) => string;
        assert.ok(
            more('pages.settings.panels.import.warnings_more', { count: '290' }).includes('290')
        );
    }
});
