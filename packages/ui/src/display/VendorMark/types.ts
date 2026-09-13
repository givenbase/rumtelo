export type VendorMarkProps = {
    /** Display / accessible name (also used for initials fallback). */
    name: string;
    /** Optional logo image URL. When omitted or load fails, initials are shown. */
    src?: string | null;
    /** Pixel size of the mark (width + height). Default 20. */
    size?: number;
    className?: string;
};
