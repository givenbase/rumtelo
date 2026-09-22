import type { MerchantPreset } from '@rumtelo/contracts';

import { findCatalogMerchant, partyMark, type PartyMark } from '@/app/_lib/vendor-brands';

/** Lease companies share the auto-finance MCC; they are not a car you own or save for. */
export const NOT_A_CAR_BRAND = new Set(['LEASEPLAN', 'ALPHERA']);

/** First chip row. The rest sit behind More. */
export const CAR_BRAND_PREVIEW = 12;

/** Auto-finance marques (MCC 7512), excluding lease companies. */
export function filterCarBrands(merchants: readonly MerchantPreset[]): MerchantPreset[] {
    return merchants
        .filter(merchant => merchant.mcc === '7512' && !NOT_A_CAR_BRAND.has(merchant.key))
        .slice()
        .sort((left, right) => left.sortOrder - right.sortOrder);
}

export function findCarBrand(
    name: string,
    brands: readonly MerchantPreset[]
): MerchantPreset | null {
    return findCatalogMerchant(name, brands);
}

/** Logo for a known marque; falls back to the car emoji. */
export function carBrandMark(
    brand: Pick<MerchantPreset, 'key' | 'name' | 'logoDomain'> | null | undefined,
    size = 64
): PartyMark {
    if (!brand) {
        return { name: '?', src: null, fallbackIcon: '🚗', tone: null };
    }
    return partyMark(
        {
            key: brand.key,
            name: brand.name,
            logoDomain: brand.logoDomain,
        },
        { fallbackIcon: '🚗', tone: null },
        size
    );
}

/** Resolve a display name (asset/goal) to a car brand mark when it matches the catalog. */
export function carMarkForName(
    name: string,
    merchants: readonly MerchantPreset[],
    size = 64
): PartyMark | null {
    const brands = filterCarBrands(merchants);
    const brand = findCarBrand(name, brands);
    if (!brand) return null;
    return carBrandMark(brand, size);
}
