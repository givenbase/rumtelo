import assert from 'node:assert/strict';
import { test } from 'node:test';

import { BoardStage } from '@rumtelo/contracts';

import { quickAddHits, QUICK_ITEMS, type QuickAddInput } from './quick-add-kinds';

const LABELS: Record<string, string> = Object.fromEntries(
    QUICK_ITEMS.map(item => [item.labelKey, item.kind])
);

function input(overrides: Partial<QuickAddInput> = {}): QuickAddInput {
    return {
        stage: BoardStage.SPLIT,
        stageReady: true,
        query: '',
        productEnabled: product => product !== 'energy',
        isLocked: () => false,
        labelOf: item => LABELS[item.labelKey] ?? item.labelKey,
        ...overrides,
    };
}

const kinds = (hits: ReturnType<typeof quickAddHits>) => hits.map(hit => hit.item.kind);

test('week 1 (SPLIT and SORTING) offers exactly four kinds, in this order', () => {
    for (const stage of [BoardStage.SPLIT, BoardStage.SORTING]) {
        assert.deepEqual(kinds(quickAddHits(input({ stage }))), [
            'tx',
            'importStatement',
            'fixed',
            'income',
        ]);
    }
});

test('ROUTINE adds Goal and Move money; MONTH adds Debt and Asset', () => {
    assert.deepEqual(kinds(quickAddHits(input({ stage: BoardStage.ROUTINE }))), [
        'tx',
        'importStatement',
        'fixed',
        'income',
        'goal',
        'move',
    ]);
    assert.deepEqual(kinds(quickAddHits(input({ stage: BoardStage.MONTH }))), [
        'tx',
        'importStatement',
        'fixed',
        'income',
        'goal',
        'move',
        'debt',
        'asset',
    ]);
});

test('Training is never offered in production, not even at MONTH or when typed', () => {
    const month = input({ stage: BoardStage.MONTH, productEnabled: () => false });
    assert.ok(!kinds(quickAddHits(month)).includes('session'));
    assert.ok(!kinds(quickAddHits({ ...month, query: 'training' })).includes('session'));
    assert.ok(!kinds(quickAddHits({ ...month, query: 'sport' })).includes('session'));
    // Staging (energy launched) lists it at MONTH only.
    const staging = input({ stage: BoardStage.MONTH, productEnabled: () => true });
    assert.ok(kinds(quickAddHits(staging)).includes('session'));
    assert.ok(!kinds(quickAddHits({ ...staging, stage: BoardStage.ROUTINE })).includes('session'));
});

test('while the stage loads the list is the week-1 list; an error (MONTH) shows everything', () => {
    assert.equal(quickAddHits(input({ stage: BoardStage.MONTH, stageReady: false })).length, 4);
    assert.equal(quickAddHits(input({ stage: BoardStage.MONTH, stageReady: true })).length, 8);
});

test('typing finds a deferred kind the plan allows, with what brings it up front', () => {
    const debt = quickAddHits(input({ query: 'debt' }));
    assert.deepEqual(debt, [
        { item: QUICK_ITEMS.find(i => i.kind === 'debt')!, deferredUntil: 'month_close' },
    ]);
    const goal = quickAddHits(input({ query: 'goal' }));
    assert.equal(goal[0]?.deferredUntil, 'week_check');
    // A kind already in the list carries no hint.
    assert.equal(quickAddHits(input({ query: 'income' }))[0]?.deferredUntil, undefined);
});

test('typing never offers a plan-locked kind the stage keeps out (no new upsell rows)', () => {
    const locked = input({ query: 'debt', isLocked: kind => kind === 'debt' });
    assert.deepEqual(quickAddHits(locked), []);
    // At its own stage a locked kind keeps today's plan badge (it is in the list).
    assert.deepEqual(kinds(quickAddHits({ ...locked, stage: BoardStage.MONTH })), ['debt']);
    // The statement stays listed in week 1 even when locked: the one upsell, on the action itself.
    assert.ok(
        kinds(quickAddHits(input({ isLocked: kind => kind === 'importStatement' }))).includes(
            'importStatement'
        )
    );
});
