import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { TranslateFn } from '@rumtelo/i18n';

import {
    isDefaultJarName,
    jarGuideAllowedLabel,
    resolveJarName,
    resolvePotName,
    resolvePotPurpose,
} from './jar-copy';

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
    DAILY: ['Daily', 'Dagelijks', 'Diario', 'Quotidien'],
    GOALS: ['Goals', 'Doelen', 'Metas', 'Objectifs'],
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

// Pot copy for a household with 3 to 8 pots: a main pot alone in its group stands for the group.
const translators = {
    jars: Object.assign((key: string) => `jars:${key}`, {
        has: (key: string) => key.startsWith('names.'),
    }) as unknown as TranslateFn,
    groups: Object.assign((key: string) => `groups:${key}`, {
        has: () => true,
    }) as unknown as TranslateFn,
};
const threePots = ['NECESSITIES', 'LONG_TERM_SAVINGS', 'PLAY'];
const sixPots = [
    'NECESSITIES',
    'FINANCIAL_FREEDOM',
    'LONG_TERM_SAVINGS',
    'EDUCATION',
    'PLAY',
    'GIVE',
];

test('a main pot alone in its group is named after the group', () => {
    assert.equal(
        resolvePotName(translators, 'NECESSITIES', 'Necessity', threePots),
        'groups:BASIS.title'
    );
    assert.equal(
        resolvePotName(translators, 'LONG_TERM_SAVINGS', 'Long Term Savings', threePots),
        'groups:FUTURE.title'
    );
    assert.equal(resolvePotName(translators, 'PLAY', 'Plezier', threePots), 'groups:FREE.title');
});

test('a refined group names its main pot after the pot, not the group', () => {
    // Six pots: Future and Free hold more than the main pot; Basics is still alone.
    assert.equal(
        resolvePotName(translators, 'LONG_TERM_SAVINGS', 'Long Term Savings', sixPots),
        'jars:names.LONG_TERM_SAVINGS'
    );
    assert.equal(resolvePotName(translators, 'PLAY', 'Play', sixPots), 'jars:names.PLAY');
    assert.equal(
        resolvePotName(translators, 'NECESSITIES', 'Necessity', sixPots),
        'groups:BASIS.title'
    );
    assert.equal(
        resolvePotName(translators, 'NECESSITIES', 'Necessity', [...threePots, 'DAILY']),
        'jars:names.NECESSITIES'
    );
    // An optional pot always has its own name.
    assert.equal(
        resolvePotName(translators, 'DAILY', 'Dagelijks', [...threePots, 'DAILY']),
        'jars:names.DAILY'
    );
});

test('a name the household typed is never replaced, alone or refined', () => {
    assert.equal(
        resolvePotName(translators, 'NECESSITIES', 'Home & bills', threePots),
        'Home & bills'
    );
    assert.equal(resolvePotName(translators, 'PLAY', 'Fun money', sixPots), 'Fun money');
});

test('while the pot list is empty (loading) the per-pot name is used', () => {
    assert.equal(
        resolvePotName(translators, 'NECESSITIES', 'Necessity', []),
        'jars:names.NECESSITIES'
    );
});

test('purpose follows the same rule as the name', () => {
    assert.equal(resolvePotPurpose(translators, 'NECESSITIES', threePots), 'groups:BASIS.purpose');
    assert.equal(
        resolvePotPurpose(translators, 'NECESSITIES', [...threePots, 'DAILY']),
        'jars:purpose.NECESSITIES'
    );
    assert.equal(resolvePotPurpose(translators, 'GIVE', sixPots), 'jars:purpose.GIVE');
    assert.equal(resolvePotPurpose(translators, 'PLAY', []), 'jars:purpose.PLAY');
});

test('the Daily and Goals template names, in every language, follow the locale', () => {
    assert.equal(resolveJarName(dutch, 'DAILY', 'Dagelijks'), 'nl:names.DAILY');
    assert.equal(resolveJarName(dutch, 'GOALS', 'Objectifs'), 'nl:names.GOALS');
    assert.equal(resolveJarName(dutch, 'GOALS', 'Doelen voor ons'), 'Doelen voor ons');
});

test('the Daily and Goals guide chips follow the locale, an unknown label stays as stored', () => {
    const guides = Object.assign((key: string) => `nl:${key}`, {
        has: (key: string) => key.startsWith('guides.'),
    }) as unknown as TranslateFn;
    assert.equal(
        jarGuideAllowedLabel(guides, 'DAILY', 'Groceries'),
        'nl:guides.DAILY.allowed.groceries'
    );
    assert.equal(
        jarGuideAllowedLabel(guides, 'DAILY', 'Drugstore & pharmacy'),
        'nl:guides.DAILY.allowed.pharmacy'
    );
    assert.equal(
        jarGuideAllowedLabel(guides, 'DAILY', 'Household supplies'),
        'nl:guides.DAILY.allowed.household'
    );
    assert.equal(
        jarGuideAllowedLabel(guides, 'GOALS', 'A planned trip'),
        'nl:guides.GOALS.allowed.trip'
    );
    assert.equal(
        jarGuideAllowedLabel(guides, 'GOALS', 'Down payment'),
        'nl:guides.GOALS.allowed.home_deposit'
    );
    assert.equal(jarGuideAllowedLabel(guides, 'GOALS', 'Something new'), 'Something new');
});
