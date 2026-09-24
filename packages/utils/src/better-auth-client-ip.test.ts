import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
    applyTrustedClientIpHeaders,
    isClientIp,
    resolveClientIpFromHeaders,
} from './better-auth-client-ip';

describe('better-auth-client-ip', () => {
    it('accepts ipv4 and rejects junk', () => {
        assert.equal(isClientIp('203.0.113.10'), true);
        assert.equal(isClientIp(' 127.0.0.1 '), true);
        assert.equal(isClientIp('999.1.1.1'), false);
        assert.equal(isClientIp('10.0.0.0/8'), false);
        assert.equal(isClientIp(''), false);
    });

    it('prefers x-real-ip when single-valued', () => {
        const headers = new Headers({
            'x-real-ip': '203.0.113.10',
            'x-forwarded-for': '198.51.100.1, 10.0.0.1',
        });
        assert.equal(resolveClientIpFromHeaders(headers), '203.0.113.10');
    });

    it('takes leftmost x-forwarded-for when no single header', () => {
        const headers = new Headers({
            'x-forwarded-for': '203.0.113.50, 100.64.1.2, 10.0.0.3',
        });
        assert.equal(resolveClientIpFromHeaders(headers), '203.0.113.50');
    });

    it('stamps single-value headers for Nest', () => {
        const headers = new Headers({ 'x-forwarded-for': 'a, b' });
        applyTrustedClientIpHeaders(headers, '203.0.113.10');
        assert.equal(headers.get('x-real-ip'), '203.0.113.10');
        assert.equal(headers.get('x-forwarded-for'), '203.0.113.10');
    });
});
