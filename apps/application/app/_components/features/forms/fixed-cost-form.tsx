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
import { Cadence, FlowDirection, JarKey } from '@rumtelo/contracts';
import { z } from 'zod';

import { parseAmountToMinorUnits } from '@/app/_lib/money-input';
import { isLiveData } from '@/app/_lib/preview';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';
import { useFormDismiss } from '@/app/_lib/use-form-dismiss';
import { GivingFinder } from '@/components/features/money/giving-finder';
import { useAppShell } from '@/components/features/shell/app-shell-context';
import { useAuth } from '@/components/features/shell/auth-provider';
import { FormCreateEditShell } from '@/components/layout/form-create-edit-shell';

import { ConfirmActionButton } from './confirm-action-button';
import { resolveCategoryId, useCategoryTemplates } from './catalog-helpers';
import { FormInput } from './form-input';
import { PresetNameField } from './preset-name-field';

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

/** Category template the Give helper falls back to when none was picked. */
const DONATIONS_CATEGORY_KEY = 'DONATIONS';

export type FixedCostFormValues = z.infer<typeof fixedCostFormSchema>;

type FixedCostFormProps = {
    defaultValues?: Partial<FixedCostFormValues>;
    embedded?: boolean;
    mode?: 'create' | 'edit';
    entityId?: string;
    onSuccess?: () => void;
};

export function FixedCostForm({
    defaultValues,
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

    const jarsQuery = useLiveQuery(
        apiQuery.money.jars.list.queryOptions({ input: { householdId: householdId! } }),
        [],
        live
    );
    const jars = useMemo(() => jarsQuery.data ?? [], [jarsQuery.data]);

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
    const categoriesQuery = useCategoryTemplates(live);

    const categoryByKey = useMemo(() => {
        const map = new Map<string, { name: string; icon: string | null }>();
        for (const category of categoriesQuery.data ?? []) {
            map.set(category.key, { name: category.name, icon: category.icon });
        }
        return map;
    }, [categoriesQuery.data]);

    const presetOptions = useMemo(
        () =>
            (presetsQuery.data ?? []).map(preset => {
                const category = categoryByKey.get(preset.categoryTemplateKey);
                return {
                    key: preset.key,
                    name: preset.name,
                    group: category?.name ?? preset.categoryTemplateKey,
                    icon: category?.icon ?? null,
                    jarKey: preset.jarKey,
                    categoryTemplateKey: preset.categoryTemplateKey,
                    suggestedDueDay: preset.suggestedDueDay,
                };
            }),
        [presetsQuery.data, categoryByKey]
    );

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
    const counterparty = useWatch({ control: form.control, name: 'counterparty' });
    const isGive = useMemo(
        () => jars.find(jar => jar.id === selectedJarId)?.key === JarKey.GIVE,
        [jars, selectedJarId]
    );

    const jarCategories = useMemo(() => {
        const jar = (balancesQuery.data ?? []).find(row => row.id === selectedJarId);
        return (jar?.categories ?? []).filter(category => !category.isArchived);
    }, [balancesQuery.data, selectedJarId]);

    useEffect(() => {
        if (jars[0]?.id && !form.getValues('jarId')) {
            form.setValue('jarId', jars[0].id);
        }
    }, [jars, form]);

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
                presetOptions.find(preset => preset.name.toLowerCase() === name.toLowerCase())
                    ?.categoryTemplateKey ??
                null;
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

    const pendingLabel = pendingCategoryTemplateKey
        ? categoryByKey.get(pendingCategoryTemplateKey)?.name
        : null;

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
                        <FormControl>
                            {mode === 'create' ? (
                                <PresetNameField
                                    value={field.value}
                                    onChange={field.onChange}
                                    placeholder="e.g. rent"
                                    freeTextPlaceholder="Type a custom bill name…"
                                    options={presetOptions}
                                    lockPresets
                                    freeTextKeys={['OTHER']}
                                    onSelect={opt => {
                                        const full = presetOptions.find(
                                            preset => preset.key === opt.key
                                        );
                                        if (!full) return;
                                        const jar = jars.find(j => j.key === full.jarKey);
                                        if (jar) form.setValue('jarId', jar.id);
                                        if (full.suggestedDueDay !== null) {
                                            form.setValue('dueDay', String(full.suggestedDueDay));
                                        }
                                        setPendingCategoryTemplateKey(full.categoryTemplateKey);
                                        form.setValue('categoryId', null);
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
                                }}>
                                {jars.length === 0 ? (
                                    <option value="">No jars — complete setup first</option>
                                ) : (
                                    jars.map(jar => (
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
                name="counterparty"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>
                            {isGive ? 'To whom (organisation)' : 'Paid to (optional)'}
                        </FormLabel>
                        <FormControl>
                            <FormInput
                                placeholder={
                                    isGive
                                        ? 'The organisation you give to'
                                        : 'e.g. landlord, insurer'
                                }
                                {...field}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            {isGive ? (
                <GivingFinder
                    selectedName={counterparty}
                    onPick={organisation => {
                        form.setValue('counterparty', organisation.name, { shouldDirty: true });
                        if (!form.getValues('categoryId') && !pendingCategoryTemplateKey) {
                            setPendingCategoryTemplateKey(DONATIONS_CATEGORY_KEY);
                        }
                    }}
                />
            ) : null}

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
