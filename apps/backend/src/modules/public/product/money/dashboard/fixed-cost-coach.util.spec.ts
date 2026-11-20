import { describe, expect, it } from 'vitest';

import { Cadence, JarKey } from '@rumtelo/contracts';

import {
    type CoachBill,
    evaluateOverNecessities,
    evaluateSubscriptionReview,
    quarterKeyOf,
} from './fixed-cost-coach.util';

const JARS = [
    { id: 'jar-nec', key: JarKey.NECESSITIES, name: 'Necessities', percentage: 55 },
    { id: 'jar-play', key: JarKey.PLAY, name: 'Play', percentage: 45 },
];

function bill(overrides: Partial<CoachBill> & { id: string }): CoachBill {
    return {
        name: overrides.id,
        counterparty: null,
        jarId: 'jar-nec',
        amount: 100_00,
        cadence: Cadence.MONTHLY,
        direction: 'OUT',
        isActive: true,
        startedOn: null,
        endsOn: null,
        presetKey: null,
        merchantKey: null,
        ...overrides,
    };
}

const ASOF = '2026-11-20';

describe('evaluateOverNecessities', () => {
    it('fires when Necessities bills exceed the envelope and names the biggest bill', () => {
        // Income 2000.00 → Necessities envelope 1100.00. Bills 1250.00 → 150.00 over.
        const over = evaluateOverNecessities({
            netMonthlyCents: 2000_00,
            jars: JARS,
            bills: [
                bill({ id: 'rent', amount: 900_00 }),
                bill({ id: 'energy', amount: 150_00 }),
                bill({ id: 'phone', amount: 200_00 }),
            ],
            asOf: ASOF,
        });

        expect(over).toEqual({
            jarName: 'Necessities',
            envelopeCents: 1100_00,
            shortfallCents: 150_00,
            biggestBillId: 'rent',
        });
    });

    it('stays quiet when the bills fit, or equal the envelope', () => {
        const fits = evaluateOverNecessities({
            netMonthlyCents: 2000_00,
            jars: JARS,
            bills: [bill({ id: 'rent', amount: 1100_00 })],
            asOf: ASOF,
        });
        expect(fits).toBeNull();
    });

    it('stays quiet without income, and ignores other jars, paused, ended and IN items', () => {
        expect(
            evaluateOverNecessities({
                netMonthlyCents: 0,
                jars: JARS,
                bills: [bill({ id: 'rent', amount: 900_00 })],
                asOf: ASOF,
            })
        ).toBeNull();
        expect(
            evaluateOverNecessities({
                netMonthlyCents: 1000_00,
                jars: JARS,
                bills: [
                    bill({ id: 'play', jarId: 'jar-play', amount: 900_00 }),
                    bill({ id: 'paused', amount: 900_00, isActive: false }),
                    bill({ id: 'ended', amount: 900_00, endsOn: '2026-10-31', isActive: false }),
                    bill({ id: 'credit', amount: 900_00, direction: 'IN' }),
                ],
                asOf: ASOF,
            })
        ).toBeNull();
    });

    it('normalises yearly and quarterly bills to a month, in whole cents', () => {
        // Yearly 1200.00 = 100.00 a month; quarterly 300.00 = 100.00 a month.
        const over = evaluateOverNecessities({
            netMonthlyCents: 300_00,
            jars: JARS,
            bills: [
                bill({ id: 'insurance', amount: 1200_00, cadence: Cadence.YEARLY }),
                bill({ id: 'water', amount: 300_00, cadence: Cadence.QUARTERLY }),
            ],
            asOf: ASOF,
        });
        // Envelope floor(300.00 * 55%) = 165.00; committed 200.00.
        expect(over?.envelopeCents).toBe(165_00);
        expect(over?.shortfallCents).toBe(35_00);
    });

    it('picks the same biggest bill on a tie', () => {
        const over = evaluateOverNecessities({
            netMonthlyCents: 100_00,
            jars: JARS,
            bills: [bill({ id: 'b', name: 'Beta' }), bill({ id: 'a', name: 'Alpha' })],
            asOf: ASOF,
        });
        expect(over?.biggestBillId).toBe('a');
    });
});

describe('evaluateSubscriptionReview', () => {
    it('counts active subscription-type bills and their monthly total', () => {
        const review = evaluateSubscriptionReview({
            bills: [
                bill({ id: 'netflix', amount: 13_00, presetKey: 'STREAMING_VIDEO' }),
                bill({ id: 'vpn', amount: 60_00, cadence: Cadence.YEARLY, presetKey: 'VPN' }),
                bill({ id: 'spotify', amount: 11_00, merchantKey: 'SPOTIFY' }),
                bill({ id: 'rent', amount: 900_00, presetKey: 'RENT' }),
                bill({ id: 'phone', amount: 20_00, presetKey: 'MOBILE_PHONE', merchantKey: 'KPN' }),
                bill({ id: 'old', amount: 9_00, presetKey: 'STREAMING_MUSIC', isActive: false }),
            ],
            asOf: ASOF,
        });

        expect(review).toEqual({ count: 3, monthlyCents: 13_00 + 5_00 + 11_00 });
    });

    it('is null when there are no subscriptions', () => {
        expect(
            evaluateSubscriptionReview({
                bills: [bill({ id: 'rent', presetKey: 'RENT' }), bill({ id: 'typed' })],
                asOf: ASOF,
            })
        ).toBeNull();
    });
});

describe('quarterKeyOf', () => {
    it('maps months to calendar quarters', () => {
        expect(quarterKeyOf(new Date('2026-01-01T00:00:00Z'))).toBe('2026-Q1');
        expect(quarterKeyOf(new Date('2026-03-31T23:59:59Z'))).toBe('2026-Q1');
        expect(quarterKeyOf(new Date('2026-04-01T00:00:00Z'))).toBe('2026-Q2');
        expect(quarterKeyOf(new Date('2026-11-20T12:00:00Z'))).toBe('2026-Q4');
    });
});
