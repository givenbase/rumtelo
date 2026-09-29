import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Cadence } from '@rumtelo/contracts';

import {
    dueDayMaxForCadence,
    dueDayReachedInMonth,
    dueMonthMaxForCadence,
    isChargeMonth,
    isoWeekday,
    monthInQuarter,
    normalizeDueDay,
    normalizeDueMonth,
} from './due-day';

describe('isoWeekday', () => {
    it('maps Monday–Sunday to 1–7', () => {
        // 2026-09-28 = Monday
        assert.equal(isoWeekday(new Date(2026, 8, 28)), 1);
        assert.equal(isoWeekday(new Date(2026, 8, 29)), 2);
        assert.equal(isoWeekday(new Date(2026, 9, 4)), 7);
    });
});

describe('normalizeDueDay', () => {
    it('accepts 1–7 for weekly and 1–31 otherwise', () => {
        assert.equal(normalizeDueDay(3, Cadence.WEEKLY), 3);
        assert.equal(normalizeDueDay(8, Cadence.WEEKLY), null);
        assert.equal(normalizeDueDay(28, Cadence.MONTHLY), 28);
        assert.equal(normalizeDueDay(32, Cadence.MONTHLY), null);
        assert.equal(normalizeDueDay(15, Cadence.YEARLY), 15);
    });
});

describe('dueDayMaxForCadence', () => {
    it('caps weekly at 7', () => {
        assert.equal(dueDayMaxForCadence(Cadence.WEEKLY), 7);
        assert.equal(dueDayMaxForCadence(Cadence.MONTHLY), 31);
    });
});

describe('normalizeDueMonth / dueMonthMaxForCadence', () => {
    it('clears dueMonth for weekly/monthly', () => {
        assert.equal(dueMonthMaxForCadence(Cadence.WEEKLY), null);
        assert.equal(dueMonthMaxForCadence(Cadence.MONTHLY), null);
        assert.equal(normalizeDueMonth(2, Cadence.MONTHLY), null);
    });

    it('accepts 1–3 for quarterly and 1–12 for yearly', () => {
        assert.equal(normalizeDueMonth(2, Cadence.QUARTERLY), 2);
        assert.equal(normalizeDueMonth(4, Cadence.QUARTERLY), null);
        assert.equal(normalizeDueMonth(3, Cadence.YEARLY), 3);
        assert.equal(normalizeDueMonth(13, Cadence.YEARLY), null);
    });
});

describe('monthInQuarter / isChargeMonth', () => {
    it('maps calendar months into quarter slots', () => {
        assert.equal(monthInQuarter(9), 3); // September
        assert.equal(monthInQuarter(1), 1);
        assert.equal(monthInQuarter(4), 1);
        assert.equal(monthInQuarter(6), 3);
    });

    it('charges quarterly only in matching month-of-quarter', () => {
        // dueMonth=1 → Jan / Apr / Jul / Oct
        assert.equal(isChargeMonth(Cadence.QUARTERLY, 1, 1), true);
        assert.equal(isChargeMonth(Cadence.QUARTERLY, 1, 2), false);
        assert.equal(isChargeMonth(Cadence.QUARTERLY, 1, 4), true);
        assert.equal(isChargeMonth(Cadence.QUARTERLY, 3, 9), true);
        assert.equal(isChargeMonth(Cadence.QUARTERLY, 3, 8), false);
        assert.equal(isChargeMonth(Cadence.QUARTERLY, null, 1), false);
    });

    it('charges yearly only in matching calendar month', () => {
        assert.equal(isChargeMonth(Cadence.YEARLY, 3, 3), true);
        assert.equal(isChargeMonth(Cadence.YEARLY, 3, 4), false);
        assert.equal(isChargeMonth(Cadence.YEARLY, null, 3), false);
    });

    it('treats weekly/monthly as every month', () => {
        assert.equal(isChargeMonth(Cadence.MONTHLY, null, 9), true);
        assert.equal(isChargeMonth(Cadence.WEEKLY, null, 9), true);
    });
});

describe('dueDayReachedInMonth', () => {
    it('uses day-of-month for monthly', () => {
        const period = { year: 2026, month: 9 };
        assert.equal(
            dueDayReachedInMonth(15, Cadence.MONTHLY, period, new Date(2026, 8, 14)),
            false
        );
        assert.equal(
            dueDayReachedInMonth(15, Cadence.MONTHLY, period, new Date(2026, 8, 15)),
            true
        );
    });

    it('uses ISO weekday for weekly within the month', () => {
        const period = { year: 2026, month: 9 };
        // First Monday in Sep 2026 is the 7th
        assert.equal(dueDayReachedInMonth(1, Cadence.WEEKLY, period, new Date(2026, 8, 6)), false);
        assert.equal(dueDayReachedInMonth(1, Cadence.WEEKLY, period, new Date(2026, 8, 7)), true);
    });

    it('returns false in non-charge months for quarterly/yearly', () => {
        // Sep 2026 = month-of-quarter 3; dueMonth=1 is Jan/Apr/Jul/Oct
        assert.equal(
            dueDayReachedInMonth(
                15,
                Cadence.QUARTERLY,
                { year: 2026, month: 9 },
                new Date(2026, 8, 20),
                1
            ),
            false
        );
        assert.equal(
            dueDayReachedInMonth(
                15,
                Cadence.QUARTERLY,
                { year: 2026, month: 10 },
                new Date(2026, 9, 20),
                1
            ),
            true
        );
        assert.equal(
            dueDayReachedInMonth(
                1,
                Cadence.YEARLY,
                { year: 2026, month: 9 },
                new Date(2026, 8, 20),
                3
            ),
            false
        );
        assert.equal(
            dueDayReachedInMonth(
                1,
                Cadence.YEARLY,
                { year: 2026, month: 3 },
                new Date(2026, 2, 1),
                3
            ),
            true
        );
    });
});
