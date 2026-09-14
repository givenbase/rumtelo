# @rumtelo/brand

Single source of truth for Rumtelo logos, favicons, and PWA icons.

## Why here (not `apps/*/public`)

Website and application both need the same files. Putting them in one package
and **symlinking** each app’s `public/brand` → `packages/brand/assets` means:

- no duplicated binaries
- same `/brand/...` URLs in both Next apps

## Assets

```
packages/brand/assets/
  logo/
    icon.svg                  # app — colorful mark
    icon.png                  # email — colorful mark
    wordmark-on-light.svg     # app — light surfaces
    wordmark-on-dark.svg      # app — dark surfaces
    wordmark-on-light.png     # email — light surfaces
    wordmark-on-dark.png      # email — dark surfaces
  favicon/
    favicon.ico               # browser tab
    96x96.png                 # browser tab PNG
    apple-touch-icon.png      # iOS home screen (180×180)
  pwa/
    icon-192.png              # PWA maskable
    icon-512.png              # PWA maskable
    manifest.webmanifest      # web app manifest
```

**App:** SVG. **Email:** PNG (clients don’t reliably render SVG).
The icon is brand-colored (teal gradient) — no light/dark pair needed.

Do **not** copy favicons into `apps/*/app` or `apps/*/public`. Layouts pull
them via `BRAND_METADATA_ICONS` / `BRAND_ASSETS.manifest` from `/brand/...`.

## Usage

```tsx
import { RumteloLogo, BRAND_ASSETS, BRAND_METADATA_ICONS } from '@rumtelo/brand';

<RumteloLogo variant="wordmark" className="h-7 w-auto" />
<RumteloLogo variant="wordmarkOnDark" className="h-7 w-auto" />
<RumteloLogo variant="icon" className="size-8" />

// In layout metadata:
export const metadata = {
  icons: BRAND_METADATA_ICONS,
  manifest: BRAND_ASSETS.manifest,
  applicationName: 'Rumtelo',
  appleWebApp: { title: 'Rumtelo', capable: true, statusBarStyle: 'default' },
};
```

## Symlinks

```bash
ln -sfn ../../../packages/brand/assets apps/website/public/brand
ln -sfn ../../../packages/brand/assets apps/application/public/brand
```
