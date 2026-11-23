import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { TranslateFn } from '@rumtelo/i18n';

import { isDefaultJarName, resolveJarName } from './jar-copy';

const dutch = Object.assign((key: string) => `nl:${key}`, {
    has: (key: string) => key.startsWith('names.'),
}) as unknown as TranslateFn;

test('a jar that still has its seed name follows the locale', () => {
    assert.equal(resolveJarName(dutch, 'PLAY', 'Play'), 'nl:names.PLAY');
    assert.equal(resolveJarName(dutch, 'NECESSITIES', ' necessity '), 'nl:names.NECESSITIES');
});

test('a name the household chose is kept', () => {
    assert.equal(resolveJarName(dutch, 'PLAY', 'Fun money'), 'Fun money');
});

test('an unknown jar key keeps the stored name', () => {
    assert.equal(resolveJarName(dutch, 'OTHER', 'Play'), 'Play');
});

test('a jar seeded in Dutch, Spanish or French follows the locale too', () => {
    assert.equal(resolveJarName(dutch, 'NECESSITIES', 'Noodzakelijk'), 'nl:names.NECESSITIES');
    assert.equal(
        resolveJarName(dutch, 'FINANCIAL_FREEDOM', 'Financiële vrijheid'),
        'nl:names.FINANCIAL_FREEDOM'
    );
    assert.equal(
        resolveJarName(dutch, 'LONG_TERM_SAVINGS', 'Langetermijn sparen'),
        'nl:names.LONG_TERM_SAVINGS'
    );
    assert.equal(resolveJarName(dutch, 'EDUCATION', 'Opleiding'), 'nl:names.EDUCATION');
    assert.equal(resolveJarName(dutch, 'PLAY', 'Plezier'), 'nl:names.PLAY');
    assert.equal(resolveJarName(dutch, 'GIVE', 'Geven / stichting'), 'nl:names.GIVE');
    assert.equal(resolveJarName(dutch, 'PLAY', 'ocio'), 'nl:names.PLAY');
    assert.equal(resolveJarName(dutch, 'EDUCATION', 'Éducation'), 'nl:names.EDUCATION');
});

test('a default name of another jar is a name the household chose', () => {
    assert.equal(resolveJarName(dutch, 'PLAY', 'Opleiding'), 'Opleiding');
    assert.equal(isDefaultJarName('PLAY', 'Plezier'), true);
    assert.equal(isDefaultJarName('PLAY', 'Plezier voor ons'), false);
    assert.equal(isDefaultJarName('OTHER', 'Play'), false);
});

// QA (SP-4a): the seed names the backend copies onto a household's jars
// (`jar.seed-data.ts` EN, `jar-translations.ts` nl/es/fr), per key. If a default is added
// there, add it here and in `LEGACY_DEFAULT_JAR_NAMES`.
const SEEDED_NAMES: Record<string, string[]> = {
    NECESSITIES: ['Necessity', 'Noodzakelijk', 'Necesidades', 'Nécessités'],
    FINANCIAL_FREEDOM: [
        'Financial Freedom',
        'Financiële vrijheid',
        'Libertad financiera',
        'Liberté financière',
    ],
    LONG_TERM_SAVINGS: [
        'Long Term Savings',
        'Langetermijn sparen',
        'Ahorro a largo plazo',
        'Épargne long terme',
    ],
    EDUCATION: ['Education', 'Opleiding', 'Educación', 'Éducation'],
    PLAY: ['Play', 'Plezier', 'Ocio', 'Plaisir'],
    GIVE: ['Give / foundation', 'Geven / stichting', 'Dar / fundación', 'Donner / fondation'],
};

test('every seeded name, in every language, is a default for its own jar only', () => {
    for (const [jarKey, names] of Object.entries(SEEDED_NAMES)) {
        for (const name of names) {
            assert.equal(isDefaultJarName(jarKey, name), true, `${jarKey} / ${name}`);
            for (const otherKey of Object.keys(SEEDED_NAMES).filter(key => key !== jarKey)) {
                assert.equal(
                    resolveJarName(dutch, otherKey, name),
                    name,
                    `${name} typed on ${otherKey} must stay as typed`
                );
            }
        }
    }
});

test('case, padding and an empty name are handled', () => {
    assert.equal(resolveJarName(dutch, 'PLAY', '  PLEZIER  '), 'nl:names.PLAY');
    assert.equal(resolveJarName(dutch, 'PLAY', ''), '');
    assert.equal(resolveJarName(dutch, 'PLAY', '   '), '   ');
    assert.equal(isDefaultJarName('PLAY', ''), false);
});

test('the old English short label for Give still counts as a default', () => {
    assert.equal(resolveJarName(dutch, 'GIVE', 'Give'), 'nl:names.GIVE');
});
