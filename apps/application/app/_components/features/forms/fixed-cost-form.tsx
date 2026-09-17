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
    VendorMark,
    createFormInvalidHandler,
} from '@rumtelo/ui';

import { zodResolver } from '@hookform/resolvers/zod';
import type { CategoryTemplate, MerchantPreset } from '@rumtelo/contracts';
import {
    Cadence,
    FlowDirection,
    JarKey,
    defaultGiveCategoryTemplate,
    jarCapabilitiesFor,
    matchesAudience,
} from '@rumtelo/contracts';
import { cn } from '@rumtelo/utils';
import { z } from 'zod';

import { parseAmountToMinorUnits } from '@/app/_lib/money-input';
import { catalogMarkChrome } from '@/app/_lib/party-mark-chrome';
import { isLiveData } from '@/app/_lib/preview';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';
import { useFormDismiss } from '@/app/_lib/use-form-dismiss';
import { useJarCatalog } from '@/app/_lib/use-jar-catalog';
import { partyMark } from '@/app/_lib/vendor-brands';
import { GivingFinder } from '@/components/features/money/giving-finder';
import { useAppShell } from '@/components/features/shell/app-shell-context';
import { useAuth } from '@/components/features/shell/auth-provider';
import { FormCreateEditShell } from '@/components/layout/form-create-edit-shell';

import { ConfirmActionButton } from './confirm-action-button';
import { resolveCategoryId, useCategoryTemplates } from './catalog-helpers';
import { FormInput } from './form-input';
import {
    MERCHANT_OPTION_PREFIX,
    isMerchantOptionKey,
    merchantKeyFromOptionKey,
    merchantsToNameOptions,
} from './merchant-name-options';
import { PresetNameField, type NamePresetOption } from './preset-name-field';

/** Cap suggested vendor chips so the form stays scannable. */
const MAX_VENDOR_CHIPS = 16;

export type GivePayeeMode = 'known' | 'coach' | 'manual';

/** Two user-facing paths. `manual` is a URL alias of “I know who”. */
const GIVE_PAYEE_MODES: ReadonlyArray<{ id: GivePayeeMode; label: string }> = [
    { id: 'known', label: 'I know who' },
    { id: 'coach', label: 'Help me choose' },
];

function isKnowWho(mode: GivePayeeMode | null): boolean {
    return mode === 'known' || mode === 'manual';
}

const moneyInput = z
    .string()
    .min(1, 'Amount is required')
    .refine(
        value => {
            const cents = parseAmountToMinorUnits(value);
            return cents !== null && cents > 0;
        },
        { message: 'Enter a valid amount' }
    );

const fixedCostFormSchema = z.object({
    name: z.string().min(1, 'Name is required').max(120),
    /** Who receives it — the organisation for Give, the landlord for rent. */
    counterparty: z.string().max(160).optional(),
    amount: moneyInput,
    jarId: z.string().min(1, 'Choose a jar'),
    categoryId: z.string().nullable().optional(),
    dueDay: z.string().optional(),
});

export type FixedCostFormValues = z.infer<typeof fixedCostFormSchema>;

type FixedCostFormProps = {
    defaultValues?: Partial<FixedCostFormValues>;
    /** Soul → Giving deep-link: lock the Give “To whom” path. */
    defaultGivePayeeMode?: GivePayeeMode | null;
    /** Coach catalog key from URL — resolved to counterparty name once orgs load. */
    defaultOrgKey?: string | null;
    /** Merchant catalog key from URL — resolved to counterparty name once merchants load. */
    defaultMerchantKey?: string | null;
    embedded?: boolean;
    mode?: 'create' | 'edit';
    entityId?: string;
    onSuccess?: () => void;
};

function nameMatches(left: string | null | undefined, right: string) {
    return (left ?? '').trim().toLowerCase() === right.trim().toLowerCase();
}

export function FixedCostForm({
    defaultValues,
    defaultGivePayeeMode = null,
    defaultOrgKey = null,
    defaultMerchantKey = null,
    embedded = true,
    mode = 'create',
    entityId,
    onSuccess,
}: FixedCostFormProps) {
    const queryClient = useQueryClient();
    const { householdId } = useAuth();
    const { symbol } = useHouseholdCurrency();
    const { showToast } = useAppShell();
    const dismiss = useFormDismiss(onSuccess);
    const live = isLiveData(householdId);
    /** Preset category template key — resolved to a household category on save. */
    const [pendingCategoryTemplateKey, setPendingCategoryTemplateKey] = useState<string | null>(
        null
    );
    /** Bill-type preset key (VPN, INTERNET, …) — narrows Paid-to chips within Subscriptions. */
    const [selectedBillPresetKey, setSelectedBillPresetKey] = useState<string | null>(null);
    /** Narrow bill-type suggestions by lifestyle audience from the catalog. */
    const [audienceFilter, setAudienceFilter] = useState<string | null>(null);
    const [customPayee, setCustomPayee] = useState(false);
    /** Give only — null until the household picks a path (or prefill resolves one). */
    const [givePayeeMode, setGivePayeeMode] = useState<GivePayeeMode | null>(
        defaultGivePayeeMode ?? null
    );
    const [giveOrgKey, setGiveOrgKey] = useState<string | null>(defaultOrgKey);
    // Keys / display-name counterparty still need catalog resolve; payeeMode-only can stay locked.
    const [giveModeHydrated, setGiveModeHydrated] = useState(
        Boolean(defaultGivePayeeMode) &&
            !defaultOrgKey &&
            !defaultMerchantKey &&
            !defaultValues?.counterparty?.trim()
    );
    const [seenGivePayeeMode, setSeenGivePayeeMode] = useState(defaultGivePayeeMode);
    const [seenOrgKey, setSeenOrgKey] = useState(defaultOrgKey);
    const [seenMerchantKey, setSeenMerchantKey] = useState(defaultMerchantKey);

    if (
        defaultGivePayeeMode !== seenGivePayeeMode ||
        defaultOrgKey !== seenOrgKey ||
        defaultMerchantKey !== seenMerchantKey
    ) {
        setSeenGivePayeeMode(defaultGivePayeeMode);
        setSeenOrgKey(defaultOrgKey);
        setSeenMerchantKey(defaultMerchantKey);
        setGivePayeeMode(defaultGivePayeeMode ?? null);
        setGiveOrgKey(defaultOrgKey);
        const needsResolve = Boolean(
            defaultOrgKey || defaultMerchantKey || defaultValues?.counterparty?.trim()
        );
        setGiveModeHydrated(Boolean(defaultGivePayeeMode) && !needsResolve);
    }

    const jarsQuery = useLiveQuery(
        apiQuery.money.jars.list.queryOptions({ input: { householdId: householdId! } }),
        [],
        live
    );
    const jars = useMemo(() => jarsQuery.data ?? [], [jarsQuery.data]);
    const billJars = useMemo(() => {
        const eligible = jars.filter(jar => jarCapabilitiesFor(jar.key).allowsFixedCosts);
        if (mode !== 'edit') return eligible;
        const current = defaultValues?.jarId
            ? jars.find(jar => jar.id === defaultValues.jarId)
            : undefined;
        if (current && !eligible.some(jar => jar.id === current.id)) {
            return [...eligible, current];
        }
        return eligible;
    }, [jars, mode, defaultValues]);

    const balancesQuery = useLiveQuery(
        apiQuery.money.jars.balances.queryOptions({ input: { householdId: householdId! } }),
        [],
        live
    );

    const presetsQuery = useLiveQuery(
        apiQuery.money.catalogs.fixedCostPresets.list.queryOptions({
            input: { householdId: householdId! },
        }),
        [],
        live
    );
    const audiencesQuery = useLiveQuery(
        apiQuery.money.catalogs.audiences.list.queryOptions({
            input: { householdId: householdId! },
        }),
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
    const givingOrgsQuery = useLiveQuery(
        apiQuery.money.catalogs.givingOrganisations.list.queryOptions({
            input: { householdId: householdId! },
        }),
        [],
        live
    );
    const categoriesQuery = useCategoryTemplates(live);

    const categoryByKey = useMemo(() => {
        const map = new Map<string, Pick<CategoryTemplate, 'name' | 'icon'>>();
        for (const category of categoriesQuery.data ?? []) {
            map.set(category.key, { name: category.name, icon: category.icon });
        }
        return map;
    }, [categoriesQuery.data]);

    /** Default Give spend category from the catalog (Donations before Gifts). */
    const giveCategoryTemplateKey = useMemo(
        () => defaultGiveCategoryTemplate(categoriesQuery.data ?? [])?.key ?? null,
        [categoriesQuery.data]
    );

    /** Household category display name → catalog template key (for merchant chips). */
    const templateKeyByCategoryName = useMemo(() => {
        const map = new Map<string, string>();
        for (const category of categoriesQuery.data ?? []) {
            map.set(category.name.trim().toLowerCase(), category.key);
        }
        return map;
    }, [categoriesQuery.data]);

    const merchants = useMemo(() => merchantsQuery.data ?? [], [merchantsQuery.data]);
    const fixedCostPresets = useMemo(() => presetsQuery.data ?? [], [presetsQuery.data]);
    const audiences = useMemo(() => audiencesQuery.data ?? [], [audiencesQuery.data]);

    /** Chip audiences from the catalog (baseline rows stay out of the chip row). */
    const audienceChips = useMemo(
        () => audiences.filter(audience => !audience.isBaseline),
        [audiences]
    );
    const baselineAudienceKeys = useMemo(
        () => audiences.filter(audience => audience.isBaseline).map(audience => audience.key),
        [audiences]
    );

    /** Bill-type presets + brand catalog — type Netflix, get Media + Play auto-filled. */
    const nameOptions = useMemo((): NamePresetOption[] => {
        const fromMerchants = merchantsToNameOptions(merchants, {
            keyPrefix: MERCHANT_OPTION_PREFIX,
            categoryMeta: categoryByKey,
            excludeGivingLinked: true,
        });
        const fromPresets: NamePresetOption[] = fixedCostPresets
            .filter(preset =>
                matchesAudience(preset.audienceKeys, audienceFilter, baselineAudienceKeys)
            )
            .map(preset => {
                const category = categoryByKey.get(preset.categoryTemplateKey);
                return {
                    key: preset.key,
                    name: preset.name,
                    group: category?.name ?? preset.categoryTemplateKey,
                    icon: category?.icon ?? null,
                };
            });
        // Brands first so “netflix” hits Netflix before “Streaming video”.
        return [...fromMerchants, ...fromPresets];
    }, [merchants, fixedCostPresets, categoryByKey, audienceFilter, baselineAudienceKeys]);

    const form = useForm<FixedCostFormValues>({
        defaultValues: {
            name: defaultValues?.name ?? '',
            counterparty: defaultValues?.counterparty ?? '',
            amount: defaultValues?.amount ?? '',
            jarId: defaultValues?.jarId ?? '',
            categoryId: defaultValues?.categoryId ?? null,
            dueDay: defaultValues?.dueDay ?? '',
        },
        resolver: zodResolver(fixedCostFormSchema),
    });

    const selectedJarId = useWatch({ control: form.control, name: 'jarId' });
    const selectedCategoryId = useWatch({ control: form.control, name: 'categoryId' });
    const counterparty = useWatch({ control: form.control, name: 'counterparty' });
    const isGive = useMemo(
        () => jars.find(jar => jar.id === selectedJarId)?.key === JarKey.GIVE,
        [jars, selectedJarId]
    );

    const jarCategories = useMemo(() => {
        const jar = (balancesQuery.data ?? []).find(row => row.id === selectedJarId);
        return (jar?.categories ?? []).filter(category => !category.isArchived);
    }, [balancesQuery.data, selectedJarId]);

    /**
     * Category → merchants: from preset pick, or household category matched to
     * a catalog template by name (same link expense create already uses).
     */
    const activeCategoryTemplateKey = useMemo(() => {
        if (pendingCategoryTemplateKey) return pendingCategoryTemplateKey;
        if (!selectedCategoryId) return null;
        const householdCategory = jarCategories.find(
            category => category.id === selectedCategoryId
        );
        if (!householdCategory) return null;
        return templateKeyByCategoryName.get(householdCategory.name.trim().toLowerCase()) ?? null;
    }, [pendingCategoryTemplateKey, selectedCategoryId, jarCategories, templateKeyByCategoryName]);

    const vendorsForCategory = useMemo(() => {
        const byKey = new Map(merchants.map(merchant => [merchant.key, merchant]));
        // Bill preset owns Paid-to chips in the catalog (cross-category OK).
        if (selectedBillPresetKey) {
            const bill = fixedCostPresets.find(preset => preset.key === selectedBillPresetKey);
            const keys = bill?.suggestedMerchantKeys ?? [];
            if (keys.length === 0) return [] as MerchantPreset[];
            return keys
                .map(key => byKey.get(key))
                .filter((merchant): merchant is MerchantPreset => Boolean(merchant))
                .slice(0, MAX_VENDOR_CHIPS);
        }
        if (!activeCategoryTemplateKey) return [] as MerchantPreset[];
        return merchants
            .filter(
                merchant =>
                    merchant.categoryTemplateKey === activeCategoryTemplateKey &&
                    !merchant.givingOrganisationKey
            )
            .slice(0, MAX_VENDOR_CHIPS);
    }, [merchants, activeCategoryTemplateKey, selectedBillPresetKey, fixedCostPresets]);

    const givingOrgNames = useMemo(() => givingOrgsQuery.data ?? [], [givingOrgsQuery.data]);

    const showPayeeInput = mode === 'edit' || customPayee || vendorsForCategory.length === 0;

    useEffect(() => {
        // Wait for jars — otherwise a prefilled Give jarId gets overwritten while the list is empty.
        if (billJars.length === 0) return;
        const current = form.getValues('jarId');
        if (current && billJars.some(jar => jar.id === current)) return;
        const necessities = billJars.find(jar => jar.key === JarKey.NECESSITIES);
        const fallback = necessities?.id ?? billJars[0]?.id;
        if (fallback) form.setValue('jarId', fallback);
    }, [billJars, form]);

    // Leave Give → drop the chooser path (adjust during render — no effect).
    if (!isGive && (givePayeeMode !== null || giveModeHydrated || giveOrgKey)) {
        setGivePayeeMode(null);
        setGiveOrgKey(null);
        setGiveModeHydrated(false);
    }

    // Resolve initial Give path once catalogs are ready.
    // Keys win; display-name counterparty is fallback → coach / known / manual.
    const needsGivingOrgs = Boolean(
        defaultOrgKey ||
        defaultValues?.counterparty?.trim() ||
        form.getValues('counterparty')?.trim()
    );
    const giveCatalogsReady =
        !merchantsQuery.isLoading && (!needsGivingOrgs || !givingOrgsQuery.isLoading);
    if (isGive && !giveModeHydrated && giveCatalogsReady) {
        const orgKey = defaultOrgKey?.trim() || null;
        const merchantKey = defaultMerchantKey?.trim() || null;
        const prefillName = (
            defaultValues?.counterparty ??
            form.getValues('counterparty') ??
            ''
        ).trim();

        if (orgKey) {
            const org = givingOrgNames.find(row => row.key === orgKey);
            if (org) {
                form.setValue('counterparty', org.name, { shouldDirty: false });
                setGiveOrgKey(org.key);
                setGivePayeeMode(defaultGivePayeeMode ?? 'coach');
                if (!form.getValues('categoryId') && !pendingCategoryTemplateKey) {
                    if (giveCategoryTemplateKey) {
                        setPendingCategoryTemplateKey(giveCategoryTemplateKey);
                    }
                }
            } else {
                // Unknown key — keep any name as manual typing.
                if (prefillName) {
                    form.setValue('counterparty', prefillName, { shouldDirty: false });
                }
                setGiveOrgKey(null);
                setGivePayeeMode(defaultGivePayeeMode ?? (prefillName ? 'known' : 'coach'));
                setCustomPayee(Boolean(prefillName));
            }
        } else if (merchantKey) {
            const merchant = merchants.find(row => row.key === merchantKey);
            if (merchant) {
                form.setValue('counterparty', merchant.name, { shouldDirty: false });
                setGiveOrgKey(null);
                setGivePayeeMode(defaultGivePayeeMode ?? 'known');
            } else {
                if (prefillName) {
                    form.setValue('counterparty', prefillName, { shouldDirty: false });
                }
                setGivePayeeMode(defaultGivePayeeMode ?? 'known');
                setCustomPayee(Boolean(prefillName));
            }
        } else if (prefillName) {
            const coachOrg = givingOrgNames.find(org => nameMatches(org.name, prefillName));
            if (coachOrg && defaultGivePayeeMode === 'coach') {
                setGiveOrgKey(coachOrg.key);
                setGivePayeeMode('coach');
            } else {
                setGivePayeeMode(defaultGivePayeeMode ?? 'known');
                setCustomPayee(true);
            }
        } else if (defaultGivePayeeMode) {
            setGivePayeeMode(defaultGivePayeeMode === 'manual' ? 'known' : defaultGivePayeeMode);
            setCustomPayee(isKnowWho(defaultGivePayeeMode));
        } else {
            setGivePayeeMode('known');
        }
        setGiveModeHydrated(true);
    }

    function selectGivePayeeMode(next: GivePayeeMode) {
        const resolved = next === 'manual' ? 'known' : next;
        if (resolved === givePayeeMode) return;
        setGivePayeeMode(resolved);
        setGiveOrgKey(null);
        setCustomPayee(resolved === 'known');
        form.setValue('counterparty', '', { shouldDirty: false });
    }

    const onError = createFormInvalidHandler(({ title, description }) => {
        showToast(description ?? title, 'error');
    });

    const saveMutation = useMutation({
        mutationFn: async (values: FixedCostFormValues) => {
            if (!householdId) throw new Error('No household');
            const cents = parseAmountToMinorUnits(values.amount);
            if (cents === null || cents <= 0) throw new Error('Invalid amount');
            const due = values.dueDay?.trim() ? Number(values.dueDay) : null;
            const dueDay = due !== null && due >= 1 && due <= 31 ? due : null;
            const name = values.name.trim();
            const counterpartyValue = values.counterparty?.trim() || null;

            let categoryId = values.categoryId ?? null;
            const templateKey =
                pendingCategoryTemplateKey ??
                (() => {
                    const merchant = merchants.find(
                        row => row.name.toLowerCase() === name.toLowerCase()
                    );
                    if (merchant) return merchant.categoryTemplateKey;
                    return (
                        fixedCostPresets.find(
                            preset => preset.name.toLowerCase() === name.toLowerCase()
                        )?.categoryTemplateKey ?? null
                    );
                })();
            const categoryName = templateKey
                ? (categoryByKey.get(templateKey)?.name ?? null)
                : null;

            if (!categoryId && categoryName) {
                const jarBalance = (balancesQuery.data ?? []).find(j => j.id === values.jarId);
                categoryId = await resolveCategoryId({
                    api,
                    householdId,
                    jarId: values.jarId,
                    categoryName,
                    existing: jarBalance?.categories ?? [],
                });
            }
            setPendingCategoryTemplateKey(null);

            if (mode === 'edit' && entityId) {
                return api.money.fixedCosts.update({
                    id: entityId,
                    householdId,
                    name,
                    counterparty: counterpartyValue,
                    amount: cents,
                    jarId: values.jarId,
                    categoryId,
                    dueDay,
                });
            }
            return api.money.fixedCosts.create({
                householdId,
                jarId: values.jarId,
                categoryId,
                name,
                counterparty: counterpartyValue,
                amount: cents,
                cadence: Cadence.MONTHLY,
                dueDay,
                direction: FlowDirection.OUT,
                isActive: true,
                endsOn: null,
                note: null,
            });
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: apiQuery.money.fixedCosts.list.key() });
            void queryClient.invalidateQueries({ queryKey: apiQuery.money.fixedCosts.byJar.key() });
            void queryClient.invalidateQueries({ queryKey: apiQuery.money.jars.balances.key() });
            showToast(mode === 'edit' ? 'Fixed cost updated' : 'Fixed cost saved', 'success');
            dismiss();
        },
        onError: () => showToast('Save failed', 'error'),
    });

    const removeMutation = useMutation({
        mutationFn: async () => {
            if (!householdId || !entityId) throw new Error('No household');
            return api.money.fixedCosts.remove({ householdId: householdId, id: entityId });
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: apiQuery.money.fixedCosts.list.key() });
            void queryClient.invalidateQueries({ queryKey: apiQuery.money.fixedCosts.byJar.key() });
            void queryClient.invalidateQueries({ queryKey: apiQuery.money.jars.balances.key() });
            showToast('Fixed cost deleted', 'success');
            dismiss();
        },
        onError: () => showToast('Delete failed', 'error'),
    });

    async function onSubmit(values: FixedCostFormValues) {
        if (!live) {
            showToast('Sign in to save fixed costs', 'error');
            return;
        }
        await saveMutation.mutateAsync(values);
    }

    const busy =
        form.formState.isSubmitting ||
        saveMutation.isPending ||
        removeMutation.isPending ||
        (live && jars.length === 0);

    function applyCategoryFromTemplate(jarId: string, templateKey: string) {
        const categoryName = categoryByKey.get(templateKey)?.name;
        if (!categoryName) {
            setPendingCategoryTemplateKey(templateKey);
            form.setValue('categoryId', null);
            return;
        }
        const jarBalance = (balancesQuery.data ?? []).find(row => row.id === jarId);
        const match = (jarBalance?.categories ?? []).find(
            category =>
                !category.isArchived &&
                category.name.trim().toLowerCase() === categoryName.trim().toLowerCase()
        );
        if (match) {
            setPendingCategoryTemplateKey(null);
            form.setValue('categoryId', match.id);
            return;
        }
        setPendingCategoryTemplateKey(templateKey);
        form.setValue('categoryId', null);
    }

    const pendingLabel = pendingCategoryTemplateKey
        ? categoryByKey.get(pendingCategoryTemplateKey)?.name
        : null;
    const { byKey: jarByKey } = useJarCatalog();
    const selectedJarKey = jars.find(jar => jar.id === selectedJarId)?.key ?? null;
    const activeCategory = activeCategoryTemplateKey
        ? categoryByKey.get(activeCategoryTemplateKey)
        : null;
    const vendorChrome = catalogMarkChrome({
        icon: activeCategory?.icon,
        billName: activeCategory?.name,
        jarKey: selectedJarKey,
        jarByKey,
        categoryTemplates: categoriesQuery.data ?? [],
    });

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
                              : 'Save fixed cost'}
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
            <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Name</FormLabel>
                        {mode === 'create' ? (
                            <div
                                className="flex flex-wrap gap-1.5"
                                role="group"
                                aria-label="Filter bill types">
                                <button
                                    type="button"
                                    aria-pressed={audienceFilter === null}
                                    onClick={() => setAudienceFilter(null)}
                                    className={cn(
                                        'rounded-full border px-2.5 py-1 font-mono text-[11px] transition-colors',
                                        audienceFilter === null
                                            ? 'border-accent/40 bg-accent-soft text-accent'
                                            : 'border-line bg-raised text-fg-secondary hover:border-accent-hover hover:text-accent'
                                    )}>
                                    All
                                </button>
                                {audienceChips.map(audience => {
                                    const on = audienceFilter === audience.key;
                                    return (
                                        <button
                                            key={audience.key}
                                            type="button"
                                            title={audience.description ?? undefined}
                                            aria-pressed={on}
                                            onClick={() =>
                                                setAudienceFilter(previous =>
                                                    previous === audience.key ? null : audience.key
                                                )
                                            }
                                            className={cn(
                                                'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[11px] transition-colors',
                                                !on &&
                                                    'border-line bg-raised text-fg-secondary hover:border-accent-hover hover:text-accent'
                                            )}
                                            style={
                                                on
                                                    ? {
                                                          borderColor:
                                                              audience.accentColor ?? undefined,
                                                          backgroundColor:
                                                              audience.softColor ?? undefined,
                                                          color: audience.accentColor ?? undefined,
                                                      }
                                                    : undefined
                                            }>
                                            {audience.icon ? (
                                                <span aria-hidden>{audience.icon}</span>
                                            ) : null}
                                            {audience.name}
                                        </button>
                                    );
                                })}
                            </div>
                        ) : null}
                        <FormControl>
                            {mode === 'create' ? (
                                <PresetNameField
                                    value={field.value}
                                    onChange={field.onChange}
                                    placeholder="e.g. Netflix, rent"
                                    freeTextPlaceholder="Type a custom bill name…"
                                    options={nameOptions}
                                    lockPresets
                                    freeTextKeys={['OTHER']}
                                    onClear={() => {
                                        setPendingCategoryTemplateKey(null);
                                        setSelectedBillPresetKey(null);
                                        setCustomPayee(false);
                                        form.setValue('categoryId', null);
                                        form.setValue('counterparty', '', {
                                            shouldDirty: false,
                                        });
                                        setGivePayeeMode(null);
                                        setGiveModeHydrated(false);
                                    }}
                                    onSelect={opt => {
                                        if (isMerchantOptionKey(opt.key)) {
                                            const merchantKey = merchantKeyFromOptionKey(opt.key);
                                            const merchant = merchants.find(
                                                row => row.key === merchantKey
                                            );
                                            if (!merchant) return;
                                            setSelectedBillPresetKey(null);
                                            const jar = jars.find(j => j.key === merchant.jarKey);
                                            if (jar) {
                                                form.setValue('jarId', jar.id);
                                                applyCategoryFromTemplate(
                                                    jar.id,
                                                    merchant.categoryTemplateKey
                                                );
                                            } else {
                                                setPendingCategoryTemplateKey(
                                                    merchant.categoryTemplateKey
                                                );
                                                form.setValue('categoryId', null);
                                            }
                                            setCustomPayee(false);
                                            form.setValue('counterparty', merchant.name, {
                                                shouldDirty: true,
                                            });
                                            if (merchant.jarKey === JarKey.GIVE) {
                                                setGivePayeeMode('known');
                                                setGiveModeHydrated(true);
                                            } else {
                                                setGivePayeeMode(null);
                                                setGiveModeHydrated(false);
                                            }
                                            return;
                                        }

                                        const full = fixedCostPresets.find(
                                            preset => preset.key === opt.key
                                        );
                                        if (!full) return;
                                        setSelectedBillPresetKey(full.key);
                                        const jar = jars.find(j => j.key === full.jarKey);
                                        if (jar) {
                                            form.setValue('jarId', jar.id);
                                            applyCategoryFromTemplate(
                                                jar.id,
                                                full.categoryTemplateKey
                                            );
                                        } else {
                                            setPendingCategoryTemplateKey(full.categoryTemplateKey);
                                            form.setValue('categoryId', null);
                                        }
                                        if (full.suggestedDueDay !== null) {
                                            form.setValue('dueDay', String(full.suggestedDueDay));
                                        }
                                        setCustomPayee(false);
                                        form.setValue('counterparty', '', { shouldDirty: false });
                                        if (full.jarKey === JarKey.GIVE) {
                                            setGivePayeeMode('known');
                                            setGiveModeHydrated(true);
                                        } else {
                                            setGivePayeeMode(null);
                                            setGiveModeHydrated(false);
                                        }
                                    }}
                                />
                            ) : (
                                <FormInput placeholder="e.g. rent" {...field} />
                            )}
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Amount per month ({symbol})</FormLabel>
                        <FormControl>
                            <FormInput inputMode="decimal" placeholder="0,00" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="jarId"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Jar</FormLabel>
                        <FormControl>
                            <select
                                className="h-11 w-full rounded-lg border border-line bg-raised px-3 text-sm text-fg focus:border-accent focus:outline-none"
                                {...field}
                                onChange={event => {
                                    field.onChange(event);
                                    form.setValue('categoryId', null);
                                    setPendingCategoryTemplateKey(null);
                                    setSelectedBillPresetKey(null);
                                    setCustomPayee(false);
                                    form.setValue('counterparty', '', { shouldDirty: false });
                                    setGivePayeeMode(null);
                                    setGiveModeHydrated(false);
                                }}>
                                {billJars.length === 0 ? (
                                    <option value="">No jars — complete setup first</option>
                                ) : (
                                    billJars.map(jar => (
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

            <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Category</FormLabel>
                        <FormControl>
                            <select
                                className="h-11 w-full rounded-lg border border-line bg-raised px-3 text-sm text-fg focus:border-accent focus:outline-none"
                                value={field.value ?? ''}
                                onChange={event => {
                                    setPendingCategoryTemplateKey(null);
                                    setCustomPayee(false);
                                    form.setValue('counterparty', '', { shouldDirty: false });
                                    field.onChange(event.target.value || null);
                                }}>
                                <option value="">
                                    {pendingLabel
                                        ? `From preset (${pendingLabel})`
                                        : 'Auto from name / preset'}
                                </option>
                                {jarCategories.map(category => (
                                    <option key={category.id} value={category.id}>
                                        {category.name}
                                    </option>
                                ))}
                            </select>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="counterparty"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>
                            {isGive ? 'To whom (organisation)' : 'Paid to (optional)'}
                        </FormLabel>
                        {isGive ? (
                            <div className="grid gap-3">
                                <div
                                    className="flex flex-wrap gap-2"
                                    role="group"
                                    aria-label="How do you want to pick?">
                                    {GIVE_PAYEE_MODES.map(option => {
                                        const on =
                                            givePayeeMode === option.id ||
                                            (option.id === 'known' && givePayeeMode === 'manual');
                                        return (
                                            <button
                                                key={option.id}
                                                type="button"
                                                disabled={busy}
                                                aria-pressed={on}
                                                onClick={() => selectGivePayeeMode(option.id)}
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
                                    I know who — type whoever you already give to. Help me choose —
                                    Coach shortlist with independent checks (Doneer Effectief,
                                    GiveWell, ACE, CBF).
                                </p>

                                {isKnowWho(givePayeeMode) ? (
                                    <FormControl>
                                        <FormInput
                                            placeholder="e.g. Giro555, your church, KWF"
                                            {...field}
                                        />
                                    </FormControl>
                                ) : (
                                    <FormControl>
                                        <input type="hidden" {...field} />
                                    </FormControl>
                                )}

                                {givePayeeMode === 'coach' ? (
                                    <GivingFinder
                                        defaultOpen
                                        selectedKey={giveOrgKey}
                                        selectedName={counterparty}
                                        onPick={organisation => {
                                            setGiveOrgKey(organisation.key);
                                            form.setValue('counterparty', organisation.name, {
                                                shouldDirty: true,
                                            });
                                            if (
                                                !form.getValues('categoryId') &&
                                                !pendingCategoryTemplateKey &&
                                                giveCategoryTemplateKey
                                            ) {
                                                setPendingCategoryTemplateKey(
                                                    giveCategoryTemplateKey
                                                );
                                            }
                                        }}
                                    />
                                ) : null}
                            </div>
                        ) : (
                            <>
                                {!customPayee && vendorsForCategory.length > 0 ? (
                                    <div className="flex flex-wrap gap-1.5">
                                        {vendorsForCategory.map(merchant => {
                                            const selected = nameMatches(
                                                counterparty,
                                                merchant.name
                                            );
                                            const mark = partyMark(
                                                {
                                                    key: merchant.key,
                                                    name: merchant.name,
                                                    logoDomain: merchant.logoDomain,
                                                    website: merchant.website,
                                                },
                                                vendorChrome
                                            );
                                            return (
                                                <button
                                                    key={merchant.key}
                                                    type="button"
                                                    disabled={busy}
                                                    className={
                                                        selected
                                                            ? 'inline-flex items-center gap-2 rounded-xl border border-accent bg-accent/15 px-2.5 py-1.5 text-sm text-accent'
                                                            : 'inline-flex items-center gap-2 rounded-xl border border-line bg-raised px-2.5 py-1.5 text-sm text-fg hover:border-accent hover:text-accent'
                                                    }
                                                    onClick={() => {
                                                        form.setValue(
                                                            'counterparty',
                                                            merchant.name,
                                                            {
                                                                shouldValidate: true,
                                                                shouldDirty: true,
                                                            }
                                                        );
                                                    }}>
                                                    <VendorMark
                                                        name={mark.name}
                                                        src={mark.src}
                                                        fallbackIcon={mark.fallbackIcon}
                                                        tone={mark.tone}
                                                        size={20}
                                                    />
                                                    {merchant.name}
                                                </button>
                                            );
                                        })}
                                        <button
                                            type="button"
                                            disabled={busy}
                                            className="inline-flex items-center rounded-xl border border-dashed border-line px-3 py-1.5 text-sm text-fg-muted hover:border-accent hover:text-accent"
                                            onClick={() => {
                                                setCustomPayee(true);
                                                form.setValue('counterparty', '', {
                                                    shouldValidate: false,
                                                });
                                            }}>
                                            Other…
                                        </button>
                                    </div>
                                ) : null}
                                {showPayeeInput ? (
                                    <FormControl>
                                        <FormInput
                                            placeholder={
                                                vendorsForCategory.length > 0
                                                    ? 'Payee name'
                                                    : 'e.g. landlord, insurer'
                                            }
                                            {...field}
                                        />
                                    </FormControl>
                                ) : (
                                    <FormControl>
                                        <input type="hidden" {...field} />
                                    </FormControl>
                                )}
                            </>
                        )}
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="dueDay"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Due day (day of month)</FormLabel>
                        <FormControl>
                            <FormInput type="number" min={1} max={31} placeholder="1" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </FormCreateEditShell>
    );
}
