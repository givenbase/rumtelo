'use client';

import { api } from '@/app/_lib/api';
import { apiQuery } from '@/app/_lib/api-hooks';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { useLiveQuery } from '@rumtelo/hooks';
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    Button,
    createFormInvalidHandler,
} from '@rumtelo/ui';

import { zodResolver } from '@hookform/resolvers/zod';
import type { CategoryTemplate, MerchantPreset } from '@rumtelo/contracts';
import { JarKey, defaultGiveCategoryTemplate, jarCapabilitiesFor } from '@rumtelo/contracts';
import { z } from 'zod';

import { parseAmountToMinorUnits, todayIsoDate } from '@/app/_lib/money-input';
import { isLiveData } from '@/app/_lib/preview';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';
import { useFormDismiss } from '@/app/_lib/use-form-dismiss';
import { GivingFinder } from '@/components/features/money/giving-finder';
import { useAppShell } from '@/components/features/shell/app-shell-context';
import { useAuth } from '@/components/features/shell/auth-provider';
import { FormCreateEditShell } from '@/components/layout/form-create-edit-shell';
import { ConfirmActionButton } from './confirm-action-button';
import { resolveCategoryId, useCategoryTemplates } from './catalog-helpers';
import { ExpenseIntentField, type ExpenseIntentSelection } from './expense-intent-field';
import { FormInput } from './form-input';
import { PresetNameField } from './preset-name-field';

function resolveInflowKey(
    label: string,
    presets: ReadonlyArray<{ key: string; name: string }>
): string | null {
    const needle = label.trim().toLowerCase();
    if (!needle) return null;
    return presets.find(preset => preset.name.toLowerCase() === needle)?.key ?? null;
}

type GivePayeeMode = 'known' | 'coach';

const GIVE_PAYEE_MODES: ReadonlyArray<{ id: GivePayeeMode; label: string }> = [
    { id: 'known', label: 'I know who' },
    { id: 'coach', label: 'Help me choose' },
];

const expenseFormSchema = z.object({
    amount: z
        .string()
        .min(1, 'Amount is required')
        .refine(
            value => {
                const cents = parseAmountToMinorUnits(value);
                return cents !== null && cents > 0;
            },
            { message: 'Enter a valid amount' }
        ),
    note: z.string().max(280),
    jarId: z.string().min(1, 'Choose a jar'),
    /** Free-text label for Transaction In (gift, tax return, …). */
    label: z.string().max(120),
});

export type ExpenseFormValues = z.infer<typeof expenseFormSchema> & {
    /** Edit hydrate only — not submitted as description anymore */
    description?: string;
    counterparty?: string | null;
    categoryId?: string | null;
    /** Stable In source tag when logged from a preset. */
    inflowKey?: string | null;
    /** MerchantPreset key from URL / deep-link — preferred over counterparty name. */
    merchantKey?: string | null;
    /** CategoryTemplate key from URL / deep-link. */
    categoryKey?: string | null;
};

type ExpenseFormProps = {
    defaultValues?: Partial<ExpenseFormValues>;
    embedded?: boolean;
    mode?: 'create' | 'edit';
    /** Out = spend (negative); In = gift / top-up / refund (positive). */
    direction?: 'out' | 'in';
    /** When true (opened from a jar page), jar is fixed — no picker. */
    lockJar?: boolean;
    /** When set (inbox "Anders"), submit sorts/updates that transaction instead of creating. */
    entityId?: string;
    onSuccess?: () => void;
};

const EMPTY_INTENT: ExpenseIntentSelection = {
    vendor: '',
    merchantKey: null,
    categoryKey: null,
    categoryName: null,
    jarKey: null,
    source: null,
};

function intentFromMerchant(
    merchant: MerchantPreset,
    categories: readonly CategoryTemplate[]
): ExpenseIntentSelection {
    const category = categories.find(candidate => candidate.key === merchant.categoryTemplateKey);
    return {
        vendor: merchant.name,
        merchantKey: merchant.key,
        categoryKey: merchant.categoryTemplateKey,
        categoryName: category?.name ?? merchant.categoryTemplateKey,
        jarKey: merchant.jarKey,
        source: 'merchant',
    };
}

function buildIntentFromDefaults(
    defaults: Partial<ExpenseFormValues> | undefined,
    merchants: readonly MerchantPreset[],
    categories: readonly CategoryTemplate[]
): ExpenseIntentSelection {
    const merchantKey = defaults?.merchantKey?.trim() || '';
    if (merchantKey) {
        const merchant = merchants.find(candidate => candidate.key === merchantKey);
        if (merchant) return intentFromMerchant(merchant, categories);
        // Unknown key — fall through to name / manual.
    }

    const categoryKey = defaults?.categoryKey?.trim() || '';
    const vendor = defaults?.counterparty?.trim() || '';
    const description = defaults?.description?.trim() || '';
    const note = defaults?.note?.trim() || '';

    if (vendor) {
        const merchant =
            merchants.find(candidate => candidate.name.toLowerCase() === vendor.toLowerCase()) ??
            null;
        if (merchant) return intentFromMerchant(merchant, categories);

        const categoryFromKey = categoryKey
            ? categories.find(candidate => candidate.key === categoryKey)
            : null;
        const categoryFromDesc = categories.find(
            candidate => candidate.name.toLowerCase() === description.toLowerCase()
        );
        const category = categoryFromKey ?? categoryFromDesc ?? null;
        return {
            vendor,
            merchantKey: null,
            categoryKey: category?.key ?? null,
            categoryName: category?.name ?? null,
            jarKey: category?.jarKey ?? null,
            source: category ? 'category' : 'custom',
        };
    }

    if (categoryKey) {
        const category = categories.find(candidate => candidate.key === categoryKey);
        if (category) {
            return {
                vendor: '',
                merchantKey: null,
                categoryKey: category.key,
                categoryName: category.name,
                jarKey: category.jarKey,
                source: 'category',
            };
        }
    }

    if (description && description !== note) {
        const category = categories.find(
            candidate => candidate.name.toLowerCase() === description.toLowerCase()
        );
        if (category) {
            return {
                vendor: '',
                merchantKey: null,
                categoryKey: category.key,
                categoryName: category.name,
                jarKey: category.jarKey,
                source: 'category',
            };
        }
        return {
            vendor: description,
            merchantKey: null,
            categoryKey: null,
            categoryName: null,
            jarKey: null,
            source: 'custom',
        };
    }

    return EMPTY_INTENT;
}

/**
 * Canonical create/edit form — Galighticus pattern:
 * useForm + zodResolver → FormCreateEditShell(embedded) → FormField wrappers.
 * Create: money.transactions.create. Edit: update + sort into the chosen jar.
 */
export function ExpenseForm({
    defaultValues,
    embedded = true,
    mode = 'create',
    direction: directionProp = 'out',
    lockJar = false,
    entityId,
    onSuccess,
}: ExpenseFormProps) {
    const queryClient = useQueryClient();
    const { householdId } = useAuth();
    const { symbol } = useHouseholdCurrency();
    const { showToast } = useAppShell();
    const dismiss = useFormDismiss(onSuccess);
    const live = isLiveData(householdId);
    const propDirection: 'out' | 'in' = directionProp === 'in' ? 'in' : 'out';
    const [direction, setDirection] = useState<'out' | 'in'>(propDirection);
    const [seenDirectionProp, setSeenDirectionProp] = useState(propDirection);
    const [showNote, setShowNote] = useState(Boolean(defaultValues?.note?.trim()));
    const [intentOverride, setIntentOverride] = useState<ExpenseIntentSelection | null>(null);
    const propInflowKey = defaultValues?.inflowKey ?? null;
    const [inflowKey, setInflowKey] = useState<string | null>(propInflowKey);
    const [seenInflowKey, setSeenInflowKey] = useState(propInflowKey);

    // Reset when route/defaults change (adjust during render — no effect).
    if (propDirection !== seenDirectionProp) {
        setSeenDirectionProp(propDirection);
        setDirection(propDirection);
    }
    if (propInflowKey !== seenInflowKey) {
        setSeenInflowKey(propInflowKey);
        setInflowKey(propInflowKey);
    }

    const isIn = direction === 'in';

    const jarsQuery = useLiveQuery(
        apiQuery.money.jars.list.queryOptions({ input: { householdId: householdId! } }),
        [],
        live
    );
    const jars = useMemo(() => jarsQuery.data ?? [], [jarsQuery.data]);
    const transactionInQuery = useLiveQuery(
        apiQuery.money.catalogs.transactionInPresets.list.queryOptions({
            input: { householdId: householdId! },
        }),
        [],
        live && isIn
    );
    const transactionInPresets = useMemo(
        () => transactionInQuery.data ?? [],
        [transactionInQuery.data]
    );
    const jarChoices = useMemo(() => {
        if (isIn) return jars;
        return jars.filter(jar => jarCapabilitiesFor(jar.key).canSpend);
    }, [jars, isIn]);

    const balancesQuery = useLiveQuery(
        apiQuery.money.jars.balances.queryOptions({ input: { householdId: householdId! } }),
        [],
        live
    );

    const merchantsQuery = useLiveQuery(
        apiQuery.money.catalogs.merchantPresets.list.queryOptions({
            input: { householdId: householdId! },
        }),
        [],
        live
    );
    const categoriesQuery = useCategoryTemplates(live);

    const merchants = useMemo(() => merchantsQuery.data ?? [], [merchantsQuery.data]);
    const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);

    const categoryIconByKey = useMemo(() => {
        const map = new Map<string, string | null>();
        for (const category of categories) {
            map.set(category.key, category.icon ?? null);
        }
        return map;
    }, [categories]);

    const catalogsReady = !merchantsQuery.isLoading && !categoriesQuery.isLoading;
    const hasIdentityPrefill = Boolean(
        defaultValues?.merchantKey?.trim() ||
        defaultValues?.categoryKey?.trim() ||
        defaultValues?.counterparty?.trim() ||
        (mode === 'edit' &&
            (defaultValues?.description?.trim() || defaultValues?.counterparty?.trim()))
    );
    const resolvedIntent = useMemo(() => {
        if (!catalogsReady) return null;
        if (mode !== 'edit' && !hasIdentityPrefill) return null;
        return buildIntentFromDefaults(defaultValues, merchants, categories);
    }, [mode, catalogsReady, hasIdentityPrefill, defaultValues, merchants, categories]);

    const intent = intentOverride ?? resolvedIntent ?? EMPTY_INTENT;
    const intentReady = mode === 'create' || resolvedIntent !== null;

    const form = useForm<z.infer<typeof expenseFormSchema>>({
        defaultValues: {
            amount: defaultValues?.amount ?? '',
            note: defaultValues?.note ?? '',
            jarId: defaultValues?.jarId ?? '',
            label:
                defaultValues?.description && defaultValues.description !== defaultValues.note
                    ? defaultValues.description
                    : (defaultValues?.counterparty ?? ''),
        },
        resolver: zodResolver(expenseFormSchema),
    });

    const selectedJarId = useWatch({ control: form.control, name: 'jarId' });
    const selectedJar = useMemo(
        () => jars.find(jar => jar.id === selectedJarId) ?? null,
        [jars, selectedJarId]
    );
    const selectedJarKey = useMemo(() => selectedJar?.key ?? null, [selectedJar]);
    const isGive = selectedJarKey === JarKey.GIVE;

    // Drop intent when it belongs to another jar (adjust during render).
    const [seenJarKey, setSeenJarKey] = useState<JarKey | null>(selectedJarKey);
    if (selectedJarKey !== seenJarKey) {
        setSeenJarKey(selectedJarKey);
        if (intent.jarKey && selectedJarKey && intent.jarKey !== selectedJarKey && intentOverride) {
            setIntentOverride(null);
        }
    }

    const [givePayeeMode, setGivePayeeMode] = useState<GivePayeeMode>('known');
    const [giveOrgKey, setGiveOrgKey] = useState<string | null>(null);

    const donationsCategory = useMemo(() => defaultGiveCategoryTemplate(categories), [categories]);

    function applyGivePayee(name: string, orgKey: string | null = null) {
        setGiveOrgKey(orgKey);
        setIntentOverride({
            vendor: name,
            merchantKey: null,
            categoryKey: donationsCategory?.key ?? null,
            categoryName: donationsCategory?.name ?? null,
            jarKey: JarKey.GIVE,
            source: name.trim() ? 'custom' : null,
        });
    }

    // Leaving Give clears the special payee path (adjust during render).
    if (!isGive && (giveOrgKey || givePayeeMode !== 'known' || intent.jarKey === JarKey.GIVE)) {
        if (giveOrgKey) setGiveOrgKey(null);
        if (givePayeeMode !== 'known') setGivePayeeMode('known');
        if (intent.jarKey === JarKey.GIVE && intentOverride) {
            setIntentOverride(null);
        }
    }

    // Prefill Give payee from edit / deep-link counterparty once.
    const [giveHydrated, setGiveHydrated] = useState(false);
    if (isGive && !giveHydrated && !isIn) {
        setGiveHydrated(true);
        const prefill = (defaultValues?.counterparty ?? '').trim();
        if (prefill) {
            applyGivePayee(prefill, null);
            setGivePayeeMode('known');
        } else if (intent.jarKey !== JarKey.GIVE) {
            // Drop merchant intent from another jar when landing on Give.
            setIntentOverride({
                vendor: '',
                merchantKey: null,
                categoryKey: donationsCategory?.key ?? null,
                categoryName: donationsCategory?.name ?? null,
                jarKey: JarKey.GIVE,
                source: null,
            });
        }
    }
    if (!isGive && giveHydrated) {
        setGiveHydrated(false);
    }
    useEffect(() => {
        // Wait for jars — otherwise a prefilled jarId gets overwritten while the list is empty.
        if (jarChoices.length === 0) return;
        const current = form.getValues('jarId');
        if (current && jarChoices.some(jar => jar.id === current)) return;
        // Prefer the locked / prefilled jar even if it is not in jarChoices yet (loading race).
        if (lockJar && defaultValues?.jarId) {
            form.setValue('jarId', defaultValues.jarId);
            return;
        }
        if (jarChoices[0]?.id) form.setValue('jarId', jarChoices[0].id);
    }, [jarChoices, form, lockJar, defaultValues?.jarId]);

    useEffect(() => {
        // Locked jar context wins — don't let merchant intent switch jars.
        if (lockJar) return;
        if (!intent.jarKey) return;
        const jar = jarChoices.find(candidate => candidate.key === intent.jarKey);
        if (jar) form.setValue('jarId', jar.id);
    }, [intent.jarKey, jarChoices, form, lockJar]);

    const onError = createFormInvalidHandler(({ title, description }) => {
        showToast(description ?? title, 'error');
    });

    const saveMutation = useMutation({
        mutationFn: async (values: z.infer<typeof expenseFormSchema>) => {
            if (!householdId) throw new Error('No household');
            if (!isIn && !intent.vendor.trim() && !intent.categoryKey) {
                throw new Error(isGive ? 'Choose who you gave to' : 'Pick a vendor or type');
            }
            const label = values.label.trim();
            if (isIn && !label) {
                throw new Error('Say where this money came from');
            }
            const cents = parseAmountToMinorUnits(values.amount);
            if (cents === null || cents <= 0) throw new Error('Invalid amount');
            const signedAmount = isIn ? cents : -cents;

            const vendor = isIn ? label : intent.vendor.trim();
            const note = values.note.trim();
            const description = isIn
                ? note || label || 'Money in'
                : note || intent.categoryName?.trim() || vendor || 'Transaction';

            let categoryId: string | null = null;
            if (!isIn && intent.categoryName) {
                const jarBalance = (balancesQuery.data ?? []).find(
                    candidate => candidate.id === values.jarId
                );
                categoryId = await resolveCategoryId({
                    api,
                    householdId,
                    jarId: values.jarId,
                    categoryName: intent.categoryName,
                    existing: jarBalance?.categories ?? [],
                });
            }

            if (mode === 'edit' && entityId) {
                await api.money.transactions.update({
                    id: entityId,
                    householdId,
                    description,
                    amount: signedAmount,
                    note: note || null,
                    counterparty: vendor || null,
                    categoryId,
                    inflowKey: isIn ? inflowKey : null,
                });
                return api.money.transactions.sort({
                    householdId,
                    transactionId: entityId,
                    jarId: values.jarId,
                    categoryId,
                    createRule: false,
                });
            }

            return api.money.transactions.create({
                householdId,
                description,
                amount: signedAmount,
                bookedOn: todayIsoDate(),
                jarId: values.jarId,
                accountId: null,
                categoryId,
                counterparty: vendor || null,
                note: note || null,
                inflowKey: isIn ? inflowKey : null,
            });
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({
                queryKey: apiQuery.money.transactions.list.key(),
            });
            void queryClient.invalidateQueries({
                queryKey: apiQuery.money.transactions.inbox.key(),
            });
            void queryClient.invalidateQueries({ queryKey: apiQuery.money.jars.balances.key() });
            void queryClient.invalidateQueries({ queryKey: apiQuery.money.dashboard.get.key() });
            showToast(
                mode === 'edit' ? 'Transaction updated' : isIn ? 'In saved' : 'Out saved',
                'success'
            );
            dismiss();
        },
        onError: error =>
            showToast(error instanceof Error ? error.message : 'Save failed', 'error'),
    });

    const removeMutation = useMutation({
        mutationFn: async () => {
            if (!householdId || !entityId) throw new Error('No household');
            return api.money.transactions.remove({ householdId, id: entityId });
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({
                queryKey: apiQuery.money.transactions.list.key(),
            });
            void queryClient.invalidateQueries({
                queryKey: apiQuery.money.transactions.inbox.key(),
            });
            void queryClient.invalidateQueries({ queryKey: apiQuery.money.jars.balances.key() });
            void queryClient.invalidateQueries({ queryKey: apiQuery.money.dashboard.get.key() });
            showToast('Transaction deleted', 'success');
            dismiss();
        },
        onError: () => showToast('Delete failed', 'error'),
    });

    async function onSubmit(values: z.infer<typeof expenseFormSchema>) {
        if (!live) {
            showToast('Sign in to save transactions', 'error');
            return;
        }
        if (!isIn && !intent.vendor && !intent.categoryKey) {
            showToast(isGive ? 'Choose who you gave to' : 'Pick a vendor or a type first', 'error');
            return;
        }
        if (isIn && !values.label.trim()) {
            showToast('Say where this money came from (gift, tax return, …)', 'error');
            return;
        }
        await saveMutation.mutateAsync(values);
    }

    const busy =
        form.formState.isSubmitting ||
        saveMutation.isPending ||
        removeMutation.isPending ||
        (live && jarChoices.length === 0) ||
        (mode === 'edit' && !intentReady);

    const noteValue = useWatch({ control: form.control, name: 'note' }) ?? '';

    return (
        <FormCreateEditShell
            embedded={embedded}
            form={form}
            onError={onError}
            onSubmit={onSubmit}
            sidebar={
                <div className="grid gap-2">
                    <Button type="submit" className="w-full" disabled={busy}>
                        {saveMutation.isPending || form.formState.isSubmitting
                            ? 'Working…'
                            : mode === 'edit'
                              ? 'Save changes'
                              : isIn
                                ? 'Save in'
                                : 'Save out'}
                    </Button>
                    {mode === 'edit' && entityId ? (
                        <ConfirmActionButton
                            variant="ghost"
                            className="w-full text-danger hover:bg-danger/10 hover:text-danger"
                            disabled={
                                form.formState.isSubmitting ||
                                saveMutation.isPending ||
                                removeMutation.isPending
                            }
                            pending={removeMutation.isPending}
                            label="Delete"
                            confirmLabel="Click again to delete"
                            onConfirm={() => void removeMutation.mutateAsync()}
                        />
                    ) : null}
                </div>
            }>
            <div className="grid gap-2">
                <p className="font-mono text-[10px] font-semibold tracking-wider text-fg-muted uppercase">
                    Direction
                </p>
                <div className="flex gap-1 rounded-full bg-raised p-1">
                    {(
                        [
                            ['out', 'Out'],
                            ['in', 'In'],
                        ] as const
                    ).map(([key, label]) => (
                        <button
                            key={key}
                            type="button"
                            disabled={busy}
                            onClick={() => {
                                setDirection(key);
                                if (key === 'out') setInflowKey(null);
                            }}
                            className={
                                direction === key
                                    ? 'flex-1 rounded-full bg-accent px-3 py-2 font-mono text-[10px] font-medium tracking-wide text-on-accent uppercase'
                                    : 'flex-1 rounded-full px-3 py-2 font-mono text-[10px] font-medium tracking-wide text-fg-muted uppercase hover:text-fg'
                            }>
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {isIn ? null : lockJar && selectedJar ? (
                <div className="grid gap-1.5">
                    <p className="font-mono text-[10px] font-semibold tracking-wider text-fg-muted uppercase">
                        Jar
                    </p>
                    <div className="flex items-center gap-3 rounded-xl border border-accent/40 bg-accent-soft px-3 py-3">
                        <span className="text-lg" aria-hidden>
                            {selectedJar.icon ?? '◇'}
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-fg">{selectedJar.name}</p>
                            <p className="font-mono text-[10px] tracking-wide text-fg-muted uppercase">
                                This jar
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                <FormField
                    control={form.control}
                    name="jarId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Jar</FormLabel>
                            <FormControl>
                                <select
                                    className="h-11 w-full rounded-lg border border-line bg-raised px-3 text-sm text-fg focus:border-accent focus:outline-none"
                                    {...field}>
                                    {jarChoices.length === 0 ? (
                                        <option value="">No jars — complete setup first</option>
                                    ) : (
                                        jarChoices.map(jar => (
                                            <option key={jar.id} value={jar.id}>
                                                {jar.icon ? `${jar.icon} ` : ''}
                                                {jar.name}
                                            </option>
                                        ))
                                    )}
                                </select>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            )}

            {isIn ? (
                <FormField
                    control={form.control}
                    name="label"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Where did it come from?</FormLabel>
                            <FormControl>
                                <PresetNameField
                                    value={field.value}
                                    lockPresets
                                    freeTextKeys={['OTHER_IN']}
                                    initialLockedKey={
                                        defaultValues?.inflowKey &&
                                        defaultValues.inflowKey !== 'OTHER_IN'
                                            ? defaultValues.inflowKey
                                            : null
                                    }
                                    onChange={value => {
                                        field.onChange(value);
                                        const resolved = resolveInflowKey(
                                            value,
                                            transactionInPresets
                                        );
                                        setInflowKey(current => {
                                            if (resolved) return resolved;
                                            if (current === 'OTHER_IN') return 'OTHER_IN';
                                            if (!value.trim()) return null;
                                            return null;
                                        });
                                    }}
                                    onClear={() => {
                                        setInflowKey(null);
                                    }}
                                    options={transactionInPresets}
                                    placeholder="Gift, tax return…"
                                    freeTextPlaceholder="Describe where it came from…"
                                    disabled={busy}
                                    onSelect={preset => {
                                        setInflowKey(preset.key);
                                        if (lockJar) return;
                                        const full = transactionInPresets.find(
                                            candidate => candidate.key === preset.key
                                        );
                                        if (!full?.jarKey) return;
                                        const jar = jars.find(
                                            candidate => candidate.key === full.jarKey
                                        );
                                        if (jar) form.setValue('jarId', jar.id);
                                    }}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            ) : isGive ? (
                <div className="grid gap-3">
                    <p className="font-mono text-[10px] font-semibold tracking-wider text-fg-muted uppercase">
                        To whom
                    </p>
                    <p className="text-xs leading-relaxed text-fg-muted">
                        One-time gift — shows on Give and in Out transactions. For a recurring gift,
                        add a fixed cost instead.
                    </p>
                    <div
                        className="flex flex-wrap gap-2"
                        role="group"
                        aria-label="How do you want to pick?">
                        {GIVE_PAYEE_MODES.map(option => {
                            const on = givePayeeMode === option.id;
                            return (
                                <button
                                    key={option.id}
                                    type="button"
                                    disabled={busy}
                                    aria-pressed={on}
                                    onClick={() => setGivePayeeMode(option.id)}
                                    className={
                                        on
                                            ? 'rounded-full border border-accent/40 bg-accent-soft px-3 py-1.5 font-mono text-xs text-accent'
                                            : 'rounded-full border border-line bg-raised px-3 py-1.5 font-mono text-xs text-fg-secondary hover:border-accent-hover hover:text-accent'
                                    }>
                                    {option.label}
                                </button>
                            );
                        })}
                    </div>
                    <p className="text-xs leading-relaxed text-fg-faint">
                        I know who — type whoever you already give to. Help me choose — Coach
                        shortlist with independent checks (Doneer Effectief, GiveWell, ACE, CBF).
                    </p>
                    {givePayeeMode === 'known' ? (
                        <FormInput
                            placeholder="e.g. Giro555, your church, KWF"
                            value={intent.vendor}
                            disabled={busy}
                            onChange={event => {
                                applyGivePayee(event.target.value, null);
                            }}
                        />
                    ) : (
                        <GivingFinder
                            defaultOpen
                            selectedKey={giveOrgKey}
                            selectedName={intent.vendor}
                            onPick={organisation => {
                                applyGivePayee(organisation.name, organisation.key);
                            }}
                        />
                    )}
                </div>
            ) : (
                <div className="grid gap-2">
                    <p className="font-mono text-[10px] font-semibold tracking-wider text-fg-muted uppercase">
                        What was it?
                    </p>
                    <ExpenseIntentField
                        value={intent}
                        onChange={setIntentOverride}
                        merchants={merchants}
                        categories={categories}
                        categoryIconByKey={categoryIconByKey}
                        jarKey={selectedJarKey}
                        disabled={busy}
                    />
                </div>
            )}

            <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Amount ({symbol})</FormLabel>
                        <FormControl>
                            <FormInput inputMode="decimal" placeholder="0,00" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            {isIn ? (
                lockJar && selectedJar ? (
                    <div className="grid gap-1.5">
                        <p className="font-mono text-[10px] font-semibold tracking-wider text-fg-muted uppercase">
                            Into jar
                        </p>
                        <div className="flex items-center gap-3 rounded-xl border border-accent/40 bg-accent-soft px-3 py-3">
                            <span className="text-lg" aria-hidden>
                                {selectedJar.icon ?? '◇'}
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-fg">{selectedJar.name}</p>
                                <p className="font-mono text-[10px] tracking-wide text-fg-muted uppercase">
                                    This jar
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <FormField
                        control={form.control}
                        name="jarId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Into jar</FormLabel>
                                <FormControl>
                                    <select
                                        className="h-11 w-full rounded-lg border border-line bg-raised px-3 text-sm text-fg focus:border-accent focus:outline-none"
                                        {...field}>
                                        {jarChoices.length === 0 ? (
                                            <option value="">No jars — complete setup first</option>
                                        ) : (
                                            jarChoices.map(jar => (
                                                <option key={jar.id} value={jar.id}>
                                                    {jar.icon ? `${jar.icon} ` : ''}
                                                    {jar.name}
                                                </option>
                                            ))
                                        )}
                                    </select>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )
            ) : null}

            {showNote || noteValue ? (
                <FormField
                    control={form.control}
                    name="note"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Note</FormLabel>
                            <FormControl>
                                <FormInput
                                    placeholder={
                                        isIn
                                            ? 'Optional — e.g. from aunt'
                                            : 'Optional — e.g. kids lunch'
                                    }
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            ) : (
                <button
                    type="button"
                    className="justify-self-start font-mono text-xs tracking-wide text-accent uppercase hover:underline"
                    onClick={() => setShowNote(true)}>
                    Add note
                </button>
            )}
        </FormCreateEditShell>
    );
}
