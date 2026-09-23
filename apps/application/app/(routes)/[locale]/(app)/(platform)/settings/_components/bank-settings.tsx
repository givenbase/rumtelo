'use client';

import { api } from '@/app/_lib/api';
import { apiQuery } from '@/app/_lib/api-hooks';
import { isIbanApiErrorMessage } from '@/app/_lib/api-user-message';
import { isLiveData } from '@/app/_lib/preview';
import { useBankSyncOnVisit } from '@/app/_lib/use-bank-sync-on-visit';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';
import { useAppShell } from '@/components/features/shell/app-shell-context';
import { useAuth } from '@/components/features/shell/auth-provider';
import { usePlanCapabilities } from '@/components/features/shell/use-plan-capabilities';
import { zodResolver } from '@hookform/resolvers/zod';
import { AccountKind, type Account } from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { useTranslations } from '@rumtelo/i18n';
import { Button } from '@rumtelo/ui';
import {
    extractErrorMessage,
    formatIban,
    isValidIban,
    nlIbanBankCode,
    normalizeIban,
} from '@rumtelo/utils';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { accountNameTaken, EMPTY_BANK } from '../_utils/bank-settings';
import {
    composeAccountBankName,
    countryFromCurrency,
    resolveAccountBank,
} from '../_utils/resolve-account-bank';
import {
    createBankAccountFormSchema,
    type BankAccountFormValues,
} from '../_utils/settings-form-zod';
import {
    accountKindLabel,
    formatNlIbanStub,
    isIbanStub,
    nlIbanPrefix,
} from '../_utils/settings-shared';
import { useSettingsMutation } from '../_utils/use-settings-mutation';
import { BankLinkWizard, type BankLinkWizardAuthoriseInput } from './bank-link-wizard';
import { BankLinkedAccounts } from './bank-linked-accounts';
import { BankManualAccounts } from './bank-manual-accounts';
import { SettingsInkCard, SettingsPanel, SettingsPill } from './settings-chrome';

export function BankSettings() {
    const t = useTranslations();
    const { householdId } = useAuth();
    const { showToast } = useAppShell();
    const { formatMoney } = useHouseholdCurrency();
    const { withinLimit } = usePlanCapabilities();
    const live = isLiveData(householdId);
    const router = useRouter();
    const searchParams = useSearchParams();
    const queryClient = useQueryClient();
    const oauthHandled = useRef(false);
    const [adding, setAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [ibanError, setIbanError] = useState<string | null>(null);
    const [wizardOpen, setWizardOpen] = useState(false);

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

    const accounts = accountsQuery.data ?? [];
    const primaryAccount = accounts.find(row => row.isPrimary) ?? null;
    const primaryBankId = primaryAccount?.bankId ?? null;
    const linkedAccounts = accounts.filter(row => Boolean(row.connectionId));
    const manualAccounts = accounts.filter(row => !row.connectionId);
    const linkedByBankId = (() => {
        const map = new Map<string, Account[]>();
        for (const row of linkedAccounts) {
            const list = map.get(row.bankId) ?? [];
            list.push(row);
            map.set(row.bankId, list);
        }
        return map;
    })();

    const bankList = (() => {
        const rows = banksQuery.data ?? [];
        if (!primaryBankId) return rows;
        const main = rows.find(bank => bank.id === primaryBankId);
        if (!main) return rows;
        return [main, ...rows.filter(bank => bank.id !== primaryBankId)];
    })();

    const bankNameOptions = bankList.map(bank => ({
        key: bank.key,
        name: bank.name,
        group: t('pages.settings.panels.bank.which_bank'),
        logoDomain: bank.logoDomain,
        website: bank.website,
    }));

    const bankById = new Map(bankList.map(bank => [bank.id, bank]));
    const bankByKey = new Map(bankList.map(bank => [bank.key, bank]));

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
        const nextName = composeAccountBankName(bank.name, currentLabel, bankList);
        if (accountNameTaken(accounts, nextName, editingId)) {
            showToast(t('common.message.error.api.account_name_taken'), 'error');
            return;
        }
        form.setValue('bankId', bank.id, { shouldDirty: true });
        form.setValue('label', nextName, { shouldDirty: true });
        const code = bank.ibanBankCode?.toUpperCase() ?? null;
        if (code) {
            const prevIban = form.getValues('iban');
            if (isIbanStub(prevIban)) {
                form.setValue('iban', nlIbanPrefix(code), { shouldDirty: true });
            }
            setIbanError(null);
        }
    }

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

    const setPrimaryAccount = useSettingsMutation({
        mutationFn: async (accountId: string) => {
            if (!householdId) throw new Error('No household');
            return api.money.accounts.update({
                householdId,
                id: accountId,
                isPrimary: true,
            });
        },
        invalidateKeys: [apiQuery.money.accounts.list.key()],
        successMessage: t('pages.settings.toasts.primary_account_updated'),
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

    useEffect(() => {
        if (!live || !householdId || oauthHandled.current) return;
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        if (!code || !state) return;
        oauthHandled.current = true;
        void (async () => {
            try {
                const linked = await completeLinkAsync({ code, state });
                const result = await syncNowAsync(linked.bankAccountId);
                showToast(
                    t('pages.settings.panels.bank.synced_toast', { count: result.imported }),
                    'success'
                );
            } catch (error) {
                showToast(extractErrorMessage(error), 'error');
            } finally {
                router.replace('/settings/product/money/bank');
            }
        })();
    }, [live, householdId, searchParams, completeLinkAsync, syncNowAsync, showToast, t, router]);

    const kindLabel = (accountKind: string) => accountKindLabel(accountKind, t);
    const saving = createAccount.isPending || updateAccount.isPending;
    const wizardBusy = startLink.isPending || createAccount.isPending;
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
    const canConnect = withinLimit('maxBankLinks', linkedAccounts.length);

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
        if (accountNameTaken(accounts, name, editingId)) {
            showToast(t('common.message.error.api.account_name_taken'), 'error');
            return;
        }
        if (editingId) updateAccount.mutate(values);
        else createAccount.mutate(values);
    }

    async function runWizardAuthorise(input: BankLinkWizardAuthoriseInput) {
        if (!householdId || !input.institutionId) return;
        try {
            let bankAccountId = input.seatId;
            if (input.seatMode === 'new') {
                const catalogId = input.catalogBankId || primaryBankId || bankList[0]?.id;
                if (!catalogId) {
                    showToast(t('common.message.error.api.bank_required'), 'error');
                    return;
                }
                const bank = bankById.get(catalogId);
                const seatLabel =
                    input.newLabel.trim() ||
                    t('pages.settings.panels.bank.bank_checking', {
                        bank: bank?.name ?? t('pages.settings.panels.bank.bank_fallback'),
                    });
                if (accountNameTaken(accounts, seatLabel)) {
                    showToast(t('common.message.error.api.account_name_taken'), 'error');
                    return;
                }
                const created = await api.money.accounts.create({
                    householdId,
                    name: seatLabel,
                    iban: null,
                    kind: AccountKind.CHECKING,
                    balance: 0,
                    bankId: catalogId,
                    settlementAccountId: null,
                });
                bankAccountId = created.id;
                await queryClient.invalidateQueries({
                    queryKey: apiQuery.money.accounts.list.key(),
                });
            }
            if (!bankAccountId) {
                showToast(t('common.message.error.api.bank_sync_account_required'), 'error');
                return;
            }
            startLink.mutate({ bankAccountId, institutionId: input.institutionId });
        } catch (error) {
            showToast(extractErrorMessage(error), 'error');
        }
    }

    return (
        <SettingsPanel>
            <SettingsInkCard
                eyebrow={t('pages.settings.panels.bank.eyebrow')}
                blurb={t('pages.settings.panels.bank.blurb')}
                badge={
                    <SettingsPill>
                        {linkedAccounts.length > 0
                            ? t('pages.settings.panels.bank.linked_count', {
                                  count: linkedAccounts.length,
                              })
                            : t('pages.settings.panels.bank.none_linked')}
                    </SettingsPill>
                }>
                <BankLinkedAccounts
                    live={live}
                    linkedByBankId={linkedByBankId}
                    linkedCount={linkedAccounts.length}
                    bankById={bankById}
                    formatMoney={formatMoney}
                    syncEnabled={syncEnabled}
                    wizardOpen={wizardOpen}
                    canConnect={canConnect}
                    onOpenWizard={() => setWizardOpen(true)}
                    onSetPrimary={id => setPrimaryAccount.mutate(id)}
                    onSync={id =>
                        syncNow.mutate(id, {
                            onSuccess: result => {
                                showToast(
                                    t('pages.settings.panels.bank.synced_toast', {
                                        count: result.imported,
                                    }),
                                    'success'
                                );
                            },
                        })
                    }
                    onDisconnect={id => disconnectBank.mutate(id)}
                    setPrimaryPending={setPrimaryAccount.isPending}
                    syncPending={syncNow.isPending}
                    disconnectPending={disconnectBank.isPending}
                />
                {syncEnabled && wizardOpen ? (
                    <BankLinkWizard
                        live={live}
                        onClose={() => setWizardOpen(false)}
                        busy={wizardBusy}
                        institutions={institutionsQuery.data ?? []}
                        bankList={bankList}
                        bankNameOptions={bankNameOptions}
                        bankById={bankById}
                        bankByKey={bankByKey}
                        manualAccounts={manualAccounts}
                        primaryBankId={primaryBankId}
                        formatMoney={formatMoney}
                        onAuthorise={runWizardAuthorise}
                    />
                ) : null}
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
                <BankManualAccounts
                    live={live}
                    manualAccounts={manualAccounts}
                    bankList={bankList}
                    bankNameOptions={bankNameOptions}
                    bankById={bankById}
                    form={form}
                    bankId={bankId}
                    kind={kind}
                    label={label}
                    selectedBank={selectedBank}
                    selectedIbanCode={selectedIbanCode}
                    ibanPlaceholder={ibanPlaceholder}
                    ibanHint={ibanHint}
                    partnerHint={partnerHint}
                    settlementOptions={settlementOptions}
                    ibanError={ibanError}
                    setIbanError={setIbanError}
                    kindLabel={kindLabel}
                    adding={adding}
                    editingId={editingId}
                    canSubmit={canSubmit}
                    saving={saving}
                    setPrimaryPending={setPrimaryAccount.isPending}
                    deletePending={removeAccount.isPending}
                    formatMoney={formatMoney}
                    onReset={resetForm}
                    onOpenEdit={openEdit}
                    onSetPrimary={id => setPrimaryAccount.mutate(id)}
                    onSubmit={onSubmit}
                    onDelete={() => removeAccount.mutate()}
                    pickBank={pickBank}
                    onBankNameChange={onBankNameChange}
                />
            </SettingsInkCard>
        </SettingsPanel>
    );
}
