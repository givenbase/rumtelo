'use client';

import { vendorMarkSrc } from '@/app/_lib/vendor-brands';
import { type NamePresetOption } from '@/components/features/forms/preset-name-field';
import { type AccountKind, type Account, type Bank } from '@rumtelo/contracts';
import { useTranslations } from '@rumtelo/i18n';
import { Button, EmptyState, VendorMark } from '@rumtelo/ui';
import { cn, formatIban } from '@rumtelo/utils';
import { useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';

import type { BankAccountFormValues } from '../_utils/settings-form-zod';
import { accountBankMark } from '../_utils/resolve-account-bank';
import { BankAccountRow } from '@/components/features/money/bank-account-row';
import { BankAccountForm } from './bank-account-form';
import { SettingsRow, SettingsRowLabel } from './settings-chrome';

export type BankLinkedAccountsProps = {
    live: boolean;
    linkedByBankId: Map<string, Account[]>;
    linkedCount: number;
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
    editingId: string | null;
    canSubmit: boolean;
    saving: boolean;
    formatMoney: (amount: number) => string;
    syncEnabled: boolean;
    wizardOpen: boolean;
    canConnect: boolean;
    onOpenWizard: () => void;
    onReset: () => void;
    onOpenEdit: (account: Account) => void;
    onSetPrimary: (id: string) => void;
    onSync: (id: string) => void;
    onDisconnect: (id: string) => void;
    onSubmit: (values: BankAccountFormValues) => void;
    pickBank: (key: string) => void;
    onBankNameChange: (value: string) => void;
    setPrimaryPending: boolean;
    syncPending: boolean;
    disconnectPending: boolean;
};

export function BankLinkedAccounts({
    live,
    linkedByBankId,
    linkedCount,
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
    editingId,
    canSubmit,
    saving,
    formatMoney,
    syncEnabled,
    wizardOpen,
    canConnect,
    onOpenWizard,
    onReset,
    onOpenEdit,
    onSetPrimary,
    onSync,
    onDisconnect,
    onSubmit,
    pickBank,
    onBankNameChange,
    setPrimaryPending,
    syncPending,
    disconnectPending,
}: BankLinkedAccountsProps) {
    const t = useTranslations();
    const [openBankGroups, setOpenBankGroups] = useState<Set<string>>(() => new Set());
    const linkedBankEntries = Array.from(linkedByBankId.entries());

    function toggleBankGroup(bankIdKey: string) {
        setOpenBankGroups(prev => {
            if (prev.size === 0) {
                const next = new Set(linkedByBankId.keys());
                next.delete(bankIdKey);
                return next;
            }
            const next = new Set(prev);
            if (next.has(bankIdKey)) next.delete(bankIdKey);
            else next.add(bankIdKey);
            return next;
        });
    }

    function isBankGroupOpen(bankIdKey: string) {
        if (editingId) {
            const seats = linkedByBankId.get(bankIdKey) ?? [];
            if (seats.some(row => row.id === editingId)) return true;
        }
        return openBankGroups.size === 0 || openBankGroups.has(bankIdKey);
    }

    return (
        <>
            {!syncEnabled ? (
                <p className="py-2.5 text-sm text-fg-muted">
                    {t('pages.settings.panels.bank.connect_disabled_hint')}
                </p>
            ) : null}

            {linkedBankEntries.map(([groupBankId, seats], groupIndex) => {
                if (editingId && !seats.some(row => row.id === editingId)) return null;
                const bank = bankById.get(groupBankId);
                const mark = bank
                    ? vendorMarkSrc({
                          key: bank.key,
                          name: bank.name,
                          logoDomain: bank.logoDomain,
                          website: bank.website,
                      })
                    : null;
                const open = isBankGroupOpen(groupBankId);
                const isLastGroup =
                    groupIndex === linkedBankEntries.length - 1 && !wizardOpen && linkedCount > 0;
                return (
                    <div key={groupBankId} className="border-b border-line last:border-b-0">
                        <button
                            type="button"
                            className="flex w-full items-center gap-2.5 py-2.5 text-left"
                            onClick={() => toggleBankGroup(groupBankId)}
                            aria-expanded={open}>
                            {mark ? <VendorMark name={mark.name} src={mark.src} size={22} /> : null}
                            <SettingsRowLabel
                                title={bank?.name ?? t('pages.settings.panels.bank.bank_fallback')}
                                sub={t('pages.settings.panels.bank.group_accounts', {
                                    count: seats.length,
                                })}
                            />
                            <span className="ml-auto font-mono text-[10px] tracking-[0.12em] text-fg-faint uppercase">
                                {open ? '−' : '+'}
                            </span>
                        </button>
                        {open
                            ? seats.map((account, seatIndex) => {
                                  const isEditing = editingId === account.id;
                                  if (editingId && !isEditing) return null;
                                  const seatMark = isEditing
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
                                      isEditing ||
                                      (!editingId && isLastGroup && seatIndex === seats.length - 1);
                                  return (
                                      <div
                                          key={account.id}
                                          className={cn(
                                              isEditing &&
                                                  'mb-1 rounded-xl border border-accent/40 bg-accent-soft/50 px-3'
                                          )}>
                                          <SettingsRow last={isLastVisible && !isEditing}>
                                              <BankAccountRow
                                                  account={account}
                                                  banks={bankList}
                                                  title={rowTitle}
                                                  mark={seatMark}
                                                  className="min-w-0 flex-1"
                                                  sub={`${account.iban ? formatIban(account.iban) : t('pages.settings.panels.bank.no_iban')} · ${formatMoney(account.balance)}${
                                                      account.isPrimary
                                                          ? ` · ${t('pages.settings.panels.bank.primary')}`
                                                          : ''
                                                  }`}
                                                  onSelect={() => onOpenEdit(account)}
                                                  trailing={
                                              <div className="flex flex-wrap items-center justify-end gap-1.5">
                                                  {!isEditing && !account.isPrimary ? (
                                                      <Button
                                                          type="button"
                                                          variant="secondary"
                                                          size="sm"
                                                          className="rounded-full font-mono text-[10px] tracking-[0.12em] uppercase"
                                                          disabled={!live || setPrimaryPending}
                                                          onClick={() => onSetPrimary(account.id)}>
                                                          {t(
                                                              'pages.settings.panels.bank.set_primary'
                                                          )}
                                                      </Button>
                                                  ) : null}
                                                  {!isEditing ? (
                                                      <>
                                                          <Button
                                                              type="button"
                                                              variant="secondary"
                                                              size="sm"
                                                              className="rounded-full font-mono text-[10px] tracking-[0.12em] uppercase"
                                                              disabled={!live || syncPending}
                                                              onClick={() => onSync(account.id)}>
                                                              {t(
                                                                  'pages.settings.panels.bank.sync_now'
                                                              )}
                                                          </Button>
                                                          <Button
                                                              type="button"
                                                              variant="ghost"
                                                              size="sm"
                                                              className="rounded-full font-mono text-[10px] tracking-[0.12em] uppercase"
                                                              disabled={!live || disconnectPending}
                                                              onClick={() =>
                                                                  onDisconnect(account.id)
                                                              }>
                                                              {t(
                                                                  'pages.settings.panels.bank.disconnect_bank'
                                                              )}
                                                          </Button>
                                                      </>
                                                  ) : null}
                                                  <Button
                                                      type="button"
                                                      variant="secondary"
                                                      size="sm"
                                                      className="rounded-full font-mono text-[10px] tracking-[0.12em] uppercase"
                                                      onClick={() =>
                                                          isEditing
                                                              ? onReset()
                                                              : onOpenEdit(account)
                                                      }>
                                                      {isEditing
                                                          ? t(
                                                                'pages.settings.panels.jars_placement.close'
                                                            )
                                                          : t('pages.settings.panels.bank.edit')}
                                                  </Button>
                                              </div>
                                                  }
                                              />
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
                                                  ibanLocked
                                              />
                                          ) : null}
                                      </div>
                                  );
                              })
                            : null}
                    </div>
                );
            })}

            {linkedCount === 0 && !wizardOpen ? (
                <EmptyState
                    variant="compact"
                    className="border-0 bg-transparent"
                    title={t('pages.settings.panels.bank.empty_linked_title')}
                    body={t('pages.settings.panels.bank.empty_linked_body')}
                />
            ) : null}

            {syncEnabled && !wizardOpen ? (
                <div className="flex justify-end py-2.5">
                    <Button
                        type="button"
                        size="sm"
                        className="rounded-full font-mono text-[10px] tracking-[0.12em] uppercase"
                        disabled={!live || !canConnect || Boolean(editingId)}
                        onClick={onOpenWizard}>
                        {t('pages.settings.panels.bank.connect_bank')}
                    </Button>
                </div>
            ) : null}

            {syncEnabled && !wizardOpen && !canConnect ? (
                <p className="py-2 text-sm text-fg-muted">
                    {t('common.message.error.api.plan_limit_reached')}
                </p>
            ) : null}
        </>
    );
}
