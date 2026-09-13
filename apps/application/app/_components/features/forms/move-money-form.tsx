'use client';

import { FormInput } from './form-input';
import { api } from '@/app/_lib/api';
import { apiQuery } from '@/app/_lib/api-hooks';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
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
import { cn, toPeriodKey } from '@rumtelo/utils';
import { jarCapabilitiesFor } from '@rumtelo/contracts';

import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { JAR_META } from '@/app/_lib/jar-meta';
import { parseAmountToMinorUnits, todayIsoDate } from '@/app/_lib/money-input';
import { isLiveData } from '@/app/_lib/preview';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';
import { useFormDismiss } from '@/app/_lib/use-form-dismiss';
import { useAppShell } from '@/components/features/shell/app-shell-context';
import { useAuth } from '@/components/features/shell/auth-provider';
import { FormCreateEditShell } from '@/components/layout/form-create-edit-shell';

const moveSchema = z
    .object({
        fromJarId: z.string().min(1, 'Choose a jar to take from'),
        toJarId: z.string().min(1, 'Choose a jar to send to'),
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
    })
    .refine(values => values.fromJarId !== values.toJarId, {
        message: 'Pick two different jars',
        path: ['toJarId'],
    });

type MoveValues = z.infer<typeof moveSchema>;

type MoveMoneyFormProps = {
    embedded?: boolean;
    /** When set (jar detail), From is locked to this jar. */
    defaultFromJarId?: string;
    onSuccess?: () => void;
};

type JarPick = {
    id: string;
    key: string;
    name: string;
    icon: string;
    available: number | null;
    canSpend: boolean;
    canInvest: boolean;
};

type MoveEligibility = { ok: true } | { ok: false; reason: string };

function moveFromEligibility(jar: JarPick): MoveEligibility {
    if (!jar.canSpend) {
        return {
            ok: false,
            reason: jar.canInvest
                ? 'Protected — invest only, never move out'
                : 'This jar cannot send money',
        };
    }
    if (jar.available === null) return { ok: true };
    if (jar.available < 0) {
        return { ok: false, reason: 'Overspent — nothing left to move' };
    }
    if (jar.available === 0) {
        return { ok: false, reason: 'Nothing left to move' };
    }
    return { ok: true };
}

/**
 * Move available money between jars as a paired Out + In on the ledger.
 * Caps at source available; blocks jars that cannot spend (e.g. Financial Freedom).
 */
export function MoveMoneyForm({
    embedded = true,
    defaultFromJarId,
    onSuccess,
}: MoveMoneyFormProps) {
    const queryClient = useQueryClient();
    const { householdId } = useAuth();
    const { symbol, formatMoney } = useHouseholdCurrency();
    const { showToast, period } = useAppShell();
    const dismiss = useFormDismiss(onSuccess);
    const live = isLiveData(householdId);
    const fromLocked = Boolean(defaultFromJarId);
    const periodKey = toPeriodKey(period.year, period.month);

    const jarsQuery = useLiveQuery(
        apiQuery.money.jars.list.queryOptions({ input: { householdId: householdId! } }),
        [],
        live
    );
    const balancesQuery = useLiveQuery(
        apiQuery.money.jars.balances.queryOptions({
            input: { householdId: householdId!, period: periodKey },
        }),
        [],
        live
    );

    const jars = useMemo((): JarPick[] => {
        const balances = balancesQuery.data ?? [];
        const availableById = new Map(balances.map(row => [row.id, row.available]));
        return (jarsQuery.data ?? []).map(jar => {
            const meta = JAR_META.find(entry => entry.key === jar.key);
            const caps = jar.capabilities ?? jarCapabilitiesFor(jar.key);
            return {
                id: jar.id,
                key: jar.key,
                name: jar.name,
                icon: jar.icon || meta?.icon || '◇',
                available: availableById.has(jar.id) ? (availableById.get(jar.id) ?? 0) : null,
                canSpend: caps.canSpend,
                canInvest: caps.canInvest,
            };
        });
    }, [jarsQuery.data, balancesQuery.data]);

    const form = useForm<MoveValues>({
        defaultValues: {
            fromJarId: defaultFromJarId ?? '',
            toJarId: '',
            amount: '',
            note: '',
        },
        resolver: zodResolver(moveSchema),
    });

    const fromJarId = useWatch({ control: form.control, name: 'fromJarId' });
    const toJarId = useWatch({ control: form.control, name: 'toJarId' });
    const amountValue = useWatch({ control: form.control, name: 'amount' });

    const fromJar = jars.find(j => j.id === fromJarId);
    const toJar = jars.find(j => j.id === toJarId);
    const fromEligibility = fromJar ? moveFromEligibility(fromJar) : null;
    const maxMoveCents =
        fromJar && fromEligibility?.ok && fromJar.available !== null && fromJar.available > 0
            ? fromJar.available
            : 0;

    useEffect(() => {
        if (!fromJarId || !toJarId || fromJarId !== toJarId) return;
        form.setValue('toJarId', '');
    }, [fromJarId, toJarId, form]);

    useEffect(() => {
        if (maxMoveCents <= 0 || !amountValue) return;
        const cents = parseAmountToMinorUnits(amountValue);
        if (cents !== null && cents > maxMoveCents) {
            form.setValue('amount', (maxMoveCents / 100).toFixed(2), {
                shouldValidate: true,
            });
        }
    }, [maxMoveCents, amountValue, form]);

    const mutation = useMutation({
        mutationFn: async (values: MoveValues) => {
            const cents = parseAmountToMinorUnits(values.amount);
            if (cents === null || cents <= 0) {
                throw new Error('Enter a valid amount');
            }
            const source = jars.find(j => j.id === values.fromJarId);
            if (!source) throw new Error('Choose a jar to take from');
            const eligibility = moveFromEligibility(source);
            if (!eligibility.ok) {
                throw new Error(eligibility.reason);
            }
            if (source.available !== null && cents > source.available) {
                throw new Error(
                    `You can move at most ${formatMoney(source.available)} from ${source.name}`
                );
            }
            if (values.fromJarId === values.toJarId) {
                throw new Error('Pick two different jars');
            }
            const date = todayIsoDate();
            const note = values.note.trim();
            const fromName = source.name;
            const toName = jars.find(j => j.id === values.toJarId)?.name ?? 'jar';

            await api.money.transactions.create({
                householdId: householdId!,
                description: `Moved to ${toName}`,
                amount: -cents,
                bookedOn: date,
                jarId: values.fromJarId,
                accountId: null,
                categoryId: null,
                counterparty: null,
                note: note || null,
            });
            await api.money.transactions.create({
                householdId: householdId!,
                description: `Moved from ${fromName}`,
                amount: cents,
                bookedOn: date,
                jarId: values.toJarId,
                accountId: null,
                categoryId: null,
                counterparty: null,
                note: note || null,
            });
        },
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: apiQuery.money.jars.balances.key() }),
                queryClient.invalidateQueries({ queryKey: apiQuery.money.jars.list.key() }),
                queryClient.invalidateQueries({
                    queryKey: apiQuery.money.transactions.list.key(),
                }),
                queryClient.invalidateQueries({ queryKey: apiQuery.money.dashboard.get.key() }),
            ]);
            showToast('Money moved between jars', 'success');
            dismiss();
        },
        onError: (error: Error) => {
            showToast(error.message || 'Could not move money', 'error');
        },
    });

    const loading = jarsQuery.isLoading || balancesQuery.isLoading;
    const canSubmit = fromEligibility?.ok === true && maxMoveCents > 0;
    const busy = form.formState.isSubmitting || mutation.isPending || loading || !canSubmit;

    async function onSubmit(values: MoveValues) {
        if (!live) {
            showToast('Sign in to move money', 'error');
            return;
        }
        await mutation.mutateAsync(values);
    }

    const onError = createFormInvalidHandler();

    const body = (
        <div className="space-y-5">
            <FormField
                control={form.control}
                name="fromJarId"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[10px] font-bold tracking-wider text-[var(--ink-3)] uppercase">
                            From
                        </FormLabel>
                        {fromLocked && fromJar ? (
                            <div className="space-y-2">
                                <div
                                    className={cn(
                                        'flex items-center gap-3 rounded-[var(--r)] border px-3 py-3',
                                        fromEligibility?.ok
                                            ? 'border-[color-mix(in_srgb,var(--teal)_35%,var(--line))] bg-[color-mix(in_srgb,var(--teal)_8%,transparent)]'
                                            : 'border-[color-mix(in_srgb,var(--coral)_40%,var(--line))] bg-[color-mix(in_srgb,var(--coral)_8%,transparent)]'
                                    )}>
                                    <span className="text-lg" aria-hidden>
                                        {fromJar.icon}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-[var(--ink)]">
                                            {fromJar.name}
                                        </p>
                                        <p className="text-[11px] text-[var(--ink-3)]">This jar</p>
                                    </div>
                                    {fromJar.available !== null ? (
                                        <span
                                            className={cn(
                                                'shrink-0 text-xs font-semibold tabular-nums',
                                                fromJar.available < 0
                                                    ? 'text-[var(--coral)]'
                                                    : 'text-[var(--ink-2)]'
                                            )}>
                                            {formatMoney(fromJar.available)} left
                                        </span>
                                    ) : null}
                                </div>
                                {fromEligibility && !fromEligibility.ok ? (
                                    <p className="text-xs text-[var(--coral)]">
                                        {fromEligibility.reason}
                                    </p>
                                ) : null}
                            </div>
                        ) : (
                            <FormControl>
                                <div
                                    role="radiogroup"
                                    aria-label="Jar to take from"
                                    className="flex flex-col gap-2">
                                    {jars.map(jar => {
                                        const selected = field.value === jar.id;
                                        const eligibility = moveFromEligibility(jar);
                                        const disabled = !eligibility.ok;
                                        return (
                                            <button
                                                key={jar.id}
                                                type="button"
                                                role="radio"
                                                aria-checked={selected}
                                                disabled={disabled}
                                                title={disabled ? eligibility.reason : undefined}
                                                onClick={() => field.onChange(jar.id)}
                                                className={cn(
                                                    'flex w-full min-w-0 items-center gap-3 rounded-[var(--r)] border px-3 py-3 text-left transition-colors',
                                                    disabled && 'cursor-not-allowed opacity-55',
                                                    selected && !disabled
                                                        ? 'border-[color-mix(in_srgb,var(--teal)_45%,var(--line))] bg-[color-mix(in_srgb,var(--teal)_10%,transparent)]'
                                                        : !disabled &&
                                                              'border-[var(--line)] bg-[var(--card)] hover:border-[var(--ink-3)]'
                                                )}>
                                                <span className="text-lg" aria-hidden>
                                                    {jar.icon}
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <span className="block truncate text-sm font-semibold text-[var(--ink)]">
                                                        {jar.name}
                                                    </span>
                                                    {disabled ? (
                                                        <span className="mt-0.5 block text-[11px] text-[var(--ink-3)]">
                                                            {eligibility.reason}
                                                        </span>
                                                    ) : null}
                                                </div>
                                                {jar.available !== null ? (
                                                    <span
                                                        className={cn(
                                                            'shrink-0 text-xs font-semibold tabular-nums',
                                                            jar.available < 0
                                                                ? 'text-[var(--coral)]'
                                                                : 'text-[var(--ink-2)]'
                                                        )}>
                                                        {formatMoney(jar.available)} left
                                                    </span>
                                                ) : null}
                                            </button>
                                        );
                                    })}
                                </div>
                            </FormControl>
                        )}
                        <FormMessage />
                    </FormItem>
                )}
            />

            <div className="flex justify-center" aria-hidden>
                <span className="rounded-full border border-[var(--line)] bg-[var(--card)] px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-[var(--ink-3)] uppercase">
                    ↓ to
                </span>
            </div>

            <FormField
                control={form.control}
                name="toJarId"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[10px] font-bold tracking-wider text-[var(--ink-3)] uppercase">
                            To
                        </FormLabel>
                        <FormControl>
                            <div
                                role="radiogroup"
                                aria-label="Jar to send to"
                                className="flex flex-col gap-2">
                                {jars
                                    .filter(jar => jar.id !== fromJarId)
                                    .map(jar => {
                                        const selected = field.value === jar.id;
                                        return (
                                            <button
                                                key={jar.id}
                                                type="button"
                                                role="radio"
                                                aria-checked={selected}
                                                onClick={() => field.onChange(jar.id)}
                                                className={cn(
                                                    'flex w-full min-w-0 items-center gap-3 rounded-[var(--r)] border px-3 py-3 text-left transition-colors',
                                                    selected
                                                        ? 'border-[color-mix(in_srgb,var(--teal)_45%,var(--line))] bg-[color-mix(in_srgb,var(--teal)_10%,transparent)]'
                                                        : 'border-[var(--line)] bg-[var(--card)] hover:border-[var(--ink-3)]'
                                                )}>
                                                <span className="text-lg" aria-hidden>
                                                    {jar.icon}
                                                </span>
                                                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--ink)]">
                                                    {jar.name}
                                                </span>
                                                {jar.available !== null ? (
                                                    <span
                                                        className={cn(
                                                            'shrink-0 text-xs font-semibold tabular-nums',
                                                            jar.available < 0
                                                                ? 'text-[var(--coral)]'
                                                                : 'text-[var(--ink-2)]'
                                                        )}>
                                                        {formatMoney(jar.available)} left
                                                    </span>
                                                ) : null}
                                            </button>
                                        );
                                    })}
                            </div>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            {fromJar && toJar && fromEligibility?.ok ? (
                <div className="rounded-[var(--r)] border border-[color-mix(in_srgb,var(--blue)_28%,var(--line))] bg-[color-mix(in_srgb,var(--blue)_6%,transparent)] px-3 py-2.5 text-sm text-[var(--ink-2)]">
                    <span className="font-semibold text-[var(--ink)]">{fromJar.name}</span>
                    <span className="mx-1.5 text-[var(--ink-3)]">→</span>
                    <span className="font-semibold text-[var(--ink)]">{toJar.name}</span>
                    {amountValue && parseAmountToMinorUnits(amountValue) ? (
                        <span className="ml-2 font-bold text-[var(--teal)] tabular-nums">
                            {formatMoney(parseAmountToMinorUnits(amountValue)!)}
                        </span>
                    ) : null}
                </div>
            ) : null}

            <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                    <FormItem>
                        <div className="flex items-center justify-between gap-2">
                            <FormLabel>Amount ({symbol})</FormLabel>
                            {maxMoveCents > 0 ? (
                                <button
                                    type="button"
                                    className="text-[11px] font-semibold text-[var(--teal)] hover:underline"
                                    onClick={() =>
                                        form.setValue('amount', (maxMoveCents / 100).toFixed(2), {
                                            shouldValidate: true,
                                            shouldDirty: true,
                                        })
                                    }>
                                    Use max ({formatMoney(maxMoveCents)})
                                </button>
                            ) : null}
                        </div>
                        <FormControl>
                            <FormInput
                                type="number"
                                inputMode="decimal"
                                step="0.01"
                                min="0"
                                max={maxMoveCents > 0 ? (maxMoveCents / 100).toFixed(2) : undefined}
                                placeholder="0.00"
                                disabled={!canSubmit}
                                {...field}
                            />
                        </FormControl>
                        {maxMoveCents > 0 && fromJar ? (
                            <p className="text-[11px] text-[var(--ink-3)]">
                                Max from {fromJar.name}: {formatMoney(maxMoveCents)}
                            </p>
                        ) : null}
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="note"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Note</FormLabel>
                        <FormControl>
                            <FormInput placeholder="Optional — why this move" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
    );

    return (
        <FormCreateEditShell
            embedded={embedded}
            form={form}
            onError={onError}
            onSubmit={onSubmit}
            sidebar={
                <div className="grid gap-2">
                    <p className="text-xs text-fg-muted">
                        Only jars with money left can send. Financial Freedom stays invested.
                    </p>
                    <Button type="submit" className="w-full" disabled={busy}>
                        {mutation.isPending || form.formState.isSubmitting
                            ? 'Moving…'
                            : 'Move money'}
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        className="w-full"
                        disabled={mutation.isPending}
                        onClick={dismiss}>
                        Cancel
                    </Button>
                </div>
            }>
            {body}
        </FormCreateEditShell>
    );
}
