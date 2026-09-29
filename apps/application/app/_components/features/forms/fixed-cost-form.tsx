'use client';

import Link from 'next/link';
import { api } from '@/app/_lib/api';
import { useApiError } from '@/app/_lib/api-error-messages';
import { apiQuery } from '@/app/_lib/api-hooks';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { useLiveQuery } from '@rumtelo/hooks';
import { useTranslations } from '@rumtelo/i18n';
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormSelect,
    FormSelectItem,
    FORM_SELECT_NONE,
    fromFormSelectValue,
    toFormSelectValue,
    Button,
    VendorMark,
    createFormInvalidHandler,
} from '@rumtelo/ui';

import { zodResolver } from '@hookform/resolvers/zod';
import type { CategoryTemplate, FixedCostPreset, MerchantPreset } from '@rumtelo/contracts';
import {
    Cadence,
    FlowDirection,
    JarKey,
    defaultGiveCategoryTemplate,
    jarCapabilitiesFor,
    matchesAudience,
} from '@rumtelo/contracts';

import { audienceKeysFromFixedCostPreset } from '@/app/_lib/household-audience-from-money';
import { parseAmountToMinorUnits } from '@/app/_lib/money-input';
import { viewedPeriodDefaultIso } from '@/app/_lib/viewed-period-date';
import { catalogMarkChrome } from '@/app/_lib/party-mark-chrome';
import { isLiveData } from '@/app/_lib/preview';
import { SETTINGS_HREF } from '@/app/_lib/settings-tabs';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';
import { useFormDismiss } from '@/app/_lib/use-form-dismiss';
import { useJarCatalog } from '@/app/_lib/use-jar-catalog';
import { useMergeHouseholdAudiences } from '@/app/_lib/use-merge-household-audiences';
import { partyMark } from '@/app/_lib/vendor-brands';
import { GivingFinder } from '@/components/features/money/giving-finder';
import { CoachTipCard } from '@/components/features/helpers';
import { useHouseholdShell } from '@/components/features/shell/household-shell-context';
import { useAuth } from '@/components/features/shell/auth-provider';
import { FormCreateEditShell } from '@/components/layout/form-create-edit-shell';
import {
    findByNameOrAlias,
    namesMatch,
    normalizeDueDay,
    normalizeDueMonth,
    resolveVendorPresets,
} from '@rumtelo/utils';

import { createFixedCostFormSchema, type FixedCostFormSchemaValues } from './form-zod';
import { CadencePicker, type CadencePickerOption, toRecurringCadence } from './cadence-picker';
import { clampDueDayInput, clampDueMonthInput, DueDayField } from './due-day-field';
import { CatalogCandidateChips } from './catalog-candidate-chips';
import { CATALOG_CHIP_IDLE_LIMIT, CatalogChipPicker } from './catalog-chip-picker';
import { ConfirmActionButton } from './confirm-action-button';
import { resolveCategoryId, useCategoryTemplates } from './catalog-helpers';
import { FormDatePicker } from './form-date-picker';
import { FormInput } from './form-input';
import {
    MERCHANT_OPTION_PREFIX,
    OTHER_OPTION_KEY,
    merchantsToNameOptions,
    nameLockFromOptionKey,
    nameLockToOptionKey,
    type NameLock,
} from './merchant-name-options';
import { PresetNameField, type NamePresetOption } from './preset-name-field';

export type GivePayeeMode = 'known' | 'coach' | 'manual';

function isKnowWho(mode: GivePayeeMode | null): boolean {
    return mode === 'known' || mode === 'manual';
}

/** Tie-break for vendors linked to several bill types: prefer the vendor's own category. */
function sameCategoryAs(merchant: MerchantPreset) {
    return (preset: FixedCostPreset) => preset.categoryTemplateKey === merchant.categoryTemplateKey;
}

export type FixedCostFormValues = FixedCostFormSchemaValues;

type FixedCostFormProps = {
    defaultValues?: Partial<FixedCostFormValues> & { presetKey?: string | null };
    /** Soul → Giving deep-link: lock the Give “To whom” path. */
    defaultGivePayeeMode?: GivePayeeMode | null;
    /** Coach catalog key from URL — resolved to counterparty name once orgs load. */
    defaultOrgKey?: string | null;
    /** Merchant catalog key from URL — resolved to counterparty name once merchants load. */
    defaultMerchantKey?: string | null;
    /** After create, link this transaction as the period settlement. */
    linkTransactionId?: string | null;
    embedded?: boolean;
    mode?: 'create' | 'edit';
    entityId?: string;
    onSuccess?: () => void;
};

export function FixedCostForm({
    defaultValues,
    defaultGivePayeeMode = null,
    defaultOrgKey = null,
    defaultMerchantKey = null,
    linkTransactionId = null,
    embedded = true,
    mode = 'create',
    entityId,
    onSuccess,
}: FixedCostFormProps) {
    const t = useTranslations();
    const tFixed = useTranslations('features.money.fixed_form');
    const tChips = useTranslations('features.money.chips');
    const tProfile = useTranslations('features.money.household_profile');
    const tForm = useTranslations('ui.form');
    const tBtn = useTranslations('ui.button.actions');
    const givePayeeModes: ReadonlyArray<{ id: GivePayeeMode; label: string }> = [
        { id: 'known', label: tFixed('give_known') },
        { id: 'coach', label: tFixed('give_coach') },
    ];
    const cadenceOptions: ReadonlyArray<CadencePickerOption> = [
        {
            id: Cadence.WEEKLY,
            label: tFixed('cadence_weekly'),
            hint: tFixed('cadence_weekly_hint'),
        },
        {
            id: Cadence.MONTHLY,
            label: tFixed('cadence_monthly'),
            hint: tFixed('cadence_monthly_hint'),
        },
        {
            id: Cadence.QUARTERLY,
            label: tFixed('cadence_quarterly'),
            hint: tFixed('cadence_quarterly_hint'),
        },
        {
            id: Cadence.YEARLY,
            label: tFixed('cadence_yearly'),
            hint: tFixed('cadence_yearly_hint'),
        },
    ];
    const queryClient = useQueryClient();
    const { householdId } = useAuth();
    const { symbol } = useHouseholdCurrency();
    const amountLabelByCadence: Record<FixedCostFormValues['cadence'], string> = {
        [Cadence.WEEKLY]: tFixed('amount_label_weekly', { symbol }),
        [Cadence.MONTHLY]: tFixed('amount_label', { symbol }),
        [Cadence.QUARTERLY]: tFixed('amount_label_quarterly', { symbol }),
        [Cadence.YEARLY]: tFixed('amount_label_yearly', { symbol }),
    };
    const { showToast, period } = useHouseholdShell();
    const periodDefaultDate = viewedPeriodDefaultIso(period);
    const apiError = useApiError();
    const dismiss = useFormDismiss(onSuccess);
    const live = isLiveData(householdId);
    const { mergeImplied } = useMergeHouseholdAudiences();
    /** Preset category template key — resolved to a household category on save. */
    const [pendingCategoryTemplateKey, setPendingCategoryTemplateKey] = useState<string | null>(
        null
    );
    /** What the name field is locked to: a bill type, a vendor, or free text ("Other"). */
    const [nameLock, setNameLock] = useState<NameLock | null>(null);
    const [customPayee, setCustomPayee] = useState(false);
    const [vendorQuery, setVendorQuery] = useState('');
    /** Edit: resolve bill preset + payee chips once catalogs are ready. */
    const [editCatalogHydrated, setEditCatalogHydrated] = useState(mode !== 'edit');
    /** Create-only: bypass Huishoudprofiel filter for this form session. */
    const [showAllPresets, setShowAllPresets] = useState(false);
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
    const householdSettingsQuery = useLiveQuery(
        apiQuery.household.settings.queryOptions({ input: { householdId: householdId! } }),
        null,
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
        apiQuery.money.catalogs.givingOrganizations.list.queryOptions({
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
    const merchantByKey = useMemo(
        () => new Map(merchants.map(merchant => [merchant.key, merchant])),
        [merchants]
    );
    const presetByKey = useMemo(
        () => new Map(fixedCostPresets.map(preset => [preset.key, preset])),
        [fixedCostPresets]
    );
    const audiences = useMemo(() => audiencesQuery.data ?? [], [audiencesQuery.data]);

    const baselineAudienceKeys = useMemo(
        () => audiences.filter(audience => audience.isBaseline).map(audience => audience.key),
        [audiences]
    );
    /** Household's lifestyle tags, set once in Settings — drives bill recommendations here. */
    const householdAudienceKeys = useMemo(
        () => householdSettingsQuery.data?.audienceKeys ?? [],
        [householdSettingsQuery.data]
    );

    /** Bill-type presets + brand catalog — type Netflix, get Media + Play auto-filled. */
    const nameOptions = useMemo((): NamePresetOption[] => {
        const billTypeBadge = tFixed('option_badge_bill_type');
        const fromMerchants = merchantsToNameOptions(merchants, {
            keyPrefix: MERCHANT_OPTION_PREFIX,
            categoryMeta: categoryByKey,
            excludeGivingLinked: true,
            badge: tFixed('option_badge_vendor'),
        });
        const fromPresets: NamePresetOption[] = fixedCostPresets
            .filter(
                preset =>
                    mode === 'edit' ||
                    showAllPresets ||
                    matchesAudience(
                        preset.audienceKeys,
                        householdAudienceKeys,
                        baselineAudienceKeys
                    )
            )
            .map(preset => {
                const category = categoryByKey.get(preset.categoryTemplateKey);
                return {
                    key: preset.key,
                    name: preset.name,
                    group: category?.name ?? preset.categoryTemplateKey,
                    icon: category?.icon ?? null,
                    aliases: preset.aliases,
                    badge: billTypeBadge,
                };
            });
        // Brands first so “netflix” hits Netflix before “Streaming video”.
        return [...fromMerchants, ...fromPresets];
    }, [
        merchants,
        fixedCostPresets,
        categoryByKey,
        householdAudienceKeys,
        baselineAudienceKeys,
        showAllPresets,
        mode,
        tFixed,
    ]);
    const nameOptionByKey = useMemo(
        () => new Map(nameOptions.map(option => [option.key, option])),
        [nameOptions]
    );

    const fixedCostFormSchema = useMemo(() => createFixedCostFormSchema(tForm), [tForm]);

    const form = useForm<FixedCostFormValues>({
        defaultValues: {
            name: defaultValues?.name ?? '',
            counterparty: defaultValues?.counterparty ?? '',
            amount: defaultValues?.amount ?? '',
            cadence: defaultValues?.cadence ?? Cadence.MONTHLY,
            jarId: defaultValues?.jarId ?? '',
            categoryId: defaultValues?.categoryId ?? null,
            dueDay: defaultValues?.dueDay ?? '',
            dueMonth: defaultValues?.dueMonth ?? '',
            startedOn: defaultValues?.startedOn ?? periodDefaultDate,
            endsOn: defaultValues?.endsOn ?? '',
        },
        resolver: zodResolver(fixedCostFormSchema),
    });

    const selectedJarId = useWatch({ control: form.control, name: 'jarId' });
    const selectedCategoryId = useWatch({ control: form.control, name: 'categoryId' });
    const counterparty = useWatch({ control: form.control, name: 'counterparty' });
    const cadence = useWatch({ control: form.control, name: 'cadence' });
    const dueMonthValue = useWatch({ control: form.control, name: 'dueMonth' });
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

    const lockedBillPreset =
        nameLock?.kind === 'preset' ? (presetByKey.get(nameLock.key) ?? null) : null;
    const lockedVendor =
        nameLock?.kind === 'vendor' ? (merchantByKey.get(nameLock.merchantKey) ?? null) : null;

    /** Vendor locked as the name but linked to several bill types → let the household pick. */
    const vendorBillCandidates = useMemo(() => {
        if (!lockedVendor) return [];
        const ownCategory = sameCategoryAs(lockedVendor);
        const resolution = resolveVendorPresets(fixedCostPresets, lockedVendor.key, ownCategory);
        if (resolution.kind !== 'ambiguous') return [];
        return [...resolution.candidates]
            .sort((left, right) => Number(ownCategory(right)) - Number(ownCategory(left)))
            .map(preset => ({
                ...preset,
                icon: categoryByKey.get(preset.categoryTemplateKey)?.icon ?? null,
            }));
    }, [lockedVendor, fixedCostPresets, categoryByKey]);

    const vendorsForCategory = useMemo(() => {
        // Bill preset owns Paid-to chips in the catalog (cross-category OK).
        const presetVendors = (lockedBillPreset?.merchantKeys ?? [])
            .map(key => merchantByKey.get(key))
            .filter((merchant): merchant is MerchantPreset => Boolean(merchant));
        if (presetVendors.length > 0) return presetVendors;
        // No preset (or no links yet) — every vendor in the active category.
        if (!activeCategoryTemplateKey) return [] as MerchantPreset[];
        return merchants.filter(
            merchant =>
                merchant.categoryTemplateKey === activeCategoryTemplateKey &&
                !merchant.givingOrganizationKey
        );
    }, [merchants, merchantByKey, activeCategoryTemplateKey, lockedBillPreset]);

    const givingOrgNames = useMemo(() => givingOrgsQuery.data ?? [], [givingOrgsQuery.data]);

    // Edit hydrate: resolve the saved name to a bill type / vendor lock → unlock Paid-to chips.
    // Only the lock, category hint and payee are touched; jar, cadence and due day stay as saved.
    if (
        mode === 'edit' &&
        !editCatalogHydrated &&
        presetsQuery.data !== undefined &&
        merchantsQuery.data !== undefined
    ) {
        const savedName = (defaultValues?.name ?? form.getValues('name') ?? '').trim();
        const savedPayee = (
            defaultValues?.counterparty ??
            form.getValues('counterparty') ??
            ''
        ).trim();
        // Prefer stored presetKey — skips findByNameOrAlias for the type lookup.
        const matchedPreset =
            (defaultValues?.presetKey ? presetByKey.get(defaultValues.presetKey) : null) ??
            findByNameOrAlias(fixedCostPresets, savedName);
        const matchedVendor = matchedPreset ? null : findByNameOrAlias(merchants, savedName);

        if (matchedPreset) {
            setNameLock({ kind: 'preset', key: matchedPreset.key });
            setPendingCategoryTemplateKey(matchedPreset.categoryTemplateKey);
            const onChip = matchedPreset.merchantKeys.some(key => {
                const merchant = merchantByKey.get(key);
                return Boolean(merchant && namesMatch(merchant.name, savedPayee));
            });
            if (savedPayee && !onChip) setCustomPayee(true);
        } else if (matchedVendor) {
            // Saved as a brand (HelloFresh, KPN) — same resolution as a fresh vendor pick.
            const resolution = resolveVendorPresets(
                fixedCostPresets,
                matchedVendor.key,
                sameCategoryAs(matchedVendor)
            );
            if (resolution.kind === 'preset') {
                setNameLock({ kind: 'preset', key: resolution.preset.key });
                setPendingCategoryTemplateKey(resolution.preset.categoryTemplateKey);
                form.setValue('name', resolution.preset.name, { shouldDirty: false });
            } else {
                setNameLock({ kind: 'vendor', merchantKey: matchedVendor.key });
                setPendingCategoryTemplateKey(matchedVendor.categoryTemplateKey);
            }
            if (!savedPayee) {
                form.setValue('counterparty', matchedVendor.name, { shouldDirty: false });
            } else if (!namesMatch(savedPayee, matchedVendor.name)) {
                setCustomPayee(true);
            }
        } else if (savedName) {
            // Truly free-text — lock as Other so the label still shows.
            setNameLock({ kind: 'other' });
        }
        setEditCatalogHydrated(true);
    }

    const showPayeeInput = customPayee || vendorsForCategory.length === 0;

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
            const coachOrg = givingOrgNames.find(org => namesMatch(org.name, prefillName));
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

    const onError = createFormInvalidHandler(
        ({ title, description }) => {
            showToast(description ?? title, 'error');
        },
        {
            title: tForm('incomplete_title'),
            description: tForm('incomplete_description'),
        }
    );

    const saveMutation = useMutation({
        mutationFn: async (values: FixedCostFormValues) => {
            if (!householdId) throw new Error('No household');
            const cents = parseAmountToMinorUnits(values.amount);
            if (cents === null || cents <= 0) throw new Error('Invalid amount');
            const dueDay = normalizeDueDay(
                values.dueDay?.trim() ? Number(values.dueDay) : null,
                values.cadence
            );
            const dueMonth = normalizeDueMonth(
                values.dueMonth?.trim() ? Number(values.dueMonth) : null,
                values.cadence
            );
            const counterpartyValue = values.counterparty?.trim() || null;
            const merchantKey = nameLock?.kind === 'vendor' ? nameLock.merchantKey : null;
            const saveParty = Boolean(counterpartyValue) && !merchantKey;
            const jarBalanceForName = (balancesQuery.data ?? []).find(
                jar => jar.id === values.jarId
            );
            const categoryLabel =
                (values.categoryId
                    ? jarBalanceForName?.categories.find(row => row.id === values.categoryId)?.name
                    : null) ??
                (pendingCategoryTemplateKey
                    ? categoryByKey.get(pendingCategoryTemplateKey)?.name
                    : null) ??
                null;
            // Prefer typed name → vendor → category (never save a blank label).
            const name = values.name.trim() || counterpartyValue || categoryLabel?.trim() || '';
            if (!name) throw new Error('Name required');

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

            const endsOn = values.endsOn?.trim() ? values.endsOn.slice(0, 10) : null;
            const presetKeyToSave = nameLock?.kind === 'preset' ? nameLock.key : null;

            if (mode === 'edit' && entityId) {
                const startedOn = values.startedOn?.trim() ? values.startedOn.slice(0, 10) : null;
                return api.money.fixedCosts.update({
                    id: entityId,
                    householdId,
                    name,
                    presetKey: presetKeyToSave,
                    counterparty: counterpartyValue,
                    merchantKey,
                    partyId: null,
                    saveParty,
                    amount: cents,
                    cadence: values.cadence,
                    jarId: values.jarId,
                    categoryId,
                    dueDay,
                    dueMonth,
                    startedOn,
                    endsOn,
                });
            }
            const startedOn = values.startedOn?.trim()
                ? values.startedOn.slice(0, 10)
                : periodDefaultDate;
            return api.money.fixedCosts.create({
                householdId,
                jarId: values.jarId,
                categoryId,
                name,
                presetKey: presetKeyToSave,
                counterparty: counterpartyValue,
                merchantKey,
                partyId: null,
                saveParty,
                amount: cents,
                cadence: values.cadence,
                dueDay,
                dueMonth,
                direction: FlowDirection.OUT,
                isActive: true,
                startedOn,
                endsOn,
                note: null,
            });
        },
        onSuccess: async result => {
            void queryClient.invalidateQueries({ queryKey: apiQuery.money.fixedCosts.list.key() });
            void queryClient.invalidateQueries({ queryKey: apiQuery.money.fixedCosts.byJar.key() });
            void queryClient.invalidateQueries({ queryKey: apiQuery.money.parties.list.key() });
            void queryClient.invalidateQueries({ queryKey: apiQuery.money.jars.balances.key() });
            if (mode === 'create' && lockedBillPreset) {
                await mergeImplied(audienceKeysFromFixedCostPreset(lockedBillPreset.audienceKeys));
            }

            let linked = false;
            if (mode === 'create' && linkTransactionId && householdId && result?.id) {
                try {
                    await api.money.transactions.update({
                        householdId,
                        id: linkTransactionId,
                        fixedCostId: result.id,
                    });
                    void queryClient.invalidateQueries({
                        queryKey: apiQuery.money.transactions.list.key(),
                    });
                    void queryClient.invalidateQueries({
                        queryKey: apiQuery.money.transactions.inbox.key(),
                    });
                    void queryClient.invalidateQueries({
                        queryKey: apiQuery.money.fixedCosts.listSettlements.key(),
                    });
                    linked = true;
                } catch (error: unknown) {
                    showToast(apiError(error), 'error');
                }
            }

            showToast(
                mode === 'edit'
                    ? t('common.message.entity.fixed_updated')
                    : linked
                      ? t('common.message.entity.fixed_saved_and_linked')
                      : t('common.message.entity.fixed_saved'),
                'success'
            );
            dismiss();
        },
        onError: (error: unknown) => showToast(apiError(error), 'error'),
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
            showToast(t('common.message.entity.fixed_deleted'), 'success');
            dismiss();
        },
        onError: (error: unknown) => showToast(apiError(error), 'error'),
    });

    async function onSubmit(values: FixedCostFormValues) {
        if (!live) {
            showToast(t('common.message.entity.sign_in_fixed'), 'error');
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

    /** Jar by catalog key → household category; falls back to a pending template when unknown. */
    function applyJarAndCategory(jarKey: JarKey, categoryTemplateKey: string) {
        const jar = jars.find(row => row.key === jarKey);
        if (jar) {
            form.setValue('jarId', jar.id);
            applyCategoryFromTemplate(jar.id, categoryTemplateKey);
            return;
        }
        setPendingCategoryTemplateKey(categoryTemplateKey);
        form.setValue('categoryId', null);
    }

    /** Give jar owns a "to whom" chooser; any other jar clears it. */
    function syncGiveMode(jarKey: JarKey) {
        const give = jarKey === JarKey.GIVE;
        setGivePayeeMode(give ? 'known' : null);
        setGiveModeHydrated(give);
    }

    /** Single place that writes Paid-to; empty string clears it. */
    function setPayee(name: string, opts: { dirty: boolean }) {
        setCustomPayee(false);
        form.setValue('counterparty', name, {
            shouldDirty: opts.dirty,
            shouldValidate: opts.dirty,
        });
    }

    /** Bill type picked (or resolved from a vendor): lock, jar/category, schedule defaults. */
    function applyBillPreset(preset: FixedCostPreset, opts: { keepPayee: boolean }) {
        setNameLock({ kind: 'preset', key: preset.key });
        applyJarAndCategory(preset.jarKey, preset.categoryTemplateKey);
        if (preset.dueDay !== null) form.setValue('dueDay', String(preset.dueDay));
        form.setValue('cadence', toRecurringCadence(preset.cadence));
        if (!opts.keepPayee) setPayee('', { dirty: false });
        syncGiveMode(preset.jarKey);
    }

    /**
     * Vendor picked as the bill name (HelloFresh, KPN): resolve its bill type when
     * unambiguous, derive jar/category, and lock Paid-to to the vendor.
     * Returns the option the name field should lock to when the vendor resolved to a bill type.
     */
    function applyVendorPick(merchant: MerchantPreset): NamePresetOption | undefined {
        const resolution = resolveVendorPresets(
            fixedCostPresets,
            merchant.key,
            sameCategoryAs(merchant)
        );
        if (resolution.kind === 'preset') {
            applyBillPreset(resolution.preset, { keepPayee: true });
            form.setValue('name', resolution.preset.name, { shouldDirty: true });
        } else {
            setNameLock({ kind: 'vendor', merchantKey: merchant.key });
            applyJarAndCategory(merchant.jarKey, merchant.categoryTemplateKey);
            form.setValue('name', merchant.name, { shouldDirty: true });
            syncGiveMode(merchant.jarKey);
        }
        setPayee(merchant.name, { dirty: true });
        return resolution.kind === 'preset'
            ? nameOptionByKey.get(resolution.preset.key)
            : undefined;
    }

    /** Ambiguous vendor: the household picked which of its bill types this is. */
    function chooseBillTypeForVendor(candidate: { key: string }) {
        const preset = presetByKey.get(candidate.key);
        if (!preset) return;
        applyBillPreset(preset, { keepPayee: true });
        form.setValue('name', preset.name, { shouldDirty: true });
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
                            ? tForm('working')
                            : mode === 'edit'
                              ? tForm('save_changes')
                              : tFixed('save')}
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
                            label={tBtn('delete')}
                            confirmLabel={tForm('confirm_delete')}
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
                        <FormLabel>{tForm('fields.name')}</FormLabel>
                        <FormControl>
                            <PresetNameField
                                value={field.value}
                                onChange={field.onChange}
                                placeholder={
                                    mode === 'edit'
                                        ? tFixed('name_edit_placeholder')
                                        : tFixed('name_placeholder')
                                }
                                freeTextPlaceholder={tFixed('name_free_placeholder')}
                                options={nameOptions}
                                lockPresets
                                freeTextKeys={[OTHER_OPTION_KEY]}
                                initialLockedKey={nameLockToOptionKey(nameLock)}
                                onClear={() => {
                                    setPendingCategoryTemplateKey(null);
                                    setNameLock(null);
                                    setPayee('', { dirty: false });
                                    form.setValue('categoryId', null);
                                    setGivePayeeMode(null);
                                    setGiveModeHydrated(false);
                                }}
                                onSelect={opt => {
                                    const lock = nameLockFromOptionKey(opt.key);
                                    switch (lock.kind) {
                                        case 'other':
                                            // Identity stays Other; the label is free text.
                                            setNameLock(lock);
                                            return;
                                        case 'vendor': {
                                            const merchant = merchantByKey.get(lock.merchantKey);
                                            return merchant ? applyVendorPick(merchant) : undefined;
                                        }
                                        case 'preset': {
                                            const preset = presetByKey.get(lock.key);
                                            if (preset)
                                                applyBillPreset(preset, { keepPayee: false });
                                            return;
                                        }
                                    }
                                }}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            {lockedVendor ? (
                <CatalogCandidateChips
                    label={tFixed('bill_type_for_vendor', { vendor: lockedVendor.name })}
                    candidates={vendorBillCandidates}
                    disabled={busy}
                    onPick={chooseBillTypeForVendor}
                />
            ) : null}

            {mode === 'create' && householdAudienceKeys.length > 0 ? (
                showAllPresets ? (
                    <div className="flex flex-wrap items-center gap-2 text-xs text-fg-muted">
                        <p className="min-w-0 flex-1 text-pretty">{tProfile('showing_all')}</p>
                        <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => setShowAllPresets(false)}>
                            {tProfile('use_filter')}
                        </Button>
                    </div>
                ) : (
                    <CoachTipCard
                        title={tProfile('filter_tip_title')}
                        actions={
                            <>
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => setShowAllPresets(true)}>
                                    {tProfile('show_all')}
                                </Button>
                                <Button
                                    as={Link}
                                    href={SETTINGS_HREF.household}
                                    size="sm"
                                    variant="secondary">
                                    {tProfile('open_settings')}
                                </Button>
                            </>
                        }>
                        {tProfile('filter_tip_body')}
                    </CoachTipCard>
                )
            ) : null}

            <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>{amountLabelByCadence[cadence ?? Cadence.MONTHLY]}</FormLabel>
                        <FormControl>
                            <FormInput
                                inputMode="decimal"
                                placeholder={tForm('amount_zero')}
                                {...field}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <CadencePicker
                heading={tFixed('cadence_heading')}
                options={cadenceOptions}
                value={cadence ?? Cadence.MONTHLY}
                disabled={busy}
                onChange={next => {
                    form.setValue('cadence', next, {
                        shouldValidate: true,
                        shouldDirty: true,
                    });
                    form.setValue(
                        'dueDay',
                        clampDueDayInput(form.getValues('dueDay') ?? '', next),
                        {
                            shouldDirty: true,
                        }
                    );
                    form.setValue(
                        'dueMonth',
                        clampDueMonthInput(form.getValues('dueMonth') ?? '', next),
                        {
                            shouldDirty: true,
                        }
                    );
                }}
            />

            <FormField
                control={form.control}
                name="jarId"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>{tForm('jar')}</FormLabel>
                        <FormSelect
                            value={toFormSelectValue(field.value)}
                            onValueChange={value => {
                                if (value === FORM_SELECT_NONE) return;
                                field.onChange(value);
                                form.setValue('categoryId', null);
                                setPendingCategoryTemplateKey(null);
                                setNameLock(null);
                                setPayee('', { dirty: false });
                                setGivePayeeMode(null);
                                setGiveModeHydrated(false);
                            }}>
                            {billJars.length === 0 ? (
                                <FormSelectItem value={FORM_SELECT_NONE} disabled>
                                    {tFixed('no_jars')}
                                </FormSelectItem>
                            ) : (
                                billJars.map(jar => (
                                    <FormSelectItem key={jar.id} value={jar.id}>
                                        {jar.icon ? `${jar.icon} ` : ''}
                                        {jar.name}
                                    </FormSelectItem>
                                ))
                            )}
                        </FormSelect>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>{tForm('category')}</FormLabel>
                        <FormSelect
                            value={toFormSelectValue(field.value)}
                            onValueChange={value => {
                                setPendingCategoryTemplateKey(null);
                                setPayee('', { dirty: false });
                                field.onChange(fromFormSelectValue(value));
                            }}>
                            <FormSelectItem value={FORM_SELECT_NONE}>
                                {pendingLabel
                                    ? tFixed('category_from_preset', { name: pendingLabel })
                                    : tFixed('category_auto')}
                            </FormSelectItem>
                            {jarCategories.map(category => (
                                <FormSelectItem key={category.id} value={category.id}>
                                    {category.name}
                                </FormSelectItem>
                            ))}
                        </FormSelect>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="counterparty"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>{isGive ? tFixed('to_whom') : tFixed('paid_to')}</FormLabel>
                        {isGive ? (
                            <div className="grid gap-3">
                                <div
                                    className="flex flex-wrap gap-2"
                                    role="group"
                                    aria-label={tForm('aria.pick_mode')}>
                                    {givePayeeModes.map(option => {
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
                                    {tFixed('give_hint')}
                                </p>

                                {isKnowWho(givePayeeMode) ? (
                                    <FormControl>
                                        <FormInput
                                            placeholder={tFixed('give_placeholder')}
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
                                        onPick={organization => {
                                            setGiveOrgKey(organization.key);
                                            form.setValue('counterparty', organization.name, {
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
                                    <CatalogChipPicker
                                        query={vendorQuery}
                                        onQueryChange={setVendorQuery}
                                        items={vendorsForCategory}
                                        placeholder={tForm('search_vendor')}
                                        noMatchesLabel={tForm('no_matches')}
                                        disabled={busy}
                                        idleLimit={CATALOG_CHIP_IDLE_LIMIT}
                                        selectedKey={
                                            vendorsForCategory.find(merchant =>
                                                namesMatch(counterparty, merchant.name)
                                            )?.key ?? null
                                        }
                                        otherLabel={tForm('other')}
                                        onOther={() => {
                                            setCustomPayee(true);
                                            form.setValue('counterparty', '', {
                                                shouldValidate: false,
                                            });
                                        }}
                                        renderChip={merchant => {
                                            const selected = namesMatch(
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
                                                    type="button"
                                                    disabled={busy}
                                                    className={
                                                        selected
                                                            ? 'inline-flex items-center gap-2 rounded-xl border border-accent bg-accent/15 px-2.5 py-1.5 text-sm text-accent'
                                                            : 'inline-flex items-center gap-2 rounded-xl border border-line bg-raised px-2.5 py-1.5 text-sm text-fg hover:border-accent hover:text-accent'
                                                    }
                                                    onClick={() => {
                                                        // No bill name yet → the vendor names the bill too.
                                                        if (!form.getValues('name')?.trim()) {
                                                            applyVendorPick(merchant);
                                                            return;
                                                        }
                                                        setPayee(merchant.name, { dirty: true });
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
                                        }}
                                    />
                                ) : null}
                                {showPayeeInput ? (
                                    <FormControl>
                                        <FormInput
                                            placeholder={
                                                vendorsForCategory.length > 0
                                                    ? tFixed('payee_name')
                                                    : tFixed('payee_placeholder')
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
                    <DueDayField
                        cadence={cadence ?? Cadence.MONTHLY}
                        value={field.value ?? ''}
                        onChange={field.onChange}
                        dueMonth={dueMonthValue ?? ''}
                        onDueMonthChange={next =>
                            form.setValue('dueMonth', next, { shouldDirty: true })
                        }
                        disabled={busy}
                        label={
                            (cadence ?? Cadence.MONTHLY) === Cadence.WEEKLY
                                ? tFixed('due_day_weekly')
                                : tFixed('due_day')
                        }
                        weekdayLabel={day => tChips(`due_weekday_${day}`)}
                        quarterMonthLabel={month => tChips(`due_quarter_${month}`)}
                        calendarMonthLabel={month => tChips(`due_month_${month}`)}
                        monthOfPeriodLabel={
                            (cadence ?? Cadence.MONTHLY) === Cadence.QUARTERLY
                                ? tFixed('due_month_quarter')
                                : (cadence ?? Cadence.MONTHLY) === Cadence.YEARLY
                                  ? tFixed('due_month_year')
                                  : undefined
                        }
                    />
                )}
            />

            <FormField
                control={form.control}
                name="startedOn"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>{tFixed('start_date')}</FormLabel>
                        <FormDatePicker
                            value={field.value}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            name={field.name}
                        />
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="endsOn"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>{tFixed('end_date')}</FormLabel>
                        <FormDatePicker
                            value={field.value}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            name={field.name}
                        />
                        <FormMessage />
                    </FormItem>
                )}
            />
        </FormCreateEditShell>
    );
}
