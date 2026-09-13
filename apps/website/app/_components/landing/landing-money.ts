import { DEFAULT_CURRENCY, formatPlanPrice, toMinorUnits } from '@rumtelo/utils';

/**
 * Marketing catalog amounts are authored in major units (9, 90, 4300).
 * Stripe / plan list price is always DEFAULT_CURRENCY — not a household board currency.
 */
export function formatCatalogMajor(major: number): string {
    return formatPlanPrice(toMinorUnits(major));
}

/** Exact major units with cents (e.g. yearly ÷ 12) — still catalog currency. */
export function formatCatalogMajorExact(major: number): string {
    return new Intl.NumberFormat('en-IE', {
        style: 'currency',
        currency: DEFAULT_CURRENCY,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(major);
}
