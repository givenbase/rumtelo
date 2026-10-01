import createNextIntlPlugin from 'next-intl/plugin';

/** @type {import('next').NextConfig} */
const nextConfig = {
    // Next regenerates AGENTS.md/CLAUDE.md on every dev boot; we keep our own docs.
    agentRules: false,
    // Workspace packages must be transpiled so proxy/middleware can resolve them.
    transpilePackages: [
        '@rumtelo/contracts',
        '@rumtelo/i18n',
        '@rumtelo/brand',
        '@rumtelo/ui',
        '@rumtelo/utils',
        '@rumtelo/hooks',
        '@rumtelo/config',
    ],
    experimental: {
        // Enables app/global-not-found.tsx so unmatched URLs use StatusPage.
        globalNotFound: true,
    },
};

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

export default withNextIntl(nextConfig);
