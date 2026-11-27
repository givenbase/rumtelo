import assert from 'node:assert/strict';
import { test } from 'node:test';

import { JarGroup, JarKey } from '@rumtelo/contracts';

import { buildDirectionNow, type NowJar } from './direction-now';

const THREE_POTS: NowJar[] = [
    { key: JarKey.NECESSITIES, percentage: 55, allocated: 165_000, potBalance: 0 },
    { key: JarKey.LONG_TERM_SAVINGS, percentage: 20, allocated: 60_000, potBalance: 240_000 },
    { key: JarKey.PLAY, percentage: 25, allocated: 75_000, potBalance: 5_000 },
];

test('no income is one state, whatever the pots say', () => {
    assert.deepEqual(
        buildDirectionNow({
            jars: THREE_POTS,
            incomeTotal: 0,
            debtFreeOn: null,
            includeDebt: true,
        }),
        { kind: 'no_income' }
    );
});

test('the split is read per group in group order, with the Buffer found by its key', () => {
    const now = buildDirectionNow({
        // Order from the API must not matter.
        jars: [THREE_POTS[2]!, THREE_POTS[0]!, THREE_POTS[1]!],
        incomeTotal: 300_000,
        debtFreeOn: null,
        includeDebt: true,
    });
    assert.equal(now.kind, 'split');
    if (now.kind !== 'split') return;
    assert.deepEqual(
        now.groups.map(row => [row.group, row.percent, row.allocated]),
        [
            [JarGroup.BASIS, 55, 165_000],
            [JarGroup.FUTURE, 20, 60_000],
            [JarGroup.FREE, 25, 75_000],
        ]
    );
    assert.deepEqual(now.buffer, { jarKey: JarKey.LONG_TERM_SAVINGS, saved: 240_000 });
    assert.equal(now.debtFreeOn, null);
});

test('a refined group adds its pots up without float drift', () => {
    const now = buildDirectionNow({
        jars: [
            { key: JarKey.NECESSITIES, percentage: 45.1, allocated: 100, potBalance: 0 },
            { key: JarKey.DAILY, percentage: 9.9, allocated: 20, potBalance: 0 },
            { key: JarKey.LONG_TERM_SAVINGS, percentage: 20, allocated: 60, potBalance: 0 },
            { key: JarKey.PLAY, percentage: 25, allocated: 75, potBalance: 0 },
        ],
        incomeTotal: 1_000,
        debtFreeOn: null,
        includeDebt: false,
    });
    assert.equal(now.kind, 'split');
    if (now.kind !== 'split') return;
    assert.equal(now.groups[0]?.percent, 55);
    assert.equal(now.groups[0]?.allocated, 120);
});

test('an empty or negative Buffer is left out, not shown as a gap', () => {
    for (const potBalance of [0, -1_500]) {
        const now = buildDirectionNow({
            jars: THREE_POTS.map(jar =>
                jar.key === JarKey.LONG_TERM_SAVINGS ? { ...jar, potBalance } : jar
            ),
            incomeTotal: 300_000,
            debtFreeOn: null,
            includeDebt: false,
        });
        assert.equal(now.kind === 'split' ? now.buffer : 'wrong', null);
    }
});

test('the debt-free date shows only when debt counts for this plan and role', () => {
    const base = { jars: THREE_POTS, incomeTotal: 300_000, debtFreeOn: '2028-03-01' };
    const included = buildDirectionNow({ ...base, includeDebt: true });
    assert.equal(included.kind === 'split' ? included.debtFreeOn : 'wrong', '2028-03-01');
    const left = buildDirectionNow({ ...base, includeDebt: false });
    assert.equal(left.kind === 'split' ? left.debtFreeOn : 'wrong', null);
});
