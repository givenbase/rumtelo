import { describe, expect, it } from 'vitest';

import { FIXED_COST_PRESET_SEED } from '../../../../../backoffice/product/money/preset/fixed-cost/seed/fixed-cost.seed-data';
import { MERCHANT_PRESET_SEED } from '../../../../../backoffice/product/money/preset/merchant/seed';
import {
    SUBSCRIPTION_MERCHANT_KEYS,
    SUBSCRIPTION_PRESET_KEYS,
    isCancellableFixedCost,
    isSubscriptionFixedCost,
} from './fixed-cost-cancellable.util';

const pick = (presetKey: string | null, merchantKey: string | null = null) => ({
    presetKey,
    merchantKey,
});

describe('isCancellableFixedCost', () => {
    it('flags streaming, software, news, VPN, cloud, meal kit and gaming presets', () => {
        for (const key of [
            'STREAMING_VIDEO',
            'STREAMING_MUSIC',
            'STREAMING_BUNDLE',
            'GAMING_SUBSCRIPTION',
            'CLOUD_STORAGE',
            'SOFTWARE_SUITE',
            'NEWS_SUBSCRIPTION',
            'VPN',
            'MEAL_KIT',
        ]) {
            expect(isCancellableFixedCost(pick(key))).toBe(true);
            expect(isSubscriptionFixedCost(pick(key))).toBe(true);
        }
    });

    it('flags gym, club and hobby memberships as cancellable but not as subscriptions', () => {
        for (const key of ['GYM', 'SPORTS_CLUB', 'HOBBY_MEMBERSHIP']) {
            expect(isCancellableFixedCost(pick(key))).toBe(true);
            expect(isSubscriptionFixedCost(pick(key))).toBe(false);
        }
    });

    it('never flags essentials', () => {
        for (const key of [
            'RENT',
            'MORTGAGE',
            'INTERNET',
            'MOBILE_PHONE',
            'MOBILE_PHONE_PARTNER',
            'LANDLINE',
            'HOSTING_EMAIL',
        ]) {
            expect(isCancellableFixedCost(pick(key))).toBe(false);
        }
        // Telco merchants sit in the Subscriptions category but are essentials.
        expect(isCancellableFixedCost(pick(null, 'KPN'))).toBe(false);
        expect(isCancellableFixedCost(pick(null, 'VODAFONE'))).toBe(false);
    });

    it('flags streaming and software merchants, and delivery merchants as cancellable only', () => {
        expect(isSubscriptionFixedCost(pick(null, 'NETFLIX'))).toBe(true);
        expect(isCancellableFixedCost(pick(null, 'SPOTIFY'))).toBe(true);
        expect(isCancellableFixedCost(pick(null, 'NORDVPN'))).toBe(true);
        const eatingOut = MERCHANT_PRESET_SEED.find(
            merchant => merchant.categoryTemplateKey === 'EATING_OUT'
        )!;
        expect(isCancellableFixedCost(pick(null, eatingOut.key))).toBe(true);
        expect(isSubscriptionFixedCost(pick(null, eatingOut.key))).toBe(false);
    });

    it('does not flag sport retailers or free-typed bills', () => {
        expect(isCancellableFixedCost(pick(null, 'DECATHLON'))).toBe(false);
        expect(isCancellableFixedCost(pick(null, null))).toBe(false);
    });

    it('only references keys that exist in the catalogs', () => {
        const presetKeys = new Set(FIXED_COST_PRESET_SEED.map(preset => preset.key));
        const merchantKeys = new Set(MERCHANT_PRESET_SEED.map(merchant => merchant.key));
        for (const key of [
            ...SUBSCRIPTION_PRESET_KEYS,
            'GYM',
            'SPORTS_CLUB',
            'HOBBY_MEMBERSHIP',
            'MEAL_KIT',
            'INTERNET',
            'MOBILE_PHONE',
            'MOBILE_PHONE_PARTNER',
            'LANDLINE',
        ]) {
            expect(presetKeys.has(key)).toBe(true);
        }
        for (const key of ['KPN', 'VODAFONE', 'NETFLIX', 'SPOTIFY', 'NORDVPN', 'DECATHLON']) {
            expect(merchantKeys.has(key)).toBe(true);
        }
        expect(SUBSCRIPTION_MERCHANT_KEYS.size).toBeGreaterThan(0);
    });
});
