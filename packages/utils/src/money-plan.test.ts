import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { jarCoverage, jarPotBalance } from './money-plan';

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
