import {
    PRACTICE_BASE_UNIT_CENTS,
    PRACTICE_CLIENT_SEAT_UNIT_CENTS,
    PRACTICE_STAFF_SEAT_UNIT_CENTS,
} from '@rumtelo/contracts';

/** Format eurocents as `€X` / `€X.XX` for i18n price params. */
export function formatPracticePrice(cents: number): string {
    const major = cents / 100;
    const formatted = Number.isInteger(major) ? String(major) : major.toFixed(2);
    return `€${formatted}`;
}

/** Catalog prices ready for `t('…', practicePriceParams)`. */
export const practicePriceParams = {
    basePrice: formatPracticePrice(PRACTICE_BASE_UNIT_CENTS),
    staffPrice: formatPracticePrice(PRACTICE_STAFF_SEAT_UNIT_CENTS),
    clientPrice: formatPracticePrice(PRACTICE_CLIENT_SEAT_UNIT_CENTS),
} as const;
