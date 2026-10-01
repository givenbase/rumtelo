'use client';

import Link from 'next/link';
import { api } from '@/app/_lib/api';
import { useApiError } from '@/app/_lib/api-error-messages';
import { apiQuery } from '@/app/_lib/api-hooks';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { useLiveQuery } from '@rumtelo/hooks';
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormSelect,
    FormSelectItem,
    Button,
    Typography,
    createFormInvalidHandler,
} from '@rumtelo/ui';

import { zodResolver } from '@hookform/resolvers/zod';
import type { IncomeAmountPeriod, IncomeSourcePreset } from '@rumtelo/contracts';
import { Cadence, IncomeKind } from '@rumtelo/contracts';

import { useTranslations } from '@rumtelo/i18n';
import { findByNameOrAlias } from '@rumtelo/utils';

import { CREATE_HREF } from '@/app/_lib/create-routes';
import { parseAmountToMinorUnits } from '@/app/_lib/money-input';
import { isLiveData } from '@/app/_lib/preview';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';
import { useFormDismiss } from '@/app/_lib/use-form-dismiss';
import { formRoute } from '@/app/_lib/form-route-meta';
import { viewedPeriodDefaultIso } from '@/app/_lib/viewed-period-date';
import { CoachTipCard } from '@/components/features/helpers';
import { useHouseholdShell } from '@/components/features/shell/household-shell-context';
import { useAuth } from '@/components/features/shell/auth-provider';
import { FormCreateEditShell } from '@/components/layout/form-create-edit-shell';
import { ConfirmActionButton } from './confirm-action-button';
import { createIncomeFormSchema, type IncomeFormSchemaValues } from './form-zod';
import { DepositField } from './deposit-field';
import { FormDatePicker } from './form-date-picker';
import { FormInput } from './form-input';
import { HoldingField } from './holding-field';
import { merchantsToNameOptions } from './merchant-name-options';
import { PartyField } from './party-field';
import { partiesToNameOptions } from './party-name-options';
import { PresetNameField } from './preset-name-field';

const INCOME_KIND_ICON: Record<IncomeKind, string> = {
    [IncomeKind.SALARY]: '💼',
    [IncomeKind.FREELANCE]: '🛠️',
    [IncomeKind.BENEFIT]: '🏛️',
    [IncomeKind.RENTAL]: '🔑',
    [IncomeKind.DIVIDEND]: '📊',
    [IncomeKind.OTHER]: '✨',
};

export type IncomeFormValues = IncomeFormSchemaValues;

type IncomeFormProps = {
    defaultValues?: Partial<IncomeFormValues> & { presetKey?: string | null };
    periods?: IncomeAmountPeriod[];
    /** Opened from a holding (`?assetId=`): the holding is shown, not editable. */
    lockAsset?: boolean;
    embedded?: boolean;
    mode?: 'create' | 'edit';
    entityId?: string;
    onSuccess?: () => void;
};

const EMPTY_PERIODS: IncomeAmountPeriod[] = [];

function todayIso(): string {
    return new Date().toISOString().slice(0, 10);
}

export function IncomeForm({
    defaultValues,
    periods = EMPTY_PERIODS,
    lockAsset = false,
    embedded = true,
    mode = 'create',
    entityId,
    onSuccess,
}: IncomeFormProps) {
    const queryClient = useQueryClient();
    const { householdId } = useAuth();
    const { symbol, formatMoney } = useHouseholdCurrency();
    const t = useTranslations();
    const tIncome = useTranslations('features.money.income_form');
    const tForm = useTranslations('ui.form');
    const tBtn = useTranslations('ui.button.actions');
    const { showToast, period } = useHouseholdShell();
    const periodDefaultDate = viewedPeriodDefaultIso(period);
    const apiError = useApiError();
    const { dismiss, dismissAfterRemove } = useFormDismiss(onSuccess, {
        listHref: formRoute('incomeUpdate').closeHref,
    });
    const live = isLiveData(householdId);

    const presetsQuery = useLiveQuery(
        apiQuery.money.catalogs.incomeSourcePresets.list.queryOptions({
            input: { householdId: householdId! },
        }),
        [],
        live
    );
    const merchantsQuery = useLiveQuery(
        apiQuery.money.catalogs.merchantPresets.list.queryOptions({
            input: { householdId: householdId! },
        }),
        [],
        live
    );

    const partiesQuery = useLiveQuery(
        apiQuery.money.parties.list.queryOptions({
            input: { householdId: householdId! },
        }),
        [],
        live
    );
    const incomeKindGroup = useCallback(
        (kind: IncomeKind): string => {
            switch (kind) {
                case IncomeKind.SALARY:
                    return tIncome('kind_group_employment');
                case IncomeKind.FREELANCE:
                    return tIncome('kind_group_freelance');
                case IncomeKind.BENEFIT:
                    return tIncome('kind_group_benefits');
                case IncomeKind.RENTAL:
                    return tIncome('kind_group_rental');
                case IncomeKind.DIVIDEND:
                    return tIncome('kind_group_investments');
                case IncomeKind.OTHER:
                    return tIncome('kind_group_other');
                default:
                    return kind;
            }
        },
        [tIncome]
    );

    const kindLabel = useCallback(
        (kind: IncomeKind): string => {
            switch (kind) {
                case IncomeKind.SALARY:
                    return tIncome('kind_salary');
                case IncomeKind.FREELANCE:
                    return tIncome('kind_freelance');
                case IncomeKind.BENEFIT:
                    return tIncome('kind_benefit');
                case IncomeKind.RENTAL:
                    return tIncome('kind_rental');
                case IncomeKind.DIVIDEND:
                    return tIncome('kind_dividend');
                case IncomeKind.OTHER:
                    return tIncome('kind_other');
                default:
                    return kind;
            }
        },
        [tIncome]
    );

    const cadenceLabel = useCallback(
        (cadence: Cadence): string => {
            switch (cadence) {
                case Cadence.WEEKLY:
                    return tIncome('cadence_weekly');
                case Cadence.MONTHLY:
                    return tIncome('cadence_monthly');
                case Cadence.QUARTERLY:
                    return tIncome('cadence_quarterly');
                case Cadence.YEARLY:
                    return tIncome('cadence_yearly');
                case Cadence.ONCE:
                    return tIncome('cadence_once');
                default:
                    return cadence;
            }
        },
        [tIncome]
    );

    const presetOptions = useMemo(
        () =>
            (presetsQuery.data ?? []).map(
                preset =>
                    ({
                        ...preset,
                        group: incomeKindGroup(preset.kind),
                        icon: preset.icon ?? INCOME_KIND_ICON[preset.kind] ?? null,
                    }) satisfies IncomeSourcePreset & { group: string; icon: string | null }
            ),
        [presetsQuery.data, incomeKindGroup]
    );

    const payerOptions = useMemo(() => {
        const saved = partiesToNameOptions(partiesQuery.data ?? [], {
            badge: tIncome('option_badge_saved'),
            group: tIncome('option_group_saved'),
        });
        const catalog = merchantsToNameOptions(merchantsQuery.data ?? [], {
            badge: tIncome('option_badge_payer'),
        }).map(opt => ({ ...opt, group: tIncome('option_group_catalog') }));
        return [...saved, ...catalog];
    }, [merchantsQuery.data, partiesQuery.data, tIncome]);

    const incomeFormSchema = useMemo(() => createIncomeFormSchema(tForm), [tForm]);

    const form = useForm<IncomeFormValues>({
        defaultValues: {
            name: defaultValues?.name ?? '',
            counterparty: defaultValues?.counterparty ?? '',
            merchantKey: defaultValues?.merchantKey ?? '',
            partyId: defaultValues?.partyId ?? '',
            saveParty: defaultValues?.saveParty ?? true,
            amount: defaultValues?.amount ?? '',
            kind: defaultValues?.kind ?? IncomeKind.SALARY,
            cadence: defaultValues?.cadence ?? Cadence.MONTHLY,
            startedOn: defaultValues?.startedOn ?? periodDefaultDate,
            endsOn: defaultValues?.endsOn ?? '',
            amountEffectiveFrom: defaultValues?.amountEffectiveFrom ?? periodDefaultDate,
            assetId: defaultValues?.assetId ?? null,
            bankId: defaultValues?.bankId ?? null,
            accountId: defaultValues?.accountId ?? null,
        },
        resolver: zodResolver(incomeFormSchema),
    });

    const watchedAssetId = useWatch({ control: form.control, name: 'assetId' }) ?? null;
    const watchedBankId = useWatch({ control: form.control, name: 'bankId' }) ?? null;
    const watchedAccountId = useWatch({ control: form.control, name: 'accountId' }) ?? null;
    const watchedMerchantKey = useWatch({ control: form.control, name: 'merchantKey' }) ?? '';
    const watchedPartyId = useWatch({ control: form.control, name: 'partyId' }) ?? '';
    const watchedSaveParty = useWatch({ control: form.control, name: 'saveParty' }) ?? true;

    const onError = createFormInvalidHandler(
        ({ title, description }) => {
            showToast(description ?? title, 'error');
        },
        {
            title: tForm('incomplete_title'),
            description: tForm('incomplete_description'),
        }
    );

    const invalidateIncome = () => {
        void queryClient.invalidateQueries({ queryKey: apiQuery.money.income.list.key() });
        void queryClient.invalidateQueries({ queryKey: apiQuery.growth.dashboard.get.key() });
        void queryClient.invalidateQueries({ queryKey: apiQuery.money.parties.list.key() });
        void queryClient.invalidateQueries({ queryKey: apiQuery.money.jars.balances.key() });
        void queryClient.invalidateQueries({ queryKey: apiQuery.money.dashboard.get.key() });
        void queryClient.invalidateQueries({ queryKey: apiQuery.money.goals.list.key() });
        void queryClient.invalidateQueries({
            queryKey: apiQuery.money.goals.projections.key(),
        });
    };

    const saveMutation = useMutation({
        mutationFn: async (values: IncomeFormValues) => {
            if (!householdId) throw new Error('No household');
            const cents = parseAmountToMinorUnits(values.amount);
            if (cents === null || cents <= 0) throw new Error('Invalid amount');
            const name = values.name.trim();
            const counterparty = values.counterparty?.trim() || null;
            const merchantKey = counterparty ? values.merchantKey?.trim() || null : null;
            const partyId = counterparty ? values.partyId?.trim() || null : null;
            const saveParty =
                Boolean(counterparty) && !merchantKey && !partyId && (values.saveParty ?? true);
            const endsOn = values.endsOn?.trim() ? values.endsOn.slice(0, 10) : null;
            // Resolve presetKey from the locked income preset (by name match).
            const presets = presetsQuery.data ?? [];
            const matchedPreset = findByNameOrAlias(presets, name);
            const presetKey = matchedPreset?.key ?? null;
            if (mode === 'edit' && entityId) {
                const startedOn = values.startedOn?.trim() ? values.startedOn.slice(0, 10) : null;
                return api.money.income.update({
                    id: entityId,
                    householdId,
                    name,
                    presetKey,
                    counterparty,
                    merchantKey,
                    partyId,
                    saveParty,
                    amount: cents,
                    startedOn,
                    endsOn,
                    amountEffectiveFrom:
                        values.amountEffectiveFrom?.slice(0, 10) || periodDefaultDate,
                    assetId: values.assetId ?? null,
                    bankId: values.bankId ?? null,
                    accountId: values.accountId ?? null,
                });
            }
            const startedOn = values.startedOn?.trim()
                ? values.startedOn.slice(0, 10)
                : periodDefaultDate;
            return api.money.income.create({
                householdId,
                name,
                presetKey,
                counterparty,
                merchantKey,
                partyId,
                saveParty,
                amount: cents,
                kind: values.kind,
                cadence: values.cadence,
                expectedDay: null,
                isActive: true,
                startedOn,
                endsOn,
                assetId: values.assetId ?? null,
                bankId: values.bankId ?? null,
                accountId: values.accountId ?? null,
            });
        },
        onSuccess: () => {
            invalidateIncome();
            showToast(
                mode === 'edit'
                    ? t('common.message.success.updated', {
                          entity: t('common.message.entity.names.income'),
                      })
                    : t('common.message.success.saved'),
                'success'
            );
            dismiss();
        },
        onError: (error: unknown) => showToast(apiError(error), 'error'),
    });

    const endMutation = useMutation({
        mutationFn: async () => {
            if (!householdId || !entityId) throw new Error('No household');
            return api.money.income.update({
                id: entityId,
                householdId,
                isActive: false,
                endsOn: todayIso(),
            });
        },
        onSuccess: () => {
            invalidateIncome();
            showToast(tIncome('toast_ended'), 'success');
            dismiss();
        },
        onError: (error: unknown) => showToast(apiError(error), 'error'),
    });

    const removeMutation = useMutation({
        mutationFn: async () => {
            if (!householdId || !entityId) throw new Error('No household');
            return api.money.income.remove({ householdId, id: entityId });
        },
        onSuccess: () => {
            invalidateIncome();
            showToast(t('common.message.entity.income_deleted'), 'success');
            dismissAfterRemove();
        },
        onError: (error: unknown) => showToast(apiError(error), 'error'),
    });

    async function onSubmit(values: IncomeFormValues) {
        if (!live) {
            showToast(t('common.message.entity.sign_in_income'), 'error');
            return;
        }
        await saveMutation.mutateAsync(values);
    }

    const busy =
        form.formState.isSubmitting ||
        saveMutation.isPending ||
        removeMutation.isPending ||
        endMutation.isPending;

    const lockedKind = useWatch({ control: form.control, name: 'kind' });
    const lockedCadence = useWatch({ control: form.control, name: 'cadence' });

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
                              : tIncome('save')}
                    </Button>
                    {mode === 'edit' && entityId ? (
                        <>
                            <ConfirmActionButton
                                variant="ghost"
                                className="w-full"
                                disabled={busy}
                                pending={endMutation.isPending}
                                label={tIncome('end_income')}
                                confirmLabel={tIncome('confirm_end')}
                                onConfirm={() => void endMutation.mutateAsync()}
                            />
                            <ConfirmActionButton
                                variant="ghost"
                                className="w-full text-danger hover:bg-danger/10 hover:text-danger"
                                disabled={busy}
                                pending={removeMutation.isPending}
                                label={tBtn('delete')}
                                confirmLabel={tForm('confirm_delete')}
                                onConfirm={() => void removeMutation.mutateAsync()}
                            />
                        </>
                    ) : null}
                </div>
            }>
            {mode === 'edit' ? (
                <CoachTipCard
                    title={tIncome('raise_tip_title')}
                    meta={
                        <Link href={CREATE_HREF.income} className="hover:text-accent">
                            {tIncome('raise_tip_link')}
                        </Link>
                    }>
                    {tIncome('raise_tip_body')}
                </CoachTipCard>
            ) : null}

            <FormField
                control={form.control}
                name="name"
                render={({ field }) => {
                    // Prefer stored presetKey; fallback to name-alias search for pre-fix rows.
                    const lockedIncomeKey =
                        mode === 'edit'
                            ? (defaultValues?.presetKey ??
                              findByNameOrAlias(presetOptions, field.value)?.key ??
                              null)
                            : null;
                    return (
                        <FormItem>
                            <FormLabel>{tForm('fields.name')}</FormLabel>
                            <FormControl>
                                <PresetNameField
                                    value={field.value}
                                    onChange={field.onChange}
                                    placeholder={tIncome('name_placeholder')}
                                    freeTextPlaceholder={tIncome('free_text_placeholder')}
                                    options={presetOptions}
                                    lockPresets
                                    freeTextKeys={['OTHER']}
                                    initialLockedKey={lockedIncomeKey}
                                    onClear={() => {
                                        form.setValue('kind', IncomeKind.SALARY);
                                        form.setValue('cadence', Cadence.MONTHLY);
                                    }}
                                    onSelect={opt => {
                                        const full = presetOptions.find(
                                            preset => preset.key === opt.key
                                        );
                                        if (!full) return;
                                        form.setValue('kind', full.kind);
                                        form.setValue('cadence', full.cadence);
                                    }}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    );
                }}
            />

            <FormField
                control={form.control}
                name="counterparty"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>{tIncome('received_from')}</FormLabel>
                        <FormControl>
                            <PartyField
                                label={tIncome('received_from')}
                                placeholder={tIncome('received_from_placeholder')}
                                options={payerOptions}
                                value={{
                                    counterparty: field.value ?? '',
                                    merchantKey: watchedMerchantKey,
                                    partyId: watchedPartyId,
                                    saveParty: watchedSaveParty,
                                }}
                                onChange={next => {
                                    field.onChange(next.counterparty);
                                    form.setValue('merchantKey', next.merchantKey, {
                                        shouldDirty: true,
                                    });
                                    form.setValue('partyId', next.partyId, { shouldDirty: true });
                                    form.setValue('saveParty', next.saveParty, {
                                        shouldDirty: true,
                                    });
                                }}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <HoldingField
                value={watchedAssetId}
                locked={lockAsset}
                disabled={busy}
                onChange={next => form.setValue('assetId', next, { shouldDirty: true })}
            />

            <DepositField
                bankId={watchedBankId}
                accountId={watchedAccountId}
                disabled={busy}
                onChange={next => {
                    form.setValue('bankId', next.bankId, { shouldDirty: true });
                    form.setValue('accountId', next.accountId, { shouldDirty: true });
                }}
            />

            <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>
                            {mode === 'edit'
                                ? tIncome('amount_new', { symbol })
                                : tIncome('amount', { symbol })}
                        </FormLabel>
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

            {mode === 'edit' ? (
                <FormField
                    control={form.control}
                    name="amountEffectiveFrom"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{tIncome('effective_from')}</FormLabel>
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
            ) : null}

            <FormField
                control={form.control}
                name="startedOn"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>{tIncome('start_date')}</FormLabel>
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
                        <FormLabel>{tIncome('end_date')}</FormLabel>
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

            {mode === 'create' ? (
                <>
                    <FormField
                        control={form.control}
                        name="cadence"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{tIncome('how_often')}</FormLabel>
                                <FormSelect value={field.value} onValueChange={field.onChange}>
                                    <FormSelectItem value={Cadence.WEEKLY}>
                                        {tIncome('cadence_weekly')}
                                    </FormSelectItem>
                                    <FormSelectItem value={Cadence.MONTHLY}>
                                        {tIncome('cadence_monthly')}
                                    </FormSelectItem>
                                    <FormSelectItem value={Cadence.QUARTERLY}>
                                        {tIncome('cadence_quarterly')}
                                    </FormSelectItem>
                                    <FormSelectItem value={Cadence.YEARLY}>
                                        {tIncome('cadence_yearly')}
                                    </FormSelectItem>
                                    <FormSelectItem value={Cadence.ONCE}>
                                        {tIncome('cadence_once')}
                                    </FormSelectItem>
                                </FormSelect>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="kind"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{tIncome('type')}</FormLabel>
                                <FormSelect value={field.value} onValueChange={field.onChange}>
                                    <FormSelectItem value="SALARY">
                                        {tIncome('kind_salary')}
                                    </FormSelectItem>
                                    <FormSelectItem value="FREELANCE">
                                        {tIncome('kind_freelance')}
                                    </FormSelectItem>
                                    <FormSelectItem value="BENEFIT">
                                        {tIncome('kind_benefit')}
                                    </FormSelectItem>
                                    <FormSelectItem value="RENTAL">
                                        {tIncome('kind_rental')}
                                    </FormSelectItem>
                                    <FormSelectItem value="DIVIDEND">
                                        {tIncome('kind_dividend')}
                                    </FormSelectItem>
                                    <FormSelectItem value="OTHER">
                                        {tIncome('kind_other')}
                                    </FormSelectItem>
                                </FormSelect>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </>
            ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-1">
                        <Typography as="p" variant="eyebrow" color="muted">
                            {tIncome('how_often')}
                        </Typography>
                        <p className="text-sm text-fg">{cadenceLabel(lockedCadence)}</p>
                    </div>
                    <div className="grid gap-1">
                        <Typography as="p" variant="eyebrow" color="muted">
                            {tIncome('type')}
                        </Typography>
                        <p className="text-sm text-fg">{kindLabel(lockedKind)}</p>
                    </div>
                </div>
            )}

            {mode === 'edit' && periods.length > 0 ? (
                <div className="grid gap-2 border-t border-line pt-4">
                    <Typography as="p" variant="eyebrow" color="muted">
                        {tIncome('amount_history')}
                    </Typography>
                    <ul className="grid gap-1.5">
                        {periods.map(amountPeriod => (
                            <li
                                key={amountPeriod.id}
                                className="flex items-baseline justify-between gap-3 text-sm">
                                <span className="font-mono text-xs text-fg-muted">
                                    {amountPeriod.effectiveOn}
                                </span>
                                <span className="font-mono text-fg">
                                    {formatMoney(amountPeriod.amount)}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            ) : null}
        </FormCreateEditShell>
    );
}
