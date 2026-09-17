import { electronicFormatIBAN, extractIBAN, friendlyFormatIBAN, isValidIBAN } from 'ibantools';

/** Strip to the compact uppercase form used for storage and checksum checks. */
export function normalizeIban(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) return null;
    return electronicFormatIBAN(trimmed);
}

/** True when empty/null, or when the value is a valid IBAN (MOD-97 + structure). */
export function isValidIban(value: string | null | undefined): boolean {
    if (value === null || value === undefined || !value.trim()) return true;
    const electronic = normalizeIban(value);
    return electronic !== null && isValidIBAN(electronic);
}

/** Spaced display form (e.g. NL91 ABNA 0417 1643 00). Falls back to trimmed input. */
export function formatIban(value: string): string {
    const electronic = normalizeIban(value);
    if (!electronic) return value.trim();
    return friendlyFormatIBAN(electronic) ?? electronic;
}

/**
 * Dutch IBAN bank code (BBAN positions 1–4), e.g. INGB.
 * Null when not NL or the IBAN cannot be parsed.
 */
export function nlIbanBankCode(value: string): string | null {
    const electronic = normalizeIban(value);
    if (!electronic) return null;
    const extracted = extractIBAN(electronic);
    if (!extracted.valid || extracted.countryCode !== 'NL') return null;
    const code = (extracted.bankIdentifier ?? extracted.bban?.slice(0, 4) ?? '').toUpperCase();
    return /^[A-Z]{4}$/.test(code) ? code : null;
}
