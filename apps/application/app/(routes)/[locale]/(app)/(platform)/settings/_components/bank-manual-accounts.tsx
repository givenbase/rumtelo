'use client';

import { vendorMarkSrc } from '@/app/_lib/vendor-brands';
import { type NamePresetOption } from '@/components/features/forms/preset-name-field';
import { type AccountKind, type Account, type Bank } from '@rumtelo/contracts';
import { useTranslations } from '@rumtelo/i18n';
import { Button, EmptyState, VendorMark } from '@rumtelo/ui';
import { cn, formatIban } from '@rumtelo/utils';
import type { UseFormReturn } from 'react-hook-form';

import type { BankAccountFormValues } from '../_utils/settings-form-zod';
import { accountBankMark } from '../_utils/resolve-account-bank';
import { BankAccountForm } from './bank-account-form';
import { SettingsRow, SettingsRowLabel } from './settings-chrome';

export type BankManualAccountsProps = {
    live: boolean;
    manualAccounts: Account[];
    bankList: Bank[];
    bankNameOptions: NamePresetOption[];
    bankById: Map<string, Bank>;
    form: UseFormReturn<BankAccountFormValues>;
    bankId: string;
    kind: AccountKind;
    label: string;
    selectedBank: Bank | null | undefined;
    selectedIbanCode: string | undefined;
    ibanPlaceholder: string;
    ibanHint: string;
    partnerHint: string | null;
    settlementOptions: Account[];
    ibanError: string | null;
    setIbanError: (value: string | null) => void;
    kindLabel: (accountKind: string) => string;
    adding: boolean;
    editingId: string | null;
    canSubmit: boolean;
    saving: boolean;
    setPrimaryPending: boolean;
    deletePending: boolean;
    formatMoney: (amount: number) => string;
    onReset: () => void;
    onOpenEdit: (account: Account) => void;
    onSetPrimary: (id: string) => void;
    onSubmit: (values: BankAccountFormValues) => void;
    onDelete: () => void;
    pickBank: (key: string) => void;
    onBankNameChange: (value: string) => void;
};

export function BankManualAccounts({
    live,
    manualAccounts,
    bankList,
    bankNameOptions,
    bankById,
    form,
    bankId,
    kind,
    label,
    selectedBank,
    selectedIbanCode,
    ibanPlaceholder,
    ibanHint,
    partnerHint,
    settlementOptions,
    ibanError,
    setIbanError,
    kindLabel,
    adding,
    editingId,
    canSubmit,
    saving,
    setPrimaryPending,
    deletePending,
    formatMoney,
    onReset,
    onOpenEdit,
    onSetPrimary,
    onSubmit,
    onDelete,
    pickBank,
    onBankNameChange,
}: BankManualAccountsProps) {
    const t = useTranslations();

    return (
        <>
            {adding ? (
                <BankAccountForm
                    form={form}
                    formKey="add"
                    editing={false}
                    live={live}
                    canSubmit={canSubmit}
                    saving={saving}
                    bankList={bankList}
                    bankNameOptions={bankNameOptions}
                    bankById={bankById}
                    bankId={bankId}
                    selectedBank={selectedBank}
                    selectedIbanCode={selectedIbanCode}
                    ibanPlaceholder={ibanPlaceholder}
                    ibanHint={ibanHint}
                    partnerHint={partnerHint}
                    kind={kind}
                    settlementOptions={settlementOptions}
                    ibanError={ibanError}
                    setIbanError={setIbanError}
                    kindLabel={kindLabel}
                    pickBank={pickBank}
                    onBankNameChange={onBankNameChange}
                    onSubmit={onSubmit}
                    onCancel={onReset}
                />
            ) : manualAccounts.length === 0 ? (
                <EmptyState
                    variant="compact"
                    className="border-0 bg-transparent"
                    title={t('pages.settings.panels.bank.no_accounts_yet_title')}
                    body={t('pages.settings.panels.bank.no_accounts_yet_body')}
                />
            ) : (
                manualAccounts.map((account, i) => {
                    const isEditing = editingId === account.id;
                    if (editingId && !isEditing) return null;
                    const mark = isEditing
                        ? selectedBank
                            ? vendorMarkSrc({
                                  key: selectedBank.key,
                                  name: selectedBank.name,
                                  logoDomain: selectedBank.logoDomain,
                                  website: selectedBank.website,
                              })
                            : null
                        : accountBankMark(account, bankList);
                    const rowTitle = isEditing
                        ? label.trim() || selectedBank?.name || account.name
                        : account.name;
                    const isLastVisible =
                        isEditing || (!editingId && i === manualAccounts.length - 1);
                    return (
                        <div
                            key={account.id}
                            className={cn(
                                isEditing &&
                                    'mb-1 rounded-xl border border-accent/40 bg-accent-soft/50 px-3'
                            )}>
                            <SettingsRow last={isLastVisible && !isEditing}>
                                <button
                                    type="button"
                                    className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                                    onClick={() => onOpenEdit(account)}>
                                    {mark ? (
                                        <VendorMark name={mark.name} src={mark.src} size={22} />
                                    ) : null}
                                    <SettingsRowLabel
                                        title={rowTitle}
                                        sub={`${account.iban ? formatIban(account.iban) : t('pages.settings.panels.bank.no_iban')} · ${formatMoney(account.balance)}${
                                            account.isPrimary
                                                ? ` · ${t('pages.settings.panels.bank.primary')}`
                                                : ''
                                        }`}
                                    />
                                </button>
                                <div className="flex flex-wrap items-center justify-end gap-1.5">
                                    {!isEditing && !account.isPrimary ? (
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            size="sm"
                                            className="rounded-full font-mono text-[10px] tracking-[0.12em] uppercase"
                                            disabled={!live || setPrimaryPending}
                                            onClick={() => onSetPrimary(account.id)}>
                                            {t('pages.settings.panels.bank.set_primary')}
                                        </Button>
                                    ) : null}
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        className="rounded-full font-mono text-[10px] tracking-[0.12em] uppercase"
                                        onClick={() =>
                                            isEditing ? onReset() : onOpenEdit(account)
                                        }>
                                        {isEditing
                                            ? t('pages.settings.panels.jars_placement.close')
                                            : t('pages.settings.panels.bank.edit')}
                                    </Button>
                                </div>
                            </SettingsRow>
                            {isEditing ? (
                                <BankAccountForm
                                    form={form}
                                    formKey={editingId}
                                    editing
                                    live={live}
                                    canSubmit={canSubmit}
                                    saving={saving}
                                    bankList={bankList}
                                    bankNameOptions={bankNameOptions}
                                    bankById={bankById}
                                    bankId={bankId}
                                    selectedBank={selectedBank}
                                    selectedIbanCode={selectedIbanCode}
                                    ibanPlaceholder={ibanPlaceholder}
                                    ibanHint={ibanHint}
                                    partnerHint={partnerHint}
                                    kind={kind}
                                    settlementOptions={settlementOptions}
                                    ibanError={ibanError}
                                    setIbanError={setIbanError}
                                    kindLabel={kindLabel}
                                    pickBank={pickBank}
                                    onBankNameChange={onBankNameChange}
                                    onSubmit={onSubmit}
                                    onCancel={onReset}
                                    onDelete={() => onDelete()}
                                    deletePending={deletePending}
                                />
                            ) : null}
                        </div>
                    );
                })
            )}
        </>
    );
}
