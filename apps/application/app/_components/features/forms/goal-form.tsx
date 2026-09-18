'use client';

import { api } from '@/app/_lib/api';
import { apiQuery } from '@/app/_lib/api-hooks';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
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
import type { GoalPreset } from '@rumtelo/contracts';
import { GivingCause, GoalKind, GoalStatus, JarKey } from '@rumtelo/contracts';
import { z } from 'zod';

import { GIVING_CAUSE_CATALOG, WHY_GIVE, givingCauseMeta } from '@/app/_lib/giving';
import { parseAmountToMinorUnits } from '@/app/_lib/money-input';
import { isLiveData } from '@/app/_lib/preview';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';
import { soulPath } from '@/app/_lib/routes';
import { useFormDismiss } from '@/app/_lib/use-form-dismiss';
import { CoachTipCard } from '@/components/features/helpers';
import { GivingFinder } from '@/components/features/money/giving-finder';
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
            return cents !== null && cents > 0;
        },
        { message: 'Enter a valid amount' }
    );

const goalFormSchema = z.object({
    kind: z.enum(GoalKind),
    name: z.string().min(1, 'Name is required').max(120),
    target: moneyInput,
    monthlyContribution: z.string().optional(),
    jarId: z.string().optional(),
    why: z.string().max(500).optional(),
    /** GIVE: cause reserved for this pledge; null = any giving. */
    cause: z.enum(GivingCause).nullable().optional(),
    /** GIVE: organisation catalog key when named. */
    givingOrganisationKey: z.string().max(64).nullable().optional(),
});

export type GoalFormValues = z.infer<typeof goalFormSchema>;

type GiveTargetMode = 'open' | 'org' | 'manual';

const GOAL_KIND_OPTIONS: ReadonlyArray<{
    id: GoalKind;
    icon: string;
    label: string;
    line: string;
}> = [
    {
        id: GoalKind.SAVE,
        icon: '🎯',
        label: 'Save',
        line: 'Put money aside in a jar',
    },
    {
        id: GoalKind.EARN,
        icon: '📈',
        label: 'Earn',
        line: 'Reach a monthly income target',
    },
    {
        id: GoalKind.GIVE,
        icon: '💛',
        label: 'Give',
        line: 'Pledge what you’ll give this year',
    },
];

const GIVE_TARGET_MODES: ReadonlyArray<{ id: GiveTargetMode; label: string }> = [
    { id: 'manual', label: 'I know who' },
    { id: 'org', label: 'Help me choose' },
    { id: 'open', label: 'Keep it open' },
];

function givePledgeName(cause: GivingCause | null | undefined) {
    if (!cause) return 'Give pledge this year';
    const meta = givingCauseMeta(cause);
    return meta ? `${meta.name} pledge` : 'Give pledge this year';
}

function resolveGiveTargetMode(defaults: Partial<GoalFormValues> | undefined): GiveTargetMode {
    if (defaults?.givingOrganisationKey?.trim()) return 'org';
    if (defaults?.name?.trim() && defaults.name !== givePledgeName(defaults.cause ?? null)) {
        return 'manual';
    }
    return 'open';
}

type GoalFormProps = {
    defaultValues?: Partial<GoalFormValues>;
    embedded?: boolean;
    mode?: 'create' | 'edit';
    entityId?: string;
    onSuccess?: () => void;
};

export function GoalForm({
    defaultValues,
    embedded = true,
    mode = 'create',
    entityId,
    onSuccess,
}: GoalFormProps) {
    const queryClient = useQueryClient();
    const { householdId } = useAuth();
    const { symbol } = useHouseholdCurrency();
    const { showToast } = useAppShell();
    const dismiss = useFormDismiss(onSuccess);
    const live = isLiveData(householdId);
    const [giveTargetMode, setGiveTargetMode] = useState<GiveTargetMode>(() =>
        resolveGiveTargetMode(defaultValues)
    );

    const jarsQuery = useLiveQuery(
        apiQuery.money.jars.list.queryOptions({ input: { householdId: householdId! } }),
        [],
        live
    );
    const jars = useMemo(() => jarsQuery.data ?? [], [jarsQuery.data]);

    const presetsQuery = useLiveQuery(
        apiQuery.money.catalogs.goalPresets.list.queryOptions({
            input: { householdId: householdId! },
        }),
        [],
        live && mode === 'create'
    );
    const presetOptions = useMemo(
        () =>
            (presetsQuery.data ?? []).map(
                preset =>
                    ({
                        ...preset,
                        group: preset.key === 'OTHER' ? 'Other' : undefined,
                    }) satisfies GoalPreset & { group?: string }
            ),
        [presetsQuery.data]
    );
    const selectedIcon = useRef<string | null>(null);

    const form = useForm<GoalFormValues>({
        defaultValues: {
            kind: defaultValues?.kind ?? GoalKind.SAVE,
            name: defaultValues?.name ?? '',
            target: defaultValues?.target ?? '',
            monthlyContribution: defaultValues?.monthlyContribution ?? '',
            jarId: defaultValues?.jarId ?? '',
            why: defaultValues?.why ?? '',
            cause: defaultValues?.cause ?? null,
            givingOrganisationKey: defaultValues?.givingOrganisationKey ?? null,
        },
        resolver: zodResolver(goalFormSchema),
    });

    const kind = useWatch({ control: form.control, name: 'kind' });
    const cause = useWatch({ control: form.control, name: 'cause' });
    const givingOrganisationKey = useWatch({
        control: form.control,
        name: 'givingOrganisationKey',
    });
    const name = useWatch({ control: form.control, name: 'name' });
    const isEarn = kind === GoalKind.EARN;
    const isGive = kind === GoalKind.GIVE;

    useEffect(() => {
        if (isEarn) return;
        if (jars.length === 0) return;
        if (isGive) {
            // A pledge always lives in the Give jar — no choice to make.
            const give = jars.find(j => j.key === JarKey.GIVE);
            if (give && form.getValues('jarId') !== give.id) form.setValue('jarId', give.id);
            return;
        }
        if (!form.getValues('jarId')) {
            const lts = jars.find(j => j.key === JarKey.LONG_TERM_SAVINGS);
            form.setValue('jarId', lts?.id ?? jars[0]!.id);
        }
    }, [jars, form, isEarn, isGive]);

    const onError = createFormInvalidHandler(({ title, description }) => {
        showToast(description ?? title, 'error');
    });

    function selectKind(next: GoalKind) {
        if (next === kind) return;
        form.setValue('kind', next);
        if (next === GoalKind.GIVE) {
            form.setValue('cause', null);
            form.setValue('givingOrganisationKey', null);
            form.setValue('name', givePledgeName(null), { shouldDirty: false });
            setGiveTargetMode('open');
            selectedIcon.current = '💛';
            return;
        }
        form.setValue('cause', null);
        form.setValue('givingOrganisationKey', null);
        if (kind === GoalKind.GIVE) {
            form.setValue('name', '', { shouldDirty: false });
            selectedIcon.current = null;
        }
    }

    function selectCause(next: GivingCause | null) {
        form.setValue('cause', next, { shouldDirty: true });
        if (giveTargetMode === 'open') {
            form.setValue('givingOrganisationKey', null);
            form.setValue('name', givePledgeName(next), { shouldDirty: true });
            const meta = next ? givingCauseMeta(next) : null;
            selectedIcon.current = meta?.icon ?? '💛';
        }
    }

    function selectGiveTargetMode(next: GiveTargetMode) {
        if (next === giveTargetMode) return;
        setGiveTargetMode(next);
        form.setValue('givingOrganisationKey', null);
        if (next === 'open') {
            form.setValue('name', givePledgeName(cause ?? null), { shouldDirty: true });
            const meta = cause ? givingCauseMeta(cause) : null;
            selectedIcon.current = meta?.icon ?? '💛';
            return;
        }
        if (next === 'manual') {
            form.setValue('name', '', { shouldDirty: false });
            selectedIcon.current = '💛';
            return;
        }
        // org — wait for GivingFinder pick; keep cause-based name until then.
        if (!name?.trim() || name === givePledgeName(cause ?? null)) {
            form.setValue('name', givePledgeName(cause ?? null), { shouldDirty: false });
        }
    }

    const saveMutation = useMutation({
        mutationFn: async (values: GoalFormValues) => {
            if (!householdId) throw new Error('No household');
            const target = parseAmountToMinorUnits(values.target);
            if (target === null || target <= 0) throw new Error('Invalid target');
            const earn = values.kind === GoalKind.EARN;
            const give = values.kind === GoalKind.GIVE;
            const monthly = earn
                ? 0
                : values.monthlyContribution?.trim()
                  ? (parseAmountToMinorUnits(values.monthlyContribution) ?? 0)
                  : 0;
            const nameValue = values.name.trim();
            const jarId = earn ? null : values.jarId || null;
            const why = values.why?.trim() || null;
            const causeValue = give ? (values.cause ?? null) : null;
            const givingOrganisationKeyValue = give
                ? values.givingOrganisationKey?.trim() || null
                : null;
            if (mode === 'edit' && entityId) {
                return api.money.goals.update({
                    id: entityId,
                    householdId,
                    kind: values.kind,
                    name: nameValue,
                    target,
                    monthlyContribution: monthly,
                    jarId,
                    why,
                    cause: causeValue,
                    givingOrganisationKey: givingOrganisationKeyValue,
                });
            }
            return api.money.goals.create({
                householdId,
                kind: values.kind,
                jarId,
                name: nameValue,
                icon:
                    selectedIcon.current ??
                    (give
                        ? ((causeValue ? givingCauseMeta(causeValue)?.icon : null) ?? '💛')
                        : null),
                target,
                monthlyContribution: monthly,
                targetOn: null,
                status: GoalStatus.ACTIVE,
                why,
                cause: causeValue,
                givingOrganisationKey: givingOrganisationKeyValue,
            });
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: apiQuery.money.goals.list.key() });
            void queryClient.invalidateQueries({
                queryKey: apiQuery.money.goals.projections.key(),
            });
            showToast(mode === 'edit' ? 'Goal updated' : 'Goal saved', 'success');
            dismiss();
        },
        onError: () => showToast('Save failed', 'error'),
    });

    const removeMutation = useMutation({
        mutationFn: async () => {
            if (!householdId || !entityId) throw new Error('No household');
            return api.money.goals.remove({ householdId, id: entityId });
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: apiQuery.money.goals.list.key() });
            void queryClient.invalidateQueries({
                queryKey: apiQuery.money.goals.projections.key(),
            });
            showToast('Goal deleted', 'success');
            dismiss();
        },
        onError: () => showToast('Delete failed', 'error'),
    });

    async function onSubmit(values: GoalFormValues) {
        if (!live) {
            showToast('Sign in to save goals', 'error');
            return;
        }
        await saveMutation.mutateAsync(values);
    }

    const busy = form.formState.isSubmitting || saveMutation.isPending || removeMutation.isPending;
    const activeCause = cause ? givingCauseMeta(cause) : null;

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
                              : 'Save goal'}
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
                        <FormLabel>Goal type</FormLabel>
                        <FormControl>
                            <div
                                className="grid gap-2 sm:grid-cols-3"
                                role="radiogroup"
                                aria-label="Goal type">
                                {GOAL_KIND_OPTIONS.map(option => {
                                    const on = field.value === option.id;
                                    return (
                                        <button
                                            key={option.id}
                                            type="button"
                                            role="radio"
                                            aria-checked={on}
                                            disabled={busy}
                                            onClick={() => selectKind(option.id)}
                                            className={
                                                on
                                                    ? 'flex flex-col items-start gap-1 rounded-xl border border-accent/40 bg-accent-soft px-3 py-3 text-left transition-colors'
                                                    : 'flex flex-col items-start gap-1 rounded-xl border border-line bg-raised px-3 py-3 text-left transition-colors hover:border-accent-hover'
                                            }>
                                            <span className="flex items-center gap-2">
                                                <span aria-hidden className="text-base">
                                                    {option.icon}
                                                </span>
                                                <span
                                                    className={
                                                        on
                                                            ? 'text-sm font-semibold text-accent'
                                                            : 'text-sm font-semibold text-fg'
                                                    }>
                                                    {option.label}
                                                </span>
                                            </span>
                                            <span className="text-xs leading-snug text-fg-muted">
                                                {option.line}
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

            {isGive ? (
                <>
                    <CoachTipCard
                        title="A pledge, not a pot"
                        meta={
                            <a href={soulPath('giving')} className="hover:text-accent">
                                Why giving is in a money app → Soul
                            </a>
                        }>
                        {WHY_GIVE.body[1]} Every sorted amount that leaves your Give jar this year
                        counts toward it — nothing to move by hand.
                    </CoachTipCard>

                    <FormField
                        control={form.control}
                        name="cause"
                        render={() => (
                            <FormItem>
                                <FormLabel>Cause (purpose)</FormLabel>
                                <FormControl>
                                    <div
                                        className="flex flex-wrap gap-2"
                                        role="group"
                                        aria-label="Giving cause">
                                        <button
                                            type="button"
                                            disabled={busy}
                                            aria-pressed={!cause}
                                            onClick={() => selectCause(null)}
                                            className={
                                                !cause
                                                    ? 'rounded-full border border-accent/40 bg-accent-soft px-3 py-1.5 font-mono text-xs text-accent'
                                                    : 'rounded-full border border-line bg-raised px-3 py-1.5 font-mono text-xs text-fg-secondary hover:border-accent-hover hover:text-accent'
                                            }>
                                            Any cause
                                        </button>
                                        {GIVING_CAUSE_CATALOG.map(meta => {
                                            const on = cause === meta.key;
                                            return (
                                                <button
                                                    key={meta.key}
                                                    type="button"
                                                    disabled={busy}
                                                    aria-pressed={on}
                                                    onClick={() =>
                                                        selectCause(on ? null : meta.key)
                                                    }
                                                    className={
                                                        on
                                                            ? 'flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent-soft px-3 py-1.5 font-mono text-xs text-accent'
                                                            : 'flex items-center gap-1.5 rounded-full border border-line bg-raised px-3 py-1.5 font-mono text-xs text-fg-secondary hover:border-accent-hover hover:text-accent'
                                                    }>
                                                    <span aria-hidden>{meta.icon}</span>
                                                    {meta.name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </FormControl>
                                {activeCause ? (
                                    <p className="text-xs leading-relaxed text-fg-faint">
                                        {activeCause.line}
                                    </p>
                                ) : (
                                    <p className="text-xs leading-relaxed text-fg-faint">
                                        Open pledge — any giving from the Give jar counts.
                                    </p>
                                )}
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="grid gap-2">
                        <p className="font-mono text-[10px] font-semibold tracking-widest text-fg-faint uppercase">
                            Organisation
                        </p>
                        <div
                            className="flex flex-wrap gap-2"
                            role="group"
                            aria-label="How specific is this pledge?">
                            {GIVE_TARGET_MODES.map(option => {
                                const on = giveTargetMode === option.id;
                                return (
                                    <button
                                        key={option.id}
                                        type="button"
                                        disabled={busy}
                                        aria-pressed={on}
                                        onClick={() => selectGiveTargetMode(option.id)}
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
                            shortlist with independent checks. Keep it open — name the cause only,
                            no organisation yet.
                        </p>
                    </div>

                    {giveTargetMode === 'org' ? (
                        <GivingFinder
                            defaultOpen
                            initialCause={cause ?? null}
                            selectedKey={givingOrganisationKey}
                            selectedName={name}
                            onPick={organisation => {
                                form.setValue('givingOrganisationKey', organisation.key, {
                                    shouldDirty: true,
                                });
                                form.setValue('name', organisation.name, { shouldDirty: true });
                                const orgCause = organisation.causes[0] ?? null;
                                if (orgCause && !cause) {
                                    form.setValue('cause', orgCause, { shouldDirty: true });
                                }
                                selectedIcon.current = '💛';
                            }}
                        />
                    ) : null}
                </>
            ) : null}

            <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>
                            {isGive ? (giveTargetMode === 'open' ? 'Pledge name' : 'Name') : 'Name'}
                        </FormLabel>
                        <FormControl>
                            {mode === 'create' && !isEarn && !isGive ? (
                                <PresetNameField
                                    value={field.value}
                                    placeholder="e.g. emergency fund"
                                    freeTextPlaceholder="Type a custom goal name…"
                                    options={presetOptions}
                                    lockPresets
                                    freeTextKeys={['OTHER']}
                                    onChange={value => {
                                        field.onChange(value);
                                        if (
                                            value.trim() &&
                                            !presetOptions.some(
                                                preset =>
                                                    preset.name.toLowerCase() ===
                                                    value.trim().toLowerCase()
                                            )
                                        ) {
                                            selectedIcon.current = null;
                                        }
                                    }}
                                    onClear={() => {
                                        selectedIcon.current = null;
                                    }}
                                    onSelect={opt => {
                                        const full = presetOptions.find(
                                            preset => preset.key === opt.key
                                        );
                                        if (!full) return;
                                        selectedIcon.current = full.icon;
                                        const jar = jars.find(j => j.key === full.jarKey);
                                        if (jar) form.setValue('jarId', jar.id);
                                    }}
                                />
                            ) : isGive && giveTargetMode === 'org' ? (
                                <FormInput
                                    readOnly
                                    placeholder="Pick from Help me choose above"
                                    {...field}
                                />
                            ) : (
                                <FormInput
                                    placeholder={
                                        isEarn
                                            ? `e.g. ${symbol}5k net income`
                                            : isGive
                                              ? giveTargetMode === 'manual'
                                                  ? 'e.g. local food bank'
                                                  : 'e.g. Health pledge'
                                              : 'e.g. emergency fund'
                                    }
                                    {...field}
                                />
                            )}
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="target"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>
                            {isEarn
                                ? `Monthly net (${symbol})`
                                : isGive
                                  ? `Pledge for the year (${symbol})`
                                  : `Target amount (${symbol})`}
                        </FormLabel>
                        <FormControl>
                            <FormInput inputMode="decimal" placeholder="0,00" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            {!isEarn ? (
                <>
                    <FormField
                        control={form.control}
                        name="monthlyContribution"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>
                                    {isGive
                                        ? `Planned per month (${symbol})`
                                        : `Monthly contribution (${symbol})`}
                                </FormLabel>
                                <FormControl>
                                    <FormInput inputMode="decimal" placeholder="0,00" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {isGive ? null : (
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
                                            {jars.map(jar => (
                                                <option key={jar.id} value={jar.id}>
                                                    {jar.icon ? `${jar.icon} ` : ''}
                                                    {jar.name}
                                                </option>
                                            ))}
                                        </select>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}
                </>
            ) : null}

            <FormField
                control={form.control}
                name="why"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Why (optional)</FormLabel>
                        <FormControl>
                            <FormInput placeholder="Briefly why this matters" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </FormCreateEditShell>
    );
}
