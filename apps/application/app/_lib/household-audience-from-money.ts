/**
 * Map money create signals → household audience keys (Huishoudprofiel chips).
 * Used to auto-enable lifestyle tags when the household adds matching items.
 */

const BASELINE = new Set(['COMMON']);

/** Non-baseline keys from a fixed-cost preset’s audience tags. */
export function audienceKeysFromFixedCostPreset(
    audienceKeys: readonly string[] | null | undefined
): string[] {
    if (!audienceKeys?.length) return [];
    return audienceKeys.filter(key => !BASELINE.has(key));
}

/**
 * Debt type preset key and/or DebtKind → implied lifestyle chips.
 * CAR_LOAN is DebtKind.LOAN — prefer preset key when present.
 */
export function audienceKeysFromDebt(input: {
    presetKey?: string | null;
    kind?: string | null;
}): string[] {
    const preset = input.presetKey?.trim() || null;
    const kind = input.kind?.trim() || null;
    if (preset === 'CAR_LOAN') return ['CAR_OWNER'];
    if (preset === 'MORTGAGE' || kind === 'MORTGAGE') return ['HOMEOWNER'];
    if (preset === 'STUDENT' || kind === 'STUDENT') return ['STUDENT'];
    return [];
}

/** Net-worth asset kind / preset → implied lifestyle chips. */
export function audienceKeysFromAsset(input: {
    kindKey?: string | null;
    presetKey?: string | null;
}): string[] {
    const kind = input.kindKey?.trim() || null;
    const preset = input.presetKey?.trim() || null;
    if (kind === 'PROPERTY' || preset === 'HOME' || preset === 'RENTAL') {
        return ['HOMEOWNER'];
    }
    if (kind === 'VEHICLE' || preset === 'CAR') {
        return ['CAR_OWNER'];
    }
    return [];
}

/** Keys in `implied` that are not already on the household. */
export function missingAudienceKeys(
    current: readonly string[],
    implied: readonly string[]
): string[] {
    if (implied.length === 0) return [];
    const have = new Set(current);
    return implied.filter(key => !have.has(key));
}
