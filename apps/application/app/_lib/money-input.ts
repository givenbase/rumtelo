'use client';

/**
 * Parse a user-entered amount in major units ("12,50" / "12.50") into integer
 * minor units. Returns null when the string is empty or not a finite number.
 */
export function parseAmountToMinorUnits(raw: string): number | null {
    const trimmed = raw.trim().replace(/\s/g, '').replace(',', '.');
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) return null;
    return Math.round(parsed * 100);
}

/** Format minor units for form inputs (decimal comma when needed). */
export function minorUnitsToAmountInput(minorUnits: number): string {
    const major = minorUnits / 100;
    if (Number.isInteger(major)) return String(major);
    return major.toFixed(2).replace('.', ',');
}

/** Today's date as YYYY-MM-DD for IsoDate fields. */
export function todayIsoDate(): string {
    return new Date().toISOString().slice(0, 10);
}
