import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
    feedMessagesForKeys,
    isDeferredPortalHref,
    orderFeedMessagesByKeys,
    ratioBandFingerprint,
    secondaryCtaOf,
    selectCoachLineCandidate,
    type CoachLineCandidate,
} from './coach-line';

const allEnabled = () => true;
const noneEnabled = () => false;

function candidate(over: Partial<CoachLineCandidate> = {}): CoachLineCandidate {
    return {
        id: 'feed:1',
        text: 'Fixed costs take 62% of your income.',
        cta: { label: 'Add income', href: '/product/money/income' },
        dismiss: { kind: 'feed', messageId: '1' },
        ...over,
    };
}

describe('selectCoachLineCandidate', () => {
    it('renders nothing without candidates', () => {
        assert.equal(
            selectCoachLineCandidate([], { localHidden: {}, isProductEnabled: allEnabled }),
            null
        );
    });

    it('picks the first candidate in priority order', () => {
        const first = candidate({ id: 'feed:1' });
        const second = candidate({ id: 'feed:2' });
        assert.equal(
            selectCoachLineCandidate([first, second], {
                localHidden: {},
                isProductEnabled: allEnabled,
            }),
            first
        );
    });

    it('skips a candidate without text or without a move', () => {
        const noText = candidate({ id: 'a', text: '  ' });
        const noLabel = candidate({ id: 'b', cta: { label: '', href: '/x' } });
        const noHref = candidate({ id: 'c', cta: { label: 'Open', href: '' } });
        const ok = candidate({ id: 'd' });
        const picked = selectCoachLineCandidate([noText, noLabel, noHref, ok], {
            localHidden: {},
            isProductEnabled: allEnabled,
        });
        assert.equal(picked?.id, 'd');
    });

    it('hides a local rule at the same fingerprint and shows it again when it changes', () => {
        const local = candidate({
            id: 'jars.necessities_over',
            dismiss: { kind: 'local', fingerprint: '2026-11:12' },
        });
        const options = { isProductEnabled: allEnabled };
        assert.equal(
            selectCoachLineCandidate([local], {
                ...options,
                localHidden: { 'jars.necessities_over': '2026-11:12' },
            }),
            null
        );
        assert.equal(
            selectCoachLineCandidate([local], {
                ...options,
                localHidden: { 'jars.necessities_over': '2026-11:11' },
            }),
            local
        );
    });

    it('falls through to the next candidate when the first is hidden', () => {
        const hidden = candidate({
            id: 'local',
            dismiss: { kind: 'local', fingerprint: 'a' },
        });
        const next = candidate({ id: 'feed:2' });
        const picked = selectCoachLineCandidate([hidden, next], {
            localHidden: { local: 'a' },
            isProductEnabled: allEnabled,
        });
        assert.equal(picked, next);
    });

    it('skips candidates that point into a deferred portal', () => {
        const energy = candidate({
            id: 'energy',
            cta: { label: 'Open my week', href: '/product/energy/week' },
        });
        const money = candidate({ id: 'money' });
        assert.equal(
            selectCoachLineCandidate([energy, money], {
                localHidden: {},
                isProductEnabled: noneEnabled,
            })?.id,
            'money'
        );
        assert.equal(
            selectCoachLineCandidate([energy], { localHidden: {}, isProductEnabled: allEnabled })
                ?.id,
            'energy'
        );
    });

    it('skips a candidate whose secondary move is in a deferred portal', () => {
        const mixed = candidate({
            secondaryCta: { label: 'Stillness', href: '/product/soul/stillness' },
        });
        assert.equal(
            selectCoachLineCandidate([mixed], { localHidden: {}, isProductEnabled: noneEnabled }),
            null
        );
    });
});

describe('isDeferredPortalHref', () => {
    it('matches only energy and soul routes', () => {
        assert.equal(isDeferredPortalHref('/product/energy', noneEnabled), true);
        assert.equal(isDeferredPortalHref('/product/soul/giving?x=1', noneEnabled), true);
        assert.equal(isDeferredPortalHref('/product/money/income', noneEnabled), false);
        assert.equal(isDeferredPortalHref('/product/energyx', noneEnabled), false);
    });
});

describe('feed filtering', () => {
    const rows = [
        { key: 'money.inbox_unsorted:2026-11:3', dismissedAt: null },
        { key: 'money.fixed_costs.business_leak:2026-11', dismissedAt: null },
        { key: 'money.fixed_costs.over_necessities:2026-11:62', dismissedAt: null },
        {
            key: 'money.fixed_costs.subscription_review:2026-Q4',
            dismissedAt: '2026-11-01T00:00:00Z',
        },
        { key: null, dismissedAt: null },
    ];
    const prefixes = [
        'money.fixed_costs.over_necessities',
        'money.fixed_costs.business_leak',
        'money.fixed_costs.subscription_review',
    ];

    it('keeps only open rows with the wanted key prefixes', () => {
        const kept = feedMessagesForKeys(rows, prefixes);
        assert.deepEqual(
            kept.map(row => row.key),
            [
                'money.fixed_costs.business_leak:2026-11',
                'money.fixed_costs.over_necessities:2026-11:62',
            ]
        );
    });

    it('orders by the prefix priority, not by feed order', () => {
        const ordered = orderFeedMessagesByKeys(feedMessagesForKeys(rows, prefixes), prefixes);
        assert.deepEqual(
            ordered.map(row => row.key),
            [
                'money.fixed_costs.over_necessities:2026-11:62',
                'money.fixed_costs.business_leak:2026-11',
            ]
        );
    });
});

describe('secondaryCtaOf', () => {
    it('is null when the row has no second move', () => {
        assert.equal(secondaryCtaOf({}), null);
        assert.equal(secondaryCtaOf({ ctaSecondaryLabel: 'Open', ctaSecondaryHref: null }), null);
    });

    it('reads both fields when present', () => {
        assert.deepEqual(
            secondaryCtaOf({
                ctaSecondaryLabel: 'Open the biggest fixed cost',
                ctaSecondaryHref: '/x',
            }),
            { label: 'Open the biggest fixed cost', href: '/x' }
        );
    });
});

describe('ratioBandFingerprint', () => {
    it('changes only when the ratio moves to a new 5-point band or a new month starts', () => {
        assert.equal(ratioBandFingerprint('2026-11', 61), ratioBandFingerprint('2026-11', 64));
        assert.notEqual(ratioBandFingerprint('2026-11', 64), ratioBandFingerprint('2026-11', 65));
        assert.notEqual(ratioBandFingerprint('2026-11', 61), ratioBandFingerprint('2026-12', 61));
    });
});
