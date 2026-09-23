'use client';

import { api } from '@/app/_lib/api';
import { apiQuery } from '@/app/_lib/api-hooks';
import { isIbanApiErrorMessage } from '@/app/_lib/api-user-message';
import { isLiveData } from '@/app/_lib/preview';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';
import { vendorMarkSrc } from '@/app/_lib/vendor-brands';
import {
    PresetNameField,
    type NamePresetOption,
} from '@/components/features/forms/preset-name-field';
import { useAppShell } from '@/components/features/shell/app-shell-context';
import { useAuth } from '@/components/features/shell/auth-provider';
import { zodResolver } from '@hookform/resolvers/zod';
import { AccountKind, type Bank, type Account } from '@rumtelo/contracts';
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
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useRouter, useSearchParams } from 'next/navigation';

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
    composeAccountBankName,
    countryFromCurrency,
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
import { useBankSyncOnVisit } from '@/app/_lib/use-bank-sync-on-visit';

const EMPTY_BANK: BankAccountFormValues = {
    label: '',
    iban: '',
    kind: AccountKind.CHECKING,
    bankId: '',
    settlementAccountId: null,
};

export function BankSettings() {
    const t = useTranslations();
    const { householdId } = useAuth();
    const { showToast } = useAppShell();
    const { formatMoney } = useHouseholdCurrency();
    const live = isLiveData(householdId);
    const router = useRouter();
    const searchParams = useSearchParams();
    const oauthHandled = useRef(false);
    const [adding, setAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [ibanError, setIbanError] = useState<string | null>(null);
    const [connectingAccountId, setConnectingAccountId] = useState<string | null>(null);
    const [institutionId, setInstitutionId] = useState('');

    const form = useForm<BankAccountFormValues>({
        defaultValues: EMPTY_BANK,
        resolver: zodResolver(createBankAccountFormSchema(t)),
    });
    useBankSyncOnVisit();
    const bankId = useWatch({ control: form.control, name: 'bankId' });
    const kind = useWatch({ control: form.control, name: 'kind' });
    const label = useWatch({ control: form.control, name: 'label' });

    const accountsQuery = useLiveQuery(
        apiQuery.money.accounts.list.queryOptions({ input: { householdId: householdId! } }),
        [],
        live
    );
    const settingsQuery = useLiveQuery(
        apiQuery.household.settings.queryOptions({ input: { householdId: householdId! } }),
        null,
        live
    );
    const bankCountry = countryFromCurrency(settingsQuery.data?.currency);
    const banksQuery = useLiveQuery(
        apiQuery.money.catalogs.banks.list.queryOptions({
            input: { householdId: householdId!, country: bankCountry },
        }),
        [],
        live
    );
    const bankSyncStatus = useLiveQuery(
        apiQuery.money.bankSync.status.queryOptions({
            input: { householdId: householdId! },
        }),
        { enabled: false, connectedAccountIds: [] },
        live
    );
    const syncEnabled = bankSyncStatus.data?.enabled;
    const institutionsQuery = useLiveQuery(
        apiQuery.money.bankSync.listInstitutions.queryOptions({
            input: { householdId: householdId!, country: bankCountry },
        }),
        [],
        live && syncEnabled
    );
    const bankList = useMemo(() => {
        const rows = banksQuery.data ?? [];
        const mainId = settingsQuery.data?.mainBankId ?? null;
        if (!mainId) return rows;
        const main = rows.find(bank => bank.id === mainId);
        if (!main) return rows;
        return [main, ...rows.filter(bank => bank.id !== mainId)];
    }, [banksQuery.data, settingsQuery.data?.mainBankId]);

    const bankNameOptions = useMemo((): NamePresetOption[] => {
        return bankList.map(bank => ({
            key: bank.key,
            name: bank.name,
            group: t('pages.settings.panels.bank.eyebrow'),
            logoDomain: bank.logoDomain,
            website: bank.website,
        }));
    }, [bankList, t]);

    const bankById = useMemo(() => new Map(bankList.map(bank => [bank.id, bank])), [bankList]);
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
            bankId: bank?.id ?? account.bankId,
            settlementAccountId: account.settlementAccountId,
        });
        setIbanError(null);
        setAdding(false);
        setEditingId(account.id);
    }

    function pickBank(key: string) {
        const bank = bankByKey.get(key);
        if (!bank) return;
        const currentLabel = form.getValues('label');
        // Always rewrite the stored name for the new bank (drop old "ING · …" prefix).
        const nextName = composeAccountBankName(bank.name, currentLabel, bankList);
        if (accountNameTaken(nextName, editingId)) {
            showToast(t('common.message.error.api.account_name_taken'), 'error');
            return;
        }
        form.setValue('bankId', bank.id, { shouldDirty: true });
        form.setValue('label', nextName, {
            shouldDirty: true,
        });
        const code = bank.ibanBankCode?.toUpperCase() ?? null;
        if (code) {
            const prevIban = form.getValues('iban');
            if (isIbanStub(prevIban)) {
                form.setValue('iban', nlIbanPrefix(code), { shouldDirty: true });
            }
            setIbanError(null);
        }
    }

    /** Typing an exact catalog name selects that bank. */
    function onBankNameChange(value: string) {
        const needle = value.trim().toLowerCase();
        const match = needle ? bankList.find(bank => bank.name.toLowerCase() === needle) : null;
        if (match) {
            form.setValue('bankId', match.id, { shouldDirty: true });
            form.setValue('label', composeAccountBankName(match.name, value, bankList), {
                shouldDirty: true,
            });
            const code = match.ibanBankCode?.toUpperCase() ?? null;
            if (code) {
                const prevIban = form.getValues('iban');
                if (isIbanStub(prevIban)) {
                    form.setValue('iban', nlIbanPrefix(code), { shouldDirty: true });
                }
                setIbanError(null);
            }
            return;
        }
        form.setValue('label', value, { shouldDirty: true });
    }

    function resolveIbanForSubmit(value: string): string | null {
        const trimmed = value.trim();
        if (!trimmed || isIbanStub(trimmed)) return null;
        if (!isValidIban(trimmed)) {
            throw new Error('invalid_iban');
        }
        const selected = bankId ? bankById.get(bankId) : null;
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

    const selectedBank = bankId ? (bankById.get(bankId) ?? null) : null;
    const selectedIbanCode = selectedBank?.ibanBankCode?.toUpperCase() ?? undefined;
    const ibanPlaceholder = selectedIbanCode
        ? formatNlIbanStub(selectedIbanCode)
        : t('pages.settings.panels.bank.iban_placeholder');
    const ibanHint = selectedIbanCode
        ? t('pages.settings.panels.bank.iban_hint_prefix', { code: selectedIbanCode })
        : t('pages.settings.panels.bank.iban_hint_optional');

    function buildAccountName(values: BankAccountFormValues): string {
        const bank = values.bankId ? (bankById.get(values.bankId) ?? null) : null;
        if (!bank) throw new Error(t('common.message.error.api.bank_required'));
        return composeAccountBankName(bank.name, values.label, bankList);
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
                bankId: values.bankId,
                settlementAccountId: values.settlementAccountId ?? null,
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
                bankId: values.bankId,
                settlementAccountId: values.settlementAccountId ?? null,
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

    const setMainBank = useSettingsMutation({
        mutationFn: async (nextBankId: string | null) => {
            if (!householdId) throw new Error('No household');
            return api.household.updateSettings({ householdId, mainBankId: nextBankId });
        },
        invalidateKeys: [apiQuery.household.settings.key()],
        successMessage: t('pages.settings.toasts.main_bank_updated'),
    });

    const startLink = useSettingsMutation({
        mutationFn: async (input: { bankAccountId: string; institutionId: string }) => {
            if (!householdId) throw new Error('No household');
            return api.money.bankSync.startLink({
                householdId,
                bankAccountId: input.bankAccountId,
                institutionId: input.institutionId,
            });
        },
        invalidateKeys: [],
        onSuccess: result => {
            window.location.assign(result.authUrl);
        },
    });

    const completeLink = useSettingsMutation({
        mutationFn: async (input: { code: string; state: string }) => {
            if (!householdId) throw new Error('No household');
            return api.money.bankSync.completeLink({
                householdId,
                code: input.code,
                state: input.state,
            });
        },
        invalidateKeys: [apiQuery.money.accounts.list.key(), apiQuery.money.bankSync.status.key()],
    });

    const syncNow = useSettingsMutation({
        mutationFn: async (bankAccountId: string) => {
            if (!householdId) throw new Error('No household');
            return api.money.bankSync.syncNow({ householdId, bankAccountId });
        },
        invalidateKeys: [
            apiQuery.money.accounts.list.key(),
            apiQuery.money.transactions.inbox.key(),
        ],
    });

    const disconnectBank = useSettingsMutation({
        mutationFn: async (bankAccountId: string) => {
            if (!householdId) throw new Error('No household');
            return api.money.bankSync.disconnect({ householdId, bankAccountId });
        },
        invalidateKeys: [apiQuery.money.accounts.list.key(), apiQuery.money.bankSync.status.key()],
        successMessage: t('pages.settings.toasts.bank_disconnected'),
    });

    const completeLinkAsync = completeLink.mutateAsync;
    const syncNowAsync = syncNow.mutateAsync;

    // Return from Enable Banking OAuth — exchange code, then first sync.
    useEffect(() => {
        if (!live || !householdId || oauthHandled.current) return;
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        if (!code || !state) return;
        oauthHandled.current = true;

        void (async () => {
            try {
                showToast(t('pages.settings.panels.bank.linked_toast'), 'info');
                const linked = await completeLinkAsync({ code, state });
                try {
                    const synced = await syncNowAsync(linked.bankAccountId);
                    showToast(
                        t('pages.settings.panels.bank.synced_toast', {
                            count: synced.imported,
                        }),
                        'success'
                    );
                } catch {
                    showToast(t('pages.settings.panels.bank.sync_failed_toast'), 'error');
                }
            } catch {
                showToast(t('common.message.error.api.bank_sync_failed'), 'error');
            } finally {
                router.replace('/settings/product/money/bank');
            }
        })();
    }, [live, householdId, searchParams, completeLinkAsync, syncNowAsync, router, showToast, t]);

    const mainBankId = settingsQuery.data?.mainBankId ?? null;
    const accounts = accountsQuery.data ?? [];
    const kindLabel = (accountKind: string) => accountKindLabel(accountKind, t);
    const saving = createAccount.isPending || updateAccount.isPending;

    const partnerHint =
        selectedBank && selectedBank.partnerBankKeys.length > 0
            ? t('pages.settings.panels.bank.partners_hint', {
                  banks: selectedBank.partnerBankKeys
                      .map(key => bankByKey.get(key)?.name ?? key)
                      .join(', '),
              })
            : null;

    const settlementOptions = accounts.filter(
        row =>
            row.id !== editingId &&
            (row.kind === AccountKind.CHECKING || row.kind === AccountKind.SAVINGS)
    );

    const canSubmit = live && !saving && !ibanError && Boolean(bankId && bankById.get(bankId));

    function accountNameTaken(name: string, exceptId?: string | null): boolean {
        const needle = name.trim().toLowerCase();
        if (!needle) return false;
        return accounts.some(
            row => row.name.trim().toLowerCase() === needle && row.id !== exceptId
        );
    }

    function onSubmit(values: BankAccountFormValues) {
        let name: string;
        try {
            name = buildAccountName(values);
        } catch (error) {
            showToast(
                error instanceof Error
                    ? error.message
                    : t('pages.settings.panels.bank.name_required'),
                'error'
            );
            return;
        }
        if (accountNameTaken(name, editingId)) {
            showToast(t('common.message.error.api.account_name_taken'), 'error');
            return;
        }
        if (editingId) updateAccount.mutate(values);
        else createAccount.mutate(values);
    }

    return (
        <SettingsPanel>
            <SettingsInkCard
                eyebrow={t('pages.settings.panels.bank.eyebrow')}
                blurb={t('pages.settings.panels.bank.blurb')}
                badge={
                    <SettingsPill>
                        {syncEnabled
                            ? t('pages.settings.panels.bank.connected')
                            : t('pages.settings.panels.bank.not_connected')}
                    </SettingsPill>
                }>
                {!syncEnabled ? (
                    <p className="py-2.5 text-sm text-fg-muted">
                        {t('pages.settings.panels.bank.connect_disabled_hint')}
                    </p>
                ) : null}
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
                        const isMain = mainBankId === bank.id;
                        return (
                            <SettingsRow key={bank.id} last={i === bankList.length - 1}>
                                <div className="flex min-w-0 items-center gap-2.5">
                                    <VendorMark name={mark.name} src={mark.src} size={22} />
                                    <SettingsRowLabel
                                        title={bank.name}
                                        sub={
                                            isMain
                                                ? t('pages.settings.panels.bank.main_bank')
                                                : undefined
                                        }
                                    />
                                </div>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    className="rounded-full font-mono text-[10px] tracking-[0.12em] uppercase"
                                    disabled={!live || setMainBank.isPending}
                                    onClick={() => setMainBank.mutate(isMain ? null : bank.id)}>
                                    {isMain
                                        ? t('pages.settings.panels.bank.clear_main')
                                        : t('pages.settings.panels.bank.set_main')}
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
                        onClick={adding ? resetForm : startAdd}
                        disabled={Boolean(editingId)}>
                        {adding
                            ? t('pages.settings.panels.jars_placement.close')
                            : t('pages.settings.panels.bank.add_account')}
                    </Button>
                }>
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
                        onCancel={resetForm}
                        t={t}
                    />
                ) : accounts.length === 0 ? (
                    <EmptyState
                        variant="compact"
                        className="border-0 bg-transparent"
                        title={t('pages.settings.panels.bank.no_accounts_yet_title')}
                        body={t('pages.settings.panels.bank.no_accounts_yet_body')}
                    />
                ) : (
                    accounts.map((account, i) => {
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
                            isEditing || (!editingId && i === accounts.length - 1);
                        const isLinked = Boolean(account.connectionId);
                        const isConnecting = connectingAccountId === account.id;
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
                                            title={rowTitle}
                                            sub={`${account.iban ? formatIban(account.iban) : t('pages.settings.panels.bank.no_iban')} · ${formatMoney(account.balance)}${
                                                isLinked
                                                    ? ` · ${t('pages.settings.panels.bank.connected')}`
                                                    : ''
                                            }`}
                                        />
                                    </button>
                                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                                        {syncEnabled && !isEditing && isLinked ? (
                                            <>
                                                <Button
                                                    type="button"
                                                    variant="secondary"
                                                    size="sm"
                                                    className="rounded-full font-mono text-[10px] tracking-[0.12em] uppercase"
                                                    disabled={!live || syncNow.isPending}
                                                    onClick={() =>
                                                        syncNow.mutate(account.id, {
                                                            onSuccess: result => {
                                                                showToast(
                                                                    t(
                                                                        'pages.settings.panels.bank.synced_toast',
                                                                        { count: result.imported }
                                                                    ),
                                                                    'success'
                                                                );
                                                            },
                                                        })
                                                    }>
                                                    {t('pages.settings.panels.bank.sync_now')}
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="rounded-full font-mono text-[10px] tracking-[0.12em] uppercase"
                                                    disabled={!live || disconnectBank.isPending}
                                                    onClick={() =>
                                                        disconnectBank.mutate(account.id)
                                                    }>
                                                    {t(
                                                        'pages.settings.panels.bank.disconnect_bank'
                                                    )}
                                                </Button>
                                            </>
                                        ) : null}
                                        {syncEnabled && !isEditing && !isLinked ? (
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                size="sm"
                                                className="rounded-full font-mono text-[10px] tracking-[0.12em] uppercase"
                                                disabled={!live}
                                                onClick={() => {
                                                    setConnectingAccountId(account.id);
                                                    setInstitutionId(
                                                        institutionsQuery.data?.[0]?.id ?? ''
                                                    );
                                                }}>
                                                {t('pages.settings.panels.bank.connect')}
                                            </Button>
                                        ) : null}
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
                                    </div>
                                </SettingsRow>
                                {isConnecting && !isEditing ? (
                                    <div className="grid gap-2 border-t border-line py-2.5">
                                        <label
                                            className="font-mono text-[10px] tracking-[0.14em] text-fg-faint uppercase"
                                            htmlFor={`acc-aspsp-${account.id}`}>
                                            {t('pages.settings.panels.bank.pick_institution')}
                                        </label>
                                        <Select
                                            id={`acc-aspsp-${account.id}`}
                                            value={institutionId}
                                            onChange={event => setInstitutionId(event.target.value)}
                                            disabled={!live || startLink.isPending}>
                                            <option value="">
                                                {t('pages.settings.panels.bank.pick_institution')}
                                            </option>
                                            {(institutionsQuery.data ?? []).map(row => (
                                                <option key={row.id} value={row.id}>
                                                    {row.name}
                                                </option>
                                            ))}
                                        </Select>
                                        <div className="flex flex-wrap justify-end gap-2">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                onClick={() => {
                                                    setConnectingAccountId(null);
                                                    setInstitutionId('');
                                                }}>
                                                {t('pages.settings.cancel')}
                                            </Button>
                                            <Button
                                                type="button"
                                                disabled={
                                                    !live || !institutionId || startLink.isPending
                                                }
                                                onClick={() =>
                                                    startLink.mutate({
                                                        bankAccountId: account.id,
                                                        institutionId,
                                                    })
                                                }>
                                                {startLink.isPending
                                                    ? t('pages.settings.panels.bank.linking')
                                                    : t('pages.settings.panels.bank.connect')}
                                            </Button>
                                        </div>
                                    </div>
                                ) : null}
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
            </SettingsInkCard>
        </SettingsPanel>
    );
}

type BankPreset = Bank;

type AccountBankFormProps = {
    form: ReturnType<typeof useForm<BankAccountFormValues>>;
    formKey: string;
    editing: boolean;
    live: boolean;
    canSubmit: boolean;
    saving: boolean;
    bankList: BankPreset[];
    bankNameOptions: NamePresetOption[];
    bankById: Map<string, BankPreset>;
    bankId: string;
    selectedBank: BankPreset | null | undefined;
    selectedIbanCode: string | undefined;
    ibanPlaceholder: string;
    ibanHint: string;
    partnerHint: string | null;
    kind: AccountKind;
    settlementOptions: Account[];
    ibanError: string | null;
    setIbanError: (value: string | null) => void;
    kindLabel: (accountKind: string) => string;
    pickBank: (key: string) => void;
    onBankNameChange: (value: string) => void;
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
    bankById,
    bankId,
    selectedBank,
    selectedIbanCode,
    ibanPlaceholder,
    ibanHint,
    partnerHint,
    kind,
    settlementOptions,
    ibanError,
    setIbanError,
    kindLabel,
    pickBank,
    onBankNameChange,
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
                                value={bankById.get(bankId)?.name ?? ''}
                                onChange={onBankNameChange}
                                options={bankNameOptions}
                                placeholder={t('pages.settings.panels.bank.search_bank')}
                                freeTextPlaceholder={t('pages.settings.panels.bank.type_bank_name')}
                                lockPresets
                                initialLockedKey={bankById.get(bankId)?.key || undefined}
                                disabled={!live}
                                onClear={() => {
                                    form.setValue('bankId', '');
                                    form.setValue('label', '');
                                }}
                                onSelect={opt => {
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
                                    const selected = bankId === bank.id;
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
                            {partnerHint ? (
                                <p className="text-xs text-fg-muted">{partnerHint}</p>
                            ) : null}
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
                                            bankId
                                                ? t('pages.settings.panels.bank.bank_checking', {
                                                      bank:
                                                          bankById.get(bankId)?.name ??
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
                                        onChange={event => {
                                            const next = event.target.value;
                                            field.onChange(next);
                                            if (next !== AccountKind.CREDIT) {
                                                form.setValue('settlementAccountId', null, {
                                                    shouldDirty: true,
                                                });
                                            }
                                        }}
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
                {kind === AccountKind.CREDIT ? (
                    <FormField
                        control={form.control}
                        name="settlementAccountId"
                        render={({ field }) => (
                            <FormItem>
                                <Field
                                    label={t('pages.settings.panels.bank.pay_from')}
                                    htmlFor={`acc-settle-${formKey}`}
                                    hint={t('pages.settings.panels.bank.pay_from_hint')}>
                                    <FormControl>
                                        <Select
                                            id={`acc-settle-${formKey}`}
                                            value={field.value ?? ''}
                                            onChange={event => {
                                                const next = event.target.value;
                                                field.onChange(next ? next : null);
                                            }}
                                            disabled={!live || settlementOptions.length === 0}>
                                            <option value="">
                                                {t('pages.settings.panels.bank.pay_from_none')}
                                            </option>
                                            {settlementOptions.map(row => (
                                                <option key={row.id} value={row.id}>
                                                    {row.name}
                                                </option>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Field>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                ) : null}
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
