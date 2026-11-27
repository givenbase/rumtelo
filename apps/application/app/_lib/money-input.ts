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

export type LocaleAmountError =
    | 'empty'
    | 'not_a_number'
    | 'negative'
    | 'too_many_decimals'
    | 'too_large';

export type LocaleAmountResult =
    | { ok: true; minor: number }
    | { ok: false; reason: LocaleAmountError };

/** Largest amount onboarding accepts: 1,000,000.00 in minor units. */
export const MAX_LOCALE_AMOUNT_MINOR = 100_000_000;

/** Locales that write `1.234,56` (decimal comma, dot or space as the group mark). */
function usesDecimalComma(locale: string): boolean {
    const base = locale.toLowerCase().split('-')[0] ?? '';
    return base === 'nl' || base === 'es' || base === 'fr' || base === 'de';
}

/** Group marks must split digits in threes: `1.234.567`, never `1.23`. */
function hasValidGroups(integer: string, groupMark: string): boolean {
    if (!integer.includes(groupMark)) return true;
    const [first, ...rest] = integer.split(groupMark);
    if (!first || first.length > 3 || (first.startsWith('0') && first.length > 0)) return false;
    return rest.every(group => /^\d{3}$/.test(group));
}

/**
 * Parse an amount typed by a person into integer minor units, by locale.
 * Integers only: the digits are split as strings and never go through a float multiply,
 * so "1.234,56" is 123456, not 123 (the old `parseFloat(replace(',', '.'))` bug).
 *
 * - Both `.` and `,` present: the last one is the decimal mark, the other is a group mark.
 * - One kind, more than once: group marks.
 * - One kind, once, exactly three digits after it: ambiguous, the locale decides.
 * - Otherwise it is the decimal mark. More than two decimals is an error, never a guess.
 */
export function parseLocaleAmount(raw: string, locale: string): LocaleAmountResult {
    const stripped = raw.replace(/[\s  €$£]/g, '');
    if (!stripped) return { ok: false, reason: 'empty' };
    if (stripped.startsWith('-')) return { ok: false, reason: 'negative' };
    if (!/^[0-9.,]+$/.test(stripped) || !/\d/.test(stripped)) {
        return { ok: false, reason: 'not_a_number' };
    }

    const dots = stripped.split('.').length - 1;
    const commas = stripped.split(',').length - 1;
    const commaLocale = usesDecimalComma(locale);

    let decimalMark: '.' | ',' | null;
    let groupMark: '.' | ',' | null;
    if (dots > 0 && commas > 0) {
        decimalMark = stripped.lastIndexOf('.') > stripped.lastIndexOf(',') ? '.' : ',';
        groupMark = decimalMark === '.' ? ',' : '.';
        // The decimal mark may appear once, and only after every group mark.
        const decimalCount = decimalMark === '.' ? dots : commas;
        if (decimalCount !== 1) return { ok: false, reason: 'not_a_number' };
    } else if (dots === 0 && commas === 0) {
        decimalMark = null;
        groupMark = null;
    } else {
        const mark = dots > 0 ? '.' : ',';
        const count = dots > 0 ? dots : commas;
        const afterLast = stripped.length - stripped.lastIndexOf(mark) - 1;
        if (count > 1) {
            decimalMark = null;
            groupMark = mark;
        } else if (afterLast === 3) {
            const markIsDecimalInLocale = commaLocale ? mark === ',' : mark === '.';
            decimalMark = markIsDecimalInLocale ? mark : null;
            groupMark = markIsDecimalInLocale ? null : mark;
        } else {
            decimalMark = mark;
            groupMark = null;
        }
    }

    const decimalIndex = decimalMark ? stripped.indexOf(decimalMark) : -1;
    const integerPart = decimalIndex === -1 ? stripped : stripped.slice(0, decimalIndex);
    const fraction = decimalIndex === -1 ? '' : stripped.slice(decimalIndex + 1);
    if (fraction.includes('.') || fraction.includes(',')) {
        return { ok: false, reason: 'not_a_number' };
    }
    if (groupMark && !hasValidGroups(integerPart, groupMark)) {
        return { ok: false, reason: 'not_a_number' };
    }
    if (!groupMark && /[.,]/.test(integerPart)) return { ok: false, reason: 'not_a_number' };

    const integerDigits = groupMark ? integerPart.split(groupMark).join('') : integerPart;
    if (fraction.length > 2) return { ok: false, reason: 'too_many_decimals' };

    const trimmedInteger = integerDigits.replace(/^0+(?=\d)/, '') || '0';
    if (trimmedInteger.length > 9) return { ok: false, reason: 'too_large' };

    const minor = Number(trimmedInteger) * 100 + Number(fraction.padEnd(2, '0'));
    if (minor > MAX_LOCALE_AMOUNT_MINOR) return { ok: false, reason: 'too_large' };
    return { ok: true, minor };
}
