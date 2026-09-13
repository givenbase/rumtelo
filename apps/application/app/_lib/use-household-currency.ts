'use client';

import { useLiveQuery } from '@rumtelo/hooks';
import { DEFAULT_CURRENCY, currencySymbol, formatMoney as formatMoneyCore } from '@rumtelo/utils';

import { apiQuery } from '@/app/_lib/api-hooks';
import { isLiveData } from '@/app/_lib/preview';
import { useAuth } from '@/components/features/shell/auth-provider';

type BoundFormatMoneyOptions = {
    locale?: string;
    signed?: boolean;
};

/**
 * The household's currency and a bound formatter — the only product-UI money API.
 * Copy must never hardcode a currency word or symbol; read it from here.
 */
export function useHouseholdCurrency(): {
    currency: string;
    symbol: string;
    formatMoney: (minorUnits: number, opts?: BoundFormatMoneyOptions) => string;
} {
    const { householdId } = useAuth();
    const live = isLiveData(householdId);
    const settings = useLiveQuery(
        apiQuery.household.settings.queryOptions({ input: { householdId: householdId! } }),
        null,
        live
    );
    const currency = settings.data?.currency ?? DEFAULT_CURRENCY;
    return {
        currency,
        symbol: currencySymbol(currency),
        formatMoney: (minorUnits, opts) =>
            formatMoneyCore(minorUnits, { currency, locale: opts?.locale, signed: opts?.signed }),
    };
}
