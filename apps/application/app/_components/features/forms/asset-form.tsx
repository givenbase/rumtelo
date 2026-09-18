'use client';

import { useForm, useWatch } from 'react-hook-form';

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

type AssetFormProps = {
    embedded?: boolean;
    onSuccess?: () => void;
};

/** Asks the class first. The name searches the same catalog a fixed cost does. */
export function AssetForm({ embedded = true, onSuccess }: AssetFormProps) {
    const { showToast } = useAppShell();
    const dismiss = useFormDismiss(onSuccess);
    const { symbol } = useHouseholdCurrency();
    const { householdId } = useAuth();
    const live = isLiveData(householdId);

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
        defaultValues: { kind: 'PORTFOLIO', name: '', value: '', flow: '' },
        resolver: zodResolver(assetFormSchema),
    });

    const kindKey = useWatch({ control: form.control, name: 'kind' });
    const picked = kinds.find(kind => kind.key === kindKey) ?? kinds[0];

    const suggestions: NamePresetOption[] = presets.map(preset => ({
        key: preset.key,
        name: preset.name,
        group: preset.kindName,
    }));

    const onError = createFormInvalidHandler(({ title, description }) => {
        showToast(description ?? title, 'error');
    });

    function selectKind(next: string) {
        const current = form.getValues('name');
        form.setValue('kind', next, { shouldValidate: true });
        const preset = presets.find(row => row.name === current);
        if (preset && preset.kindKey !== next) form.setValue('name', '');
        const nextKind = kinds.find(row => row.key === next);
        if (nextKind && !nextKind.canPay) form.setValue('flow', '');
    }

    function selectPreset(option: NamePresetOption) {
        const preset = presets.find(row => row.key === option.key);
        if (!preset) return;
        form.setValue('kind', preset.kindKey, { shouldValidate: true });
        if (!preset.canPay) form.setValue('flow', '');
    }

    async function onSubmit() {
        showToast('Not on the board yet — an asset has nowhere to be stored.', 'success');
        dismiss();
    }

    return (
        <FormCreateEditShell
            embedded={embedded}
            form={form}
            onError={onError}
            onSubmit={onSubmit}
            sidebar={
                <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? 'Working…' : 'Save asset'}
                </Button>
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
                                {kinds.map(option => {
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
                                onChange={field.onChange}
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
