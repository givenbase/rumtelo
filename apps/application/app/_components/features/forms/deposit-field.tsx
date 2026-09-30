'use client';

import { useMemo } from 'react';

import { AccountKind } from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { useTranslations } from '@rumtelo/i18n';
import { FORM_SELECT_NONE, FormSelect, FormSelectItem, toFormSelectValue } from '@rumtelo/ui';

import { apiQuery } from '@/app/_lib/api-hooks';
import { isLiveData } from '@/app/_lib/preview';
import { countryFromCurrency } from '@/app/_lib/resolve-account-bank';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';
import { useAuth } from '@/components/features/shell/auth-provider';

const DEPOSIT_KINDS = new Set<AccountKind>([
    AccountKind.CHECKING,
    AccountKind.SAVINGS,
    AccountKind.CASH,
]);

type DepositFieldProps = {
    bankId: string | null;
    accountId: string | null;
    onChange: (next: { bankId: string | null; accountId: string | null }) => void;
    disabled?: boolean;
};

/**
 * Optional “where income lands” — catalog bank and/or household deposit seat.
 * Selecting an account syncs the bank; bank filters the account list.
 */
export function DepositField({ bankId, accountId, onChange, disabled = false }: DepositFieldProps) {
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

    const banks = banksQuery.data ?? [];
    const depositAccounts = useMemo(
        () => (accountsQuery.data ?? []).filter(row => DEPOSIT_KINDS.has(row.kind)),
        [accountsQuery.data]
    );
    const accountsForBank = useMemo(
        () => (bankId ? depositAccounts.filter(row => row.bankId === bankId) : depositAccounts),
        [bankId, depositAccounts]
    );

    if (!live) return null;
    if (banks.length === 0 && depositAccounts.length === 0) return null;

    return (
        <div className="grid gap-4">
            <div className="grid gap-1.5">
                <p className="font-mono text-[10px] font-semibold tracking-wider text-fg-muted uppercase">
                    {t('bank_label')}
                </p>
                <FormSelect
                    value={toFormSelectValue(bankId)}
                    disabled={disabled}
                    withFormControl={false}
                    onValueChange={next => {
                        if (next === FORM_SELECT_NONE) {
                            // Clearing bank while an account remains → re-sync bank from seat.
                            if (accountId) {
                                const seat = depositAccounts.find(row => row.id === accountId);
                                onChange({
                                    bankId: seat?.bankId ?? null,
                                    accountId,
                                });
                                return;
                            }
                            onChange({ bankId: null, accountId: null });
                            return;
                        }
                        const keepAccount =
                            accountId &&
                            depositAccounts.some(row => row.id === accountId && row.bankId === next)
                                ? accountId
                                : null;
                        onChange({ bankId: next, accountId: keepAccount });
                    }}>
                    <FormSelectItem value={FORM_SELECT_NONE}>{t('bank_none')}</FormSelectItem>
                    {banks.map(bank => (
                        <FormSelectItem key={bank.id} value={bank.id}>
                            {bank.name}
                        </FormSelectItem>
                    ))}
                </FormSelect>
                <p className="text-xs leading-relaxed text-fg-faint">{t('bank_hint')}</p>
            </div>

            {depositAccounts.length > 0 ? (
                <div className="grid gap-1.5">
                    <p className="font-mono text-[10px] font-semibold tracking-wider text-fg-muted uppercase">
                        {t('account_label')}
                    </p>
                    <FormSelect
                        value={toFormSelectValue(accountId)}
                        disabled={disabled}
                        withFormControl={false}
                        onValueChange={next => {
                            if (next === FORM_SELECT_NONE) {
                                onChange({ bankId, accountId: null });
                                return;
                            }
                            const seat = depositAccounts.find(row => row.id === next);
                            onChange({
                                bankId: seat?.bankId ?? bankId,
                                accountId: next,
                            });
                        }}>
                        <FormSelectItem value={FORM_SELECT_NONE}>
                            {t('account_none')}
                        </FormSelectItem>
                        {accountsForBank.map(account => (
                            <FormSelectItem key={account.id} value={account.id}>
                                {account.name}
                            </FormSelectItem>
                        ))}
                    </FormSelect>
                    <p className="text-xs leading-relaxed text-fg-faint">{t('account_hint')}</p>
                </div>
            ) : null}
        </div>
    );
}
