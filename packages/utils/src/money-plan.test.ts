import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
    allocateByPercentage,
    jarCoverage,
    jarPotBalance,
    projectPotBalanceAhead,
} from './money-plan';

describe('jarPotBalance', () => {
    it('adds the cumulative deposit and lifetime credits, minus spends', () => {
        assert.equal(
            jarPotBalance({
                cumulativeDeposit: 300_00,
                lifetimeCredited: 50_00,
                lifetimeSpent: 40_00,
            }),
            310_00
        );
    });

    it('can go negative when spends exceed what was deposited', () => {
        assert.equal(
            jarPotBalance({
                cumulativeDeposit: 80_00,
                lifetimeCredited: 0,
                lifetimeSpent: 100_00,
            }),
            -20_00
        );
    });
});

describe('projectPotBalanceAhead', () => {
    it('adds monthly deposits for each month ahead', () => {
        assert.equal(
            projectPotBalanceAhead({
                potBalance: 440_000,
                monthlyAllocated: 220_000,
                monthsAhead: 2,
            }),
            880_000
        );
    });

    it('leaves pot unchanged when monthsAhead is 0', () => {
        assert.equal(
            projectPotBalanceAhead({
                potBalance: 100_00,
                monthlyAllocated: 50_00,
                monthsAhead: 0,
            }),
            100_00
        );
    });
});

describe('jarCoverage', () => {
    it('keeps month envelope separate from pot math', () => {
        const coverage = jarCoverage({
            allocated: 100_00,
            spent: 30_00,
            credited: 0,
            committedOut: 20_00,
        });
        assert.equal(coverage.available, 50_00);
        assert.equal(coverage.remaining, 70_00);
    });
});

describe('allocateByPercentage', () => {
    const DEFAULT_SPLIT = [
        { id: 'NECESSITIES', percentage: 55 },
        { id: 'FINANCIAL_FREEDOM', percentage: 10 },
        { id: 'EDUCATION', percentage: 10 },
        { id: 'LONG_TERM_SAVINGS', percentage: 10 },
        { id: 'PLAY', percentage: 10 },
        { id: 'GIVE', percentage: 5 },
    ];
    const total = (rows: { amount: number }[]) => rows.reduce((sum, row) => sum + row.amount, 0);

    it('splits 100 minor units at the default split and the sum is exact', () => {
        const rows = allocateByPercentage(100, DEFAULT_SPLIT);
        assert.deepEqual(
            rows.map(row => row.amount),
            [55, 10, 10, 10, 10, 5]
        );
        assert.equal(total(rows), 100);
    });

    it('gives the whole remainder to the largest share (1 minor unit)', () => {
        const rows = allocateByPercentage(1, DEFAULT_SPLIT);
        assert.deepEqual(
            rows.map(row => row.amount),
            [1, 0, 0, 0, 0, 0]
        );
    });

    it('splits zero into zeros', () => {
        const rows = allocateByPercentage(0, DEFAULT_SPLIT);
        assert.equal(total(rows), 0);
        assert.ok(rows.every(row => row.amount === 0));
    });

    it('breaks a tie for the largest share by the first one in order', () => {
        const rows = allocateByPercentage(101, [
            { id: 'a', percentage: 50 },
            { id: 'b', percentage: 50 },
        ]);
        assert.deepEqual(
            rows.map(row => row.amount),
            [51, 50]
        );
    });

    it('is not one unit low on 2-decimal percentages (float safe)', () => {
        // 10000 × 0.57 / 100 is 56.99999… in floats.
        const rows = allocateByPercentage(10_000, [
            { id: 'small', percentage: 0.57 },
            { id: 'rest', percentage: 99.43 },
        ]);
        assert.deepEqual(
            rows.map(row => row.amount),
            [57, 9_943]
        );
    });

    it('keeps 250001 whole: the odd unit lands on the largest share', () => {
        const rows = allocateByPercentage(250_001, DEFAULT_SPLIT);
        assert.equal(total(rows), 250_001);
        assert.equal(rows[0]!.amount, 137_501);
    });
});
