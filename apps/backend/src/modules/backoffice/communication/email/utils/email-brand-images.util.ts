import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/** Content-IDs referenced as `cid:…` in Resend HTML (must match attachment.contentId). */
export const EMAIL_LOGO_CID = {
    wordmark: 'rumtelo-wordmark',
    icon: 'rumtelo-icon',
} as const;

export type EmailLogoMode = 'cid' | 'data-uri';

export type EmailBrandLogoSrcs = {
    wordmark: string;
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

let dataUriCache: EmailBrandLogoSrcs | undefined;
let pngCache: { wordmark: Buffer; icon: Buffer } | undefined;

function brandPngs() {
    if (!pngCache) {
        pngCache = {
            wordmark: readBrandPng('logo/wordmark-on-light-email.png'),
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
        wordmark: toDataUri(pngs.wordmark),
        icon: toDataUri(pngs.icon),
    };
    return dataUriCache;
}

/** Resend MIME inline images — pair with `<img src="cid:…">`. */
export function emailBrandCidAttachments(): EmailCidAttachment[] {
    const pngs = brandPngs();
    return [
        {
            filename: 'rumtelo-wordmark.png',
            content: pngs.wordmark.toString('base64'),
            contentId: EMAIL_LOGO_CID.wordmark,
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
            wordmark: `cid:${EMAIL_LOGO_CID.wordmark}`,
            icon: `cid:${EMAIL_LOGO_CID.icon}`,
        };
    }
    return emailBrandDataUris();
}
