/**
 * Email chrome brand — header wordmark + footer icon.
 *
 * Logos are inlined as `data:image/png;base64,…` (see `email-brand-images.util.ts`)
 * so `/email-preview` and mail clients both render without remote URLs or CID.
 */
export const EMAIL_BRAND = {
    name: 'Rumtelo',
    tagline: 'Stop wondering where it went.',
    /** Fallback marketing origin — prefer DOMAIN_WEB at send time. */
    websiteUrl: 'https://rumtelo.app',
} as const;

/** Display sizes for email `<Img>` (CSS pixels). Email PNGs are 3× these (sharp). */
export const EMAIL_LOGO_SIZE = {
    wordmark: { width: 192, height: 32 },
    icon: { width: 40, height: 38 },
} as const;
