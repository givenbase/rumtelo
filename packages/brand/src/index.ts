/**
 * Shared Rumtelo brand assets + logo component.
 *
 * Source of truth: `packages/brand/assets/`
 * Apps expose them at `/brand/*` via `public/brand` → symlink to this folder.
 * Do not copy files into app `public/` folders.
 */
export { RumteloLogo, type RumteloLogoProps, type RumteloLogoVariant } from './RumteloLogo';

/** Public URL prefix after the symlink is in place. */
export const BRAND_PUBLIC_BASE = '/brand' as const;

export const BRAND_ASSETS = {
    /** App UI — colorful icon mark (theme-independent). */
    icon: `${BRAND_PUBLIC_BASE}/rumtelo-logo-icon.svg`,
    /** Email / raster — colorful icon mark. */
    iconPng: `${BRAND_PUBLIC_BASE}/rumtelo-logo-icon.png`,
    /** Browser tab — multi-size ICO. */
    favicon: `${BRAND_PUBLIC_BASE}/rumtelo-favicon.ico`,
    /** Browser tab — 96×96 PNG. */
    favicon96: `${BRAND_PUBLIC_BASE}/rumtelo-favicon-96x96.png`,
    /** iOS home screen — 180×180. */
    appleTouchIcon: `${BRAND_PUBLIC_BASE}/rumtelo-apple-touch-icon.png`,
    /** PWA / Android — 192×192 maskable. */
    pwa192: `${BRAND_PUBLIC_BASE}/rumtelo-pwa-192.png`,
    /** PWA / Android — 512×512 maskable. */
    pwa512: `${BRAND_PUBLIC_BASE}/rumtelo-pwa-512.png`,
    /** Web app manifest. */
    manifest: `${BRAND_PUBLIC_BASE}/site.webmanifest`,
    /** App UI — SVG lockup for light surfaces. */
    wordmarkOnLight: `${BRAND_PUBLIC_BASE}/rumtelo-logo-wordmark-on-light.svg`,
    /** App UI — SVG lockup for dark surfaces. */
    wordmarkOnDark: `${BRAND_PUBLIC_BASE}/rumtelo-logo-wordmark-on-dark.svg`,
    /** Email / raster clients — PNG lockup for light surfaces. */
    wordmarkOnLightPng: `${BRAND_PUBLIC_BASE}/rumtelo-logo-wordmark-on-light.png`,
    /** Email / raster clients — PNG lockup for dark surfaces. */
    wordmarkOnDarkPng: `${BRAND_PUBLIC_BASE}/rumtelo-logo-wordmark-on-dark.png`,
} as const;

type BrandIcon = { url: string; type?: string; sizes?: string };

/** Shared Next.js `metadata.icons` (mutable so it matches Metadata typings). */
export const BRAND_METADATA_ICONS: { icon: BrandIcon[]; apple: BrandIcon[] } = {
    icon: [
        { url: BRAND_ASSETS.icon, type: 'image/svg+xml' },
        { url: BRAND_ASSETS.favicon96, sizes: '96x96', type: 'image/png' },
        { url: BRAND_ASSETS.favicon, sizes: '48x48' },
    ],
    apple: [{ url: BRAND_ASSETS.appleTouchIcon, sizes: '180x180', type: 'image/png' }],
};
