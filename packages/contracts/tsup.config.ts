import { defineConfig } from 'tsup';

/**
 * Dual-format build. The Nest backend is CommonJS (MikroORM entity decorators and
 * circular relations misbehave under ESM), while both Next apps are ESM. Shipping
 * both from one source keeps a single contract definition without the internal
 * HTTP hop the earlier migration plan proposed.
 *
 * Two configs, not one: bundlers strip module-level directives, so the React entry
 * needs "use client" re-attached as a banner or Next will treat it as a server module.
 *
 * Domain subpaths (`money`, `growth`, …) ship ownership in the import path so
 * callers need not rename symbols to MoneyDebtKind.
 */
const shared = {
    format: ['esm', 'cjs'] as const,
    dts: true,
    sourcemap: true,
    treeshake: true,
    external: ['react', '@tanstack/react-query'],
};

const domainEntries = {
    money: 'src/public/product/money/index.ts',
    growth: 'src/public/product/growth/index.ts',
    platform: 'src/public/platform/index.ts',
    energy: 'src/public/product/energy/index.ts',
    soul: 'src/public/product/soul/index.ts',
    backoffice: 'src/backoffice/index.ts',
    common: 'src/common/index.ts',
} as const;

export default defineConfig(options => [
    {
        ...shared,
        entry: { index: 'src/index.ts', ...domainEntries },
        // Watch must not wipe dist — turbo starts app/backend right after build, and
        // a concurrent clean races to ENOENT / MODULE_NOT_FOUND.
        clean: !options.watch,
    },
    {
        ...shared,
        // Types resolve from src via package.json exports. Emitting
        // a portable .d.ts for createAPIUtils hits TS7056 and breaks app inference.
        dts: false,
        entry: { react: 'src/client/react.tsx' },
        clean: false,
    },
]);
