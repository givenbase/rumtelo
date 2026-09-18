import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { PayoffStrategy } from '@rumtelo/contracts';

import { allocateByPercentage } from './money-plan';
import { projectBalancesAfterMonths, simulatePayoff } from './debt-payoff-math';
import {
    coachPeriodTravelCopy,
    horizonMonths,
    incomeNeededForTarget,
    projectDebtsAtHorizon,
    projectGoalsAtHorizon,
    stackPlannedAllocations,
} from './period-stack';
import { describePeriodTravel } from './period-offset';

describe('period-stack', () => {
    it('horizonMonths is |Δ| + 1', () => {
        assert.equal(horizonMonths({ monthsDelta: 0 }), 1);
        assert.equal(horizonMonths({ monthsDelta: 1 }), 2);
        assert.equal(horizonMonths({ monthsDelta: 3 }), 4);
        assert.equal(horizonMonths({ monthsDelta: -8 }), 9);
    });

    it('stackPlannedAllocations multiplies monthly split by horizon', () => {
        const monthlyNet = 430_000;
        const shares = [
            { id: 'nec', percentage: 55 },
            { id: 'ff', percentage: 10 },
            { id: 'lts', percentage: 10 },
            { id: 'edu', percentage: 10 },
            { id: 'play', percentage: 10 },
            { id: 'give', percentage: 5 },
        ];
        const monthly = allocateByPercentage(monthlyNet, shares);
        const stacked = stackPlannedAllocations({ monthlyNet, shares, horizon: 4 });
        assert.equal(stacked.stackedTotal, monthlyNet * 4);
        for (const row of stacked.stacked) {
            const base = monthly.find(entry => entry.id === row.id)!;
            assert.equal(row.amount, base.amount * 4);
        }
    });

    it('projectGoalsAtHorizon adds monthsDelta contributions looking ahead', () => {
        const goals = projectGoalsAtHorizon({
            monthsDelta: 2,
            direction: 'future',
            goals: [
                {
                    id: 'g1',
                    name: 'Emergency',
                    kind: 'SAVE',
                    status: 'ACTIVE',
                    saved: 100_000,
                    target: 200_000,
                    monthlyContribution: 50_000,
                    targetOn: null,
                    fulfilledOn: null,
                },
            ],
        });
        assert.equal(goals[0]!.projectedSaved, 200_000);
        assert.equal(goals[0]!.fulfilledByPeriod, true);
    });

    it('incomeNeededForTarget matches goal-pace rounding', () => {
        const result = incomeNeededForTarget({
            remainingCents: 80_000,
            months: 4,
            jarPercentage: 10,
            jarFixedCents: 0,
            siblingPlannedCents: 0,
        });
        assert.equal(result.needCents, 20_000);
        assert.ok(result.incomeForNeedCents !== null);
        assert.equal(result.incomeForNeedCents % 1_000, 0);
    });

    it('projectDebtsAtHorizon reduces remaining looking ahead', () => {
        const debts = [{ balance: 100_000, interestRate: 0, minimumPayment: 25_000 }];
        const at = projectDebtsAtHorizon({
            debts,
            monthsDelta: 2,
            direction: 'future',
            strategy: PayoffStrategy.MINIMAL,
        });
        assert.ok(at.totalRemaining < at.totalOriginal);
        const after2 = projectBalancesAfterMonths(debts, 2, PayoffStrategy.MINIMAL);
        assert.equal(at.totalRemaining, after2.totalRemaining);
    });

    it('simulatePayoff and projectBalancesAfterMonths agree at freedom month', () => {
        const debts = [{ balance: 50_000, interestRate: 0, minimumPayment: 25_000 }];
        const full = simulatePayoff(debts, PayoffStrategy.MINIMAL);
        const atEnd = projectBalancesAfterMonths(debts, full.months, PayoffStrategy.MINIMAL);
        assert.equal(atEnd.cleared, true);
        assert.equal(atEnd.totalRemaining, 0);
        assert.equal(atEnd.clearedAfterMonths[0], full.months);
        assert.ok(atEnd.clearedOn[0] instanceof Date);
    });

    it('coachPeriodTravelCopy mentions stamp and horizon', () => {
        const travel = describePeriodTravel(
            { year: 2026, month: 12 },
            new Date(Date.UTC(2026, 8, 17))
        );
        const text = coachPeriodTravelCopy({
            travel,
            stamp: 'Dec 2026',
            horizon: horizonMonths(travel),
            stackedTotal: 1_720_000,
            formatMoney: cents => `€${cents / 100}`,
            jarHighlights: ['Necessity €100 → €400'],
            goalsAtPeriod: [
                {
                    goalId: '1',
                    name: 'Emergency',
                    jarKey: null,
                    saved: 0,
                    target: 100,
                    projectedSaved: 100,
                    fulfilledByPeriod: true,
                    monthsToFulfill: 0,
                    reachedOn: null,
                    incomeNeededCents: null,
                },
            ],
            debtsAtPeriod: {
                totalRemaining: 50_000,
                totalOriginal: 100_000,
                debtFreeOn: null,
                monthsRemaining: 2,
                clearedByPeriod: false,
            },
        });
        assert.match(text, /Dec 2026/);
        assert.match(text, /Necessity/);
        // Goals / debt deltas belong on the travel strip, not in Coach copy.
        assert.doesNotMatch(text, /Emergency/);
        assert.doesNotMatch(text, /still owe/i);
    });
});
