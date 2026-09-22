import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

function readBrandPng(assetFile: string): Buffer {
    // `@rumtelo/brand` exports `./assets/*` → packages/brand/assets/*
    const absolute = require.resolve(`@rumtelo/brand/assets/${assetFile}`);
    return readFileSync(absolute);
}

function toDataUri(png: Buffer): string {
    return `data:image/png;base64,${png.toString('base64')}`;
}

export type EmailBrandDataUris = {
    /** Header wordmark — Lanczos3 3× display PNG. */
    wordmark: string;
    /** Footer icon — Lanczos3 3× display PNG. */
    icon: string;
};

let cached: EmailBrandDataUris | undefined;

/**
 * Self-contained logo sources for email HTML.
 *
 * Data URIs work in `/email-preview` (browser) and most mail clients without
 * depending on remote `/brand/*` URLs or CID multipart (which browsers ignore).
 * Sources are sharp-generated `*-email.png` masters — small enough to inline.
 */
export function emailBrandDataUris(): EmailBrandDataUris {
    if (cached) return cached;
    cached = {
        wordmark: toDataUri(readBrandPng('logo/wordmark-on-light-email.png')),
        icon: toDataUri(readBrandPng('logo/icon-email.png')),
    };
    return cached;
}
