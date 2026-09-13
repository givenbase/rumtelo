/**
 * Money is carried as integer minor units everywhere. These helpers are the only
 * place it becomes a string or major units, so rounding happens once and consistently.
 *
 * toMinorUnits / fromMinorUnits assume 2-decimal currencies (EUR, USD, GBP —
 * the whole platform_currency enum). Revisit when a zero-decimal currency lands.
 */

/** Platform default until a household currency is known — data default, never copy. */
export const DEFAULT_CURRENCY = 'EUR';

/**
 * Major currency units → integer minor units (cents).
 * Use at authoring boundaries (seeds, form parsers) — never for ongoing math.
 */
export function toMinorUnits(major: number): number {
    return Math.round(major * 100);
}

/** Integer minor units → major currency units (display / rare exports). */
export function fromMinorUnits(minor: number): number {
    return minor / 100;
}

export type FormatMoneyOptions = {
    /** ISO 4217 currency code — required; never rely on a silent default. */
    currency: string;
    locale?: string;
    signed?: boolean;
};

export function formatMoney(
    minorUnits: number,
    { currency, locale = 'en-IE', signed = false }: FormatMoneyOptions
): string {
    const formatted = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(fromMinorUnits(minorUnits));
    return signed && minorUnits > 0 ? `+${formatted}` : formatted;
}

/** ISO code → the locale's symbol for it; falls back to the code itself. */
export function currencySymbol(currency: string, locale = 'en-IE'): string {
    try {
        const currencyPart = new Intl.NumberFormat(locale, { style: 'currency', currency })
            .formatToParts(0)
            .find(segment => segment.type === 'currency');
        return currencyPart?.value ?? currency;
    } catch {
        return currency;
    }
}

/**
 * Stripe catalog list price — always the platform billing currency (EUR),
 * never the household board currency.
 */
export function formatPlanPrice(
    minorUnits: number,
    opts?: { locale?: string; signed?: boolean }
): string {
    return formatMoney(minorUnits, {
        currency: DEFAULT_CURRENCY,
        locale: opts?.locale,
        signed: opts?.signed,
    });
}

export function formatPercent(value: number, locale = 'en-IE'): string {
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value) + '%';
}

export function formatPeriod(period: string, locale = 'en-IE'): string {
    const [year, month] = period.split('-').map(Number);
    return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(
        new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, 1))
    );
}

export function currentPeriod(date = new Date()): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
