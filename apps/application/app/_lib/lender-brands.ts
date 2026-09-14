/**
 * @deprecated Import from `@/app/_lib/vendor-brands` — this file re-exports for
 * existing debt/settings call sites.
 */
export {
    findCatalogVendor,
    findCatalogVendorFromFeed,
    lenderLogoUrl,
    resolveLenderBrand,
    resolveVendorBrand,
    vendorLogoUrl,
    vendorMarkSrc,
    type VendorBrand as LenderBrand,
    type ResolveVendorInput,
} from './vendor-brands';
