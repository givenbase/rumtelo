import { describe, expect, it } from 'vitest';

import {
    PLAN_RETAIL_CENTS,
    PlanKey,
    PRACTICE_CLIENT_DISCOUNT_PCT,
    PRACTICE_CLIENT_SEAT_UNIT_CENTS,
} from '@rumtelo/contracts';

import { STRIPE_PLAN_CATALOG, STRIPE_PRACTICE_CLIENT_CATALOG } from './stripe-plans.config';

describe('practice client seat pricing', () => {
    const plus = PLAN_RETAIL_CENTS[PlanKey.PLUS];

    it('is Plus monthly retail minus the practice discount', () => {
        expect(PRACTICE_CLIENT_SEAT_UNIT_CENTS).toBe(
            Math.round((plus.month * (100 - PRACTICE_CLIENT_DISCOUNT_PCT)) / 100)
        );
    });

    it('stays below Plus monthly and Plus yearly-per-month — sponsoring always beats buying alone', () => {
        expect(PRACTICE_CLIENT_SEAT_UNIT_CENTS).toBeLessThan(plus.month);
        expect(PRACTICE_CLIENT_SEAT_UNIT_CENTS).toBeLessThan(plus.year / 12);
    });

    it('seeds Stripe with the contracts amounts', () => {
        expect(STRIPE_PRACTICE_CLIENT_CATALOG.month * 100).toBe(PRACTICE_CLIENT_SEAT_UNIT_CENTS);
        expect(STRIPE_PLAN_CATALOG[PlanKey.PLUS].month * 100).toBe(plus.month);
    });
});
