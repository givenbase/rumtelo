/**
 * Curated vendor → website domain for logo lookup (banks, merchants, charities).
 * Merchant `key` must match backoffice merchant presets; lender `name` matches
 * debt `suggestedLenders` / settings banks.
 */

export type VendorBrand = {
    name: string;
    domain: string;
    /** Merchant preset key when this row is a catalog merchant. */
    key?: string;
};

/** NL retail banks — debt issuer chips + settings bank connect list. */
export const NL_BANK_LENDERS = [
    { name: 'ING', domain: 'ing.nl' },
    { name: 'Rabobank', domain: 'rabobank.nl' },
    { name: 'ABN AMRO', domain: 'abnamro.nl' },
    { name: 'bunq', domain: 'bunq.com' },
    { name: 'Revolut', domain: 'revolut.com' },
    { name: 'N26', domain: 'n26.com' },
] as const satisfies readonly VendorBrand[];

/** Extra debt lenders (student, BNPL, tax, mortgage niches). */
const OTHER_LENDERS = [
    { name: 'Triodos', domain: 'triodos.nl' },
    { name: 'ASN Bank', domain: 'asnbank.nl' },
    { name: 'DUO', domain: 'duo.nl' },
    { name: 'Klarna', domain: 'klarna.com' },
    { name: 'Afterpay / Riverty', domain: 'riverty.com' },
    { name: 'Belastingdienst', domain: 'belastingdienst.nl' },
    { name: 'CJIB', domain: 'cjib.nl' },
] as const satisfies readonly VendorBrand[];

/**
 * Merchant preset key → brand. Keys must stay in sync with
 * `merchant.seed-data.ts`.
 */
const MERCHANT_BRANDS: readonly VendorBrand[] = [
    { key: 'ALBERT_HEIJN', name: 'Albert Heijn', domain: 'ah.nl' },
    { key: 'JUMBO', name: 'Jumbo', domain: 'jumbo.com' },
    { key: 'LIDL', name: 'Lidl', domain: 'lidl.nl' },
    { key: 'PLUS', name: 'PLUS', domain: 'plus.nl' },
    { key: 'DIRK', name: 'Dirk', domain: 'dirk.nl' },
    { key: 'ALDI', name: 'Aldi', domain: 'aldi.nl' },
    { key: 'SPAR', name: 'Spar', domain: 'spar.nl' },
    { key: 'CRISP', name: 'Crisp', domain: 'crisp.nl' },
    { key: 'NS', name: 'NS', domain: 'ns.nl' },
    { key: 'GVB', name: 'GVB', domain: 'gvb.nl' },
    { key: 'RET', name: 'RET', domain: 'ret.nl' },
    { key: 'SHELL', name: 'Shell', domain: 'shell.nl' },
    { key: 'BP', name: 'BP', domain: 'bp.com' },
    { key: 'TOTALENERGIES', name: 'TotalEnergies', domain: 'totalenergies.nl' },
    { key: 'UBER', name: 'Uber', domain: 'uber.com' },
    { key: 'ANWB', name: 'ANWB', domain: 'anwb.nl' },
    { key: 'VATTENFALL', name: 'Vattenfall', domain: 'vattenfall.nl' },
    { key: 'ENECO', name: 'Eneco', domain: 'eneco.nl' },
    { key: 'ESSENT', name: 'Essent', domain: 'essent.nl' },
    { key: 'WATERNET', name: 'Waternet', domain: 'waternet.nl' },
    { key: 'VESTIA', name: 'Vestia', domain: 'vestia.nl' },
    { key: 'YOMERE', name: 'Ymere', domain: 'ymere.nl' },
    { key: 'IKEA', name: 'IKEA', domain: 'ikea.com' },
    { key: 'ACHMEA', name: 'Achmea', domain: 'achmea.nl' },
    { key: 'CENTRAAL_BEHEER', name: 'Centraal Beheer', domain: 'centraalbeheer.nl' },
    { key: 'INTERPOLIS', name: 'Interpolis', domain: 'interpolis.nl' },
    { key: 'OHRA', name: 'OHRA', domain: 'ohra.nl' },
    { key: 'VODAFONE', name: 'Vodafone', domain: 'vodafone.nl' },
    { key: 'KPN', name: 'KPN', domain: 'kpn.com' },
    { key: 'ZIGGO', name: 'Ziggo', domain: 'ziggo.nl' },
    { key: 'ODIDO', name: 'Odido', domain: 'odido.nl' },
    { key: 'APPLE', name: 'Apple', domain: 'apple.com' },
    { key: 'GOOGLE', name: 'Google', domain: 'google.com' },
    { key: 'ETOS', name: 'Etos', domain: 'etos.nl' },
    { key: 'KRUIDVAT', name: 'Kruidvat', domain: 'kruidvat.nl' },
    { key: 'DA', name: 'DA', domain: 'da.nl' },
    { key: 'HOLLAND_AND_BARRETT', name: 'Holland & Barrett', domain: 'hollandandbarrett.nl' },
    { key: 'ZOO_PLUS', name: 'Zooplus', domain: 'zooplus.nl' },
    { key: 'PETSPLANET', name: 'Pets Place', domain: 'petsplace.nl' },
    { key: 'ING', name: 'ING', domain: 'ing.nl' },
    { key: 'ABN_AMRO', name: 'ABN AMRO', domain: 'abnamro.nl' },
    { key: 'RABOBANK', name: 'Rabobank', domain: 'rabobank.nl' },
    { key: 'BUNQ', name: 'bunq', domain: 'bunq.com' },
    { key: 'BELASTINGDIENST', name: 'Belastingdienst', domain: 'belastingdienst.nl' },
    { key: 'DOUANE', name: 'Douane', domain: 'douane.nl' },
    { key: 'DUO', name: 'DUO', domain: 'duo.nl' },
    { key: 'RDW', name: 'RDW', domain: 'rdw.nl' },
    { key: 'CBR', name: 'CBR', domain: 'cbr.nl' },
    { key: 'UWV', name: 'UWV', domain: 'uwv.nl' },
    { key: 'SVB', name: 'SVB', domain: 'svb.nl' },
    { key: 'KADASTER', name: 'Kadaster', domain: 'kadaster.nl' },
    { key: 'CJIB', name: 'CJIB', domain: 'cjib.nl' },
    { key: 'POLITIE', name: 'Politie', domain: 'politie.nl' },
    { key: 'OM', name: 'Openbaar Ministerie', domain: 'om.nl' },
    { key: 'GEMEENTE_BOETE', name: 'Gemeente (boete)', domain: 'rijksoverheid.nl' },
    { key: 'YELLOWBRICK_FINE', name: 'Yellowbrick', domain: 'yellowbrick.nl' },
    { key: 'PARKMOBILE', name: 'Parkmobile', domain: 'parkmobile.nl' },
    { key: 'PRENATAL', name: 'Prenatal', domain: 'prenatal.nl' },
    { key: 'ZEEMAN', name: 'Zeeman', domain: 'zeeman.com' },
    { key: 'KLARNA', name: 'Klarna', domain: 'klarna.com' },
    { key: 'AFTERPAY', name: 'Afterpay / Riverty', domain: 'riverty.com' },
    { key: 'SPOTIFY', name: 'Spotify', domain: 'spotify.com' },
    { key: 'NETFLIX', name: 'Netflix', domain: 'netflix.com' },
    { key: 'DISNEY_PLUS', name: 'Disney+', domain: 'disneyplus.com' },
    { key: 'VIAPLAY', name: 'Viaplay', domain: 'viaplay.com' },
    { key: 'PRIME_VIDEO', name: 'Prime Video', domain: 'primevideo.com' },
    { key: 'YOUTUBE_PREMIUM', name: 'YouTube Premium', domain: 'youtube.com' },
    { key: 'THUISBEZORGD', name: 'Thuisbezorgd', domain: 'thuisbezorgd.nl' },
    { key: 'UBER_EATS', name: 'Uber Eats', domain: 'ubereats.com' },
    { key: 'STARBUCKS', name: 'Starbucks', domain: 'starbucks.com' },
    { key: 'BAGELS_AND_BEANS', name: 'Bagels & Beans', domain: 'bagelsbeans.nl' },
    { key: 'MCDONALDS', name: "McDonald's", domain: 'mcdonalds.com' },
    { key: 'BURGER_KING', name: 'Burger King', domain: 'burgerking.nl' },
    { key: 'BOL', name: 'bol.com', domain: 'bol.com' },
    { key: 'AMAZON', name: 'Amazon', domain: 'amazon.nl' },
    { key: 'COOLBLUE', name: 'Coolblue', domain: 'coolblue.nl' },
    { key: 'MEDIAMARKT', name: 'MediaMarkt', domain: 'mediamarkt.nl' },
    { key: 'BASIC_FIT', name: 'Basic-Fit', domain: 'basic-fit.com' },
    { key: 'SPORTCITY', name: 'SportCity', domain: 'sportcity.nl' },
    { key: 'DECATHLON', name: 'Decathlon', domain: 'decathlon.nl' },
    { key: 'BRUNA', name: 'Bruna', domain: 'bruna.nl' },
    { key: 'UDEMY', name: 'Udemy', domain: 'udemy.com' },
    { key: 'COURSERA', name: 'Coursera', domain: 'coursera.org' },
    { key: 'GIRO555', name: 'Giro555', domain: 'giro555.nl' },
    { key: 'KWF', name: 'KWF', domain: 'kwf.nl' },
    { key: 'UNICEF', name: 'Unicef', domain: 'unicef.nl' },
    { key: 'BLOOMON', name: 'Bloomon', domain: 'bloomon.nl' },
];

const ALL_BRANDS: readonly VendorBrand[] = [
    ...NL_BANK_LENDERS,
    ...OTHER_LENDERS,
    ...MERCHANT_BRANDS,
];

const byKey = new Map(MERCHANT_BRANDS.filter(brand => brand.key).map(brand => [brand.key!, brand]));
const byName = new Map(ALL_BRANDS.map(brand => [brand.name.toLowerCase(), brand]));

export const NL_BANK_NAMES = NL_BANK_LENDERS.map(lender => lender.name);

export type ResolveVendorInput = {
    key?: string | null;
    name?: string | null;
    /** Full URL — hostname becomes the logo domain (giving orgs). */
    website?: string | null;
};

/** Resolve a known vendor brand from key, display name, or website URL. */
export function resolveVendorBrand(input: ResolveVendorInput): VendorBrand | null {
    if (input.key) {
        const byMerchantKey = byKey.get(input.key);
        if (byMerchantKey) return byMerchantKey;
    }
    const name = input.name?.trim();
    if (name) {
        const exact = byName.get(name.toLowerCase());
        if (exact) return exact;
    }
    const domain = domainFromWebsite(input.website);
    if (domain) return { name: name || domain, domain };
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
