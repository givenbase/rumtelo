'use client';

import { useState } from 'react';
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
    createFormInvalidHandler,
} from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import { zodResolver } from '@hookform/resolvers/zod';
import type { AssetKind, AssetPreset } from '@rumtelo/contracts';
import { z } from 'zod';

import { api } from '@/app/_lib/api';
import { apiQuery } from '@/app/_lib/api-hooks';
import { parseAmountToMinorUnits } from '@/app/_lib/money-input';
import { isLiveData } from '@/app/_lib/preview';
import { useFormDismiss } from '@/app/_lib/use-form-dismiss';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';
import { useAuth } from '@/components/features/shell/auth-provider';
import { useAppShell } from '@/components/features/shell/app-shell-context';
import { FormCreateEditShell } from '@/components/layout/form-create-edit-shell';

import { FormInput } from './form-input';
import { type NamePresetOption, PresetNameField } from './preset-name-field';
import { ConfirmActionButton } from './confirm-action-button';

const EMPTY_KINDS: AssetKind[] = [];
const EMPTY_PRESETS: AssetPreset[] = [];

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

const assetFormSchema = z
    .object({
        kind: z.string().min(1).max(64),
        name: z.string().min(1, 'Name is required').max(80),
        value: moneyInput,
        flow: z.string().optional(),
    })
    .superRefine((values, ctx) => {
        if (!values.flow?.trim()) return;
        const cents = parseAmountToMinorUnits(values.flow);
        if (cents === null || cents < 0) {
            ctx.addIssue({ code: 'custom', path: ['flow'], message: 'Enter a valid amount' });
        }
    });

type AssetFormValues = z.infer<typeof assetFormSchema>;

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
    const { showToast } = useAppShell();
    const dismiss = useFormDismiss(onSuccess);
    const { symbol } = useHouseholdCurrency();
    const { householdId } = useAuth();
    const live = isLiveData(householdId);
    const queryClient = useQueryClient();
    const [presetKey, setPresetKey] = useState(defaultValues?.presetKey ?? null);

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
    const kinds = kindsQuery.data ?? EMPTY_KINDS;
    const presets = presetsQuery.data ?? EMPTY_PRESETS;

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
    const picked = kinds.find(kind => kind.key === kindKey) ?? kinds[0];

    const locked = kinds.find(kind => kind.key === lockedKind);
    const visibleKinds = locked ? [locked] : kinds;

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

    const onError = createFormInvalidHandler(({ title, description }) => {
        showToast(description ?? title, 'error');
    });

    function selectKind(next: string) {
        const current = form.getValues('name');
        form.setValue('kind', next, { shouldValidate: true });
        const preset = presets.find(row => row.name === current);
        if (preset && preset.kindKey !== next) {
            form.setValue('name', '');
            setPresetKey(null);
        }
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

    const saveMutation = useMutation({
        mutationFn: async (values: AssetFormValues) => {
            if (!householdId || !entityId) throw new Error('No household');
            const cents = parseAmountToMinorUnits(values.value);
            if (cents === null || cents <= 0) throw new Error('Invalid amount');
            const kind = kinds.find(row => row.key === values.kind);
            const flowCents =
                kind && !kind.canPay
                    ? 0
                    : values.flow?.trim()
                      ? (parseAmountToMinorUnits(values.flow) ?? 0)
                      : 0;
            return api.growth.assets.update({
                id: entityId,
                householdId,
                name: values.name.trim(),
                kindKey: values.kind,
                presetKey,
                value: cents,
                flow: flowCents,
            });
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: apiQuery.growth.assets.list.key() });
            void queryClient.invalidateQueries({ queryKey: apiQuery.growth.assets.get.key() });
            showToast('Asset updated', 'success');
            dismiss();
        },
        onError: () => showToast('Save failed', 'error'),
    });

    const removeMutation = useMutation({
        mutationFn: async () => {
            if (!householdId || !entityId) throw new Error('No household');
            return api.growth.assets.remove({ householdId, id: entityId });
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: apiQuery.growth.assets.list.key() });
            void queryClient.invalidateQueries({ queryKey: apiQuery.growth.assets.get.key() });
            showToast('Asset deleted', 'success');
            dismiss();
        },
        onError: () => showToast('Delete failed', 'error'),
    });

    async function onSubmit(values: AssetFormValues) {
        if (mode !== 'edit' || !entityId) {
            showToast('Not on the board yet — an asset has nowhere to be stored.', 'success');
            dismiss();
            return;
        }
        if (!live) {
            showToast('Sign in to save this asset', 'error');
            return;
        }
        await saveMutation.mutateAsync(values);
    }

    const busy = form.formState.isSubmitting || saveMutation.isPending || removeMutation.isPending;

    return (
        <FormCreateEditShell
            embedded={embedded}
            form={form}
            onError={onError}
            onSubmit={onSubmit}
            sidebar={
                <div className="grid gap-2">
                    <Button type="submit" className="w-full" disabled={busy}>
                        {busy ? 'Working…' : mode === 'edit' ? 'Save changes' : 'Save asset'}
                    </Button>
                    {mode === 'edit' && entityId ? (
                        <ConfirmActionButton
                            variant="ghost"
                            className="w-full text-danger hover:bg-danger/10 hover:text-danger"
                            disabled={busy}
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
                name="kind"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Type</FormLabel>
                        <FormControl>
                            <div
                                className="grid gap-2 sm:grid-cols-2"
                                role="radiogroup"
                                aria-label="Asset type">
                                {visibleKinds.map(option => {
                                    const on = field.value === option.key;
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
                                                {option.icon}
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
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                            <PresetNameField
                                value={field.value}
                                options={suggestions}
                                placeholder="Start typing, or pick one"
                                freeTextPlaceholder="Type the name"
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

            <FormField
                control={form.control}
                name="value"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Value ({symbol})</FormLabel>
                        <FormControl>
                            <FormInput inputMode="decimal" placeholder="0,00" {...field} />
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
                            <FormLabel>Pays you each month ({symbol})</FormLabel>
                            <FormControl>
                                <FormInput inputMode="decimal" placeholder="0,00" {...field} />
                            </FormControl>
                            <p className="text-xs text-fg-faint">
                                Leave empty if it only sits there.
                            </p>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            ) : picked ? (
                <p className="text-sm text-pretty text-fg-muted">
                    {picked.key === 'PENSION'
                        ? 'Locked until you stop working. It counts in the total, not as monthly income.'
                        : 'It counts in the total, not as monthly income.'}
                </p>
            ) : null}
        </FormCreateEditShell>
    );
}
