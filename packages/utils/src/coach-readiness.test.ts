import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
    CoachFeatureId,
    CoachFeatureStatus,
    COACH_FEATURES,
    getCoachFeature,
    isCoachFeatureEnabledAtLaunch,
    shouldDeferPreviewCoaches,
} from '@rumtelo/contracts';

describe('shouldDeferPreviewCoaches', () => {
    it('defers only when NODE_ENV is production', () => {
        assert.equal(shouldDeferPreviewCoaches({ nodeEnv: 'production' }), true);
    });

    it('does not defer for development, staging, or test', () => {
        assert.equal(shouldDeferPreviewCoaches({ nodeEnv: 'development' }), false);
        assert.equal(shouldDeferPreviewCoaches({ nodeEnv: 'staging' }), false);
        assert.equal(shouldDeferPreviewCoaches({ nodeEnv: 'test' }), false);
        assert.equal(shouldDeferPreviewCoaches({}), false);
    });
});

describe('isCoachFeatureEnabledAtLaunch', () => {
    it('always enables ship features', () => {
        assert.equal(
            isCoachFeatureEnabledAtLaunch(CoachFeatureId.SPLIT_COACH, { nodeEnv: 'production' }),
            true
        );
        assert.equal(
            isCoachFeatureEnabledAtLaunch(CoachFeatureId.DEBT_STRATEGY, { nodeEnv: 'staging' }),
            true
        );
    });

    it('hides preview features in production', () => {
        assert.equal(
            isCoachFeatureEnabledAtLaunch(CoachFeatureId.GIVING_FINDER, { nodeEnv: 'production' }),
            false
        );
        assert.equal(
            isCoachFeatureEnabledAtLaunch(CoachFeatureId.TIME_COACH, { nodeEnv: 'production' }),
            false
        );
    });

    it('shows preview features on staging and development', () => {
        assert.equal(
            isCoachFeatureEnabledAtLaunch(CoachFeatureId.GIVING_FINDER, { nodeEnv: 'staging' }),
            true
        );
        assert.equal(
            isCoachFeatureEnabledAtLaunch(CoachFeatureId.GOAL_ADVICE, {
                nodeEnv: 'development',
            }),
            true
        );
    });

    it('never enables backlog features', () => {
        assert.equal(
            isCoachFeatureEnabledAtLaunch(CoachFeatureId.SPLIT_COACH_B2, {
                nodeEnv: 'development',
            }),
            false
        );
        assert.equal(
            isCoachFeatureEnabledAtLaunch(CoachFeatureId.MONEY_TIP_PRODUCERS, {
                nodeEnv: 'staging',
            }),
            false
        );
    });
});

describe('COACH_FEATURES catalog', () => {
    it('has unique ids and known statuses', () => {
        const ids = COACH_FEATURES.map(feature => feature.id);
        assert.equal(new Set(ids).size, ids.length);
        for (const feature of COACH_FEATURES) {
            assert.ok(Object.values(CoachFeatureStatus).includes(feature.status));
            assert.ok(getCoachFeature(feature.id)?.id === feature.id);
        }
    });
});
