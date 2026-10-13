import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { jarCoverage, jarPotBalance, projectPotBalanceAhead } from './money-plan';

describe('jarPotBalance', () => {
    it('sums months × allocation plus lifetime credits minus spends', () => {
        assert.equal(
            jarPotBalance({
                allocated: 100_00,
                monthCount: 3,
                lifetimeCredited: 50_00,
                lifetimeSpent: 40_00,
            }),
            310_00
        );
    });

    it('treats monthCount below 1 as one month', () => {
        assert.equal(
            jarPotBalance({
                allocated: 80_00,
                monthCount: 0,
                lifetimeCredited: 0,
                lifetimeSpent: 20_00,
            }),
            60_00
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
