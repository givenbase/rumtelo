export type VendorMarkProps = {
    /** Display / accessible name (also used for initials fallback). */
    name: string;
    /** Optional logo image URL. When omitted or load fails, catalog / initials fallback. */
    src?: string | null;
    /**
     * Catalog emoji (category / jar) when the logo is missing or fails to load.
     * Initials are used only when this is also absent.
     */
    fallbackIcon?: string | null;
    /** Soft CSS color for the mark background when showing a non-logo fallback. */
    tone?: string | null;
    /** Pixel size of the mark (width + height). Default 20. */
    size?: number;
    className?: string;
};
