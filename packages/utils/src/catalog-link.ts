/**
 * Reverse lookup from a vendor (merchant) to the catalog preset(s) that list it —
 * bill types via `merchantKeys`, debt types via `merchantKeys`, etc.
 *
 * Presets link vendors; vendors don't link presets. These helpers answer
 * "the user typed HelloFresh — which bill type is that?" without the form
 * re-implementing the filter at every call site.
 */

type MerchantLinkedPreset = { key: string; merchantKeys?: readonly string[] };

export type VendorResolution<P> =
    /** Exactly one linked preset — safe to auto-apply. */
    | { kind: 'preset'; preset: P }
    /** Several linked presets and `prefer` could not narrow to one — let the user choose. */
    | { kind: 'ambiguous'; candidates: P[] }
    /** Vendor is not linked to any preset — keep it as a plain vendor. */
    | { kind: 'none' };

/**
 * Resolve the preset(s) a vendor is linked to.
 * `prefer` is an optional tie-break (e.g. same category as the vendor); it only
 * wins when it narrows the candidates to exactly one.
 */
export function resolveVendorPresets<P extends MerchantLinkedPreset>(
    presets: readonly P[],
    merchantKey: string,
    prefer?: (preset: P) => boolean
): VendorResolution<P> {
    const linked = presets.filter(preset => preset.merchantKeys?.includes(merchantKey));
    if (linked.length === 0) return { kind: 'none' };
    if (linked.length === 1) return { kind: 'preset', preset: linked[0]! };
    if (prefer) {
        const preferred = linked.filter(prefer);
        if (preferred.length === 1) return { kind: 'preset', preset: preferred[0]! };
    }
    return { kind: 'ambiguous', candidates: linked };
}

/** The single preset a vendor is linked to; null when none or ambiguous. */
export function presetForMerchant<P extends MerchantLinkedPreset>(
    presets: readonly P[],
    merchantKey: string,
    prefer?: (preset: P) => boolean
): P | null {
    const resolution = resolveVendorPresets(presets, merchantKey, prefer);
    return resolution.kind === 'preset' ? resolution.preset : null;
}
