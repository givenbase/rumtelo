import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Cadence } from '@rumtelo/contracts';

import {
    assetFlowSummary,
    assetMonthlyIn,
    evaluateBusinessHouseholdLeak,
    linkedMonthlyOut,
} from './asset-link';

const AS_OF = '2026-09-15';

describe('linkedMonthlyOut', () => {
    it('sums active OUT bills normalised to a month', () => {
        const out = linkedMonthlyOut(
            [
                { amount: 1200, cadence: Cadence.MONTHLY, direction: 'OUT' },
                { amount: 12000, cadence: Cadence.YEARLY, direction: 'OUT' },
                { amount: 999, cadence: Cadence.MONTHLY, direction: 'IN' },
                { amount: 5000, cadence: Cadence.MONTHLY, direction: 'OUT', isActive: false },
                {
                    amount: 700,
                    cadence: Cadence.MONTHLY,
                    direction: 'OUT',
                    startedOn: '2026-10-01',
                },
            ],
            AS_OF
        );
        assert.equal(out, 1200 + 1000);
    });
});

describe('assetMonthlyIn', () => {
    it('falls back to the asset flow when nothing is linked', () => {
        assert.deepEqual(assetMonthlyIn({ flow: 2500 }, [], AS_OF), {
            amount: 2500,
            fromSources: false,
        });
    });

    it('uses linked sources only — never adds the flow on top', () => {
        const result = assetMonthlyIn(
            { flow: 2500 },
            [
                { amount: 3000, cadence: Cadence.MONTHLY },
                { amount: 1200, cadence: Cadence.YEARLY },
                { amount: 9000, cadence: Cadence.MONTHLY, isActive: false },
            ],
            AS_OF
        );
        assert.deepEqual(result, { amount: 3100, fromSources: true });
    });
});

describe('assetFlowSummary', () => {
    it('reports in / out / net', () => {
        const summary = assetFlowSummary(
            { flow: 0 },
            [{ amount: 4000, cadence: Cadence.MONTHLY }],
            [{ amount: 1500, cadence: Cadence.MONTHLY, direction: 'OUT' }],
            AS_OF
        );
        assert.equal(summary.monthlyIn, 4000);
        assert.equal(summary.monthlyOut, 1500);
        assert.equal(summary.monthlyNet, 2500);
        assert.equal(summary.inFromSources, true);
    });
});

describe('evaluateBusinessHouseholdLeak', () => {
    const company = { id: 'a1', kindKey: 'BUSINESS', name: 'Studio Noord' };
    const car = { id: 'a2', kindKey: 'VEHICLE', name: 'Car' };

    it('stays quiet when no BUSINESS holding has linked out', () => {
        const leak = evaluateBusinessHouseholdLeak({
            assets: [company, car],
            bills: [
                {
                    assetId: car.id,
                    amount: 200_00,
                    cadence: Cadence.MONTHLY,
                    direction: 'OUT',
                    isActive: true,
                },
            ],
            asOf: AS_OF,
        });
        assert.equal(leak.active, false);
        assert.equal(leak.monthlyOutCents, 0);
    });

    it('flags BUSINESS bills paid through the household', () => {
        const leak = evaluateBusinessHouseholdLeak({
            assets: [company, car],
            bills: [
                {
                    assetId: company.id,
                    amount: 89_00,
                    cadence: Cadence.MONTHLY,
                    direction: 'OUT',
                    isActive: true,
                },
                {
                    assetId: company.id,
                    amount: 120_00,
                    cadence: Cadence.MONTHLY,
                    direction: 'OUT',
                    isActive: true,
                },
                {
                    assetId: car.id,
                    amount: 200_00,
                    cadence: Cadence.MONTHLY,
                    direction: 'OUT',
                    isActive: true,
                },
            ],
            asOf: AS_OF,
        });
        assert.equal(leak.active, true);
        assert.equal(leak.monthlyOutCents, 209_00);
        assert.equal(leak.billCount, 2);
        assert.equal(leak.primaryName, 'Studio Noord');
        assert.deepEqual(leak.assetIds, [company.id]);
    });
});
