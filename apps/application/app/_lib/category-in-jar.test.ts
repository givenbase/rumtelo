import assert from 'node:assert/strict';
import { test } from 'node:test';

import { categoryIdInJar } from './category-in-jar';

const basics = [{ id: 'cat-rent' }, { id: 'cat-energy' }];

test('a category of the pot stays', () => {
    assert.equal(categoryIdInJar('cat-rent', basics), 'cat-rent');
});

test('a category of another pot is dropped (a pot that takes no bills moved to Basics)', () => {
    assert.equal(categoryIdInJar('cat-groceries-daily', basics), null);
});

test('no category stays no category', () => {
    assert.equal(categoryIdInJar(null, basics), null);
    assert.equal(categoryIdInJar(undefined, basics), null);
    assert.equal(categoryIdInJar('', basics), null);
});

test('a pot with no categories drops the id', () => {
    assert.equal(categoryIdInJar('cat-rent', []), null);
});

test('while the pot is still loading the id is kept', () => {
    assert.equal(categoryIdInJar('cat-rent', undefined), 'cat-rent');
});
