'use client';

import { useEffect, useRef, useState } from 'react';
import { useFieldArray, useForm, useFormContext, useWatch } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { zodResolver } from '@hookform/resolvers/zod';
import {
    AccountKind,
    type Bank,
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

import {
    accountKindLabel,
    isIbanStub,
} from '@/app/(routes)/[locale]/(app)/(household)/settings/_utils/settings-shared';
import { isIbanApiErrorMessage } from '@/app/_lib/api-user-message';
import { api } from '@/app/_lib/api';
import { apiQuery } from '@/app/_lib/api-hooks';
import { useApiError } from '@/app/_lib/api-error-messages';
import { jarPlacementForAccounts, planJarBankSetup } from '@/app/_lib/jar-bank-plan';
import { countryFromCurrency } from '@/app/_lib/resolve-account-bank';
import { vendorMarkSrc, type PartyMark } from '@/app/_lib/vendor-brands';
import { JarMark } from '@/components/features/money/jar-badge';
import { useHouseholdShell } from '@/components/features/shell/household-shell-context';
import { useAuth } from '@/components/features/shell/auth-provider';

// ── Schema ─────────────────────────────────────────────────────────────────

function buildAccountsFormSchema(invalidIbanMessage: string) {
    const accountRowSchema = z.object({
        /** Set after create — the only identity once the row is saved. */
        accountId: z.string().nullable(),
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

type MapAccountOption = {
    id: string;
    name: string;
    mark: PartyMark | null;
};

/** Empty or incomplete NL bank stub → null. Caller must validate first. */
function resolveOptionalIban(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed || isIbanStub(trimmed)) return null;
    return normalizeIban(trimmed);
}

function bankWithMark(
    banks: readonly Bank[],
    bankId: string | undefined
): { bank: Bank | undefined; mark: PartyMark | null } {
    const bank = banks.find(row => row.id === bankId) ?? banks[0];
    if (!bank) return { bank: undefined, mark: null };
    return {
        bank,
        mark: vendorMarkSrc({
            key: bank.key,
            name: bank.name,
            logoDomain: bank.logoDomain,
            website: bank.website,
        }),
    };
}

function finishOnboarding(router: ReturnType<typeof useRouter>) {
    sessionStorage.setItem('rumtelo:offer-tour', '1');
    router.replace('/');
}

// ── Small UI pieces ────────────────────────────────────────────────────────

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

const EMPTY_JARS: Jar[] = [];
const SETUP_ACCOUNT_KINDS = [AccountKind.CHECKING, AccountKind.SAVINGS, AccountKind.CASH] as const;

function AccountRow({
    index,
    banks,
    canRemove,
    alreadyCreated,
    invalidIbanMessage,
    onRemove,
}: {
    index: number;
    banks: readonly Bank[];
    canRemove: boolean;
    alreadyCreated: boolean;
    invalidIbanMessage: string;
    onRemove: () => void;
}) {
    const t = useTranslations('pages.onboarding');
    const tRoot = useTranslations();
    const form = useFormContext<AccountsFormValues>();
    const kindValue = useWatch({ control: form.control, name: `accounts.${index}.kind` });
    const rowBankId = useWatch({ control: form.control, name: `accounts.${index}.bankId` });
    const defaultBankId = banks[0]?.id ?? '';
    const { bank: rowBank, mark: rowMark } = bankWithMark(banks, rowBankId || defaultBankId);

    return (
        <div className="grid gap-2 rounded-xl border border-line bg-raised p-3">
            {banks.length > 0 ? (
                <Field label={t('banks_setup.bank_label')} htmlFor={`jbs-bank-${index}`}>
                    <Select
                        value={rowBankId || defaultBankId}
                        disabled={alreadyCreated}
                        onValueChange={value => {
                            form.setValue(`accounts.${index}.bankId`, value);
                            const current = form.getValues(`accounts.${index}.iban`) ?? '';
                            if (isIbanStub(current)) {
                                form.setValue(`accounts.${index}.iban`, '');
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
                                        <span className="truncate">{rowBank.name}</span>
                                    </span>
                                ) : null}
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent position="popper">
                            {banks.map(bank => {
                                const { mark } = bankWithMark(banks, bank.id);
                                return (
                                    <SelectItem key={bank.id} value={bank.id}>
                                        <span className="flex min-w-0 items-center gap-2">
                                            {mark ? (
                                                <VendorMark
                                                    name={mark.name}
                                                    src={mark.src}
                                                    size={18}
                                                />
                                            ) : null}
                                            <span className="truncate">{bank.name}</span>
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
                                    label={t('banks_setup.account_name_label')}
                                    htmlFor={`jbs-acc-name-${index}`}>
                                    <FormControl>
                                        <Input
                                            id={`jbs-acc-name-${index}`}
                                            {...nameField}
                                            disabled={alreadyCreated}
                                        />
                                    </FormControl>
                                </Field>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                {canRemove ? (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="mt-6 shrink-0"
                        onClick={onRemove}>
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
                                form.formState.errors.accounts?.[index]?.iban
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
                                        const trimmed = event.target.value.trim();
                                        if (!trimmed || isIbanStub(trimmed)) {
                                            form.clearErrors(`accounts.${index}.iban`);
                                            return;
                                        }
                                        if (!isValidIban(trimmed)) {
                                            form.setError(`accounts.${index}.iban`, {
                                                message: invalidIbanMessage,
                                            });
                                            return;
                                        }
                                        form.clearErrors(`accounts.${index}.iban`);
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
                <Typography as="p" size="xs" color="muted" id={`jbs-kind-label-${index}`}>
                    {t('banks_setup.kind_label')}
                </Typography>
                <div
                    className="flex flex-wrap gap-1.5"
                    role="group"
                    aria-labelledby={`jbs-kind-label-${index}`}>
                    {SETUP_ACCOUNT_KINDS.map(kind => (
                        <KindPill
                            key={kind}
                            value={kind}
                            selected={(kindValue ?? AccountKind.CHECKING) === kind}
                            disabled={alreadyCreated}
                            label={accountKindLabel(kind, tRoot)}
                            onClick={next => form.setValue(`accounts.${index}.kind`, next)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

function MapStep({
    jars,
    accountOptions,
    effectivePlacement,
    mapNeedsChoices,
    mapIncomplete,
    onPlace,
}: {
    jars: readonly Jar[];
    accountOptions: readonly MapAccountOption[];
    effectivePlacement: Record<string, string>;
    mapNeedsChoices: boolean;
    mapIncomplete: boolean;
    onPlace: (jarId: string, accountId: string) => void;
}) {
    const t = useTranslations('pages.onboarding');

    if (accountOptions.length === 0) {
        return <p className="text-sm text-fg-muted">{t('banks_setup.no_accounts_yet')}</p>;
    }

    return (
        <div className="grid gap-3">
            {jars.map(jar => (
                <div
                    key={jar.id}
                    className="flex items-center gap-3 rounded-xl border border-line bg-raised px-3 py-2">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-line bg-card text-base">
                        <JarMark jarKey={jar.key} icon={jar.icon} />
                    </span>
                    <span className="min-w-0 flex-1 text-sm font-medium text-fg">{jar.name}</span>
                    <Select
                        value={effectivePlacement[jar.id] ?? 'none'}
                        disabled={!mapNeedsChoices}
                        onValueChange={value => onPlace(jar.id, value === 'none' ? '' : value)}>
                        <SelectTrigger
                            className="w-44 shrink-0"
                            aria-label={`${jar.name} — ${t('banks_setup.map_title')}`}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent position="popper">
                            {mapNeedsChoices ? <SelectItem value="none">—</SelectItem> : null}
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
            ))}
            {mapIncomplete ? (
                <p className="text-sm font-medium text-fg-muted">{t('banks_setup.map_required')}</p>
            ) : null}
        </div>
    );
}

// ── Main component ─────────────────────────────────────────────────────────

export function JarBankSetupFlow({ experience }: { experience: JarExperience }) {
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

    const [screen, setScreen] = useState<'accounts' | 'map'>('accounts');
    const [pending, setPending] = useState(false);
    const [placementOverrides, setPlacementOverrides] = useState<Record<string, string>>({});

    const invalidIbanMessage = tRoot('pages.settings.panels.bank.invalid_iban');
    const accountsFormSchema = buildAccountsFormSchema(invalidIbanMessage);

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
        EMPTY_JARS,
        Boolean(householdId)
    );
    const jars = jarsQuery.data;

    const accountsQuery = useLiveQuery(
        apiQuery.money.accounts.list.queryOptions({ input: { householdId: householdId! } }),
        [],
        Boolean(householdId)
    );
    const existingAccounts = accountsQuery.data;

    const plan = planJarBankSetup(experience);

    const form = useForm<AccountsFormValues>({
        resolver: zodResolver(accountsFormSchema),
        defaultValues: { accounts: [] },
        mode: 'onSubmit',
        reValidateMode: 'onChange',
    });

    const { fields, append, remove } = useFieldArray({ control: form.control, name: 'accounts' });
    const watchedAccounts = useWatch({ control: form.control, name: 'accounts' });

    const hydratedRef = useRef(false);
    useEffect(() => {
        if (hydratedRef.current) return;
        if (accountsQuery.isPending || banksQuery.isPending) return;
        if (banks.length === 0) return;

        hydratedRef.current = true;
        const fallbackBankId = banks[0]?.id ?? '';

        if (existingAccounts.length > 0) {
            form.reset({
                accounts: existingAccounts.map(account => ({
                    accountId: account.id,
                    name: account.name,
                    kind: account.kind,
                    bankId: account.bankId || fallbackBankId,
                    iban: account.iban ? formatIban(account.iban) : '',
                })),
            });
            return;
        }

        form.reset({
            accounts: plan.suggestedAccounts.map(acct => ({
                accountId: null,
                name: t(acct.nameKey),
                kind: acct.kind,
                bankId: fallbackBankId,
                iban: '',
            })),
        });
    }, [accountsQuery.isPending, banks, banksQuery.isPending, existingAccounts, form, plan, t]);

    const fromForm = (watchedAccounts ?? []).filter(row => row.accountId);
    const mapAccounts =
        fromForm.length > 0
            ? fromForm.map(row => ({
                  id: row.accountId!,
                  name: row.name,
                  bankId: row.bankId,
              }))
            : existingAccounts.map(account => ({
                  id: account.id,
                  name: account.name,
                  bankId: account.bankId,
              }));
    const mapAccountIds = mapAccounts.map(account => account.id);
    const defaultPlacement = jarPlacementForAccounts(jars, mapAccountIds);
    const effectivePlacement =
        mapAccountIds.length === 1
            ? defaultPlacement
            : { ...defaultPlacement, ...placementOverrides };
    const mapNeedsChoices = mapAccountIds.length > 1;
    const mapIncomplete = mapNeedsChoices && jars.some(jar => !effectivePlacement[jar.id]);

    const accountOptions: MapAccountOption[] = mapAccounts.map(account => ({
        id: account.id,
        name: account.name,
        mark: bankWithMark(banks, account.bankId).mark,
    }));

    function addAccount() {
        const previous = form.getValues('accounts');
        append({
            accountId: null,
            name: t('banks_setup.extra_account'),
            kind: AccountKind.CHECKING,
            bankId: previous.at(-1)?.bankId || banks[0]?.id || '',
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
        finishOnboarding(router);
    }

    async function handleCreateAccounts(values: AccountsFormValues) {
        if (!householdId) return;
        setPending(true);
        try {
            const existing = await api.money.accounts.list({ householdId });
            const byName = new Map(
                existing.map(account => [account.name.trim().toLowerCase(), account.id])
            );
            const nextRows: AccountsFormValues['accounts'] = [];

            for (const [index, row] of values.accounts.entries()) {
                if (row.accountId) {
                    nextRows.push(row);
                    continue;
                }

                const nameKey = row.name.trim().toLowerCase();
                const existingId = byName.get(nameKey);
                if (existingId) {
                    nextRows.push({ ...row, accountId: existingId });
                    continue;
                }

                try {
                    const acct = await api.money.accounts.create({
                        householdId,
                        name: row.name,
                        kind: row.kind,
                        bankId: row.bankId,
                        iban: resolveOptionalIban(row.iban),
                        balance: 0,
                        settlementAccountId: null,
                    });
                    byName.set(nameKey, acct.id);
                    nextRows.push({ ...row, accountId: acct.id });
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

            form.reset({ accounts: nextRows });
            void queryClient.invalidateQueries({ queryKey: apiQuery.money.accounts.list.key() });

            const accountIds = nextRows
                .map(row => row.accountId)
                .filter((id): id is string => Boolean(id));
            setPlacementOverrides(jarPlacementForAccounts(jars, accountIds));
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
            await api.money.jars.updatePlacement({
                householdId,
                placements: jars.map(jar => ({
                    jarId: jar.id,
                    accountId: effectivePlacement[jar.id] ?? null,
                })),
            });
            await api.household.updateSettings({
                householdId,
                answers: { [HouseholdAnswerKey.JAR_BANK_SETUP_DONE]: true },
            });

            const primaryAccountId = mapAccountIds[0];
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
            finishOnboarding(router);
        } catch (error) {
            showToast(apiError(error), 'error');
        } finally {
            setPending(false);
        }
    }

    let headerTitle: string;
    let headerBody: string;
    switch (screen) {
        case 'accounts':
            headerTitle = t('banks_setup.accounts_title');
            headerBody = t('banks_setup.accounts_body');
            break;
        case 'map':
            headerTitle = t('banks_setup.map_title');
            headerBody = mapNeedsChoices
                ? t('banks_setup.map_body')
                : t('banks_setup.map_body_one');
            break;
    }

    return (
        <div className="flex flex-col overflow-hidden rounded-2xl border border-line-strong bg-surface">
            <div className="flex shrink-0 items-center gap-3 border-b border-line px-5 py-3.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-accent/20 bg-accent-soft text-accent">
                    <Icon name="landmark" size="sm" color="inherit" />
                </span>
                <div className="min-w-0 flex-1">
                    <Typography as="p" size="sm" weight="bold">
                        {headerTitle}
                    </Typography>
                    <Typography as="p" size="xs" color="muted">
                        {headerBody}
                    </Typography>
                </div>
            </div>

            <div className="p-5 pb-4">
                {screen === 'accounts' ? (
                    <Form {...form}>
                        <form
                            id="jar-bank-accounts-form"
                            onSubmit={bindFormSubmit(form, handleCreateAccounts, onInvalid)}
                            className="grid gap-4"
                            noValidate>
                            <div className="grid gap-3">
                                {fields.map((field, index) => (
                                    <AccountRow
                                        key={field.id}
                                        index={index}
                                        banks={banks}
                                        canRemove={
                                            !watchedAccounts?.[index]?.accountId &&
                                            fields.length > 1
                                        }
                                        alreadyCreated={Boolean(
                                            watchedAccounts?.[index]?.accountId
                                        )}
                                        invalidIbanMessage={invalidIbanMessage}
                                        onRemove={() => remove(index)}
                                    />
                                ))}
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

                            {plan.tipKeys.map(key => (
                                <p
                                    key={key}
                                    className="rounded-xl border border-accent/20 bg-accent-soft/40 px-3.5 py-2.5 text-sm font-medium text-accent">
                                    {t(key)}
                                </p>
                            ))}
                        </form>
                    </Form>
                ) : (
                    <MapStep
                        jars={jars}
                        accountOptions={accountOptions}
                        effectivePlacement={effectivePlacement}
                        mapNeedsChoices={mapNeedsChoices}
                        mapIncomplete={mapIncomplete}
                        onPlace={(jarId, accountId) =>
                            setPlacementOverrides(prev => ({ ...prev, [jarId]: accountId }))
                        }
                    />
                )}
            </div>

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
                    <Button
                        size="sm"
                        disabled={pending || mapIncomplete}
                        onClick={() => void handleSaveMap()}>
                        {pending ? t('banks_setup.saving') : t('banks_setup.finish')}
                    </Button>
                )}
            </div>
        </div>
    );
}
