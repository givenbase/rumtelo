import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { shouldShowStagingBanner } from './staging-banner';

describe('shouldShowStagingBanner', () => {
    it('shows only when NODE_ENV is staging', () => {
        assert.equal(shouldShowStagingBanner({ nodeEnv: 'staging' }), true);
    });

    it('hides for development, test, and production', () => {
        assert.equal(shouldShowStagingBanner({ nodeEnv: 'development' }), false);
        assert.equal(shouldShowStagingBanner({ nodeEnv: 'test' }), false);
        assert.equal(shouldShowStagingBanner({ nodeEnv: 'production' }), false);
        assert.equal(shouldShowStagingBanner({}), false);
    });
});
