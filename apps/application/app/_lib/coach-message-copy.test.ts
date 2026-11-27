import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveCoachMessage, type CoachCopyContext } from './coach-message-copy';

// Echo translator: `key|name=value|…` so the test sees which key and which values were used.
const translate = (key: string, values?: Record<string, string | number | Date>) =>
    [key, ...Object.entries(values ?? {}).map(([name, value]) => `${name}=${String(value)}`)].join(
        '|'
    );

const context: CoachCopyContext = {
    formatMoney: cents => `€${cents}`,
    necessitiesJarName: 'Basis',
};

function resolve(key: string, ctx: CoachCopyContext | null = context) {
    return resolveCoachMessage(
        { key, text: 'server text', ctaLabel: 'Server CTA' },
        translate,
        undefined,
        ctx ?? undefined
    );
}

describe('fixed-costs Coach rules', () => {
    it('builds the over-necessities sentence from the key and the jar name', () => {
        const copy = resolve('money.fixed_costs.over_necessities:2026-11:12500');
        assert.equal(
            copy.text,
            'money_coach.fixed_costs.over_necessities.text|jar=Basis|amount=€12500'
        );
        assert.equal(copy.ctaLabel, 'money_coach.fixed_costs.over_necessities.cta');
    });

    it('builds the business-leak sentence from the monthly cents', () => {
        const copy = resolve('money.fixed_costs.business_leak:2026-11:4000:2');
        assert.equal(copy.text, 'money_coach.fixed_costs.business_leak.text|amount=€4000');
    });

    it('uses the singular and plural subscription sentences', () => {
        assert.equal(
            resolve('money.fixed_costs.subscription_review:2026-Q4:1:900').text,
            'money_coach.fixed_costs.subscription_review.text_one|count=1|amount=€900'
        );
        assert.equal(
            resolve('money.fixed_costs.subscription_review:2026-Q4:3:2500').text,
            'money_coach.fixed_costs.subscription_review.text_other|count=3|amount=€2500'
        );
    });

    it('falls back to the server text when the key cannot be parsed', () => {
        assert.equal(resolve('money.fixed_costs.over_necessities:2026-11').text, 'server text');
        assert.equal(resolve('money.fixed_costs.business_leak:2026-11:x:1').text, 'server text');
        assert.equal(
            resolve('money.fixed_costs.subscription_review:2026-Q4:2').text,
            'server text'
        );
    });

    it('falls back to the server text without a context or a jar name', () => {
        assert.equal(
            resolve('money.fixed_costs.business_leak:2026-11:4000:1', null).text,
            'server text'
        );
        assert.equal(
            resolve('money.fixed_costs.over_necessities:2026-11:12500', {
                ...context,
                necessitiesJarName: null,
            }).text,
            'server text'
        );
    });
});
