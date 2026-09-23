'use client';

import { vendorMarkSrc } from '@/app/_lib/vendor-brands';
import { type Account, type Bank } from '@rumtelo/contracts';
import { useTranslations } from '@rumtelo/i18n';
import { Button, EmptyState, VendorMark } from '@rumtelo/ui';
import { formatIban } from '@rumtelo/utils';
import { useState } from 'react';

import { SettingsRow, SettingsRowLabel } from './settings-chrome';

export type BankLinkedAccountsProps = {
    live: boolean;
    linkedByBankId: Map<string, Account[]>;
    linkedCount: number;
    bankById: Map<string, Bank>;
    formatMoney: (amount: number) => string;
    syncEnabled: boolean;
    wizardOpen: boolean;
    canConnect: boolean;
    onOpenWizard: () => void;
    onSetPrimary: (id: string) => void;
    onSync: (id: string) => void;
    onDisconnect: (id: string) => void;
    setPrimaryPending: boolean;
    syncPending: boolean;
    disconnectPending: boolean;
};

export function BankLinkedAccounts({
    live,
    linkedByBankId,
    linkedCount,
    bankById,
    formatMoney,
    syncEnabled,
    wizardOpen,
    canConnect,
    onOpenWizard,
    onSetPrimary,
    onSync,
    onDisconnect,
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
                            ? seats.map((account, seatIndex) => (
                                  <SettingsRow
                                      key={account.id}
                                      last={isLastGroup && seatIndex === seats.length - 1}>
                                      <SettingsRowLabel
                                          title={account.name}
                                          sub={`${account.iban ? formatIban(account.iban) : t('pages.settings.panels.bank.no_iban')} · ${formatMoney(account.balance)}${
                                              account.isPrimary
                                                  ? ` · ${t('pages.settings.panels.bank.primary')}`
                                                  : ''
                                          }`}
                                      />
                                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                                          {!account.isPrimary ? (
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
                                              disabled={!live || syncPending}
                                              onClick={() => onSync(account.id)}>
                                              {t('pages.settings.panels.bank.sync_now')}
                                          </Button>
                                          <Button
                                              type="button"
                                              variant="ghost"
                                              size="sm"
                                              className="rounded-full font-mono text-[10px] tracking-[0.12em] uppercase"
                                              disabled={!live || disconnectPending}
                                              onClick={() => onDisconnect(account.id)}>
                                              {t('pages.settings.panels.bank.disconnect_bank')}
                                          </Button>
                                      </div>
                                  </SettingsRow>
                              ))
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
                        disabled={!live || !canConnect}
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
