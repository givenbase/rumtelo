import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/** Content-IDs referenced as `cid:…` in Resend HTML (must match attachment.contentId). */
export const EMAIL_LOGO_CID = {
    wordmarkLight: 'rumtelo-wordmark-light',
    wordmarkDark: 'rumtelo-wordmark-dark',
    icon: 'rumtelo-icon',
} as const;

export type EmailLogoMode = 'cid' | 'data-uri';

export type EmailBrandLogoSrcs = {
    /** Wordmark for light surfaces (dark ink). */
    wordmarkLight: string;
    /** Wordmark for dark surfaces (light ink). */
    wordmarkDark: string;
    /** Colorful icon mark — theme-independent. */
    icon: string;
};

export type EmailCidAttachment = {
    filename: string;
    /** Base64 — required by Resend when sending local file content. */
    content: string;
    contentId: string;
    contentType: 'image/png';
};

function readBrandPng(assetFile: string): Buffer {
    const absolute = require.resolve(`@rumtelo/brand/assets/${assetFile}`);
    return readFileSync(absolute);
}

function toDataUri(png: Buffer): string {
    return `data:image/png;base64,${png.toString('base64')}`;
}

type BrandPngs = {
    wordmarkLight: Buffer;
    wordmarkDark: Buffer;
    icon: Buffer;
};

let dataUriCache: EmailBrandLogoSrcs | undefined;
let pngCache: BrandPngs | undefined;

function brandPngs(): BrandPngs {
    if (!pngCache) {
        pngCache = {
            wordmarkLight: readBrandPng('logo/wordmark-on-light-email.png'),
            wordmarkDark: readBrandPng('logo/wordmark-on-dark-email.png'),
            icon: readBrandPng('logo/icon-email.png'),
        };
    }
    return pngCache;
}

/** Browser `/email-preview` — data URIs (Gmail strips these; never use for Resend). */
export function emailBrandDataUris(): EmailBrandLogoSrcs {
    if (dataUriCache) return dataUriCache;
    const pngs = brandPngs();
    dataUriCache = {
        wordmarkLight: toDataUri(pngs.wordmarkLight),
        wordmarkDark: toDataUri(pngs.wordmarkDark),
        icon: toDataUri(pngs.icon),
    };
    return dataUriCache;
}

/** Resend MIME inline images — light + dark wordmarks + icon. */
export function emailBrandCidAttachments(): EmailCidAttachment[] {
    const pngs = brandPngs();
    return [
        {
            filename: 'rumtelo-wordmark-light.png',
            content: pngs.wordmarkLight.toString('base64'),
            contentId: EMAIL_LOGO_CID.wordmarkLight,
            contentType: 'image/png',
        },
        {
            filename: 'rumtelo-wordmark-dark.png',
            content: pngs.wordmarkDark.toString('base64'),
            contentId: EMAIL_LOGO_CID.wordmarkDark,
            contentType: 'image/png',
        },
        {
            filename: 'rumtelo-icon.png',
            content: pngs.icon.toString('base64'),
            contentId: EMAIL_LOGO_CID.icon,
            contentType: 'image/png',
        },
    ];
}

/**
 * Resolve logo `src` values.
 * - `cid` — real Resend delivery (Gmail-safe)
 * - `data-uri` — `/email-preview` + memory outbox HTML in a browser
 */
export function emailBrandLogoSrcs(mode: EmailLogoMode = 'data-uri'): EmailBrandLogoSrcs {
    if (mode === 'cid') {
        return {
            wordmarkLight: `cid:${EMAIL_LOGO_CID.wordmarkLight}`,
            wordmarkDark: `cid:${EMAIL_LOGO_CID.wordmarkDark}`,
            icon: `cid:${EMAIL_LOGO_CID.icon}`,
        };
    }
    return emailBrandDataUris();
}

/**
 * Header wordmark CSS — swaps on-light / on-dark with the client color scheme
 * (same pair as the app `RumteloLogo` light/dark swap).
 */
export const EMAIL_WORDMARK_THEME_CSS = `
.rumtelo-wm-light { display: block !important; }
.rumtelo-wm-dark { display: none !important; max-height: 0; overflow: hidden; }
@media (prefers-color-scheme: dark) {
  .rumtelo-wm-light { display: none !important; max-height: 0 !important; overflow: hidden !important; }
  .rumtelo-wm-dark { display: block !important; max-height: none !important; overflow: visible !important; }
}
`.trim();
