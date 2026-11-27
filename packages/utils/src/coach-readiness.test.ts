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
            isCoachFeatureEnabledAtLaunch(CoachFeatureId.SOUL_TIP_PRODUCERS, {
                nodeEnv: 'staging',
            }),
            false
        );
    });
});

describe('backlog features, whole catalog', () => {
    it('are never enabled, in any environment, whatever else the catalog holds', () => {
        const backlog = COACH_FEATURES.filter(
            feature => feature.status === CoachFeatureStatus.BACKLOG
        );
        // A catalog without backlog rows would make this test pass for nothing.
        assert.ok(backlog.length > 0);
        for (const feature of backlog) {
            for (const nodeEnv of ['production', 'staging', 'development', 'test', undefined]) {
                assert.equal(
                    isCoachFeatureEnabledAtLaunch(feature.id, { nodeEnv }),
                    false,
                    `${feature.id} enabled in ${String(nodeEnv)}`
                );
            }
        }
    });

    it('ship features are on everywhere, so a status flip is caught by the other tests', () => {
        for (const feature of COACH_FEATURES.filter(
            row => row.status === CoachFeatureStatus.SHIP
        )) {
            assert.equal(
                isCoachFeatureEnabledAtLaunch(feature.id, { nodeEnv: 'production' }),
                true
            );
        }
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
