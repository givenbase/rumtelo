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
import type { Jar, JarCapabilities } from '@rumtelo/contracts';
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

type JarPick = Pick<Jar, 'id' | 'key' | 'name'> &
    Pick<JarCapabilities, 'canSpend' | 'canInvest'> & {
        icon: string;
        /** null when balances for the period have not loaded yet. */
        available: number | null;
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

function JarBalance({
    cents,
    afterCents,
    formatMoney,
}: {
    cents: number | null;
    /** When set, shows current → projected balance after the move. */
    afterCents?: number | null;
    formatMoney: (cents: number) => string;
}) {
    if (cents === null) return null;
    const showAfter =
        afterCents !== undefined && afterCents !== null && afterCents !== cents;
    if (!showAfter) {
        return (
            <span
                className={cn(
                    'shrink-0 font-mono text-[11px] font-semibold tabular-nums',
                    cents < 0 ? 'text-danger' : 'text-fg-muted'
                )}>
                {formatMoney(cents)} left
            </span>
        );
    }
    return (
        <span className="shrink-0 text-right">
            <span
                className={cn(
                    'block font-mono text-[10px] tabular-nums text-fg-faint',
                    cents < 0 && 'text-danger/70'
                )}>
                {formatMoney(cents)}
            </span>
            <span
                className={cn(
                    'block font-mono text-[11px] font-semibold tabular-nums',
                    afterCents < 0 ? 'text-danger' : 'text-accent'
                )}>
                → {formatMoney(afterCents)}
            </span>
        </span>
    );
}

/** Locked source card — not clickable (opened from a jar detail). */
function LockedFromJar({
    jar,
    eligibility,
    afterCents,
    formatMoney,
}: {
    jar: JarPick;
    eligibility: MoveEligibility | null;
    afterCents?: number | null;
    formatMoney: (cents: number) => string;
}) {
    const blocked = eligibility !== null && !eligibility.ok;
    return (
        <div className="space-y-2">
            <div
                className={cn(
                    'flex items-center gap-3 rounded-xl border px-3 py-3',
                    blocked
                        ? 'border-danger/40 bg-danger/10'
                        : 'border-accent/40 bg-accent-soft'
                )}>
                <span className="text-lg" aria-hidden>
                    {jar.icon}
                </span>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-fg">{jar.name}</p>
                    <p className="font-mono text-[10px] tracking-wide text-fg-muted uppercase">
                        {blocked ? 'Cannot send from here' : 'Sending from here'}
                    </p>
                </div>
                <JarBalance
                    cents={jar.available}
                    afterCents={blocked ? undefined : afterCents}
                    formatMoney={formatMoney}
                />
            </div>
            {blocked ? (
                <p className="text-xs text-danger">{eligibility.reason}</p>
            ) : null}
        </div>
    );
}

type JarChoiceProps = {
    jar: JarPick;
    selected: boolean;
    disabled?: boolean;
    disabledReason?: string;
    /** Projected balance after the move (shown when selected + amount known). */
    afterCents?: number | null;
    onSelect: () => void;
    formatMoney: (cents: number) => string;
};

/** Clickable jar option with clear selected / disabled states. */
function JarChoice({
    jar,
    selected,
    disabled = false,
    disabledReason,
    afterCents,
    onSelect,
    formatMoney,
}: JarChoiceProps) {
    if (disabled) {
        return (
            <div
                aria-disabled="true"
                title={disabledReason}
                className="flex w-full min-w-0 cursor-not-allowed items-center gap-3 rounded-xl border border-dashed border-line bg-raised/40 px-3 py-3 opacity-60">
                <span
                    className="flex size-5 shrink-0 items-center justify-center rounded-full border border-line text-[10px] text-fg-faint"
                    aria-hidden>
                    —
                </span>
                <span className="text-lg grayscale" aria-hidden>
                    {jar.icon}
                </span>
                <div className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-fg-muted">
                        {jar.name}
                    </span>
                    {disabledReason ? (
                        <span className="mt-0.5 block text-[11px] leading-snug text-fg-faint">
                            {disabledReason}
                        </span>
                    ) : null}
                </div>
                <JarBalance cents={jar.available} formatMoney={formatMoney} />
            </div>
        );
    }

    return (
        <button
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={onSelect}
            className={cn(
                'flex w-full min-w-0 items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors',
                selected
                    ? 'border-accent bg-accent-soft ring-1 ring-accent/30'
                    : 'border-line bg-raised hover:border-accent/50 hover:bg-accent-soft/40'
            )}>
            <span
                className={cn(
                    'flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold',
                    selected
                        ? 'border-accent bg-accent text-on-accent'
                        : 'border-fg-faint bg-transparent text-transparent'
                )}
                aria-hidden>
                {selected ? '✓' : ''}
            </span>
            <span className="text-lg" aria-hidden>
                {jar.icon}
            </span>
            <div className="min-w-0 flex-1">
                <span
                    className={cn(
                        'block truncate text-sm font-semibold',
                        selected ? 'text-accent' : 'text-fg'
                    )}>
                    {jar.name}
                </span>
                <span
                    className={cn(
                        'mt-0.5 block font-mono text-[10px] tracking-wide uppercase',
                        selected ? 'text-accent' : 'text-fg-faint'
                    )}>
                    {selected ? 'Selected' : 'Tap to choose'}
                </span>
            </div>
            <JarBalance
                cents={jar.available}
                afterCents={selected ? afterCents : undefined}
                formatMoney={formatMoney}
            />
        </button>
    );
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
    const moveCents = parseAmountToMinorUnits(amountValue ?? '');
    const fromAvail = fromJar?.available ?? null;
    const toAvail = toJar?.available ?? null;
    const fromAfterCents =
        moveCents !== null && moveCents > 0 && fromAvail !== null
            ? fromAvail - moveCents
            : null;
    const toAfterCents =
        moveCents !== null && moveCents > 0 && toAvail !== null ? toAvail + moveCents : null;

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
                        <FormLabel className="font-mono text-[10px] font-bold tracking-wider text-fg-muted uppercase">
                            From
                        </FormLabel>
                        {fromLocked && fromJar ? (
                            <LockedFromJar
                                jar={fromJar}
                                eligibility={fromEligibility}
                                afterCents={fromAfterCents}
                                formatMoney={formatMoney}
                            />
                        ) : (
                            <FormControl>
                                <div
                                    role="radiogroup"
                                    aria-label="Jar to take from"
                                    className="flex flex-col gap-2">
                                    {jars.map(jar => {
                                        const eligibility = moveFromEligibility(jar);
                                        const selected = field.value === jar.id;
                                        return (
                                            <JarChoice
                                                key={jar.id}
                                                jar={jar}
                                                selected={selected}
                                                disabled={!eligibility.ok}
                                                disabledReason={
                                                    eligibility.ok ? undefined : eligibility.reason
                                                }
                                                afterCents={selected ? fromAfterCents : undefined}
                                                onSelect={() => field.onChange(jar.id)}
                                                formatMoney={formatMoney}
                                            />
                                        );
                                    })}
                                </div>
                            </FormControl>
                        )}
                        <FormMessage />
                    </FormItem>
                )}
            />

            {!fromJarId ? (
                <p className="text-[11px] text-fg-faint">Choose a source jar first.</p>
            ) : fromEligibility && !fromEligibility.ok ? (
                <p className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2.5 text-sm text-danger">
                    Pick a different source jar — this one can’t send money out.
                </p>
            ) : (
                <>
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
                                            className="font-mono text-[11px] font-semibold tracking-wide text-accent uppercase hover:underline"
                                            onClick={() =>
                                                form.setValue(
                                                    'amount',
                                                    (maxMoveCents / 100).toFixed(2),
                                                    {
                                                        shouldValidate: true,
                                                        shouldDirty: true,
                                                    }
                                                )
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
                                        max={
                                            maxMoveCents > 0
                                                ? (maxMoveCents / 100).toFixed(2)
                                                : undefined
                                        }
                                        placeholder="0.00"
                                        disabled={!canSubmit}
                                        {...field}
                                    />
                                </FormControl>
                                {maxMoveCents > 0 && fromJar ? (
                                    <p className="text-[11px] text-fg-faint">
                                        Max from {fromJar.name}: {formatMoney(maxMoveCents)}
                                    </p>
                                ) : null}
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="flex justify-center" aria-hidden>
                        <span className="rounded-full border border-line bg-raised px-2.5 py-0.5 font-mono text-[10px] font-bold tracking-wider text-fg-muted uppercase">
                            ↓ to
                        </span>
                    </div>

                    <FormField
                        control={form.control}
                        name="toJarId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="font-mono text-[10px] font-bold tracking-wider text-fg-muted uppercase">
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
                                                const previewAfter =
                                                    selected &&
                                                    moveCents !== null &&
                                                    moveCents > 0 &&
                                                    jar.available !== null
                                                        ? jar.available + moveCents
                                                        : null;
                                                return (
                                                    <JarChoice
                                                        key={jar.id}
                                                        jar={jar}
                                                        selected={selected}
                                                        afterCents={previewAfter}
                                                        onSelect={() => field.onChange(jar.id)}
                                                        formatMoney={formatMoney}
                                                    />
                                                );
                                            })}
                                    </div>
                                </FormControl>
                                {!field.value ? (
                                    <p className="text-[11px] text-fg-faint">
                                        Choose where the money should land.
                                    </p>
                                ) : null}
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {fromJar && toJar && fromEligibility?.ok ? (
                        <div className="space-y-1.5 rounded-xl border border-accent/30 bg-accent-soft/60 px-3 py-2.5 text-sm text-fg-muted">
                            <p>
                                Moving{' '}
                                {moveCents !== null && moveCents > 0 ? (
                                    <span className="font-semibold text-accent tabular-nums">
                                        {formatMoney(moveCents)}
                                    </span>
                                ) : (
                                    <span className="text-fg-faint">…</span>
                                )}{' '}
                                from <span className="font-semibold text-fg">{fromJar.name}</span>
                                <span className="mx-1 text-fg-faint">→</span>
                                <span className="font-semibold text-fg">{toJar.name}</span>
                            </p>
                            {toAfterCents !== null ? (
                                <p className="font-mono text-[11px] text-fg-faint">
                                    {toJar.name}{' '}
                                    <span className="text-fg-muted">
                                        {toJar.available !== null
                                            ? formatMoney(toJar.available)
                                            : '—'}
                                    </span>
                                    <span className="mx-1">→</span>
                                    <span className="font-semibold text-accent tabular-nums">
                                        {formatMoney(toAfterCents)}
                                    </span>
                                </p>
                            ) : null}
                        </div>
                    ) : null}

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
                </>
            )}
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
