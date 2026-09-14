/**
 * Shared Rumtelo brand assets + logo component.
 *
 * Source of truth: `packages/brand/assets/`
 * Apps expose them at `/brand/*` via `public/brand` → symlink to this folder.
 * Do not copy files into app `public/` folders.
 *
 * Layout:
 *   logo/     — wordmark + icon mark (SVG app UI, PNG email)
 *   favicon/  — browser tab + Apple touch
 *   pwa/      — install / home-screen + web manifest
 */
export { RumteloLogo, type RumteloLogoProps, type RumteloLogoVariant } from './RumteloLogo';
export { BRAND_ASSETS, BRAND_METADATA_ICONS, BRAND_PUBLIC_BASE } from './assets';
