'use client';

import { vendorMarkSrc } from '@/app/_lib/vendor-brands';
import {
    PresetNameField,
    type NamePresetOption,
} from '@/components/features/forms/preset-name-field';
import { type Account, type Bank } from '@rumtelo/contracts';
import type { BankInstitution } from '@rumtelo/contracts/money';
import { useTranslations } from '@rumtelo/i18n';
import { Button, Field, Input, VendorMark } from '@rumtelo/ui';
import { cn, formatIban } from '@rumtelo/utils';
import { useState } from 'react';

import { accountBankMark } from '../_utils/resolve-account-bank';
import {
    isMockInstitution,
    matchCatalogToInstitution,
    sortInstitutions,
} from '../_utils/bank-settings';
import { SettingsRowLabel } from './settings-chrome';

export type BankLinkWizardAuthoriseInput = {
    institutionId: string;
    seatMode: 'existing' | 'new';
    seatId: string;
    newLabel: string;
    catalogBankId: string;
};

export type BankLinkWizardProps = {
    live: boolean;
    onClose: () => void;
    busy: boolean;
    institutions: BankInstitution[];
    bankList: Bank[];
    bankNameOptions: NamePresetOption[];
    bankById: Map<string, Bank>;
    bankByKey: Map<string, Bank>;
    manualAccounts: Account[];
    primaryBankId: string | null;
    formatMoney: (amount: number) => string;
    onAuthorise: (input: BankLinkWizardAuthoriseInput) => void | Promise<void>;
};

export function BankLinkWizard({
    live,
    onClose,
    busy,
    institutions: institutionsRaw,
    bankList,
    bankNameOptions,
    bankById,
    bankByKey,
    manualAccounts,
    primaryBankId,
    formatMoney,
    onAuthorise,
}: BankLinkWizardProps) {
    const t = useTranslations();
    const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
    const [wizardInstitutionId, setWizardInstitutionId] = useState('');
    const [wizardSeatMode, setWizardSeatMode] = useState<'existing' | 'new'>(() =>
        manualAccounts.length > 0 ? 'existing' : 'new'
    );
    const [wizardSeatId, setWizardSeatId] = useState('');
    const [wizardNewLabel, setWizardNewLabel] = useState('');
    const [wizardCatalogBankId, setWizardCatalogBankId] = useState('');

    const institutions = sortInstitutions(institutionsRaw);
    const sandboxInstitutionList = institutions.some(row => isMockInstitution(row.name));
    const wizardInstitution = institutions.find(row => row.id === wizardInstitutionId);
    const wizardInstitutionCatalog = wizardInstitution
        ? matchCatalogToInstitution(wizardInstitution.name, bankList)
        : null;
    const wizardInstitutionMark = wizardInstitutionCatalog
        ? vendorMarkSrc({
              key: wizardInstitutionCatalog.key,
              name: wizardInstitutionCatalog.name,
              logoDomain: wizardInstitutionCatalog.logoDomain,
              website: wizardInstitutionCatalog.website,
          })
        : wizardInstitution
          ? { name: wizardInstitution.name, src: wizardInstitution.logo }
          : null;
    const wizardMatchingSeats = !wizardInstitution
        ? []
        : isMockInstitution(wizardInstitution.name)
          ? manualAccounts
          : !wizardInstitutionCatalog
            ? []
            : manualAccounts.filter(row => row.bankId === wizardInstitutionCatalog.id);
    const wizardSeat =
        wizardSeatMode === 'existing'
            ? (wizardMatchingSeats.find(row => row.id === wizardSeatId) ?? null)
            : null;
    const wizardSeatMark = wizardSeat ? accountBankMark(wizardSeat, bankList) : null;
    const canWizardSeatNext =
        wizardSeatMode === 'existing'
            ? Boolean(wizardSeatId && wizardSeat)
            : Boolean(
                  wizardCatalogBankId ||
                  wizardInstitutionCatalog?.id ||
                  primaryBankId ||
                  bankList[0]?.id
              );
    const wizardBusy = busy;

    return (
        <div className="grid gap-3 border-t border-line py-3">
            <p className="font-mono text-[10px] tracking-[0.14em] text-fg-faint uppercase">
                {wizardStep === 1
                    ? t('pages.settings.panels.bank.wizard_step_institution')
                    : wizardStep === 2
                      ? t('pages.settings.panels.bank.wizard_step_seat')
                      : t('pages.settings.panels.bank.wizard_step_authorise')}
            </p>

            {wizardStep === 1 ? (
                <div className="grid gap-3">
                    <p className="text-sm text-fg-muted">
                        {sandboxInstitutionList
                            ? t('pages.settings.panels.bank.wizard_institution_sandbox_hint')
                            : t('pages.settings.panels.bank.wizard_institution_hint')}
                    </p>
                    <div
                        className="grid gap-1"
                        role="radiogroup"
                        aria-label={t('pages.settings.panels.bank.wizard_pick_institution')}>
                        {institutions.length === 0 ? (
                            <p className="text-sm text-fg-muted">
                                {t('pages.settings.panels.bank.loading_banks')}
                            </p>
                        ) : (
                            institutions.map(row => {
                                const selected = wizardInstitutionId === row.id;
                                const isMock = isMockInstitution(row.name);
                                const catalog = matchCatalogToInstitution(row.name, bankList);
                                const mark = catalog
                                    ? vendorMarkSrc({
                                          key: catalog.key,
                                          name: catalog.name,
                                          logoDomain: catalog.logoDomain,
                                          website: catalog.website,
                                      })
                                    : { name: row.name, src: row.logo };
                                return (
                                    <button
                                        key={row.id}
                                        type="button"
                                        role="radio"
                                        aria-checked={selected}
                                        disabled={!live || wizardBusy}
                                        onClick={() => {
                                            setWizardInstitutionId(row.id);
                                            setWizardCatalogBankId(catalog?.id ?? '');
                                            if (catalog && !wizardNewLabel.trim()) {
                                                setWizardNewLabel(
                                                    t('pages.settings.panels.bank.bank_checking', {
                                                        bank: catalog.name,
                                                    })
                                                );
                                            }
                                        }}
                                        className={cn(
                                            'flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors',
                                            selected
                                                ? 'border-accent bg-accent-soft/60'
                                                : 'border-line bg-bg hover:border-fg-faint'
                                        )}>
                                        <span
                                            className={cn(
                                                'flex size-4 shrink-0 items-center justify-center rounded-full border',
                                                selected
                                                    ? 'border-accent bg-accent'
                                                    : 'border-fg-faint'
                                            )}
                                            aria-hidden>
                                            {selected ? (
                                                <span className="size-1.5 rounded-full bg-bg" />
                                            ) : null}
                                        </span>
                                        <VendorMark name={mark.name} src={mark.src} size={28} />
                                        <SettingsRowLabel
                                            title={row.name}
                                            sub={
                                                isMock
                                                    ? t(
                                                          'pages.settings.panels.bank.wizard_sandbox_badge'
                                                      )
                                                    : undefined
                                            }
                                        />
                                    </button>
                                );
                            })
                        )}
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={onClose}>
                            {t('pages.settings.panels.bank.wizard_cancel')}
                        </Button>
                        <Button
                            type="button"
                            disabled={!live || !wizardInstitutionId}
                            onClick={() => {
                                const catalog = wizardInstitution
                                    ? matchCatalogToInstitution(wizardInstitution.name, bankList)
                                    : null;
                                if (catalog) {
                                    setWizardCatalogBankId(catalog.id);
                                    if (!wizardNewLabel.trim()) {
                                        setWizardNewLabel(
                                            t('pages.settings.panels.bank.bank_checking', {
                                                bank: catalog.name,
                                            })
                                        );
                                    }
                                }
                                const matching =
                                    wizardInstitution && isMockInstitution(wizardInstitution.name)
                                        ? manualAccounts
                                        : catalog
                                          ? manualAccounts.filter(row => row.bankId === catalog.id)
                                          : [];
                                if (matching.length > 0) {
                                    setWizardSeatMode('existing');
                                    const preferred =
                                        matching.find(row => row.isPrimary) ?? matching[0];
                                    setWizardSeatId(preferred?.id ?? '');
                                } else {
                                    setWizardSeatMode('new');
                                    setWizardSeatId('');
                                }
                                setWizardStep(2);
                            }}>
                            {t('pages.settings.panels.bank.connect')}
                        </Button>
                    </div>
                </div>
            ) : null}

            {wizardStep === 2 ? (
                <div className="grid gap-3">
                    <div className="flex flex-wrap gap-2">
                        <Button
                            type="button"
                            size="sm"
                            variant={wizardSeatMode === 'existing' ? 'primary' : 'secondary'}
                            className="rounded-full font-mono text-[10px] tracking-[0.12em] uppercase"
                            disabled={wizardMatchingSeats.length === 0}
                            onClick={() => setWizardSeatMode('existing')}>
                            {t('pages.settings.panels.bank.wizard_seat_existing')}
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant={wizardSeatMode === 'new' ? 'primary' : 'secondary'}
                            className="rounded-full font-mono text-[10px] tracking-[0.12em] uppercase"
                            onClick={() => {
                                setWizardSeatMode('new');
                                if (wizardInstitutionCatalog) {
                                    setWizardCatalogBankId(wizardInstitutionCatalog.id);
                                }
                            }}>
                            {t('pages.settings.panels.bank.wizard_seat_new')}
                        </Button>
                    </div>
                    {wizardSeatMode === 'existing' ? (
                        <div
                            className="grid gap-1"
                            role="radiogroup"
                            aria-label={t('pages.settings.panels.bank.wizard_pick_seat')}>
                            <p className="text-sm text-fg-muted">
                                {wizardInstitution && !isMockInstitution(wizardInstitution.name)
                                    ? t('pages.settings.panels.bank.wizard_pick_seat_bank', {
                                          bank:
                                              wizardInstitutionCatalog?.name ??
                                              wizardInstitution.name,
                                      })
                                    : t('pages.settings.panels.bank.wizard_pick_seat')}
                            </p>
                            {wizardMatchingSeats.length === 0 ? (
                                <p className="text-sm text-fg-muted">
                                    {t('pages.settings.panels.bank.wizard_no_matching_seats', {
                                        bank:
                                            wizardInstitutionCatalog?.name ??
                                            wizardInstitution?.name ??
                                            t('pages.settings.panels.bank.bank_fallback'),
                                    })}
                                </p>
                            ) : (
                                wizardMatchingSeats.map(row => {
                                    const mark = accountBankMark(row, bankList);
                                    const selected = wizardSeatId === row.id;
                                    return (
                                        <button
                                            key={row.id}
                                            type="button"
                                            role="radio"
                                            aria-checked={selected}
                                            disabled={!live || wizardBusy}
                                            onClick={() => setWizardSeatId(row.id)}
                                            className={cn(
                                                'flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors',
                                                selected
                                                    ? 'border-accent bg-accent-soft/60'
                                                    : 'border-line bg-bg hover:border-fg-faint'
                                            )}>
                                            <span
                                                className={cn(
                                                    'flex size-4 shrink-0 items-center justify-center rounded-full border',
                                                    selected
                                                        ? 'border-accent bg-accent'
                                                        : 'border-fg-faint'
                                                )}
                                                aria-hidden>
                                                {selected ? (
                                                    <span className="size-1.5 rounded-full bg-bg" />
                                                ) : null}
                                            </span>
                                            {mark ? (
                                                <VendorMark
                                                    name={mark.name}
                                                    src={mark.src}
                                                    size={22}
                                                />
                                            ) : null}
                                            <SettingsRowLabel
                                                title={row.name}
                                                sub={`${row.iban ? formatIban(row.iban) : t('pages.settings.panels.bank.no_iban')} · ${formatMoney(row.balance)}`}
                                            />
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {wizardInstitutionCatalog || wizardInstitutionMark ? (
                                <div className="flex items-center gap-2.5 rounded-xl border border-line px-3 py-2.5">
                                    {wizardInstitutionMark ? (
                                        <VendorMark
                                            name={wizardInstitutionMark.name}
                                            src={wizardInstitutionMark.src}
                                            size={22}
                                        />
                                    ) : null}
                                    <SettingsRowLabel
                                        title={
                                            wizardInstitutionCatalog?.name ??
                                            wizardInstitution?.name ??
                                            t('pages.settings.panels.bank.bank_fallback')
                                        }
                                        sub={t('pages.settings.panels.bank.wizard_catalog_bank')}
                                    />
                                </div>
                            ) : null}
                            <Field label={t('pages.settings.panels.bank.wizard_new_label')}>
                                <Input
                                    value={wizardNewLabel}
                                    onChange={event => setWizardNewLabel(event.target.value)}
                                    disabled={!live || wizardBusy}
                                />
                            </Field>
                            {!wizardInstitutionCatalog ? (
                                <div className="grid gap-2">
                                    <p className="font-mono text-[10px] tracking-[0.14em] text-fg-faint uppercase">
                                        {t('pages.settings.panels.bank.wizard_catalog_bank')}
                                    </p>
                                    {bankList.length === 0 ? (
                                        <p className="text-sm text-fg-muted">
                                            {t('pages.settings.panels.bank.loading_banks')}
                                        </p>
                                    ) : (
                                        <>
                                            <PresetNameField
                                                value={
                                                    bankById.get(
                                                        wizardCatalogBankId || primaryBankId || ''
                                                    )?.name ?? ''
                                                }
                                                onChange={name => {
                                                    const match = bankList.find(
                                                        bank =>
                                                            bank.name.toLowerCase() ===
                                                            name.trim().toLowerCase()
                                                    );
                                                    if (match) {
                                                        setWizardCatalogBankId(match.id);
                                                        if (!wizardNewLabel.trim()) {
                                                            setWizardNewLabel(
                                                                t(
                                                                    'pages.settings.panels.bank.bank_checking',
                                                                    {
                                                                        bank: match.name,
                                                                    }
                                                                )
                                                            );
                                                        }
                                                    }
                                                }}
                                                options={bankNameOptions}
                                                placeholder={t(
                                                    'pages.settings.panels.bank.search_bank'
                                                )}
                                                freeTextPlaceholder={t(
                                                    'pages.settings.panels.bank.type_bank_name'
                                                )}
                                                lockPresets
                                                initialLockedKey={
                                                    bankById.get(
                                                        wizardCatalogBankId || primaryBankId || ''
                                                    )?.key || undefined
                                                }
                                                disabled={!live || wizardBusy}
                                                onClear={() => setWizardCatalogBankId('')}
                                                onSelect={opt => {
                                                    const bank = bankByKey.get(opt.key);
                                                    if (!bank) return;
                                                    setWizardCatalogBankId(bank.id);
                                                    if (!wizardNewLabel.trim()) {
                                                        setWizardNewLabel(
                                                            t(
                                                                'pages.settings.panels.bank.bank_checking',
                                                                { bank: bank.name }
                                                            )
                                                        );
                                                    }
                                                }}
                                            />
                                            <div className="flex flex-wrap gap-2">
                                                {bankList.slice(0, 8).map(bank => {
                                                    const mark = vendorMarkSrc({
                                                        key: bank.key,
                                                        name: bank.name,
                                                        logoDomain: bank.logoDomain,
                                                        website: bank.website,
                                                    });
                                                    const selectedId =
                                                        wizardCatalogBankId || primaryBankId || '';
                                                    const selected = selectedId === bank.id;
                                                    return (
                                                        <button
                                                            key={bank.key}
                                                            type="button"
                                                            disabled={!live || wizardBusy}
                                                            onClick={() => {
                                                                setWizardCatalogBankId(bank.id);
                                                                if (!wizardNewLabel.trim()) {
                                                                    setWizardNewLabel(
                                                                        t(
                                                                            'pages.settings.panels.bank.bank_checking',
                                                                            {
                                                                                bank: bank.name,
                                                                            }
                                                                        )
                                                                    );
                                                                }
                                                            }}
                                                            className={cn(
                                                                'inline-flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-xs transition-colors',
                                                                selected
                                                                    ? 'border-accent bg-accent/10 text-fg'
                                                                    : 'border-line text-fg-secondary hover:border-fg-faint hover:text-fg'
                                                            )}>
                                                            <VendorMark
                                                                name={mark.name}
                                                                src={mark.src}
                                                                size={18}
                                                            />
                                                            {bank.name}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </>
                                    )}
                                </div>
                            ) : null}
                        </div>
                    )}
                    <div className="flex flex-wrap justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={() => setWizardStep(1)}>
                            {t('pages.settings.panels.bank.wizard_cancel')}
                        </Button>
                        <Button
                            type="button"
                            disabled={!live || !canWizardSeatNext}
                            onClick={() => setWizardStep(3)}>
                            {t('pages.settings.panels.bank.connect')}
                        </Button>
                    </div>
                </div>
            ) : null}

            {wizardStep === 3 ? (
                <div className="grid gap-3">
                    <p className="text-sm text-fg-muted">
                        {t('pages.settings.panels.bank.wizard_authorise_hint')}
                    </p>
                    <div className="grid gap-2 rounded-xl border border-line px-3 py-3">
                        <p className="font-mono text-[10px] tracking-[0.14em] text-fg-faint uppercase">
                            {t('pages.settings.panels.bank.wizard_authorise_bank')}
                        </p>
                        {wizardInstitution && wizardInstitutionMark ? (
                            <div className="flex items-center gap-2.5">
                                <VendorMark
                                    name={wizardInstitutionMark.name}
                                    src={wizardInstitutionMark.src}
                                    size={28}
                                />
                                <SettingsRowLabel
                                    title={wizardInstitution.name}
                                    sub={
                                        isMockInstitution(wizardInstitution.name)
                                            ? t('pages.settings.panels.bank.wizard_sandbox_badge')
                                            : undefined
                                    }
                                />
                            </div>
                        ) : (
                            <p className="text-sm text-fg-muted">
                                {t('pages.settings.panels.bank.pick_institution')}
                            </p>
                        )}
                        <p className="mt-2 font-mono text-[10px] tracking-[0.14em] text-fg-faint uppercase">
                            {t('pages.settings.panels.bank.wizard_authorise_seat')}
                        </p>
                        {wizardSeatMode === 'existing' && wizardSeat ? (
                            <div className="flex items-center gap-2.5">
                                {wizardSeatMark ? (
                                    <VendorMark
                                        name={wizardSeatMark.name}
                                        src={wizardSeatMark.src}
                                        size={22}
                                    />
                                ) : null}
                                <SettingsRowLabel
                                    title={wizardSeat.name}
                                    sub={`${wizardSeat.iban ? formatIban(wizardSeat.iban) : t('pages.settings.panels.bank.no_iban')} · ${formatMoney(wizardSeat.balance)}`}
                                />
                            </div>
                        ) : (
                            <SettingsRowLabel
                                title={
                                    wizardNewLabel.trim() ||
                                    t('pages.settings.panels.bank.wizard_seat_new')
                                }
                                sub={
                                    bankById.get(
                                        wizardCatalogBankId ||
                                            primaryBankId ||
                                            bankList[0]?.id ||
                                            ''
                                    )?.name
                                }
                            />
                        )}
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            disabled={wizardBusy}
                            onClick={() => setWizardStep(2)}>
                            {t('pages.settings.panels.bank.wizard_cancel')}
                        </Button>
                        <Button
                            type="button"
                            disabled={!live || wizardBusy}
                            onClick={() =>
                                void onAuthorise({
                                    institutionId: wizardInstitutionId,
                                    seatMode: wizardSeatMode,
                                    seatId: wizardSeatId,
                                    newLabel: wizardNewLabel,
                                    catalogBankId: wizardCatalogBankId,
                                })
                            }>
                            {wizardBusy
                                ? t('pages.settings.panels.bank.linking')
                                : t('pages.settings.panels.bank.wizard_authorise')}
                        </Button>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
