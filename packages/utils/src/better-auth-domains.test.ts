import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
    buildBetterAuthTrustedOrigins,
    extractRootDomainFromUrl,
    resolveCrossSubdomainCookieDomain,
} from './better-auth-domains';

describe('extractRootDomainFromUrl', () => {
    it('takes the last two labels from env hostnames', () => {
        assert.equal(extractRootDomainFromUrl('https://app.rumtelo.com'), 'rumtelo.com');
        assert.equal(extractRootDomainFromUrl('https://dev.rumtelo.com'), 'rumtelo.com');
        assert.equal(extractRootDomainFromUrl('https://dev-app.rumtelo.com'), 'rumtelo.com');
    });

    it('returns null for localhost', () => {
        assert.equal(extractRootDomainFromUrl('http://localhost:3000'), null);
    });
});

describe('resolveCrossSubdomainCookieDomain', () => {
    it('uses the first DOMAIN_* URL root (galighticus pattern)', () => {
        assert.equal(
            resolveCrossSubdomainCookieDomain(
                'https://dev.rumtelo.com',
                'https://dev-app.rumtelo.com'
            ),
            '.rumtelo.com'
        );
        assert.equal(
            resolveCrossSubdomainCookieDomain('https://rumtelo.com', 'https://app.rumtelo.com'),
            '.rumtelo.com'
        );
    });

    it('returns undefined for localhost-only env', () => {
        assert.equal(
            resolveCrossSubdomainCookieDomain('http://localhost:3001', 'http://localhost:3000'),
            undefined
        );
    });
});

describe('buildBetterAuthTrustedOrigins', () => {
    it('normalizes DOMAIN_* URLs to origins', () => {
        assert.deepEqual(
            buildBetterAuthTrustedOrigins([
                'https://dev-app.rumtelo.com/',
                'https://dev.rumtelo.com',
                'https://dev-backend.rumtelo.com/',
            ]),
            [
                'https://dev-app.rumtelo.com',
                'https://dev.rumtelo.com',
                'https://dev-backend.rumtelo.com',
            ]
        );
    });
});
