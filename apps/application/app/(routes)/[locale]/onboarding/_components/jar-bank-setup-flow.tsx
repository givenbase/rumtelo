'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { zodResolver } from '@hookform/resolvers/zod';
import {
    AccountKind,
    type BankAccountCount,
    HouseholdAnswerKey,
    type JarExperience,
    type Jar,
} from '@rumtelo/contracts';
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
    Icon,
    Input,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Typography,
    VendorMark,
    bindFormSubmit,
    createFormInvalidHandler,
} from '@rumtelo/ui';
import { cn, extractErrorMessage, formatIban, isValidIban, normalizeIban } from '@rumtelo/utils';

import { isIbanStub } from '@/app/(routes)/[locale]/(app)/(household)/settings/_utils/settings-shared';
import { isIbanApiErrorMessage } from '@/app/_lib/api-user-message';
import { api } from '@/app/_lib/api';
import { apiQuery } from '@/app/_lib/api-hooks';
import { useApiError } from '@/app/_lib/api-error-messages';
import { planJarBankSetup } from '@/app/_lib/jar-bank-plan';
import { countryFromCurrency } from '@/app/_lib/resolve-account-bank';
import { vendorMarkSrc } from '@/app/_lib/vendor-brands';
import { JarMark } from '@/components/features/money/jar-badge';
import { useHouseholdShell } from '@/components/features/shell/household-shell-context';
import { useAuth } from '@/components/features/shell/auth-provider';

// ── Schema ─────────────────────────────────────────────────────────────────

function buildAccountsFormSchema(invalidIbanMessage: string) {
    const accountRowSchema = z.object({
        localKey: z.string(),
        name: z.string().min(1).max(120),
        kind: z.enum(AccountKind),
        bankId: z.string().min(1),
        /** Optional; empty / bank stub OK. Anything else must be a real IBAN. */
        iban: z
            .string()
            .max(42)
            .refine(
                value => {
                    const trimmed = value.trim();
                    if (!trimmed || isIbanStub(trimmed)) return true;
                    return isValidIban(trimmed);
                },
                { message: invalidIbanMessage }
            ),
    });

    return z.object({
        accounts: z.array(accountRowSchema).min(1),
    });
}

type AccountsFormValues = z.infer<ReturnType<typeof buildAccountsFormSchema>>;

/** Empty or incomplete NL bank stub → null. Caller must validate first. */
function resolveOptionalIban(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed || isIbanStub(trimmed)) return null;
    return normalizeIban(trimmed);
}
// ── Small inner components ─────────────────────────────────────────────────

function KindPill({
    value,
    selected,
    label,
    disabled,
    onClick,
}: {
    value: AccountKind;
    selected: boolean;
    label: string;
    disabled?: boolean;
    onClick: (kind: AccountKind) => void;
}) {
    return (
        <button
            type="button"
            aria-pressed={selected}
            disabled={disabled}
            onClick={() => onClick(value)}
            className={cn(
                'rounded-full border px-3 py-1 font-mono text-[10px] font-semibold tracking-wide uppercase transition-colors',
                selected
                    ? 'border-accent bg-accent-soft text-accent'
                    : 'border-line bg-raised text-fg-muted hover:border-accent hover:text-fg',
                disabled && 'cursor-not-allowed opacity-60 hover:border-line hover:text-fg-muted'
            )}>
            {label}
        </button>
    );
}

// ── Main component ─────────────────────────────────────────────────────────

export function JarBankSetupFlow({
    experience,
    accountCount,
}: {
    experience: JarExperience;
    accountCount: BankAccountCount;
}) {
    const t = useTranslations('pages.onboarding');
    const tRoot = useTranslations();
    const tForm = useTranslations('ui.form');
    const { householdId } = useAuth();
    const router = useRouter();
    const { showToast } = useHouseholdShell();
    const apiError = useApiError();
    const queryClient = useQueryClient();

    const onInvalid = createFormInvalidHandler(
        ({ title, description }) => {
            showToast(description ?? title, 'error');
        },
        {
            title: tForm('incomplete_title'),
            description: tForm('incomplete_description'),
        }
    );

    const kindLabel = (kind: AccountKind) => {
        const key =
            kind === AccountKind.CHECKING
                ? 'checking'
                : kind === AccountKind.SAVINGS
                  ? 'savings'
                  : kind === AccountKind.CASH
                    ? 'cash'
                    : kind === AccountKind.CREDIT
                      ? 'credit'
                      : 'investment';
        return tRoot(`pages.settings.panels.bank.${key}`);
    };

    const [screen, setScreen] = useState<'accounts' | 'map'>('accounts');
    const [pending, setPending] = useState(false);
    /** Session creates on top of any accounts already saved for this household. */
    const [sessionCreatedByKey, setSessionCreatedByKey] = useState<Record<string, string>>({});
    /** User edits on the map screen; server jar.defaultAccountId is the base. */
    const [placementOverrides, setPlacementOverrides] = useState<Record<string, string>>({});

    const invalidIbanMessage = tRoot('pages.settings.panels.bank.invalid_iban');
    const accountsFormSchema = useMemo(
        () => buildAccountsFormSchema(invalidIbanMessage),
        [invalidIbanMessage]
    );

    const settingsQuery = useLiveQuery(
        apiQuery.household.settings.queryOptions({ input: { householdId: householdId! } }),
        null,
        Boolean(householdId)
    );

    const banksQuery = useLiveQuery(
        apiQuery.money.catalogs.banks.list.queryOptions({
            input: {
                householdId: householdId!,
                country: countryFromCurrency(settingsQuery.data?.currency),
            },
        }),
        [],
        Boolean(householdId)
    );
    const banks = banksQuery.data;

    const jarsQuery = useLiveQuery(
        apiQuery.money.jars.list.queryOptions({ input: { householdId: householdId! } }),
        [] as Jar[],
        Boolean(householdId)
    );
    const jars = jarsQuery.data;

    const accountsQuery = useLiveQuery(
        apiQuery.money.accounts.list.queryOptions({ input: { householdId: householdId! } }),
        [],
        Boolean(householdId)
    );
    const existingAccounts = accountsQuery.data;

    const plan = useMemo(() => {
        return planJarBankSetup({
            experience,
            accountCount,
            jarKeys: jars.map(j => j.key),
        });
    }, [experience, accountCount, jars]);

    const defaultBankId = banks[0]?.id ?? '';

    const form = useForm<AccountsFormValues>({
        resolver: zodResolver(accountsFormSchema),
        defaultValues: {
            accounts: [],
        },
        mode: 'onSubmit',
        reValidateMode: 'onChange',
    });

    const serverCreatedByKey = useMemo(() => {
        if (!plan || existingAccounts.length === 0) return {};
        const created: Record<string, string> = {};
        for (const [index, account] of existingAccounts.entries()) {
            const localKey = plan.suggestedAccounts[index]?.localKey ?? `existing-${account.id}`;
            created[localKey] = account.id;
        }
        return created;
    }, [existingAccounts, plan]);

    const serverPlacement = useMemo(() => {
        const placement: Record<string, string> = {};
        for (const jar of jars) {
            if (jar.defaultAccountId) placement[jar.id] = jar.defaultAccountId;
        }
        return placement;
    }, [jars]);

    const createdByKey = { ...serverCreatedByKey, ...sessionCreatedByKey };
    const jarPlacement = { ...serverPlacement, ...placementOverrides };

    // Sync form rows from saved accounts (or plan defaults). Created/placement are derived above.
    const planKey = plan?.suggestedAccounts.map(account => account.localKey).join(',') ?? '';
    const accountsKey = existingAccounts.map(account => account.id).join(',');
    const hydratedRef = useRef<string | null>(null);
    useEffect(() => {
        if (!plan) return;
        if (householdId && (accountsQuery.isPending || banksQuery.isPending)) return;
        if (banks.length === 0) return;

        const hydrateKey = `${planKey}|${accountsKey}|${banks.length}`;
        if (hydratedRef.current === hydrateKey) return;
        hydratedRef.current = hydrateKey;

        const fallbackBankId = banks[0]?.id ?? '';

        if (existingAccounts.length > 0) {
            const rows: AccountsFormValues['accounts'] = existingAccounts.map((account, index) => {
                const suggestion = plan.suggestedAccounts[index];
                return {
                    localKey: suggestion?.localKey ?? `existing-${account.id}`,
                    name: account.name,
                    kind: account.kind,
                    bankId: account.bankId || fallbackBankId,
                    iban: account.iban ? formatIban(account.iban) : '',
                };
            });
            for (let i = existingAccounts.length; i < plan.suggestedAccounts.length; i++) {
                const suggestion = plan.suggestedAccounts[i]!;
                rows.push({
                    localKey: suggestion.localKey,
                    name: t(suggestion.nameKey),
                    kind: suggestion.kind,
                    bankId: fallbackBankId,
                    iban: '',
                });
            }
            form.reset({ accounts: rows });
            return;
        }

        form.reset({
            accounts: plan.suggestedAccounts.map(acct => ({
                localKey: acct.localKey,
                name: t(acct.nameKey),
                kind: acct.kind,
                bankId: fallbackBankId,
                iban: '',
            })),
        });
    }, [
        accountsKey,
        accountsQuery.isPending,
        banks,
        banksQuery.isPending,
        existingAccounts,
        form,
        householdId,
        plan,
        planKey,
        t,
    ]);

    const { fields, append, remove } = useFieldArray({ control: form.control, name: 'accounts' });
    const watchedAccounts = useWatch({ control: form.control, name: 'accounts' });

    function bankMark(bankId: string | undefined) {
        const bank = banks.find(row => row.id === bankId) ?? banks[0];
        if (!bank) return null;
        return vendorMarkSrc({
            key: bank.key,
            name: bank.name,
            logoDomain: bank.logoDomain,
            website: bank.website,
        });
    }

    function bankById(bankId: string | undefined) {
        return banks.find(row => row.id === bankId) ?? banks[0];
    }

    function addAccount() {
        const previous = form.getValues('accounts');
        const bankId = previous.at(-1)?.bankId || banks[0]?.id || '';
        append({
            localKey: `extra-${crypto.randomUUID()}`,
            name: t('banks_setup.extra_account'),
            kind: AccountKind.CHECKING,
            bankId,
            iban: '',
        });
    }

    async function handleSkip() {
        if (!householdId) return;
        setPending(true);
        try {
            await api.household.updateSettings({
                householdId,
                answers: { [HouseholdAnswerKey.JAR_BANK_SETUP_DONE]: true },
            });
        } catch {
            // Non-critical — don't block the user.
        } finally {
            setPending(false);
        }
        sessionStorage.setItem('rumtelo:offer-tour', '1');
        router.replace('/');
    }

    async function handleCreateAccounts(values: AccountsFormValues) {
        if (!householdId) return;
        setPending(true);
        try {
            const created = { ...createdByKey };
            const existing = await api.money.accounts.list({ householdId });
            const byName = new Map(
                existing.map(account => [account.name.trim().toLowerCase(), account.id])
            );

            for (const [index, row] of values.accounts.entries()) {
                if (created[row.localKey]) continue;

                const nameKey = row.name.trim().toLowerCase();
                const existingId = byName.get(nameKey);
                if (existingId) {
                    created[row.localKey] = existingId;
                    continue;
                }

                try {
                    const iban = resolveOptionalIban(row.iban);
                    const acct = await api.money.accounts.create({
                        householdId,
                        name: row.name,
                        kind: row.kind,
                        bankId: row.bankId,
                        iban,
                        balance: 0,
                        settlementAccountId: null,
                    });
                    created[row.localKey] = acct.id;
                    byName.set(nameKey, acct.id);
                    setSessionCreatedByKey({ ...created });
                } catch (error) {
                    const raw = extractErrorMessage(error);
                    const message = apiError(error);
                    if (isIbanApiErrorMessage(raw) || /iban/i.test(raw)) {
                        form.setError(`accounts.${index}.iban`, { message });
                    } else if (raw === 'account_name_taken' || /account_name_taken/i.test(raw)) {
                        form.setError(`accounts.${index}.name`, { message });
                    } else {
                        showToast(message, 'error');
                    }
                    throw error;
                }
            }

            void queryClient.invalidateQueries({ queryKey: apiQuery.money.accounts.list.key() });

            const initial = { ...jarPlacement };
            if (plan) {
                for (const jar of jars) {
                    if (initial[jar.id]) continue;
                    const localKey = plan.draftPlacementByJarKey[jar.key];
                    if (localKey && created[localKey]) {
                        initial[jar.id] = created[localKey]!;
                    }
                }
            }
            setSessionCreatedByKey(created);
            setPlacementOverrides(initial);
            setScreen('map');
        } catch {
            // Field errors / toast already set above.
        } finally {
            setPending(false);
        }
    }

    async function handleSaveMap() {
        if (!householdId) return;
        setPending(true);
        try {
            const placements = jars.map(jar => ({
                jarId: jar.id,
                accountId: jarPlacement[jar.id] ?? null,
            }));
            await api.money.jars.updatePlacement({ householdId, placements });
            await api.household.updateSettings({
                householdId,
                answers: { [HouseholdAnswerKey.JAR_BANK_SETUP_DONE]: true },
            });

            // Link onboard income to the main checking seat (where pay lands).
            const primaryAccountId = createdByKey.main ?? Object.values(createdByKey)[0];
            if (primaryAccountId) {
                try {
                    const sources = await api.money.income.list({ householdId });
                    await Promise.all(
                        sources
                            .filter(source => !source.accountId)
                            .map(source =>
                                api.money.income.update({
                                    householdId,
                                    id: source.id,
                                    accountId: primaryAccountId,
                                })
                            )
                    );
                } catch {
                    // Non-critical — income still works without a seat link.
                }
            }

            void queryClient.invalidateQueries({ queryKey: apiQuery.money.jars.list.key() });
            void queryClient.invalidateQueries({ queryKey: apiQuery.money.income.list.key() });
            showToast(t('banks_setup.finish'), 'success');
            sessionStorage.setItem('rumtelo:offer-tour', '1');
            router.replace('/');
        } catch (error) {
            showToast(apiError(error), 'error');
        } finally {
            setPending(false);
        }
    }

    if (!plan) return null;

    // Created account options for the map Select
    const accountOptions = Object.entries(createdByKey).map(([localKey, id]) => {
        const suggestion = plan.suggestedAccounts.find(item => item.localKey === localKey);
        const row = form.getValues('accounts').find(item => item.localKey === localKey);
        const mark = bankMark(row?.bankId);
        return {
            id,
            name: row?.name ?? (suggestion ? t(suggestion.nameKey) : localKey),
            mark,
        };
    });

    return (
        <div className="flex flex-col overflow-hidden rounded-2xl border border-line-strong bg-surface">
            {/* Header */}
            <div className="flex shrink-0 items-center gap-3 border-b border-line px-5 py-3.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-accent/20 bg-accent-soft text-accent">
                    <Icon name="landmark" size="sm" color="inherit" />
                </span>
                <div className="min-w-0 flex-1">
                    <Typography as="p" size="sm" weight="bold">
                        {screen === 'accounts'
                            ? t('banks_setup.accounts_title')
                            : t('banks_setup.map_title')}
                    </Typography>
                    <Typography as="p" size="xs" color="muted">
                        {screen === 'accounts'
                            ? t('banks_setup.accounts_body')
                            : t('banks_setup.map_body')}
                    </Typography>
                </div>
            </div>

            {/* Body */}
            <div className="p-5 pb-4">
                {screen === 'accounts' && (
                    <Form {...form}>
                        <form
                            id="jar-bank-accounts-form"
                            onSubmit={bindFormSubmit(form, handleCreateAccounts, onInvalid)}
                            className="grid gap-4"
                            noValidate>
                            {/* Per-account rows — each seat picks its own bank */}
                            <div className="grid gap-3">
                                {fields.map((field, index) => {
                                    const kindValue =
                                        watchedAccounts?.[index]?.kind ?? AccountKind.CHECKING;
                                    const rowBankId =
                                        watchedAccounts?.[index]?.bankId ?? defaultBankId;
                                    const alreadyCreated = Boolean(createdByKey[field.localKey]);
                                    const rowBank = bankById(rowBankId);
                                    const rowMark = bankMark(rowBankId);
                                    return (
                                        <div
                                            key={field.id}
                                            className="grid gap-2 rounded-xl border border-line bg-raised p-3">
                                            {banks.length > 0 ? (
                                                <Field
                                                    label={t('banks_setup.bank_label')}
                                                    htmlFor={`jbs-bank-${index}`}>
                                                    <Select
                                                        value={rowBankId || defaultBankId}
                                                        disabled={
                                                            alreadyCreated || banks.length === 0
                                                        }
                                                        onValueChange={value => {
                                                            form.setValue(
                                                                `accounts.${index}.bankId`,
                                                                value
                                                            );
                                                            // Clear incomplete stub when switching banks;
                                                            // keep a real IBAN the user already typed.
                                                            const current =
                                                                form.getValues(
                                                                    `accounts.${index}.iban`
                                                                ) ?? '';
                                                            if (isIbanStub(current)) {
                                                                form.setValue(
                                                                    `accounts.${index}.iban`,
                                                                    ''
                                                                );
                                                            }
                                                        }}>
                                                        <SelectTrigger id={`jbs-bank-${index}`}>
                                                            <SelectValue>
                                                                {rowBank && rowMark ? (
                                                                    <span className="flex min-w-0 items-center gap-2">
                                                                        <VendorMark
                                                                            name={rowMark.name}
                                                                            src={rowMark.src}
                                                                            size={18}
                                                                        />
                                                                        <span className="truncate">
                                                                            {rowBank.name}
                                                                        </span>
                                                                    </span>
                                                                ) : null}
                                                            </SelectValue>
                                                        </SelectTrigger>
                                                        <SelectContent position="popper">
                                                            {banks.map(bank => {
                                                                const mark = vendorMarkSrc({
                                                                    key: bank.key,
                                                                    name: bank.name,
                                                                    logoDomain: bank.logoDomain,
                                                                    website: bank.website,
                                                                });
                                                                return (
                                                                    <SelectItem
                                                                        key={bank.id}
                                                                        value={bank.id}>
                                                                        <span className="flex min-w-0 items-center gap-2">
                                                                            <VendorMark
                                                                                name={mark.name}
                                                                                src={mark.src}
                                                                                size={18}
                                                                            />
                                                                            <span className="truncate">
                                                                                {bank.name}
                                                                            </span>
                                                                        </span>
                                                                    </SelectItem>
                                                                );
                                                            })}
                                                        </SelectContent>
                                                    </Select>
                                                </Field>
                                            ) : null}

                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0 flex-1">
                                                    <FormField
                                                        control={form.control}
                                                        name={`accounts.${index}.name`}
                                                        render={({ field: nameField }) => (
                                                            <FormItem>
                                                                <Field
                                                                    label={t(
                                                                        'banks_setup.account_name_label'
                                                                    )}
                                                                    htmlFor={`jbs-acc-name-${index}`}>
                                                                    <FormControl>
                                                                        <Input
                                                                            id={`jbs-acc-name-${index}`}
                                                                            {...nameField}
                                                                            disabled={
                                                                                alreadyCreated
                                                                            }
                                                                        />
                                                                    </FormControl>
                                                                </Field>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>
                                                {!alreadyCreated && fields.length > 1 ? (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="mt-6 shrink-0"
                                                        onClick={() => remove(index)}>
                                                        {t('banks_setup.remove_account')}
                                                    </Button>
                                                ) : null}
                                            </div>
                                            <FormField
                                                control={form.control}
                                                name={`accounts.${index}.iban`}
                                                render={({ field: ibanField }) => (
                                                    <FormItem>
                                                        <Field
                                                            label={t('banks_setup.iban_label')}
                                                            htmlFor={`jbs-iban-${index}`}
                                                            hint={
                                                                form.formState.errors.accounts?.[
                                                                    index
                                                                ]?.iban
                                                                    ? undefined
                                                                    : t('banks_setup.iban_optional')
                                                            }>
                                                            <FormControl>
                                                                <Input
                                                                    id={`jbs-iban-${index}`}
                                                                    {...ibanField}
                                                                    disabled={alreadyCreated}
                                                                    autoComplete="off"
                                                                    spellCheck={false}
                                                                    placeholder={
                                                                        rowBank?.ibanBankCode
                                                                            ? `NL00 ${rowBank.ibanBankCode}`
                                                                            : 'NL00 BANK …'
                                                                    }
                                                                    onBlur={event => {
                                                                        ibanField.onBlur();
                                                                        const trimmed =
                                                                            event.target.value.trim();
                                                                        if (
                                                                            !trimmed ||
                                                                            isIbanStub(trimmed)
                                                                        ) {
                                                                            form.clearErrors(
                                                                                `accounts.${index}.iban`
                                                                            );
                                                                            return;
                                                                        }
                                                                        if (!isValidIban(trimmed)) {
                                                                            form.setError(
                                                                                `accounts.${index}.iban`,
                                                                                {
                                                                                    message:
                                                                                        invalidIbanMessage,
                                                                                }
                                                                            );
                                                                            return;
                                                                        }
                                                                        form.clearErrors(
                                                                            `accounts.${index}.iban`
                                                                        );
                                                                        form.setValue(
                                                                            `accounts.${index}.iban`,
                                                                            formatIban(trimmed)
                                                                        );
                                                                    }}
                                                                />
                                                            </FormControl>
                                                        </Field>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <div className="grid gap-1.5">
                                                <Typography
                                                    as="p"
                                                    size="xs"
                                                    color="muted"
                                                    id={`jbs-kind-label-${index}`}>
                                                    {t('banks_setup.kind_label')}
                                                </Typography>
                                                <div
                                                    className="flex flex-wrap gap-1.5"
                                                    role="group"
                                                    aria-labelledby={`jbs-kind-label-${index}`}>
                                                    <KindPill
                                                        value={AccountKind.CHECKING}
                                                        selected={
                                                            kindValue === AccountKind.CHECKING
                                                        }
                                                        disabled={alreadyCreated}
                                                        label={kindLabel(AccountKind.CHECKING)}
                                                        onClick={kind =>
                                                            form.setValue(
                                                                `accounts.${index}.kind`,
                                                                kind
                                                            )
                                                        }
                                                    />
                                                    <KindPill
                                                        value={AccountKind.SAVINGS}
                                                        selected={kindValue === AccountKind.SAVINGS}
                                                        disabled={alreadyCreated}
                                                        label={kindLabel(AccountKind.SAVINGS)}
                                                        onClick={kind =>
                                                            form.setValue(
                                                                `accounts.${index}.kind`,
                                                                kind
                                                            )
                                                        }
                                                    />
                                                    <KindPill
                                                        value={AccountKind.CASH}
                                                        selected={kindValue === AccountKind.CASH}
                                                        disabled={alreadyCreated}
                                                        label={kindLabel(AccountKind.CASH)}
                                                        onClick={kind =>
                                                            form.setValue(
                                                                `accounts.${index}.kind`,
                                                                kind
                                                            )
                                                        }
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                className="justify-self-start"
                                disabled={pending}
                                onClick={addAccount}>
                                <Icon name="plus" size="sm" />
                                {t('banks_setup.add_account')}
                            </Button>

                            {/* Tips */}
                            {plan.tipKeys.map(key => (
                                <p
                                    key={key}
                                    className="rounded-xl border border-accent/20 bg-accent-soft/40 px-3.5 py-2.5 text-sm font-medium text-accent">
                                    {t(key)}
                                </p>
                            ))}
                        </form>
                    </Form>
                )}

                {screen === 'map' && (
                    <div className="grid gap-3">
                        {accountOptions.length === 0 ? (
                            <p className="text-sm text-fg-muted">
                                {t('banks_setup.no_accounts_yet')}
                            </p>
                        ) : (
                            jars.map(jar => (
                                <div
                                    key={jar.id}
                                    className="flex items-center gap-3 rounded-xl border border-line bg-raised px-3 py-2">
                                    <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-line bg-card text-base">
                                        <JarMark jarKey={jar.key} icon={jar.icon} />
                                    </span>
                                    <span className="min-w-0 flex-1 text-sm font-medium text-fg">
                                        {jar.name}
                                    </span>
                                    <Select
                                        value={jarPlacement[jar.id] ?? 'none'}
                                        onValueChange={value =>
                                            setPlacementOverrides(prev => ({
                                                ...prev,
                                                [jar.id]: value === 'none' ? '' : value,
                                            }))
                                        }>
                                        <SelectTrigger
                                            className="w-44 shrink-0"
                                            aria-label={`${jar.name} — ${t('banks_setup.map_title')}`}>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent position="popper">
                                            <SelectItem value="none">—</SelectItem>
                                            {accountOptions.map(opt => (
                                                <SelectItem key={opt.id} value={opt.id}>
                                                    <span className="flex min-w-0 items-center gap-2">
                                                        {opt.mark ? (
                                                            <VendorMark
                                                                name={opt.mark.name}
                                                                src={opt.mark.src}
                                                                size={16}
                                                            />
                                                        ) : null}
                                                        <span className="truncate">{opt.name}</span>
                                                    </span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="flex shrink-0 items-center justify-between gap-3 border-t border-line bg-raised/50 px-5 py-3.5">
                {screen === 'map' ? (
                    <Button
                        variant="ghost"
                        size="sm"
                        disabled={pending}
                        onClick={() => setScreen('accounts')}>
                        {t('banks_setup.back')}
                    </Button>
                ) : (
                    <Button
                        variant="ghost"
                        size="sm"
                        disabled={pending}
                        onClick={() => void handleSkip()}>
                        {t('banks_setup.skip')}
                    </Button>
                )}

                {screen === 'accounts' ? (
                    <Button
                        size="sm"
                        type="submit"
                        form="jar-bank-accounts-form"
                        disabled={pending || banks.length === 0 || fields.length === 0}>
                        {pending ? t('banks_setup.creating') : t('continue')}
                    </Button>
                ) : (
                    <Button size="sm" disabled={pending} onClick={() => void handleSaveMap()}>
                        {pending ? t('banks_setup.saving') : t('banks_setup.finish')}
                    </Button>
                )}
            </div>
        </div>
    );
}
