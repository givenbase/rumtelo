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

    it('skips Railway public hosts so cookies never land on .railway.app', () => {
        assert.equal(
            resolveCrossSubdomainCookieDomain(
                'https://website-prod.up.railway.app',
                'https://app.rumtelo.com'
            ),
            '.rumtelo.com'
        );
        assert.equal(
            resolveCrossSubdomainCookieDomain('https://website-prod.up.railway.app'),
            undefined
        );
    });
});

describe('buildBetterAuthTrustedOrigins', () => {
    it('normalizes DOMAIN_* URLs to origins and trusts apex + www', () => {
        const origins = buildBetterAuthTrustedOrigins([
            'https://dev-app.rumtelo.com/',
            'https://dev.rumtelo.com',
            'https://dev-backend.rumtelo.com/',
        ]);
        assert.ok(origins.includes('https://dev-app.rumtelo.com'));
        assert.ok(origins.includes('https://dev.rumtelo.com'));
        assert.ok(origins.includes('https://dev-backend.rumtelo.com'));
        assert.ok(origins.includes('https://rumtelo.com'));
        assert.ok(origins.includes('https://www.rumtelo.com'));
    });

    it('trusts apex when only the app host is configured', () => {
        const origins = buildBetterAuthTrustedOrigins([
            'https://app.rumtelo.com',
            'https://backend-prod.up.railway.app',
        ]);
        assert.ok(origins.includes('https://app.rumtelo.com'));
        assert.ok(origins.includes('https://rumtelo.com'));
        assert.ok(origins.includes('https://www.rumtelo.com'));
        assert.ok(origins.includes('https://backend-prod.up.railway.app'));
        assert.equal(origins.includes('https://railway.app'), false);
        assert.equal(origins.includes('https://www.railway.app'), false);
    });

    it('does not expand localhost', () => {
        assert.deepEqual(
            buildBetterAuthTrustedOrigins([
                'http://localhost:3000/',
                'http://localhost:3001',
                'http://localhost:3002',
            ]),
            ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002']
        );
    });
});
