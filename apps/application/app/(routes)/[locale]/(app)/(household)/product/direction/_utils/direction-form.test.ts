import assert from 'node:assert/strict';
import { test } from 'node:test';

import { YearIntention } from '@rumtelo/contracts';

import {
    DIRECTION_MAX_LENGTH,
    YEAR_INTENTIONS,
    directionFormSchema,
    directionFormValues,
    directionPatch,
    isNearLimit,
} from './direction-form';

const EMPTY = { direction: '', directionWhy: '', yearIntention: null };

test('the limit is the contract limit: 280', () => {
    assert.equal(DIRECTION_MAX_LENGTH, 280);
});

test('the form schema accepts 280 characters and rejects 281, in both text fields', () => {
    assert.ok(directionFormSchema.safeParse({ ...EMPTY, direction: 'a'.repeat(280) }).success);
    assert.ok(directionFormSchema.safeParse({ ...EMPTY, directionWhy: 'a'.repeat(280) }).success);
    assert.ok(!directionFormSchema.safeParse({ ...EMPTY, direction: 'a'.repeat(281) }).success);
    assert.ok(!directionFormSchema.safeParse({ ...EMPTY, directionWhy: 'a'.repeat(281) }).success);
});

test('the limit counts what is stored: surrounding spaces do not use it up', () => {
    // The server trims before it counts, and the form uses the same schema.
    const padded = `  ${'a'.repeat(280)}  `;
    assert.ok(directionFormSchema.safeParse({ ...EMPTY, direction: padded }).success);
    assert.ok(!directionFormSchema.safeParse({ ...EMPTY, direction: `${padded}a` }).success);
});

test('a long unbroken string and emoji are plain text to the schema', () => {
    const unbroken = 'Financieleonafhankelijkheid'.repeat(10);
    assert.ok(unbroken.length <= 280);
    assert.ok(directionFormSchema.safeParse({ ...EMPTY, direction: unbroken }).success);
    // Emoji count by UTF-16 code unit, like the browser maxLength and the server schema do.
    assert.ok(directionFormSchema.safeParse({ ...EMPTY, direction: '🌱'.repeat(140) }).success);
    assert.ok(!directionFormSchema.safeParse({ ...EMPTY, direction: '🌱'.repeat(141) }).success);
});

test('only the four year intentions are offered, and an unknown one is rejected', () => {
    assert.deepEqual(
        [...YEAR_INTENTIONS].sort(),
        [YearIntention.BUILD, YearIntention.CALM, YearIntention.GROW, YearIntention.RECOVER].sort()
    );
    assert.ok(directionFormSchema.safeParse({ ...EMPTY, yearIntention: null }).success);
    assert.ok(!directionFormSchema.safeParse({ ...EMPTY, yearIntention: 'sprint' }).success);
});

test('form values: null settings and null fields are empty fields', () => {
    assert.deepEqual(directionFormValues(null), EMPTY);
    assert.deepEqual(
        directionFormValues({ direction: null, directionWhy: null, yearIntention: null }),
        EMPTY
    );
    assert.deepEqual(
        directionFormValues({
            direction: 'Schuldenvrij en rust',
            directionWhy: 'Voor de kinderen',
            yearIntention: YearIntention.CALM,
        }),
        {
            direction: 'Schuldenvrij en rust',
            directionWhy: 'Voor de kinderen',
            yearIntention: YearIntention.CALM,
        }
    );
});

test('the patch sends every field: empty and whitespace-only text clears (null)', () => {
    assert.deepEqual(directionPatch(EMPTY), {
        direction: null,
        directionWhy: null,
        yearIntention: null,
    });
    assert.deepEqual(
        directionPatch({ direction: '   \n\t ', directionWhy: ' ', yearIntention: null }),
        { direction: null, directionWhy: null, yearIntention: null }
    );
});

test('the patch trims surrounding space and keeps the words and the chip', () => {
    assert.deepEqual(
        directionPatch({
            direction: '  Over een jaar: rust in huis 🌱 \n',
            directionWhy: '\tvoor ons gezin ',
            yearIntention: YearIntention.GROW,
        }),
        {
            direction: 'Over een jaar: rust in huis 🌱',
            directionWhy: 'voor ons gezin',
            yearIntention: YearIntention.GROW,
        }
    );
});

test('unselecting the chip sends null, which clears it on the server', () => {
    const selected = directionFormValues({
        direction: null,
        directionWhy: null,
        yearIntention: YearIntention.BUILD,
    });
    assert.equal(directionPatch({ ...selected, yearIntention: null }).yearIntention, null);
});

test('the counter is read out only within 20 characters of the limit', () => {
    assert.equal(isNearLimit(0), false);
    assert.equal(isNearLimit(259), false);
    assert.equal(isNearLimit(260), true);
    assert.equal(isNearLimit(280), true);
    assert.equal(isNearLimit(29, 50), false);
    assert.equal(isNearLimit(30, 50), true);
});
