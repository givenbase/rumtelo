'use client';

import { api } from '@/app/_lib/api';
import { apiQuery } from '@/app/_lib/api-hooks';
import { isIbanApiErrorMessage } from '@/app/_lib/api-user-message';
import { isLiveData } from '@/app/_lib/preview';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';
import { vendorMarkSrc } from '@/app/_lib/vendor-brands';
import { useCategoryTemplates } from '@/components/features/forms/catalog-helpers';
import { merchantsToNameOptions } from '@/components/features/forms/merchant-name-options';
import {
    PresetNameField,
    type NamePresetOption,
} from '@/components/features/forms/preset-name-field';
import { useAppShell } from '@/components/features/shell/app-shell-context';
import { useAuth } from '@/components/features/shell/auth-provider';
import { zodResolver } from '@hookform/resolvers/zod';
import { AccountKind, bankingCategoryTemplate } from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { useTranslations } from '@rumtelo/i18n';
import {
    Button,
    Field,
    Form,
    FormControl,
    FormField,
    FormItem,
    FormMessage,
    Input,
    Select,
    VendorMark,
    EmptyState,
} from '@rumtelo/ui';
import {
    cn,
    extractErrorMessage,
    formatIban,
    isValidIban,
    nlIbanBankCode,
    normalizeIban,
} from '@rumtelo/utils';
import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import {
    SettingsInkCard,
    SettingsPanel,
    SettingsPill,
    SettingsRow,
    SettingsRowLabel,
} from './settings-chrome';
import {
    createBankAccountFormSchema,
    type BankAccountFormValues,
} from '../_utils/settings-form-zod';
import {
    accountBankMark,
    bankingBanksOnly,
    resolveAccountBank,
} from '../_utils/resolve-account-bank';
import {
    accountKindLabel,
    formatNlIbanStub,
    isIbanStub,
    nlIbanPrefix,
} from '../_utils/settings-shared';
import { useSettingsMutation } from '../_utils/use-settings-mutation';
import { ConfirmActionButton } from '@/components/features/forms/confirm-action-button';
import type { Account } from '@rumtelo/contracts';

const EMPTY_BANK: BankAccountFormValues = {
    label: '',
    iban: '',
    kind: AccountKind.CHECKING,
    bankKey: '',
    customBank: false,
};

export function BankSettings() {
    const t = useTranslations();
    const { householdId } = useAuth();
    const { showToast } = useAppShell();
    const { formatMoney } = useHouseholdCurrency();
    const live = isLiveData(householdId);
    const [adding, setAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [ibanError, setIbanError] = useState<string | null>(null);

    const form = useForm<BankAccountFormValues>({
        defaultValues: EMPTY_BANK,
        resolver: zodResolver(createBankAccountFormSchema(t)),
    });
    const bankKey = useWatch({ control: form.control, name: 'bankKey' });
    const customBank = useWatch({ control: form.control, name: 'customBank' });
    const label = useWatch({ control: form.control, name: 'label' });

    const accountsQuery = useLiveQuery(
        apiQuery.money.accounts.list.queryOptions({ input: { householdId: householdId! } }),
        [],
        live
    );
    const categoriesQuery = useCategoryTemplates(live);
    const bankingCategoryKey = useMemo(
        () => bankingCategoryTemplate(categoriesQuery.data ?? [])?.key ?? null,
        [categoriesQuery.data]
    );
    const bankingMerchantsQuery = useLiveQuery(
        apiQuery.money.catalogs.merchantPresets.list.queryOptions({
            input: {
                householdId: householdId!,
                categoryTemplateKey: bankingCategoryKey,
            },
        }),
        [],
        live && Boolean(bankingCategoryKey)
    );
    const bankList = useMemo(
        () => bankingBanksOnly(bankingMerchantsQuery.data ?? []),
        [bankingMerchantsQuery.data]
    );

    const bankNameOptions = useMemo((): NamePresetOption[] => {
        return [
            ...merchantsToNameOptions(bankList, {
                categoryTemplateKey: bankingCategoryKey ?? undefined,
            }),
            {
                key: 'OTHER',
                name: t('pages.settings.panels.bank.preset_other'),
                group: t('pages.settings.panels.bank.preset_custom'),
            },
        ];
    }, [bankList, bankingCategoryKey, t]);

    const bankByKey = useMemo(() => new Map(bankList.map(bank => [bank.key, bank])), [bankList]);

    function resetForm() {
        form.reset(EMPTY_BANK);
        setIbanError(null);
        setAdding(false);
        setEditingId(null);
    }

    function startAdd() {
        form.reset(EMPTY_BANK);
        setIbanError(null);
        setEditingId(null);
        setAdding(true);
    }

    function openEdit(account: Account) {
        const bank = resolveAccountBank(account, bankList);
        form.reset({
            label: account.name,
            iban: account.iban ? formatIban(account.iban) : '',
            kind: account.kind,
            bankKey: bank?.key ?? '',
            customBank: !bank,
        });
        setIbanError(null);
        setAdding(false);
        setEditingId(account.id);
    }

    function pickBank(key: string) {
        const bank = bankByKey.get(key);
        if (!bank) return;
        const currentLabel = form.getValues('label');
        const previousBankName = bankByKey.get(form.getValues('bankKey'))?.name;
        form.setValue('customBank', false);
        form.setValue('bankKey', key);
        form.setValue(
            'label',
            currentLabel.trim() && currentLabel.trim() !== previousBankName
                ? currentLabel
                : bank.name
        );
        const code = bank.ibanBankCode?.toUpperCase() ?? null;
        if (code) {
            const prevIban = form.getValues('iban');
            if (isIbanStub(prevIban)) form.setValue('iban', nlIbanPrefix(code));
            setIbanError(null);
        }
    }

    function resolveIbanForSubmit(value: string): string | null {
        const trimmed = value.trim();
        if (!trimmed || isIbanStub(trimmed)) return null;
        if (!isValidIban(trimmed)) {
            throw new Error('invalid_iban');
        }
        const selected = bankKey ? bankByKey.get(bankKey) : null;
        const expected = selected?.ibanBankCode?.toUpperCase() ?? null;
        if (expected) {
            const actual = nlIbanBankCode(trimmed);
            if (actual && actual !== expected) {
                throw new Error(
                    t('pages.settings.panels.bank.iban_bank_mismatch', {
                        actual,
                        expected,
                        bank: selected?.name ?? '',
                    })
                );
            }
        }
        return normalizeIban(trimmed);
    }

    const selectedBank = bankKey ? bankByKey.get(bankKey) : null;
    const selectedIbanCode = selectedBank?.ibanBankCode?.toUpperCase() ?? undefined;
    const ibanPlaceholder = selectedIbanCode
        ? formatNlIbanStub(selectedIbanCode)
        : t('pages.settings.panels.bank.iban_placeholder');
    const ibanHint = selectedIbanCode
        ? t('pages.settings.panels.bank.iban_hint_prefix', { code: selectedIbanCode })
        : t('pages.settings.panels.bank.iban_hint_optional');

    function buildAccountName(values: BankAccountFormValues): string {
        const bank = values.bankKey ? bankByKey.get(values.bankKey) : null;
        let accountName = values.label.trim();
        if (!accountName && bank) accountName = bank.name;
        if (bank && accountName && !accountName.toLowerCase().includes(bank.name.toLowerCase())) {
            accountName = `${bank.name} · ${accountName}`;
        }
        if (!accountName) throw new Error(t('pages.settings.panels.bank.name_required'));
        return accountName;
    }

    const createAccount = useSettingsMutation({
        mutationFn: async (values: BankAccountFormValues) => {
            if (!householdId) throw new Error('No household');
            return api.money.accounts.create({
                householdId,
                name: buildAccountName(values),
                iban: resolveIbanForSubmit(values.iban),
                kind: values.kind,
                balance: 0,
            });
        },
        invalidateKeys: [apiQuery.money.accounts.list.key()],
        successMessage: t('pages.settings.toasts.account_added'),
        onSuccess: () => resetForm(),
        onError: error => {
            const raw = extractErrorMessage(error);
            if (isIbanApiErrorMessage(raw) || /iban/i.test(raw)) {
                setIbanError(raw);
            }
        },
    });

    const updateAccount = useSettingsMutation({
        mutationFn: async (values: BankAccountFormValues) => {
            if (!householdId || !editingId) throw new Error('No household');
            return api.money.accounts.update({
                householdId,
                id: editingId,
                name: buildAccountName(values),
                iban: resolveIbanForSubmit(values.iban),
                kind: values.kind,
            });
        },
        invalidateKeys: [apiQuery.money.accounts.list.key()],
        successMessage: t('pages.settings.toasts.account_updated'),
        onSuccess: () => resetForm(),
        onError: error => {
            const raw = extractErrorMessage(error);
            if (isIbanApiErrorMessage(raw) || /iban/i.test(raw)) {
                setIbanError(raw);
            }
        },
    });

    const removeAccount = useSettingsMutation({
        mutationFn: async () => {
            if (!householdId || !editingId) throw new Error('No household');
            return api.money.accounts.remove({ householdId, id: editingId });
        },
        invalidateKeys: [apiQuery.money.accounts.list.key()],
        successMessage: t('pages.settings.toasts.account_deleted'),
        onSuccess: () => resetForm(),
    });

    const accounts = accountsQuery.data ?? [];
    const kindLabel = (kind: string) => accountKindLabel(kind, t);
    const formOpen = adding || Boolean(editingId);
    const saving = createAccount.isPending || updateAccount.isPending;

    const canSubmit =
        live &&
        !saving &&
        !ibanError &&
        Boolean(label.trim() || (bankKey && bankByKey.get(bankKey)?.name)) &&
        (customBank || Boolean(bankKey));

    function onSubmit(values: BankAccountFormValues) {
        if (editingId) updateAccount.mutate(values);
        else createAccount.mutate(values);
    }

    return (
        <SettingsPanel>
            <SettingsInkCard
                eyebrow={t('pages.settings.panels.bank.eyebrow')}
                blurb={t('pages.settings.panels.bank.blurb')}
                badge={
                    <SettingsPill>{t('pages.settings.panels.bank.not_connected')}</SettingsPill>
                }>
                {bankList.length === 0 ? (
                    <p className="py-2.5 text-sm text-fg-muted">
                        {t('pages.settings.panels.bank.loading_banks')}
                    </p>
                ) : (
                    bankList.map((bank, i) => {
                        const mark = vendorMarkSrc({
                            key: bank.key,
                            name: bank.name,
                            logoDomain: bank.logoDomain,
                            website: bank.website,
                        });
                        return (
                            <SettingsRow key={bank.key} last={i === bankList.length - 1}>
                                <div className="flex min-w-0 items-center gap-2.5">
                                    <VendorMark name={mark.name} src={mark.src} size={22} />
                                    <SettingsRowLabel title={bank.name} />
                                </div>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    className="rounded-full font-mono text-[10px] tracking-[0.12em] uppercase"
                                    disabled
                                    onClick={() =>
                                        showToast(t('pages.settings.toasts.bank_coming'), 'info')
                                    }>
                                    {t('pages.settings.panels.bank.connect')}
                                </Button>
                            </SettingsRow>
                        );
                    })
                )}
            </SettingsInkCard>

            <SettingsInkCard
                eyebrow={t('pages.settings.panels.bank.manual_eyebrow')}
                blurb={t('pages.settings.panels.bank.manual_blurb')}
                badge={
                    <Button
                        size="sm"
                        variant="secondary"
                        className="rounded-full font-mono text-[10px] tracking-[0.12em] uppercase"
                        onClick={startAdd}
                        disabled={formOpen && adding}>
                        {t('pages.settings.panels.bank.add_account')}
                    </Button>
                }>
                {accounts.length === 0 ? (
                    <EmptyState
                        variant="compact"
                        className="border-0 bg-transparent"
                        title={t('pages.settings.panels.bank.no_accounts_yet_title')}
                        body={t('pages.settings.panels.bank.no_accounts_yet_body')}
                    />
                ) : (
                    accounts.map((account, i) => {
                        const mark = accountBankMark(account, bankList);
                        const isEditing = editingId === account.id;
                        if (editingId && !isEditing) return null;
                        const isLastVisible =
                            isEditing || (!editingId && i === accounts.length - 1 && !adding);
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
                                        onClick={() => openEdit(account)}>
                                        {mark ? (
                                            <VendorMark name={mark.name} src={mark.src} size={22} />
                                        ) : null}
                                        <SettingsRowLabel
                                            title={account.name}
                                            sub={`${account.iban ? formatIban(account.iban) : t('pages.settings.panels.bank.no_iban')} · ${formatMoney(account.balance)}`}
                                        />
                                    </button>
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        className="rounded-full font-mono text-[10px] tracking-[0.12em] uppercase"
                                        onClick={() =>
                                            isEditing ? resetForm() : openEdit(account)
                                        }>
                                        {isEditing
                                            ? t('pages.settings.panels.jars_placement.close')
                                            : t('pages.settings.panels.bank.edit')}
                                    </Button>
                                </SettingsRow>
                                {isEditing ? (
                                    <AccountBankForm
                                        form={form}
                                        formKey={editingId}
                                        editing
                                        live={live}
                                        canSubmit={canSubmit}
                                        saving={saving}
                                        bankList={bankList}
                                        bankNameOptions={bankNameOptions}
                                        bankByKey={bankByKey}
                                        bankKey={bankKey}
                                        customBank={customBank}
                                        label={label}
                                        selectedBank={selectedBank}
                                        selectedIbanCode={selectedIbanCode}
                                        ibanPlaceholder={ibanPlaceholder}
                                        ibanHint={ibanHint}
                                        ibanError={ibanError}
                                        setIbanError={setIbanError}
                                        kindLabel={kindLabel}
                                        pickBank={pickBank}
                                        onSubmit={onSubmit}
                                        onCancel={resetForm}
                                        onDelete={() => removeAccount.mutate()}
                                        deletePending={removeAccount.isPending}
                                        t={t}
                                    />
                                ) : null}
                            </div>
                        );
                    })
                )}

                {adding ? (
                    <AccountBankForm
                        form={form}
                        formKey="add"
                        editing={false}
                        live={live}
                        canSubmit={canSubmit}
                        saving={saving}
                        bankList={bankList}
                        bankNameOptions={bankNameOptions}
                        bankByKey={bankByKey}
                        bankKey={bankKey}
                        customBank={customBank}
                        label={label}
                        selectedBank={selectedBank}
                        selectedIbanCode={selectedIbanCode}
                        ibanPlaceholder={ibanPlaceholder}
                        ibanHint={ibanHint}
                        ibanError={ibanError}
                        setIbanError={setIbanError}
                        kindLabel={kindLabel}
                        pickBank={pickBank}
                        onSubmit={onSubmit}
                        onCancel={resetForm}
                        t={t}
                    />
                ) : null}
            </SettingsInkCard>
        </SettingsPanel>
    );
}

type BankPreset = ReturnType<typeof bankingBanksOnly>[number];

type AccountBankFormProps = {
    form: ReturnType<typeof useForm<BankAccountFormValues>>;
    formKey: string;
    editing: boolean;
    live: boolean;
    canSubmit: boolean;
    saving: boolean;
    bankList: BankPreset[];
    bankNameOptions: NamePresetOption[];
    bankByKey: Map<string, BankPreset>;
    bankKey: string;
    customBank: boolean;
    label: string;
    selectedBank: BankPreset | null | undefined;
    selectedIbanCode: string | undefined;
    ibanPlaceholder: string;
    ibanHint: string;
    ibanError: string | null;
    setIbanError: (value: string | null) => void;
    kindLabel: (kind: string) => string;
    pickBank: (key: string) => void;
    onSubmit: (values: BankAccountFormValues) => void;
    onCancel: () => void;
    onDelete?: () => void;
    deletePending?: boolean;
    t: ReturnType<typeof useTranslations>;
};

function AccountBankForm({
    form,
    formKey,
    editing,
    live,
    canSubmit,
    saving,
    bankList,
    bankNameOptions,
    bankByKey,
    bankKey,
    customBank,
    label,
    selectedBank,
    selectedIbanCode,
    ibanPlaceholder,
    ibanHint,
    ibanError,
    setIbanError,
    kindLabel,
    pickBank,
    onSubmit,
    onCancel,
    onDelete,
    deletePending,
    t,
}: AccountBankFormProps) {
    return (
        <Form {...form} key={formKey}>
            <form
                className={cn(
                    'grid gap-3 py-2.5',
                    editing ? 'border-t border-accent/20' : 'border-t border-line'
                )}
                onSubmit={form.handleSubmit(onSubmit)}>
                <div className="grid gap-2">
                    <span className="font-mono text-[10px] tracking-[0.14em] text-fg-faint uppercase">
                        {editing
                            ? t('pages.settings.panels.bank.edit_account')
                            : t('pages.settings.panels.bank.which_bank')}
                    </span>
                    {bankList.length === 0 ? (
                        <p className="text-sm text-fg-muted">
                            {t('pages.settings.panels.bank.loading_banks')}
                        </p>
                    ) : (
                        <div className="grid gap-2">
                            <PresetNameField
                                value={customBank ? label : (bankByKey.get(bankKey)?.name ?? '')}
                                onChange={value => {
                                    if (!customBank) {
                                        form.setValue('customBank', true);
                                        form.setValue('bankKey', '');
                                    }
                                    form.setValue('label', value);
                                }}
                                options={bankNameOptions}
                                placeholder={t('pages.settings.panels.bank.search_bank')}
                                freeTextPlaceholder={t('pages.settings.panels.bank.type_bank_name')}
                                lockPresets
                                freeTextKeys={['OTHER']}
                                initialLockedKey={customBank ? null : bankKey || undefined}
                                disabled={!live}
                                onClear={() => {
                                    form.setValue('bankKey', '');
                                    form.setValue('customBank', false);
                                    form.setValue('label', '');
                                }}
                                onSelect={opt => {
                                    if (opt.key === 'OTHER') {
                                        form.setValue('customBank', true);
                                        form.setValue('bankKey', '');
                                        form.setValue('label', '');
                                        return;
                                    }
                                    pickBank(opt.key);
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
                                    const selected = !customBank && bankKey === bank.key;
                                    return (
                                        <button
                                            key={bank.key}
                                            type="button"
                                            disabled={!live}
                                            onClick={() => pickBank(bank.key)}
                                            className={cn(
                                                'inline-flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-xs transition-colors',
                                                selected
                                                    ? 'border-accent bg-accent/10 text-fg'
                                                    : 'border-line text-fg-secondary hover:border-fg-faint hover:text-fg'
                                            )}>
                                            <VendorMark name={mark.name} src={mark.src} size={18} />
                                            {bank.name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
                <FormField
                    control={form.control}
                    name="label"
                    render={({ field }) => (
                        <FormItem>
                            <Field
                                label={t('pages.settings.panels.bank.account_label')}
                                htmlFor={`acc-name-${formKey}`}
                                hint={t('pages.settings.panels.bank.account_label_hint')}>
                                <FormControl>
                                    <Input
                                        id={`acc-name-${formKey}`}
                                        placeholder={
                                            bankKey
                                                ? t('pages.settings.panels.bank.bank_checking', {
                                                      bank:
                                                          bankByKey.get(bankKey)?.name ??
                                                          t(
                                                              'pages.settings.panels.bank.bank_fallback'
                                                          ),
                                                  })
                                                : t('pages.settings.panels.bank.operating_checking')
                                        }
                                        disabled={!live}
                                        {...field}
                                    />
                                </FormControl>
                            </Field>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="iban"
                    render={({ field }) => (
                        <FormItem>
                            <Field
                                label={t('pages.settings.panels.bank.iban')}
                                htmlFor={`acc-iban-${formKey}`}
                                hint={ibanError ?? ibanHint}>
                                <FormControl>
                                    <Input
                                        id={`acc-iban-${formKey}`}
                                        placeholder={ibanPlaceholder}
                                        aria-invalid={Boolean(ibanError)}
                                        disabled={!live}
                                        {...field}
                                        onChange={event => {
                                            field.onChange(event);
                                            if (ibanError) setIbanError(null);
                                        }}
                                        onBlur={() => {
                                            field.onBlur();
                                            const trimmed = field.value.trim();
                                            if (!trimmed || isIbanStub(trimmed)) return;
                                            if (!isValidIban(trimmed)) {
                                                setIbanError(
                                                    t('pages.settings.panels.bank.invalid_iban')
                                                );
                                                return;
                                            }
                                            const expected = selectedIbanCode ?? null;
                                            if (expected) {
                                                const actual = nlIbanBankCode(trimmed);
                                                if (actual && actual !== expected) {
                                                    setIbanError(
                                                        t(
                                                            'pages.settings.panels.bank.iban_bank_mismatch_short',
                                                            {
                                                                actual,
                                                                expected,
                                                                bank: selectedBank?.name ?? '',
                                                            }
                                                        )
                                                    );
                                                    return;
                                                }
                                            }
                                            setIbanError(null);
                                            field.onChange(formatIban(trimmed));
                                        }}
                                    />
                                </FormControl>
                            </Field>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="kind"
                    render={({ field }) => (
                        <FormItem>
                            <Field
                                label={t('pages.settings.panels.bank.type')}
                                htmlFor={`acc-kind-${formKey}`}>
                                <FormControl>
                                    <Select
                                        id={`acc-kind-${formKey}`}
                                        value={field.value}
                                        onChange={event => field.onChange(event.target.value)}
                                        disabled={!live}>
                                        <option value={AccountKind.CHECKING}>
                                            {kindLabel(AccountKind.CHECKING)}
                                        </option>
                                        <option value={AccountKind.SAVINGS}>
                                            {kindLabel(AccountKind.SAVINGS)}
                                        </option>
                                        <option value={AccountKind.CREDIT}>
                                            {kindLabel(AccountKind.CREDIT)}
                                        </option>
                                        <option value={AccountKind.CASH}>
                                            {kindLabel(AccountKind.CASH)}
                                        </option>
                                        <option value={AccountKind.INVESTMENT}>
                                            {kindLabel(AccountKind.INVESTMENT)}
                                        </option>
                                    </Select>
                                </FormControl>
                            </Field>
                        </FormItem>
                    )}
                />
                <div className="flex flex-wrap items-center justify-end gap-2">
                    {editing && onDelete ? (
                        <ConfirmActionButton
                            variant="ghost"
                            className="mr-auto text-danger hover:bg-danger/10 hover:text-danger"
                            disabled={!live || deletePending}
                            pending={deletePending}
                            label={t('ui.button.actions.delete')}
                            confirmLabel={t('ui.form.confirm_delete')}
                            onConfirm={onDelete}
                        />
                    ) : null}
                    <Button type="button" variant="ghost" onClick={onCancel}>
                        {t('pages.settings.cancel')}
                    </Button>
                    <Button type="submit" disabled={!canSubmit}>
                        {saving
                            ? t('pages.settings.working')
                            : editing
                              ? t('ui.form.save_changes')
                              : t('pages.settings.panels.bank.add')}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
