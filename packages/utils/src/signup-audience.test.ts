import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
    parseSignUpAudience,
    signUpAudienceFromSearchParams,
    signUpAudienceQuery,
    signUpAudienceStartPath,
} from './signup-audience';

describe('sign-up audience', () => {
    it('parses known audiences case-insensitively and rejects the rest', () => {
        assert.equal(parseSignUpAudience('Practice'), 'practice');
        assert.equal(parseSignUpAudience('individual'), 'individual');
        assert.equal(parseSignUpAudience('company'), null);
        assert.equal(parseSignUpAudience(undefined), null);
    });

    it('defaults to individual when the param is missing or unknown', () => {
        assert.equal(signUpAudienceFromSearchParams(new URLSearchParams('')), 'individual');
        assert.equal(signUpAudienceFromSearchParams(new URLSearchParams('as=other')), 'individual');
        assert.equal(
            signUpAudienceFromSearchParams(new URLSearchParams('as=practice')),
            'practice'
        );
    });

    it('keeps the default implicit so plain sign-up links stay unchanged', () => {
        assert.deepEqual(signUpAudienceQuery('individual'), {});
        assert.deepEqual(signUpAudienceQuery(null), {});
        assert.deepEqual(signUpAudienceQuery('practice'), { as: 'practice' });
    });

    it('sends practices to the practice desk and individuals through onboarding', () => {
        assert.equal(signUpAudienceStartPath('practice'), '/practice/create');
        assert.equal(signUpAudienceStartPath('individual'), null);
    });
});
