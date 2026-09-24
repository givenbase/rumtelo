import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { shouldShowStagingBanner } from './staging-banner';

describe('shouldShowStagingBanner', () => {
    it('hides on local development', () => {
        assert.equal(
            shouldShowStagingBanner({
                nodeEnv: 'development',
                railwayEnvironmentName: 'staging',
                hostname: 'dev-app.rumtelo.com',
            }),
            false
        );
    });

    it('hides on production Railway env', () => {
        assert.equal(
            shouldShowStagingBanner({
                nodeEnv: 'production',
                railwayEnvironmentName: 'production',
                hostname: 'app.rumtelo.com',
            }),
            false
        );
    });

    it('shows on staging Railway env', () => {
        assert.equal(
            shouldShowStagingBanner({
                nodeEnv: 'production',
                railwayEnvironmentName: 'staging',
                hostname: 'app.rumtelo.com',
            }),
            true
        );
    });

    it('shows on staging hostnames when Railway name is unset', () => {
        assert.equal(
            shouldShowStagingBanner({
                nodeEnv: 'production',
                hostname: 'dev-app.rumtelo.com',
            }),
            true
        );
        assert.equal(
            shouldShowStagingBanner({
                nodeEnv: 'production',
                hostname: 'dev.rumtelo.com',
            }),
            true
        );
    });

    it('hides on production hostnames when Railway name is unset', () => {
        assert.equal(
            shouldShowStagingBanner({
                nodeEnv: 'production',
                hostname: 'app.rumtelo.com',
            }),
            false
        );
        assert.equal(
            shouldShowStagingBanner({
                nodeEnv: 'production',
                hostname: 'localhost',
            }),
            false
        );
    });
});
