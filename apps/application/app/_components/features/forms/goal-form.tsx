'use client';

import { api } from '@/app/_lib/api';
import { useApiError } from '@/app/_lib/api-error-messages';
import { apiQuery } from '@/app/_lib/api-hooks';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { useLiveQuery } from '@rumtelo/hooks';
import { useTranslations, type TranslateFn } from '@rumtelo/i18n';
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
import {
    type GoalPreset,
    type GivingCause,
    GoalKind,
    GoalStatus,
    JarKey,
} from '@rumtelo/contracts';

import { GIVING_CAUSE_CATALOG, givingCauseCopy, givingCauseMeta } from '@/app/_lib/giving';
import { parseAmountToMinorUnits } from '@/app/_lib/money-input';
import { isLiveData } from '@/app/_lib/preview';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';
import { soulPath } from '@/app/_lib/routes';
import { useFormDismiss } from '@/app/_lib/use-form-dismiss';
import { partyMark } from '@/app/_lib/vendor-brands';
import { CoachTipCard } from '@/components/features/helpers';
import { GivingFinder } from '@/components/features/money/giving-finder';
import { useAppShell } from '@/components/features/shell/app-shell-context';
import { useAuth } from '@/components/features/shell/auth-provider';
import { FormCreateEditShell } from '@/components/layout/form-create-edit-shell';
import { createGoalFormSchema, type GoalFormSchemaValues } from './form-zod';
import { ChipSearch, matchesChipQuery } from './chip-search';
import { ConfirmActionButton } from './confirm-action-button';
import { FormInput } from './form-input';
import { PresetNameField } from './preset-name-field';

export type GoalFormValues = GoalFormSchemaValues;

type GiveTargetMode = 'open' | 'org' | 'manual';

const GOAL_KIND_OPTIONS: ReadonlyArray<{
    id: GoalKind;
    icon: string;
    labelKey: 'kind_save' | 'kind_earn' | 'kind_give';
    lineKey: 'kind_save_line' | 'kind_earn_line' | 'kind_give_line';
}> = [
    {
        id: GoalKind.SAVE,
        icon: '🎯',
        labelKey: 'kind_save',
        lineKey: 'kind_save_line',
    },
    {
        id: GoalKind.EARN,
        icon: '📈',
        labelKey: 'kind_earn',
        lineKey: 'kind_earn_line',
    },
    {
        id: GoalKind.GIVE,
        icon: '💛',
        labelKey: 'kind_give',
        lineKey: 'kind_give_line',
    },
];

/** Lease companies share the auto-finance MCC; they are not a car you save for. */
const NOT_A_CAR_BRAND = new Set(['LEASEPLAN', 'ALPHERA']);

/** First chip row on Car fund. The rest sit behind More — same dashed chip as other pickers. */
const CAR_BRAND_PREVIEW = 12;

const GIVE_TARGET_MODES: ReadonlyArray<{ id: GiveTargetMode; labelKey: string }> = [
    { id: 'manual', labelKey: 'give_mode_manual' },
    { id: 'org', labelKey: 'give_mode_org' },
    { id: 'open', labelKey: 'give_mode_open' },
];

function givePledgeName(cause: GivingCause | null | undefined, t: TranslateFn): string {
    if (!cause) return t('features.growth.goals.form.pledge_year');
    const copy = givingCauseCopy(t, cause);
    return t('features.growth.goals.form.pledge_named', { name: copy.name });
}

function resolveGiveTargetMode(
    defaults: Partial<GoalFormValues> | undefined,
    t: TranslateFn
): GiveTargetMode {
    if (defaults?.givingOrganisationKey?.trim()) return 'org';
    if (defaults?.name?.trim() && defaults.name !== givePledgeName(defaults.cause ?? null, t)) {
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
    const t = useTranslations();
    const tGoals = useTranslations('features.growth.goals');
    const tForm = useTranslations('features.growth.goals.form');
    const tUiForm = useTranslations('ui.form');
    const queryClient = useQueryClient();
    const { householdId } = useAuth();
    const { symbol } = useHouseholdCurrency();
    const { showToast } = useAppShell();
    const apiError = useApiError();
    const dismiss = useFormDismiss(onSuccess);
    const live = isLiveData(householdId);
    const [giveTargetMode, setGiveTargetMode] = useState<GiveTargetMode>(() =>
        resolveGiveTargetMode(defaultValues, t)
    );
    const [goalPresetKey, setGoalPresetKey] = useState<string | null>(null);
    const [showAllCarBrands, setShowAllCarBrands] = useState(false);
    const [carBrandQuery, setCarBrandQuery] = useState('');

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
                        group: preset.key === 'OTHER' ? tGoals('preset_group_other') : undefined,
                    }) satisfies GoalPreset & { group?: string }
            ),
        [presetsQuery.data, tGoals]
    );
    const merchantsQuery = useLiveQuery(
        apiQuery.money.catalogs.merchantPresets.list.queryOptions({
            input: { householdId: householdId! },
        }),
        [],
        live && mode === 'create'
    );
    const carBrands = useMemo(
        () =>
            (merchantsQuery.data ?? [])
                .filter(merchant => merchant.mcc === '7512' && !NOT_A_CAR_BRAND.has(merchant.key))
                .slice()
                .sort((left, right) => left.sortOrder - right.sortOrder),
        [merchantsQuery.data]
    );
    const selectedIcon = useRef<string | null>(null);

    const goalFormSchema = useMemo(() => createGoalFormSchema(tUiForm), [tUiForm]);

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
    const carBrandSearch = carBrandQuery.trim().length > 0;
    const visibleCarBrands = useMemo(() => {
        const matched = carBrandSearch
            ? carBrands.filter(brand => matchesChipQuery(carBrandQuery, brand))
            : carBrands;
        const needle = name.trim().toLowerCase();
        const selectedPastPreview = matched
            .slice(CAR_BRAND_PREVIEW)
            .some(brand => brand.name.toLowerCase() === needle);
        if (carBrandSearch || showAllCarBrands || selectedPastPreview) return matched;
        return matched.slice(0, CAR_BRAND_PREVIEW);
    }, [carBrands, carBrandQuery, carBrandSearch, name, showAllCarBrands]);
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

    const onError = createFormInvalidHandler(
        ({ title, description }) => {
            showToast(description ?? title, 'error');
        },
        {
            title: tUiForm('incomplete_title'),
            description: tUiForm('incomplete_description'),
        }
    );

    function selectKind(next: GoalKind) {
        if (next === kind) return;
        form.setValue('kind', next);
        if (next === GoalKind.GIVE) {
            form.setValue('cause', null);
            form.setValue('givingOrganisationKey', null);
            form.setValue('name', givePledgeName(null, t), { shouldDirty: false });
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
            form.setValue('name', givePledgeName(next, t), { shouldDirty: true });
            const meta = next ? givingCauseMeta(next) : null;
            selectedIcon.current = meta?.icon ?? '💛';
        }
    }

    function selectGiveTargetMode(next: GiveTargetMode) {
        if (next === giveTargetMode) return;
        setGiveTargetMode(next);
        form.setValue('givingOrganisationKey', null);
        if (next === 'open') {
            form.setValue('name', givePledgeName(cause ?? null, t), { shouldDirty: true });
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
        if (!name?.trim() || name === givePledgeName(cause ?? null, t)) {
            form.setValue('name', givePledgeName(cause ?? null, t), { shouldDirty: false });
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
            showToast(
                mode === 'edit'
                    ? t('common.message.entity.goal_updated')
                    : t('common.message.entity.goal_saved'),
                'success'
            );
            dismiss();
        },
        onError: (error: unknown) => showToast(apiError(error), 'error'),
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
            showToast(t('common.message.entity.goal_deleted'), 'success');
            dismiss();
        },
        onError: (error: unknown) => showToast(apiError(error), 'error'),
    });

    async function onSubmit(values: GoalFormValues) {
        if (!live) {
            showToast(t('common.message.entity.sign_in_goals'), 'error');
            return;
        }
        await saveMutation.mutateAsync(values);
    }

    const busy = form.formState.isSubmitting || saveMutation.isPending || removeMutation.isPending;
    const activeCause = cause ? givingCauseCopy(t, cause) : null;

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
                            ? tUiForm('working')
                            : mode === 'edit'
                              ? tUiForm('save_changes')
                              : tForm('save_goal')}
                    </Button>
                    {mode === 'edit' && entityId ? (
                        <ConfirmActionButton
                            variant="ghost"
                            className="w-full text-danger hover:bg-danger/10 hover:text-danger"
                            disabled={busy}
                            pending={removeMutation.isPending}
                            label={tUiForm('delete')}
                            confirmLabel={tUiForm('confirm_delete')}
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
                        <FormLabel>{tForm('goal_type')}</FormLabel>
                        <FormControl>
                            <div
                                className="grid gap-2 sm:grid-cols-3"
                                role="radiogroup"
                                aria-label={tForm('goal_type')}>
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
                                                    {tForm(option.labelKey)}
                                                </span>
                                            </span>
                                            <span className="text-xs leading-snug text-fg-muted">
                                                {tForm(option.lineKey)}
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
                        title={tForm('pledge_tip_title')}
                        meta={
                            <a href={soulPath('giving')} className="hover:text-accent">
                                {tForm('pledge_tip_link')}
                            </a>
                        }>
                        {t('features.soul.giving.coach_tip_1')} {tForm('pledge_tip_body')}
                    </CoachTipCard>

                    <FormField
                        control={form.control}
                        name="cause"
                        render={() => (
                            <FormItem>
                                <FormLabel>{tForm('cause_label')}</FormLabel>
                                <FormControl>
                                    <div
                                        className="flex flex-wrap gap-2"
                                        role="group"
                                        aria-label={tForm('cause_aria')}>
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
                                            {tForm('cause_any')}
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
                                                    {givingCauseCopy(t, meta.key).name}
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
                                        {tForm('cause_open_hint')}
                                    </p>
                                )}
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="grid gap-2">
                        <p className="font-mono text-[10px] font-semibold tracking-widest text-fg-faint uppercase">
                            {tForm('organisation')}
                        </p>
                        <div
                            className="flex flex-wrap gap-2"
                            role="group"
                            aria-label={tForm('give_mode_aria')}>
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
                                        {tForm(option.labelKey)}
                                    </button>
                                );
                            })}
                        </div>
                        <p className="text-xs leading-relaxed text-fg-faint">
                            {tForm('give_mode_hint')}
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
                            {isGive
                                ? giveTargetMode === 'open'
                                    ? tForm('pledge_name')
                                    : tUiForm('fields.name')
                                : tUiForm('fields.name')}
                        </FormLabel>
                        <FormControl>
                            {mode === 'create' && !isEarn && !isGive ? (
                                <PresetNameField
                                    value={field.value}
                                    placeholder={tForm('name_placeholder_save')}
                                    freeTextPlaceholder={tForm('name_free_placeholder')}
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
                                        setGoalPresetKey(null);
                                    }}
                                    onSelect={opt => {
                                        const full = presetOptions.find(
                                            preset => preset.key === opt.key
                                        );
                                        if (!full) return;
                                        setGoalPresetKey(full.key);
                                        selectedIcon.current = full.icon;
                                        const jar = jars.find(j => j.key === full.jarKey);
                                        if (jar) form.setValue('jarId', jar.id);
                                    }}
                                />
                            ) : isGive && giveTargetMode === 'org' ? (
                                <FormInput
                                    readOnly
                                    placeholder={tForm('pick_from_finder')}
                                    {...field}
                                />
                            ) : (
                                <FormInput
                                    placeholder={
                                        isEarn
                                            ? tForm('name_placeholder_earn', { symbol })
                                            : isGive
                                              ? giveTargetMode === 'manual'
                                                  ? tForm('pledge_placeholder_manual')
                                                  : tForm('pledge_placeholder_open')
                                              : tForm('name_placeholder_save')
                                    }
                                    {...field}
                                />
                            )}
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            {carBrands.length > 0 &&
            (goalPresetKey === 'CAR' ||
                name.trim().toLowerCase() === 'car fund' ||
                carBrands.some(brand => brand.name.toLowerCase() === name.trim().toLowerCase())) ? (
                <div className="grid gap-2">
                    <p className="font-mono text-[10px] font-semibold tracking-wider text-fg-muted uppercase">
                        {tForm('which_car')}
                    </p>
                    <ChipSearch
                        value={carBrandQuery}
                        onChange={setCarBrandQuery}
                        placeholder={tForm('search_brand')}
                    />
                    {carBrandSearch && visibleCarBrands.length === 0 ? (
                        <p className="text-sm text-fg-muted">{tUiForm('no_matches')}</p>
                    ) : null}
                    <div className="flex flex-wrap gap-1.5">
                        {visibleCarBrands.map(brand => {
                            const selected = name.trim().toLowerCase() === brand.name.toLowerCase();
                            const mark = partyMark(
                                {
                                    key: brand.key,
                                    name: brand.name,
                                    logoDomain: brand.logoDomain,
                                },
                                { fallbackIcon: '🚗', tone: null }
                            );
                            return (
                                <button
                                    key={brand.key}
                                    type="button"
                                    className={
                                        selected
                                            ? 'inline-flex items-center gap-2 rounded-xl border border-accent bg-accent/15 px-2.5 py-1.5 text-sm text-accent'
                                            : 'inline-flex items-center gap-2 rounded-xl border border-line bg-raised px-2.5 py-1.5 text-sm text-fg hover:border-accent hover:text-accent'
                                    }
                                    onClick={() =>
                                        form.setValue('name', brand.name, {
                                            shouldDirty: true,
                                            shouldValidate: true,
                                        })
                                    }>
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
                        })}
                        {!carBrandSearch && visibleCarBrands.length < carBrands.length ? (
                            <button
                                type="button"
                                className="inline-flex items-center rounded-xl border border-dashed border-line px-3 py-1.5 text-sm text-fg-muted hover:border-accent hover:text-accent"
                                onClick={() => setShowAllCarBrands(true)}>
                                {tForm('more')}
                            </button>
                        ) : null}
                    </div>
                </div>
            ) : null}

            <FormField
                control={form.control}
                name="target"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>
                            {isEarn
                                ? tForm('monthly_net', { symbol })
                                : isGive
                                  ? tForm('pledge_for_year', { symbol })
                                  : tForm('target_amount', { symbol })}
                        </FormLabel>
                        <FormControl>
                            <FormInput
                                inputMode="decimal"
                                placeholder={tUiForm('amount_zero')}
                                {...field}
                            />
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
                                        ? tForm('planned_per_month', { symbol })
                                        : tForm('monthly_contribution', { symbol })}
                                </FormLabel>
                                <FormControl>
                                    <FormInput
                                        inputMode="decimal"
                                        placeholder={tUiForm('amount_zero')}
                                        {...field}
                                    />
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
                                    <FormLabel>{tUiForm('jar')}</FormLabel>
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
                        <FormLabel>{tForm('why_label')}</FormLabel>
                        <FormControl>
                            <FormInput placeholder={tForm('why_placeholder')} {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </FormCreateEditShell>
    );
}
