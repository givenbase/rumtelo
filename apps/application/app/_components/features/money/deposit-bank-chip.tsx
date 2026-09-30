'use client';

import { useLiveQuery } from '@rumtelo/hooks';
import { useTranslations } from '@rumtelo/i18n';
import { VendorMark } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import { apiQuery } from '@/app/_lib/api-hooks';
import { isLiveData } from '@/app/_lib/preview';
import {
    accountBankMark,
    countryFromCurrency,
    resolveAccountBank,
} from '@/app/_lib/resolve-account-bank';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';
import { vendorMarkSrc } from '@/app/_lib/vendor-brands';
import { useAuth } from '@/components/features/shell/auth-provider';

type DepositBankChipProps = {
    bankId: string | null | undefined;
    accountId: string | null | undefined;
    className?: string;
};

/**
 * Where income is expected to land — account seat (preferred) or catalog bank alone.
 * Sibling of HoldingChip; not the same as holding attribution.
 */
export function DepositBankChip({ bankId, accountId, className }: DepositBankChipProps) {
    const t = useTranslations('features.money.deposit_link');
    const { householdId } = useAuth();
    const { currency } = useHouseholdCurrency();
    const live = isLiveData(householdId);
    const country = countryFromCurrency(currency);

    const banksQuery = useLiveQuery(
        apiQuery.money.catalogs.banks.list.queryOptions({
            input: { householdId: householdId!, country },
        }),
        [],
        live
    );
    const accountsQuery = useLiveQuery(
        apiQuery.money.accounts.list.queryOptions({
            input: { householdId: householdId! },
        }),
        [],
        live
    );

    if (!bankId && !accountId) return null;

    const banks = banksQuery.data ?? [];
    const accounts = accountsQuery.data ?? [];
    const account = accountId ? accounts.find(row => row.id === accountId) : undefined;

    if (account) {
        const bank = resolveAccountBank(account, banks);
        const mark = accountBankMark(account, banks);
        const label = account.name;
        return (
            <span
                aria-label={t('chip_aria_account', { name: label })}
                className={cn(
                    'inline-flex min-h-6 max-w-full items-center gap-1.5 rounded-full border border-line bg-raised px-2.5 py-1 font-mono text-[10px] font-medium tracking-wide text-fg-secondary uppercase',
                    className
                )}>
                {mark ? <VendorMark name={mark.name} src={mark.src} size={14} /> : null}
                <span className="truncate">{label}</span>
                {bank && !label.toLowerCase().includes(bank.name.toLowerCase()) ? (
                    <span className="truncate text-fg-faint">{bank.name}</span>
                ) : null}
            </span>
        );
    }

    if (!bankId) return null;
    const bank = banks.find(row => row.id === bankId);
    if (!bank) return null;
    const mark = vendorMarkSrc({
        key: bank.key,
        name: bank.name,
        logoDomain: bank.logoDomain,
        website: bank.website,
    });

    return (
        <span
            aria-label={t('chip_aria_bank', { name: bank.name })}
            className={cn(
                'inline-flex min-h-6 max-w-full items-center gap-1.5 rounded-full border border-line bg-raised px-2.5 py-1 font-mono text-[10px] font-medium tracking-wide text-fg-secondary uppercase',
                className
            )}>
            <VendorMark name={mark.name} src={mark.src} size={14} />
            <span className="truncate">{bank.name}</span>
        </span>
    );
}
