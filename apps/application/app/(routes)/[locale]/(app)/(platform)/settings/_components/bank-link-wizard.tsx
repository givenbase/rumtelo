'use client';

import { vendorMarkSrc } from '@/app/_lib/vendor-brands';
import {
    PresetNameField,
    type NamePresetOption,
} from '@/components/features/forms/preset-name-field';
import { type Account, type Bank } from '@rumtelo/contracts';
import type { BankInstitution } from '@rumtelo/contracts/money';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from '@rumtelo/i18n';
import {
    Button,
    Form,
    FormControl,
    FormField,
    FormItem,
    FormMessage,
    Field,
    Input,
    VendorMark,
} from '@rumtelo/ui';
import { cn, formatIban } from '@rumtelo/utils';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { accountBankMark } from '../_utils/resolve-account-bank';
import {
    accountNameTaken,
    isMockInstitution,
    matchCatalogToInstitution,
    sortInstitutions,
} from '../_utils/bank-settings';
import {
    createBankWizardSeatFormSchema,
    type BankWizardSeatFormValues,
} from '../_utils/settings-form-zod';
import { SettingsRowLabel } from './settings-chrome';

export type BankLinkWizardAuthoriseInput = {
    institutionId: string;
    seatMode: 'existing' | 'new';
    seatId: string;
    newLabel: string;
    catalogBankId: string;
};

export type BankLinkWizardAuthoriseResult = 'ok' | 'name_taken' | 'failed';

export type BankLinkWizardProps = {
    live: boolean;
    onClose: () => void;
    busy: boolean;
    institutions: BankInstitution[];
    bankList: Bank[];
    bankNameOptions: NamePresetOption[];
    bankById: Map<string, Bank>;
    bankByKey: Map<string, Bank>;
    /** All household seats — used to keep new labels unique. */
    accounts: Account[];
    manualAccounts: Account[];
    primaryBankId: string | null;
    formatMoney: (amount: number) => string;
    onAuthorise: (
        input: BankLinkWizardAuthoriseInput
    ) => BankLinkWizardAuthoriseResult | Promise<BankLinkWizardAuthoriseResult>;
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
    accounts,
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

    const seatForm = useForm<BankWizardSeatFormValues>({
        defaultValues: { label: '', bankId: '' },
        resolver: zodResolver(createBankWizardSeatFormSchema(t)),
        mode: 'onSubmit',
    });
    const wizardNewLabel = useWatch({ control: seatForm.control, name: 'label' }) ?? '';
    const wizardCatalogBankId = useWatch({ control: seatForm.control, name: 'bankId' }) ?? '';

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
    const wizardSeatCatalog =
        wizardSeatMode === 'existing'
            ? null
            : (bankById.get(
                  wizardCatalogBankId ||
                      wizardInstitutionCatalog?.id ||
                      primaryBankId ||
                      bankList[0]?.id ||
                      ''
              ) ?? null);
    const wizardSeatMark =
        wizardSeat != null
            ? accountBankMark(wizardSeat, bankList)
            : wizardSeatCatalog
              ? vendorMarkSrc({
                    key: wizardSeatCatalog.key,
                    name: wizardSeatCatalog.name,
                    logoDomain: wizardSeatCatalog.logoDomain,
                    website: wizardSeatCatalog.website,
                })
              : null;
    const wizardSeatTitle =
        wizardSeatMode === 'existing' && wizardSeat
            ? wizardSeat.name
            : wizardNewLabel.trim() ||
              (wizardSeatCatalog
                  ? t('pages.settings.panels.bank.wizard_authorise_seat_new', {
                        bank: wizardSeatCatalog.name,
                    })
                  : t('pages.settings.panels.bank.wizard_seat_new'));
    const wizardSeatSub =
        wizardSeatMode === 'existing' && wizardSeat
            ? `${wizardSeat.iban ? formatIban(wizardSeat.iban) : t('pages.settings.panels.bank.no_iban')} · ${formatMoney(wizardSeat.balance)}`
            : wizardSeatCatalog?.name;
    const showAspspCatalogMismatch =
        Boolean(wizardInstitution) &&
        Boolean(wizardSeatCatalog) &&
        Boolean(wizardInstitutionCatalog) &&
        wizardSeatCatalog!.id !== wizardInstitutionCatalog!.id &&
        !isMockInstitution(wizardInstitution!.name);
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

    function defaultLabelForBank(bankId: string): string {
        const catalog = bankById.get(bankId);
        return t('pages.settings.panels.bank.bank_checking', {
            bank: catalog?.name ?? t('pages.settings.panels.bank.bank_fallback'),
        });
    }

    function applyCatalogBank(bankId: string, fillEmptyLabel = true) {
        seatForm.setValue('bankId', bankId, { shouldDirty: true, shouldValidate: true });
        seatForm.clearErrors('bankId');
        if (fillEmptyLabel && !seatForm.getValues('label').trim()) {
            seatForm.setValue('label', defaultLabelForBank(bankId), { shouldDirty: true });
        }
    }

    /** Validates new-seat form + unique name; keeps the user on step 2 when invalid. */
    async function ensureNewSeatFormReady(): Promise<boolean> {
        if (wizardSeatMode !== 'new') {
            seatForm.clearErrors();
            return true;
        }
        const bankId =
            seatForm.getValues('bankId') ||
            wizardInstitutionCatalog?.id ||
            primaryBankId ||
            bankList[0]?.id ||
            '';
        if (bankId && !seatForm.getValues('bankId')) {
            applyCatalogBank(bankId, true);
        }
        const ok = await seatForm.trigger();
        if (!ok) {
            setWizardSeatMode('new');
            setWizardStep(2);
            return false;
        }
        const label =
            seatForm.getValues('label').trim() || defaultLabelForBank(seatForm.getValues('bankId'));
        if (accountNameTaken(accounts, label)) {
            seatForm.setError('label', {
                message: t('pages.settings.panels.bank.account_name_taken'),
            });
            setWizardSeatMode('new');
            setWizardStep(2);
            return false;
        }
        if (!seatForm.getValues('label').trim()) {
            seatForm.setValue('label', label, { shouldDirty: true });
        }
        return true;
    }

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
                                            if (catalog) applyCatalogBank(catalog.id, true);
                                            else seatForm.setValue('bankId', '');
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
                                    applyCatalogBank(catalog.id, true);
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
                            onClick={() => {
                                setWizardSeatMode('existing');
                                seatForm.clearErrors();
                            }}>
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
                                    applyCatalogBank(wizardInstitutionCatalog.id, true);
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
                        <Form {...seatForm}>
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
                                <FormField
                                    control={seatForm.control}
                                    name="label"
                                    render={({ field }) => (
                                        <FormItem>
                                            <Field
                                                label={t(
                                                    'pages.settings.panels.bank.wizard_new_label'
                                                )}
                                                htmlFor="wizard-new-label">
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        id="wizard-new-label"
                                                        disabled={!live || wizardBusy}
                                                    />
                                                </FormControl>
                                            </Field>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
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
                                                            wizardCatalogBankId ||
                                                                primaryBankId ||
                                                                ''
                                                        )?.name ?? ''
                                                    }
                                                    onChange={name => {
                                                        const match = bankList.find(
                                                            bank =>
                                                                bank.name.toLowerCase() ===
                                                                name.trim().toLowerCase()
                                                        );
                                                        if (match) applyCatalogBank(match.id, true);
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
                                                            wizardCatalogBankId ||
                                                                primaryBankId ||
                                                                ''
                                                        )?.key || undefined
                                                    }
                                                    disabled={!live || wizardBusy}
                                                    onClear={() => {
                                                        seatForm.setValue('bankId', '');
                                                        seatForm.clearErrors('bankId');
                                                    }}
                                                    onSelect={opt => {
                                                        const bank = bankByKey.get(opt.key);
                                                        if (!bank) return;
                                                        applyCatalogBank(bank.id, true);
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
                                                            wizardCatalogBankId ||
                                                            primaryBankId ||
                                                            '';
                                                        const selected = selectedId === bank.id;
                                                        return (
                                                            <button
                                                                key={bank.key}
                                                                type="button"
                                                                disabled={!live || wizardBusy}
                                                                onClick={() =>
                                                                    applyCatalogBank(bank.id, true)
                                                                }
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
                                                <FormField
                                                    control={seatForm.control}
                                                    name="bankId"
                                                    render={() => (
                                                        <FormItem>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </>
                                        )}
                                    </div>
                                ) : null}
                            </div>
                        </Form>
                    )}
                    <div className="flex flex-wrap justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={() => setWizardStep(1)}>
                            {t('pages.settings.panels.bank.wizard_cancel')}
                        </Button>
                        <Button
                            type="button"
                            disabled={!live || !canWizardSeatNext}
                            onClick={() => {
                                void (async () => {
                                    if (!(await ensureNewSeatFormReady())) return;
                                    setWizardStep(3);
                                })();
                            }}>
                            {t('pages.settings.panels.bank.connect')}
                        </Button>
                    </div>
                </div>
            ) : null}

            {wizardStep === 3 ? (
                <div className="grid gap-3">
                    <div className="grid gap-2">
                        <p className="text-sm text-fg-muted">
                            {t('pages.settings.panels.bank.wizard_authorise_hint')}
                        </p>
                        <ul className="grid gap-1.5 text-sm text-fg-secondary">
                            <li className="flex gap-2">
                                <span className="text-fg-faint" aria-hidden>
                                    ·
                                </span>
                                <span>{t('pages.settings.panels.bank.wizard_authorise_what_1')}</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-fg-faint" aria-hidden>
                                    ·
                                </span>
                                <span>{t('pages.settings.panels.bank.wizard_authorise_what_2')}</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-fg-faint" aria-hidden>
                                    ·
                                </span>
                                <span>{t('pages.settings.panels.bank.wizard_authorise_what_3')}</span>
                            </li>
                        </ul>
                    </div>
                    <div className="grid gap-3 rounded-xl border border-line px-3 py-3">
                        <div className="grid gap-2">
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
                                                ? t(
                                                      'pages.settings.panels.bank.wizard_sandbox_badge'
                                                  )
                                                : undefined
                                        }
                                    />
                                </div>
                            ) : (
                                <p className="text-sm text-fg-muted">
                                    {t('pages.settings.panels.bank.pick_institution')}
                                </p>
                            )}
                        </div>
                        <div className="border-t border-line" />
                        <div className="grid gap-2">
                            <p className="font-mono text-[10px] tracking-[0.14em] text-fg-faint uppercase">
                                {t('pages.settings.panels.bank.wizard_authorise_seat')}
                            </p>
                            <div className="flex items-center gap-2.5">
                                {wizardSeatMark ? (
                                    <VendorMark
                                        name={wizardSeatMark.name}
                                        src={wizardSeatMark.src}
                                        size={28}
                                    />
                                ) : null}
                                <SettingsRowLabel
                                    title={wizardSeatTitle}
                                    sub={wizardSeatSub}
                                />
                            </div>
                            {showAspspCatalogMismatch ? (
                                <p className="text-xs text-fg-muted">
                                    {t('pages.settings.panels.bank.wizard_authorise_mismatch', {
                                        aspsp: wizardInstitution!.name,
                                        catalog: wizardSeatCatalog!.name,
                                    })}
                                </p>
                            ) : null}
                        </div>
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
                            onClick={() => {
                                void (async () => {
                                    if (!(await ensureNewSeatFormReady())) return;
                                    const values = seatForm.getValues();
                                    const result = await onAuthorise({
                                        institutionId: wizardInstitutionId,
                                        seatMode: wizardSeatMode,
                                        seatId: wizardSeatId,
                                        newLabel: values.label,
                                        catalogBankId: values.bankId,
                                    });
                                    if (result === 'name_taken') {
                                        seatForm.setError('label', {
                                            message: t(
                                                'pages.settings.panels.bank.account_name_taken'
                                            ),
                                        });
                                        setWizardSeatMode('new');
                                        setWizardStep(2);
                                    }
                                })();
                            }}>
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
