/** Public URL prefix after the `public/brand` symlink is in place. */
export const BRAND_PUBLIC_BASE = '/brand' as const;

export const BRAND_ASSETS = {
    /** App UI — colorful icon mark (theme-independent). */
    icon: `${BRAND_PUBLIC_BASE}/logo/icon.svg`,
    /** Designer master raster (do not downsample by hand — use `pnpm email-assets`). */
    iconPng: `${BRAND_PUBLIC_BASE}/logo/icon.png`,
    /** Email — Lanczos3 3× display PNG from master (`pnpm --filter @rumtelo/brand email-assets`). */
    iconEmailPng: `${BRAND_PUBLIC_BASE}/logo/icon-email.png`,
    /** App UI — SVG lockup for light surfaces. */
    wordmarkOnLight: `${BRAND_PUBLIC_BASE}/logo/wordmark-on-light.svg`,
    /** App UI — SVG lockup for dark surfaces. */
    wordmarkOnDark: `${BRAND_PUBLIC_BASE}/logo/wordmark-on-dark.svg`,
    /** Designer master rasters. */
    wordmarkOnLightPng: `${BRAND_PUBLIC_BASE}/logo/wordmark-on-light.png`,
    wordmarkOnDarkPng: `${BRAND_PUBLIC_BASE}/logo/wordmark-on-dark.png`,
    /** Email — Lanczos3 3× display PNGs from masters. */
    wordmarkOnLightEmailPng: `${BRAND_PUBLIC_BASE}/logo/wordmark-on-light-email.png`,
    wordmarkOnDarkEmailPng: `${BRAND_PUBLIC_BASE}/logo/wordmark-on-dark-email.png`,

    /** Browser tab — multi-size ICO. */
    favicon: `${BRAND_PUBLIC_BASE}/favicon/favicon.ico`,
    /** Browser tab — 96×96 PNG. */
    favicon96: `${BRAND_PUBLIC_BASE}/favicon/96x96.png`,
    /** iOS home screen — 180×180. */
    appleTouchIcon: `${BRAND_PUBLIC_BASE}/favicon/apple-touch-icon.png`,

    /** PWA / Android — 192×192 maskable. */
    pwa192: `${BRAND_PUBLIC_BASE}/pwa/icon-192.png`,
    /** PWA / Android — 512×512 maskable. */
    pwa512: `${BRAND_PUBLIC_BASE}/pwa/icon-512.png`,
    /** Web app manifest. */
    manifest: `${BRAND_PUBLIC_BASE}/pwa/manifest.webmanifest`,
} as const;

type BrandIcon = { url: string; type?: string; sizes?: string };

/** Shared Next.js `metadata.icons` (mutable so it matches Metadata typings). */
export const BRAND_METADATA_ICONS: { icon: BrandIcon[]; apple: BrandIcon[] } = {
    // White-bg rasters only — logo/icon.svg is transparent and fails on dark chrome.
    icon: [
        { url: BRAND_ASSETS.pwa192, sizes: '192x192', type: 'image/png' },
        { url: BRAND_ASSETS.pwa512, sizes: '512x512', type: 'image/png' },
        { url: BRAND_ASSETS.appleTouchIcon, sizes: '180x180', type: 'image/png' },
        { url: BRAND_ASSETS.favicon, sizes: '48x48' },
    ],
    apple: [{ url: BRAND_ASSETS.appleTouchIcon, sizes: '180x180', type: 'image/png' }],
};
