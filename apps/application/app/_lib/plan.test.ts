import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import { PLAN_CAPABILITY_GRANTS } from '@rumtelo/contracts';
import { formatPlanPrice } from '@rumtelo/utils';

import {
    GAIN_CAPABILITIES,
    MAX_GAIN_CAPABILITIES,
    PLAN_RETAIL_CENTS,
    PLUS_GAIN_CAPABILITIES,
    PlanKey,
    planAmountLabel,
    planPriceLabel,
} from './plan';

test('planPriceLabel reads PLAN_RETAIL_CENTS for Plus and Max', () => {
    const plus = formatPlanPrice(PLAN_RETAIL_CENTS[PlanKey.PLUS].month);
    const max = formatPlanPrice(PLAN_RETAIL_CENTS[PlanKey.MAX].month);
    assert.equal(planAmountLabel(PlanKey.PLUS), plus);
    assert.equal(planAmountLabel(PlanKey.MAX), max);
    assert.equal(planPriceLabel(PlanKey.PLUS), `${plus} / month`);
    assert.equal(planPriceLabel(PlanKey.MAX), `${max} / month`);
});

test('Basic has no price: planAmountLabel is null and planPriceLabel is Free', () => {
    assert.equal(planAmountLabel(PlanKey.BASIC), null);
    assert.equal(planPriceLabel(PlanKey.BASIC), formatPlanPrice(0));
});

test('the amount is localised, not fixed', () => {
    assert.notEqual(planAmountLabel(PlanKey.PLUS, 'nl-NL'), null);
    assert.match(planAmountLabel(PlanKey.PLUS, 'nl-NL') ?? '', /9/);
});

test('plan.ts holds no hard-coded plan amount', () => {
    const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'plan.ts'), 'utf8');
    assert.equal(/toMinorUnits\(\s*\d/.test(source), false, 'toMinorUnits(<number>)');
    assert.equal(/formatPlanPrice\(\s*\d/.test(source.replace('formatPlanPrice(0)', '')), false);
    assert.equal(/[€]\s?\d/.test(source), false, 'a literal € amount');
});

test('"More with Plus" lists only what Plus adds over Basic', () => {
    const basic = new Set<string>(PLAN_CAPABILITY_GRANTS[PlanKey.BASIC]);
    const plus = new Set<string>(PLAN_CAPABILITY_GRANTS[PlanKey.PLUS]);
    for (const key of PLUS_GAIN_CAPABILITIES) {
        assert.ok(plus.has(key), `${key} is granted on Plus`);
        assert.ok(!basic.has(key), `${key} is not granted on Basic`);
    }
});

test('"More with Max" lists only what Max adds over Plus', () => {
    const plus = new Set<string>(PLAN_CAPABILITY_GRANTS[PlanKey.PLUS]);
    const max = new Set<string>(PLAN_CAPABILITY_GRANTS[PlanKey.MAX]);
    for (const key of MAX_GAIN_CAPABILITIES) {
        assert.ok(max.has(key), `${key} is granted on Max`);
        assert.ok(!plus.has(key), `${key} is not granted on Plus`);
    }
});

test('every listed gain has a written gain line', () => {
    for (const key of [...PLUS_GAIN_CAPABILITIES, ...MAX_GAIN_CAPABILITIES]) {
        assert.ok(GAIN_CAPABILITIES.includes(key), `${key} needs a gain line`);
    }
});
