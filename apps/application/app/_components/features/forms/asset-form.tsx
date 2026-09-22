'use client';

import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useLiveQuery } from '@rumtelo/hooks';
import {
    Button,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    VendorMark,
    createFormInvalidHandler,
} from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import { zodResolver } from '@hookform/resolvers/zod';
import type { AssetKind, AssetPreset, MerchantPreset } from '@rumtelo/contracts';

import { api } from '@/app/_lib/api';
import { useApiError } from '@/app/_lib/api-error-messages';
import { apiQuery } from '@/app/_lib/api-hooks';
import {
    CAR_BRAND_PREVIEW,
    carBrandMark,
    filterCarBrands,
    findCarBrand,
} from '@/app/_lib/car-brands';
import { parseAmountToMinorUnits } from '@/app/_lib/money-input';
import { isLiveData } from '@/app/_lib/preview';
import { useTranslations } from '@rumtelo/i18n';

import { useFormDismiss } from '@/app/_lib/use-form-dismiss';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';
import { useAuth } from '@/components/features/shell/auth-provider';
import { useAppShell } from '@/components/features/shell/app-shell-context';
import { FormCreateEditShell } from '@/components/layout/form-create-edit-shell';

import { CatalogChipPicker } from './catalog-chip-picker';
import { matchesChipQuery } from './chip-search';
import { createAssetFormSchema, type AssetFormSchemaValues } from './form-zod';
import { FormInput } from './form-input';
import { type NamePresetOption, PresetNameField } from './preset-name-field';
import { ConfirmActionButton } from './confirm-action-button';

const EMPTY_KINDS: AssetKind[] = [];
const EMPTY_PRESETS: AssetPreset[] = [];
const EMPTY_MERCHANTS: MerchantPreset[] = [];

type AssetFormValues = AssetFormSchemaValues;

type AssetFormDefaults = {
    kind: string;
    name: string;
    value: string;
    flow: string;
    presetKey: string | null;
};

type AssetFormProps = {
    embedded?: boolean;
    onSuccess?: () => void;
    mode?: 'create' | 'edit';
    entityId?: string;
    defaultValues?: AssetFormDefaults;
    /** Class already chosen from a section. Hides the other classes. */
    lockedKind?: string;
};

/** Asks the class first. The name searches the same catalog a fixed cost does. */
export function AssetForm({
    embedded = true,
    onSuccess,
    mode = 'create',
    entityId,
    defaultValues,
    lockedKind,
}: AssetFormProps) {
    const t = useTranslations();
    const tAsset = useTranslations('features.growth.asset_form');
    const tForm = useTranslations('ui.form');
    const tBtn = useTranslations('ui.button.actions');
    const { showToast } = useAppShell();
    const apiError = useApiError();
    const dismiss = useFormDismiss(onSuccess);
    const { symbol } = useHouseholdCurrency();
    const { householdId } = useAuth();
    const live = isLiveData(householdId);
    const queryClient = useQueryClient();
    const [presetKey, setPresetKey] = useState(defaultValues?.presetKey ?? null);
    const [showAllCarBrands, setShowAllCarBrands] = useState(false);
    const [carBrandQuery, setCarBrandQuery] = useState('');

    const kindsQuery = useLiveQuery(
        apiQuery.growth.catalogs.assetKinds.list.queryOptions({
            input: { householdId: householdId! },
        }),
        EMPTY_KINDS,
        live
    );
    const presetsQuery = useLiveQuery(
        apiQuery.growth.catalogs.assetPresets.list.queryOptions({
            input: { householdId: householdId! },
        }),
        EMPTY_PRESETS,
        live
    );
    const merchantsQuery = useLiveQuery(
        apiQuery.money.catalogs.merchantPresets.list.queryOptions({
            input: { householdId: householdId! },
        }),
        EMPTY_MERCHANTS,
        live
    );
    const kinds = kindsQuery.data ?? EMPTY_KINDS;
    const presets = presetsQuery.data ?? EMPTY_PRESETS;
    const carBrands = useMemo(
        () => filterCarBrands(merchantsQuery.data ?? EMPTY_MERCHANTS),
        [merchantsQuery.data]
    );

    const assetFormSchema = useMemo(() => createAssetFormSchema(tForm), [tForm]);

    const form = useForm<AssetFormValues>({
        defaultValues: {
            kind: defaultValues?.kind ?? lockedKind ?? 'PORTFOLIO',
            name: defaultValues?.name ?? '',
            value: defaultValues?.value ?? '',
            flow: defaultValues?.flow ?? '',
        },
        resolver: zodResolver(assetFormSchema),
    });

    const kindKey = useWatch({ control: form.control, name: 'kind' });
    const name = useWatch({ control: form.control, name: 'name' });
    const picked = kinds.find(kind => kind.key === kindKey) ?? kinds[0];
    const selectedCarBrand = useMemo(
        () => (kindKey === 'VEHICLE' ? findCarBrand(name, carBrands) : null),
        [kindKey, name, carBrands]
    );

    const locked = kinds.find(kind => kind.key === lockedKind);
    const visibleKinds = locked ? [locked] : kinds;

    const carBrandSearch = carBrandQuery.trim().length > 0;
    const visibleCarBrands = useMemo(() => {
        const matched = carBrandSearch
            ? carBrands.filter(brand => matchesChipQuery(carBrandQuery, brand))
            : carBrands;
        const selectedPastPreview = matched
            .slice(CAR_BRAND_PREVIEW)
            .some(brand => brand.name.toLowerCase() === name.trim().toLowerCase());
        if (carBrandSearch || showAllCarBrands || selectedPastPreview) return matched;
        return matched.slice(0, CAR_BRAND_PREVIEW);
    }, [carBrands, carBrandQuery, carBrandSearch, name, showAllCarBrands]);

    const suggestions: NamePresetOption[] = presets
        .filter(preset => !locked || preset.kindKey === locked.key)
        .map(preset => {
            const kind = kinds.find(row => row.key === preset.kindKey);
            return {
                key: preset.key,
                name: preset.name,
                group: preset.kindName,
                icon: kind?.icon ?? null,
                description: kind?.description ?? null,
            };
        });

    const onError = createFormInvalidHandler(
        ({ title, description }) => {
            showToast(description ?? title, 'error');
        },
        {
            title: tForm('incomplete_title'),
            description: tForm('incomplete_description'),
        }
    );

    function selectKind(next: string) {
        const current = form.getValues('name');
        form.setValue('kind', next, { shouldValidate: true });
        const preset = presets.find(row => row.name === current);
        if (preset && preset.kindKey !== next) {
            form.setValue('name', '');
            setPresetKey(null);
        }
        const brand = findCarBrand(current, carBrands);
        if (brand && next !== 'VEHICLE') {
            form.setValue('name', '');
            setPresetKey(null);
        }
        setShowAllCarBrands(false);
        setCarBrandQuery('');
        const nextKind = kinds.find(row => row.key === next);
        if (nextKind && !nextKind.canPay) form.setValue('flow', '');
    }

    function selectPreset(option: NamePresetOption) {
        const preset = presets.find(row => row.key === option.key);
        if (!preset) return;
        form.setValue('kind', preset.kindKey, { shouldValidate: true });
        setPresetKey(preset.key);
        if (!preset.canPay) form.setValue('flow', '');
    }

    function selectCarBrand(brand: MerchantPreset) {
        form.setValue('name', brand.name, { shouldDirty: true, shouldValidate: true });
        const carPreset = presets.find(row => row.key === 'CAR');
        setPresetKey(carPreset?.key ?? null);
    }

    const saveMutation = useMutation({
        mutationFn: async (values: AssetFormValues) => {
            if (!householdId) throw new Error('No household');
            const cents = parseAmountToMinorUnits(values.value);
            if (cents === null || cents <= 0) throw new Error('Invalid amount');
            const kind = kinds.find(row => row.key === values.kind);
            const flowCents =
                kind && !kind.canPay
                    ? 0
                    : values.flow?.trim()
                      ? (parseAmountToMinorUnits(values.flow) ?? 0)
                      : 0;
            const payload = {
                householdId,
                name: values.name.trim(),
                kindKey: values.kind,
                presetKey,
                value: cents,
                flow: flowCents,
            };
            if (mode === 'edit' && entityId) {
                return api.growth.assets.update({ id: entityId, ...payload });
            }
            return api.growth.assets.create(payload);
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: apiQuery.growth.assets.list.key() });
            void queryClient.invalidateQueries({ queryKey: apiQuery.growth.assets.get.key() });
            void queryClient.invalidateQueries({ queryKey: apiQuery.growth.dashboard.get.key() });
            showToast(
                mode === 'edit'
                    ? t('common.message.success.updated', {
                          entity: t('common.message.entity.names.asset'),
                      })
                    : t('common.message.success.created', {
                          entity: t('common.message.entity.names.asset'),
                      }),
                'success'
            );
            dismiss();
        },
        onError: (error: unknown) => showToast(apiError(error), 'error'),
    });

    const removeMutation = useMutation({
        mutationFn: async () => {
            if (!householdId || !entityId) throw new Error('No household');
            return api.growth.assets.remove({ householdId, id: entityId });
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: apiQuery.growth.assets.list.key() });
            void queryClient.invalidateQueries({ queryKey: apiQuery.growth.assets.get.key() });
            void queryClient.invalidateQueries({ queryKey: apiQuery.growth.dashboard.get.key() });
            showToast(t('common.message.entity.asset_deleted'), 'success');
            dismiss();
        },
        onError: (error: unknown) => showToast(apiError(error), 'error'),
    });

    async function onSubmit(values: AssetFormValues) {
        if (!live) {
            showToast(t('common.message.entity.sign_in_asset'), 'error');
            return;
        }
        if (mode === 'edit' && !entityId) {
            showToast(t('common.message.entity.missing_asset'), 'error');
            return;
        }
        await saveMutation.mutateAsync(values);
    }

    const busy = form.formState.isSubmitting || saveMutation.isPending || removeMutation.isPending;
    const showCarBrands = kindKey === 'VEHICLE' && carBrands.length > 0;

    return (
        <FormCreateEditShell
            embedded={embedded}
            form={form}
            onError={onError}
            onSubmit={onSubmit}
            sidebar={
                <div className="grid gap-2">
                    <Button type="submit" className="w-full" disabled={busy}>
                        {busy
                            ? tForm('working')
                            : mode === 'edit'
                              ? tForm('save_changes')
                              : tAsset('save')}
                    </Button>
                    {mode === 'edit' && entityId ? (
                        <ConfirmActionButton
                            variant="ghost"
                            className="w-full text-danger hover:bg-danger/10 hover:text-danger"
                            disabled={busy}
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
                name="kind"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>{tAsset('type')}</FormLabel>
                        <FormControl>
                            <div
                                className="grid gap-2 sm:grid-cols-2"
                                role="radiogroup"
                                aria-label={tForm('aria.asset_type')}>
                                {visibleKinds.map(option => {
                                    const on = field.value === option.key;
                                    const brandMark =
                                        on && option.key === 'VEHICLE' && selectedCarBrand
                                            ? carBrandMark(selectedCarBrand)
                                            : null;
                                    return (
                                        <button
                                            key={option.key}
                                            type="button"
                                            role="radio"
                                            aria-checked={on}
                                            onClick={() => selectKind(option.key)}
                                            className={cn(
                                                'flex items-start gap-3 rounded-xl border px-3 py-3 text-left transition-colors',
                                                on
                                                    ? 'border-accent/40 bg-accent-soft'
                                                    : 'border-line bg-raised hover:border-accent-hover'
                                            )}>
                                            <span
                                                aria-hidden
                                                className={cn(
                                                    'flex size-9 shrink-0 items-center justify-center rounded-lg text-lg',
                                                    on ? 'bg-accent/15' : 'bg-sunken'
                                                )}>
                                                {brandMark ? (
                                                    <VendorMark
                                                        name={brandMark.name}
                                                        src={brandMark.src}
                                                        fallbackIcon={brandMark.fallbackIcon}
                                                        tone={brandMark.tone}
                                                        size={22}
                                                    />
                                                ) : (
                                                    option.icon
                                                )}
                                            </span>
                                            <span className="grid min-w-0 gap-0.5">
                                                <span
                                                    className={cn(
                                                        'text-sm font-semibold',
                                                        on ? 'text-accent' : 'text-fg'
                                                    )}>
                                                    {option.name}
                                                </span>
                                                <span className="text-xs leading-snug text-fg-muted">
                                                    {option.description}
                                                </span>
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>{tForm('fields.name')}</FormLabel>
                        <FormControl>
                            <PresetNameField
                                value={field.value}
                                options={suggestions}
                                placeholder={tAsset('name_placeholder')}
                                freeTextPlaceholder={tAsset('name_free_placeholder')}
                                onChange={value => {
                                    field.onChange(value);
                                    const preset = presets.find(row => row.key === presetKey);
                                    if (preset && preset.name !== value) setPresetKey(null);
                                }}
                                onSelect={selectPreset}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            {showCarBrands ? (
                <div className="grid gap-2">
                    <p className="font-mono text-[10px] font-semibold tracking-wider text-fg-muted uppercase">
                        {tAsset('which_car')}
                    </p>
                    <CatalogChipPicker
                        query={carBrandQuery}
                        onQueryChange={setCarBrandQuery}
                        items={visibleCarBrands}
                        placeholder={tAsset('search_brand')}
                        noMatchesLabel={tForm('no_matches')}
                        trailing={
                            !carBrandSearch && visibleCarBrands.length < carBrands.length ? (
                                <button
                                    type="button"
                                    className="inline-flex items-center rounded-xl border border-dashed border-line px-3 py-1.5 text-sm text-fg-muted hover:border-accent hover:text-accent"
                                    onClick={() => setShowAllCarBrands(true)}>
                                    {tAsset('more')}
                                </button>
                            ) : null
                        }
                        renderChip={brand => {
                            const selected = name.trim().toLowerCase() === brand.name.toLowerCase();
                            const mark = carBrandMark(brand);
                            return (
                                <button
                                    type="button"
                                    className={
                                        selected
                                            ? 'inline-flex items-center gap-2 rounded-xl border border-accent bg-accent/15 px-2.5 py-1.5 text-sm text-accent'
                                            : 'inline-flex items-center gap-2 rounded-xl border border-line bg-raised px-2.5 py-1.5 text-sm text-fg hover:border-accent hover:text-accent'
                                    }
                                    onClick={() => selectCarBrand(brand)}>
                                    <VendorMark
                                        name={mark.name}
                                        src={mark.src}
                                        fallbackIcon={mark.fallbackIcon}
                                        tone={mark.tone}
                                        size={20}
                                    />
                                    {brand.name}
                                </button>
                            );
                        }}
                    />
                </div>
            ) : null}

            <FormField
                control={form.control}
                name="value"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>{tAsset('value', { symbol })}</FormLabel>
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

            {picked?.canPay ? (
                <FormField
                    control={form.control}
                    name="flow"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{tAsset('flow', { symbol })}</FormLabel>
                            <FormControl>
                                <FormInput
                                    inputMode="decimal"
                                    placeholder={tForm('amount_zero')}
                                    {...field}
                                />
                            </FormControl>
                            <p className="text-xs text-fg-faint">{tAsset('flow_hint')}</p>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            ) : picked ? (
                <p className="text-sm text-pretty text-fg-muted">
                    {picked.key === 'PENSION' ? tAsset('locked_pension') : tAsset('locked_default')}
                </p>
            ) : null}
        </FormCreateEditShell>
    );
}
