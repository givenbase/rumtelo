import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
    isIbanApiErrorMessage,
    parseApiUserMessage,
    resolveApiUserMessage,
} from './api-user-message';

describe('resolveApiUserMessage', () => {
    const t = (key: string, values?: Record<string, string | number | Date>) =>
        values ? `${key}:${JSON.stringify(values)}` : key;

    it('translates backend i18n keys directly', () => {
        assert.equal(resolveApiUserMessage('goal_not_active', t), 'goal_not_active');
        assert.equal(
            resolveApiUserMessage('jar_split_total', t, { total: 95 }),
            'jar_split_total:{"total":95}'
        );
    });

    it('maps Better Auth by code (preferred)', () => {
        assert.equal(
            resolveApiUserMessage('whatever', t, { code: 'INVALID_EMAIL_OR_PASSWORD' }),
            'invalid_email_or_password'
        );
        assert.equal(
            resolveApiUserMessage('', t, { code: 'EMAIL_NOT_VERIFIED' }),
            'email_not_verified'
        );
    });

    it('maps Better Auth English only as fallback', () => {
        assert.equal(
            resolveApiUserMessage('Invalid email or password', t),
            'invalid_email_or_password'
        );
    });

    it('does not map old Nest English anymore', () => {
        assert.equal(resolveApiUserMessage('Goal is not active', t), 'Goal is not active');
    });

    it('passes through unknown messages', () => {
        assert.equal(resolveApiUserMessage('Something novel', t), 'Something novel');
    });
});

describe('parseApiUserMessage', () => {
    it('recognizes keys and codes', () => {
        assert.deepEqual(parseApiUserMessage('invalid_iban'), { key: 'invalid_iban' });
        assert.deepEqual(parseApiUserMessage('x', { code: 'USER_NOT_FOUND' }), {
            key: 'user_not_found',
        });
    });
});

describe('isIbanApiErrorMessage', () => {
    it('detects keys only', () => {
        assert.equal(isIbanApiErrorMessage('invalid_iban'), true);
        assert.equal(isIbanApiErrorMessage('Invalid IBAN'), false);
    });
});
