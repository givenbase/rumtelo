import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { TranslateFn } from '@rumtelo/i18n';

import { resolveJarName } from './jar-copy';

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
