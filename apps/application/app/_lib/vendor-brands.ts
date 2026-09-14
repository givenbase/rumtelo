/**
 * Vendor logo helpers only.
 * Merchant logos come from catalog API `logoDomain` — do not mirror merchants here.
 */

import type { MerchantPreset } from '@rumtelo/contracts';

export type VendorBrand = {
    name: string;
    domain: string;
    key?: string;
};

export type ResolveVendorInput = Partial<
    Pick<MerchantPreset, 'key' | 'name' | 'logoDomain' | 'website'>
>;

/** Resolve a brand domain from API logoDomain or website. No hardcoded merchant table. */
export function resolveVendorBrand(input: ResolveVendorInput): VendorBrand | null {
    if (input.logoDomain?.trim()) {
        return {
            name: input.name?.trim() || input.logoDomain.trim(),
            domain: input.logoDomain.trim().replace(/^www\./i, ''),
            key: input.key ?? undefined,
        };
    }
    const domain = domainFromWebsite(input.website);
    if (domain) {
        return { name: input.name?.trim() || domain, domain, key: input.key ?? undefined };
    }
    return null;
}

/** @deprecated Prefer resolveVendorBrand — kept for debt form call sites. */
export function resolveLenderBrand(name: string): VendorBrand | null {
    return resolveVendorBrand({ name });
}

/** Hostname from a website URL, without leading www. */
export function domainFromWebsite(website: string | null | undefined): string | null {
    if (!website?.trim()) return null;
    try {
        const host = new URL(website.trim()).hostname.replace(/^www\./i, '');
        return host || null;
    } catch {
        return null;
    }
}

/** Favicon CDN — no API key. Swap to Brandfetch/Logo.dev later if needed. */
export function vendorLogoUrl(domain: string, size = 64): string {
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${size}`;
}

/** @deprecated Prefer vendorLogoUrl */
export function lenderLogoUrl(domain: string, size = 64): string {
    return vendorLogoUrl(domain, size);
}

/** Convenience: logo src for a resolved brand, or null. */
export function vendorMarkSrc(
    input: ResolveVendorInput,
    size = 64
): { name: string; src: string | null } {
    const brand = resolveVendorBrand(input);
    if (!brand) {
        return { name: input.name?.trim() || '?', src: null };
    }
    return { name: brand.name, src: vendorLogoUrl(brand.domain, size) };
}

function toResolveInput(merchant: MerchantPreset): ResolveVendorInput {
    return {
        key: merchant.key,
        name: merchant.name,
        logoDomain: merchant.logoDomain,
        website: merchant.website,
    };
}

/** Match a display name to a catalog merchant row for logoDomain. */
export function findCatalogVendor(
    name: string,
    merchants: readonly MerchantPreset[]
): ResolveVendorInput | null {
    const needle = name.trim().toLowerCase();
    if (!needle) return null;
    const hit = merchants.find(merchant => {
        if (merchant.name.toLowerCase() === needle) return true;
        return merchant.aliases.some(alias => alias.trim().toLowerCase() === needle);
    });
    return hit ? toResolveInput(hit) : null;
}

/**
 * Bank-feed style match: longest CONTAINS hit on name / matchValue / aliases.
 * Used when counterparty text is noisy (e.g. "AH TO GO AMSTERDAM").
 */
export function findCatalogVendorFromFeed(
    text: string,
    merchants: readonly MerchantPreset[]
): ResolveVendorInput | null {
    const exact = findCatalogVendor(text, merchants);
    if (exact) return exact;
    const haystack = text.trim().toLowerCase();
    if (!haystack) return null;
    let best: { merchant: MerchantPreset; length: number } | null = null;
    for (const merchant of merchants) {
        const needles = [merchant.name, merchant.matchValue, ...merchant.aliases]
            .map(alias => alias.trim().toLowerCase())
            .filter(Boolean);
        for (const needle of needles) {
            if (!haystack.includes(needle)) continue;
            if (!best || needle.length > best.length) {
                best = { merchant, length: needle.length };
            }
        }
    }
    return best ? toResolveInput(best.merchant) : null;
}
