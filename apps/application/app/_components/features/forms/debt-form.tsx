'use client';

import { api } from '@/app/_lib/api';
import { apiQuery } from '@/app/_lib/api-hooks';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
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
import { DebtKind } from '@rumtelo/contracts';
import { z } from 'zod';

import { parseAmountToMinorUnits } from '@/app/_lib/money-input';
import { isLiveData } from '@/app/_lib/preview';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';
import { useFormDismiss } from '@/app/_lib/use-form-dismiss';
import { useAppShell } from '@/components/features/shell/app-shell-context';
import { useAuth } from '@/components/features/shell/auth-provider';
import { FormCreateEditShell } from '@/components/layout/form-create-edit-shell';
import { ConfirmActionButton } from './confirm-action-button';
import { FormInput } from './form-input';
import { PresetNameField } from './preset-name-field';

const moneyInput = z
    .string()
    .min(1, 'Amount is required')
    .refine(
        value => {
            const cents = parseAmountToMinorUnits(value);
            return cents !== null && cents >= 0;
        },
        { message: 'Enter a valid amount' }
    );

const debtFormSchema = z.object({
    name: z.string().min(1, 'Who you owe is required').max(120),
    balance: moneyInput,
    interestRate: z
        .string()
        .min(1, 'Interest rate is required')
        .refine(
            value => {
                const parsed = Number(value.replace(',', '.'));
                return Number.isFinite(parsed) && parsed >= 0 && parsed <= 100;
            },
            { message: 'Interest must be between 0 and 100' }
        ),
    minimumPayment: z.string().optional(),
    kind: z.enum(DebtKind),
});

export type DebtFormValues = z.infer<typeof debtFormSchema>;

type DebtFormProps = {
    defaultValues?: Partial<DebtFormValues>;
    embedded?: boolean;
    mode?: 'create' | 'edit';
    entityId?: string;
    onSuccess?: () => void;
};

export function DebtForm({
    defaultValues,
    embedded = true,
    mode = 'create',
    entityId,
    onSuccess,
}: DebtFormProps) {
    const queryClient = useQueryClient();
    const { householdId } = useAuth();
    const { symbol } = useHouseholdCurrency();
    const { showToast } = useAppShell();
    const dismiss = useFormDismiss(onSuccess);
    const live = isLiveData(householdId);
    const [typeKey, setTypeKey] = useState<string | null>(null);
    const [typeQuery, setTypeQuery] = useState('');
    const [customLender, setCustomLender] = useState(false);

    const debtTypesQuery = useLiveQuery(
        apiQuery.money.catalogs.debtPresets.list.queryOptions({
            input: { householdId: householdId! },
        }),
        [],
        live && mode === 'create'
    );

    const typeOptions = useMemo(
        () =>
            (debtTypesQuery.data ?? []).map(preset => ({
                key: preset.key,
                name: preset.name,
                kind: preset.kind,
                icon: preset.icon,
                suggestedLenders: preset.suggestedLenders ?? [],
            })),
        [debtTypesQuery.data]
    );

    const selectedType = typeOptions.find(option => option.key === typeKey) ?? null;
    const lendersForType = selectedType?.suggestedLenders ?? [];

    const form = useForm<DebtFormValues>({
        defaultValues: {
            name: defaultValues?.name ?? '',
            balance: defaultValues?.balance ?? '',
            interestRate: defaultValues?.interestRate ?? '0',
            minimumPayment: defaultValues?.minimumPayment ?? '',
            kind: defaultValues?.kind ?? DebtKind.LOAN,
        },
        resolver: zodResolver(debtFormSchema),
    });

    const onError = createFormInvalidHandler(({ title, description }) => {
        showToast(description ?? title, 'error');
    });

    const saveMutation = useMutation({
        mutationFn: async (values: DebtFormValues) => {
            if (!householdId) throw new Error('No household');
            const balance = parseAmountToMinorUnits(values.balance);
            if (balance === null || balance < 0) throw new Error('Invalid balance');
            const minimumRaw = values.minimumPayment?.trim()
                ? parseAmountToMinorUnits(values.minimumPayment)
                : 0;
            const minimumPayment = minimumRaw === null ? 0 : minimumRaw;
            const interestRate = Number(values.interestRate.replace(',', '.'));
            const name = values.name.trim();

            if (mode === 'edit' && entityId) {
                return api.money.debts.update({
                    id: entityId,
                    householdId,
                    name,
                    kind: values.kind,
                    balance,
                    interestRate,
                    minimumPayment,
                });
            }
            return api.money.debts.create({
                householdId,
                name,
                kind: values.kind,
                balance,
                originalBalance: balance,
                interestRate,
                minimumPayment,
                extraPayment: 0,
                dueDay: null,
                closedOn: null,
            });
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: apiQuery.money.debts.list.key() });
            void queryClient.invalidateQueries({ queryKey: apiQuery.money.debts.plan.key() });
            showToast(mode === 'edit' ? 'Debt updated' : 'Debt saved', 'success');
            dismiss();
        },
        onError: () => showToast('Save failed', 'error'),
    });

    const removeMutation = useMutation({
        mutationFn: async () => {
            if (!householdId || !entityId) throw new Error('No household');
            return api.money.debts.remove({ householdId, id: entityId });
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: apiQuery.money.debts.list.key() });
            void queryClient.invalidateQueries({ queryKey: apiQuery.money.debts.plan.key() });
            showToast('Debt deleted', 'success');
            dismiss();
        },
        onError: () => showToast('Delete failed', 'error'),
    });

    async function onSubmit(values: DebtFormValues) {
        if (!live) {
            showToast('Sign in to save debts', 'error');
            return;
        }
        if (mode === 'create' && !typeKey) {
            showToast('Pick a debt type first', 'error');
            return;
        }
        await saveMutation.mutateAsync(values);
    }

    const busy = form.formState.isSubmitting || saveMutation.isPending || removeMutation.isPending;

    const selectedLenderName = useWatch({ control: form.control, name: 'name' }) ?? '';
    const showLenderInput = customLender || lendersForType.length === 0;

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
                              : 'Save debt'}
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
            {mode === 'create' ? (
                <>
                    <div className="grid gap-2">
                        <p className="font-mono text-[10px] font-semibold tracking-wider text-fg-muted uppercase">
                            What kind of debt?
                        </p>
                        {selectedType ? (
                            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-raised px-3 py-2.5 text-sm">
                                <span className="min-w-0 flex-1 font-medium text-fg">
                                    {selectedType.icon ? `${selectedType.icon} ` : ''}
                                    {selectedType.name}
                                </span>
                                <button
                                    type="button"
                                    className="font-mono text-xs tracking-wide text-accent uppercase hover:underline"
                                    onClick={() => {
                                        setTypeKey(null);
                                        setTypeQuery('');
                                        setCustomLender(false);
                                        form.setValue('name', '');
                                    }}>
                                    Change
                                </button>
                            </div>
                        ) : (
                            <PresetNameField
                                value={typeQuery}
                                onChange={setTypeQuery}
                                placeholder="e.g. student loan"
                                options={typeOptions}
                                onSelect={opt => {
                                    const full = typeOptions.find(preset => preset.key === opt.key);
                                    if (!full) return;
                                    setTypeKey(full.key);
                                    setTypeQuery('');
                                    setCustomLender(false);
                                    form.setValue('kind', full.kind);
                                    form.setValue('name', '');
                                }}
                            />
                        )}
                    </div>

                    {selectedType ? (
                        <div className="grid gap-2">
                            <p className="font-mono text-[10px] font-semibold tracking-wider text-fg-muted uppercase">
                                Who do you owe?
                            </p>
                            {lendersForType.length > 0 && !customLender ? (
                                <div className="flex flex-wrap gap-1.5">
                                    {lendersForType.map(lender => {
                                        const selected =
                                            selectedLenderName.toLowerCase() ===
                                            lender.toLowerCase();
                                        return (
                                            <button
                                                key={lender}
                                                type="button"
                                                disabled={busy}
                                                className={
                                                    selected
                                                        ? 'rounded-full border border-accent bg-accent/15 px-3 py-1.5 text-sm text-accent'
                                                        : 'rounded-full border border-line bg-raised px-3 py-1.5 text-sm text-fg hover:border-accent hover:text-accent'
                                                }
                                                onClick={() =>
                                                    form.setValue('name', lender, {
                                                        shouldValidate: true,
                                                    })
                                                }>
                                                {lender}
                                            </button>
                                        );
                                    })}
                                    <button
                                        type="button"
                                        disabled={busy}
                                        className="rounded-full border border-dashed border-line px-3 py-1.5 text-sm text-fg-muted hover:border-accent hover:text-accent"
                                        onClick={() => {
                                            setCustomLender(true);
                                            form.setValue('name', '', {
                                                shouldValidate: false,
                                            });
                                        }}>
                                        Other…
                                    </button>
                                </div>
                            ) : null}
                            {showLenderInput ? (
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <FormInput
                                                    placeholder={
                                                        lendersForType.length > 0
                                                            ? 'Lender name'
                                                            : 'e.g. bank or person'
                                                    }
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            ) : (
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={() => (
                                        <FormItem>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}
                        </div>
                    ) : null}
                </>
            ) : (
                <>
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Who do you owe?</FormLabel>
                                <FormControl>
                                    <FormInput placeholder="e.g. DUO" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="kind"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Type</FormLabel>
                                <FormControl>
                                    <select
                                        className="h-11 w-full rounded-lg border border-line bg-raised px-3 text-sm text-fg focus:border-accent focus:outline-none"
                                        {...field}>
                                        <option value="CREDIT_CARD">Credit card</option>
                                        <option value="LOAN">Loan</option>
                                        <option value="STUDENT">Student loan</option>
                                        <option value="MORTGAGE">Mortgage</option>
                                        <option value="FAMILY">Family</option>
                                        <option value="OTHER">Other</option>
                                    </select>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </>
            )}

            <FormField
                control={form.control}
                name="balance"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Balance ({symbol})</FormLabel>
                        <FormControl>
                            <FormInput inputMode="decimal" placeholder="0,00" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="interestRate"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Interest rate (% per year)</FormLabel>
                        <FormControl>
                            <FormInput inputMode="decimal" placeholder="12,9" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="minimumPayment"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Minimum payment ({symbol})</FormLabel>
                        <FormControl>
                            <FormInput inputMode="decimal" placeholder="0,00" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </FormCreateEditShell>
    );
}
