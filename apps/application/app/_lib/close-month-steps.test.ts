import assert from 'node:assert/strict';
import { test } from 'node:test';

import { resolveCloseStep } from './close-month-steps';

const BILL = { fixedCostId: 'b1', name: 'Rent', amount: 100_000, arrearsMonths: 0 };
const NO_BLOCKERS = { inboxCount: 0, dueBillCount: 0, dueBillNames: [], dueBills: [] };

test('a closed month says so, whatever else is attached', () => {
    assert.deepEqual(
        resolveCloseStep({ isClosed: true, priorOpenPeriod: '2026-09', closeBlockers: null }),
        { kind: 'ALREADY_CLOSED' }
    );
});

test('an earlier open month comes first, before the Inbox and bills', () => {
    assert.deepEqual(
        resolveCloseStep({
            isClosed: false,
            priorOpenPeriod: '2026-09',
            closeBlockers: { ...NO_BLOCKERS, inboxCount: 3, dueBills: [BILL], dueBillCount: 1 },
        }),
        { kind: 'PRIOR_FIRST', prior: '2026-09' }
    );
});

test('Inbox lines of this month come before the bills', () => {
    assert.deepEqual(
        resolveCloseStep({
            isClosed: false,
            priorOpenPeriod: null,
            closeBlockers: { ...NO_BLOCKERS, inboxCount: 2, dueBills: [BILL], dueBillCount: 1 },
        }),
        { kind: 'INBOX_FIRST', count: 2 }
    );
});

test('due bills need a carry or skip each', () => {
    assert.deepEqual(
        resolveCloseStep({
            isClosed: false,
            priorOpenPeriod: null,
            closeBlockers: { ...NO_BLOCKERS, dueBills: [BILL], dueBillCount: 1 },
        }),
        { kind: 'BILLS', bills: [BILL] }
    );
});

test('nothing blocking: one confirmation', () => {
    assert.deepEqual(
        resolveCloseStep({ isClosed: false, priorOpenPeriod: null, closeBlockers: NO_BLOCKERS }),
        { kind: 'CONFIRM' }
    );
    assert.deepEqual(
        resolveCloseStep({ isClosed: false, priorOpenPeriod: null, closeBlockers: null }),
        { kind: 'CONFIRM' }
    );
});
