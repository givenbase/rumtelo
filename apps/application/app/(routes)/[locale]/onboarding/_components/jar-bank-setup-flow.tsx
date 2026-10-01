'use client';

import { api } from '@/app/_lib/api';
import { apiQuery } from '@/app/_lib/api-hooks';
import { useApiError } from '@/app/_lib/api-error-messages';
import { planJarBankSetup } from '@/app/_lib/jar-bank-plan';
import { countryFromCurrency } from '@/app/_lib/resolve-account-bank';
import { useHouseholdShell } from '@/components/features/shell/household-shell-context';
import { useAuth } from '@/components/features/shell/auth-provider';
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
    Icon,
    Input,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Typography,
} from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { z } from 'zod';

// ── Schema ─────────────────────────────────────────────────────────────────

const accountRowSchema = z.object({
    localKey: z.string(),
    name: z.string().min(1).max(120),
    kind: z.enum(AccountKind),
    bankId: z.string().min(1),
});

const accountsFormSchema = z.object({
    bankId: z.string().min(1),
    accounts: z.array(accountRowSchema).min(1),
});

type AccountsFormValues = z.infer<typeof accountsFormSchema>;

// ── Small inner components ─────────────────────────────────────────────────

function KindPill({
    value,
    selected,
    label,
    onClick,
}: {
    value: AccountKind;
    selected: boolean;
    label: string;
    onClick: (kind: AccountKind) => void;
}) {
    return (
        <button
            type="button"
            aria-pressed={selected}
            onClick={() => onClick(value)}
            className={cn(
                'rounded-full border px-3 py-1 font-mono text-[10px] font-semibold tracking-wide uppercase transition-colors',
                selected
                    ? 'border-accent bg-accent-soft text-accent'
                    : 'border-line bg-raised text-fg-muted hover:border-accent hover:text-fg'
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
    const { householdId } = useAuth();
    const router = useRouter();
    const { showToast } = useHouseholdShell();
    const apiError = useApiError();
    const queryClient = useQueryClient();

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
    /** Accounts created in screen A, keyed by localKey. */
    const [createdByKey, setCreatedByKey] = useState<Record<string, string>>({});
    /** jarId → accountId mapping for screen B. */
    const [jarPlacement, setJarPlacement] = useState<Record<string, string>>({});

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
    const banks = useMemo(() => banksQuery.data ?? [], [banksQuery.data]);

    const jarsQuery = useLiveQuery(
        apiQuery.money.jars.list.queryOptions({ input: { householdId: householdId! } }),
        [] as Jar[],
        Boolean(householdId)
    );
    const jars = useMemo(() => jarsQuery.data ?? [], [jarsQuery.data]);

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
            bankId: defaultBankId,
            accounts: [],
        },
    });

    // Sync plan → form when plan or banks become available
    const planKey = plan?.suggestedAccounts.map(account => account.localKey).join(',') ?? '';
    useMemo(() => {
        if (!plan) return;
        const bankId = form.getValues('bankId') || banks[0]?.id || '';
        form.reset({
            bankId,
            accounts: plan.suggestedAccounts.map(acct => ({
                localKey: acct.localKey,
                name: t(acct.nameKey),
                kind: acct.kind,
                bankId,
            })),
        });
        // Also initialise jar placement from plan
        setJarPlacement({});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [planKey, banks.length]);

    const { fields } = useFieldArray({ control: form.control, name: 'accounts' });
    const globalBankId = useWatch({ control: form.control, name: 'bankId' });

    // When global bank changes, propagate to all rows
    function applyGlobalBank(bankId: string) {
        form.setValue('bankId', bankId);
        const accounts = form.getValues('accounts');
        accounts.forEach((_, index) => form.setValue(`accounts.${index}.bankId`, bankId));
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
            const created: Record<string, string> = {};
            const createdAccounts = await Promise.all(
                values.accounts.map(async row => {
                    const acct = await api.money.accounts.create({
                        householdId,
                        name: row.name,
                        kind: row.kind,
                        bankId: row.bankId || values.bankId,
                        iban: null,
                        balance: 0,
                        settlementAccountId: null,
                    });
                    return { localKey: row.localKey, id: acct.id };
                })
            );
            for (const row of createdAccounts) {
                created[row.localKey] = row.id;
            }
            // Invalidate accounts list so map screen gets fresh data
            void queryClient.invalidateQueries({ queryKey: apiQuery.money.accounts.list.key() });

            // Pre-fill placement from plan draft
            const initial: Record<string, string> = {};
            if (plan) {
                for (const jar of jars) {
                    const localKey = plan.draftPlacementByJarKey[jar.key];
                    if (localKey && created[localKey]) {
                        initial[jar.id] = created[localKey]!;
                    }
                }
            }
            setCreatedByKey(created);
            setJarPlacement(initial);
            setScreen('map');
        } catch (error) {
            showToast(apiError(error), 'error');
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
            void queryClient.invalidateQueries({ queryKey: apiQuery.money.jars.list.key() });
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
        return {
            id,
            name: row?.name ?? (suggestion ? t(suggestion.nameKey) : localKey),
        };
    });

    // Jar display name lookup
    function jarDisplayName(jar: Jar): string {
        return jar.name;
    }

    return (
        <div className="flex flex-col overflow-hidden rounded-2xl border border-line-strong bg-surface">
            {/* Header */}
            <div className="flex shrink-0 items-center gap-3 border-b border-line px-6 py-4">
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
            <div className="min-h-0 flex-1 overflow-y-auto p-6 pb-4">
                {screen === 'accounts' && (
                    <form
                        id="jar-bank-accounts-form"
                        onSubmit={form.handleSubmit(handleCreateAccounts)}
                        className="grid gap-5">
                        {/* Global bank picker */}
                        {banks.length > 0 && (
                            <Field label={t('banks_setup.bank_label')} htmlFor="jbs-bank">
                                <Select value={globalBankId} onValueChange={applyGlobalBank}>
                                    <SelectTrigger id="jbs-bank">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent position="popper">
                                        {banks.map(bank => (
                                            <SelectItem key={bank.id} value={bank.id}>
                                                {bank.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>
                        )}

                        {/* Per-account rows */}
                        <div className="grid gap-3">
                            {fields.map((field, index) => {
                                const kindValue = form.watch(`accounts.${index}.kind`);
                                return (
                                    <div
                                        key={field.id}
                                        className="grid gap-2 rounded-xl border border-line bg-raised p-3">
                                        <Field
                                            label={t('banks_setup.account_name_label')}
                                            htmlFor={`jbs-acc-name-${index}`}>
                                            <Input
                                                id={`jbs-acc-name-${index}`}
                                                {...form.register(`accounts.${index}.name`)}
                                            />
                                        </Field>
                                        <div className="grid gap-1.5">
                                            <Typography as="p" size="xs" color="muted">
                                                {t('banks_setup.kind_label')}
                                            </Typography>
                                            <div className="flex flex-wrap gap-1.5">
                                                <KindPill
                                                    value={AccountKind.CHECKING}
                                                    selected={kindValue === AccountKind.CHECKING}
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

                        {/* Tips */}
                        {plan.tipKeys.map(key => (
                            <p
                                key={key}
                                className="rounded-xl border border-accent/20 bg-accent-soft/40 px-3.5 py-2.5 text-sm font-medium text-accent">
                                {t(key)}
                            </p>
                        ))}
                    </form>
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
                                    <span className="min-w-0 flex-1 text-sm font-medium text-fg">
                                        {jarDisplayName(jar)}
                                    </span>
                                    <Select
                                        value={jarPlacement[jar.id] ?? 'none'}
                                        onValueChange={value =>
                                            setJarPlacement(prev => ({
                                                ...prev,
                                                [jar.id]: value === 'none' ? '' : value,
                                            }))
                                        }>
                                        <SelectTrigger className="w-44 shrink-0">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent position="popper">
                                            <SelectItem value="none">—</SelectItem>
                                            {accountOptions.map(opt => (
                                                <SelectItem key={opt.id} value={opt.id}>
                                                    {opt.name}
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
            <div className="flex shrink-0 items-center justify-between gap-3 border-t border-line bg-raised/50 px-6 py-4">
                <Button
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() => void handleSkip()}>
                    {t('banks_setup.skip')}
                </Button>

                {screen === 'accounts' ? (
                    <Button
                        size="sm"
                        type="submit"
                        form="jar-bank-accounts-form"
                        disabled={pending || banks.length === 0}>
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
