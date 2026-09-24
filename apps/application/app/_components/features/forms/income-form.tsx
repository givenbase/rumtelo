'use client';

import { api } from '@/app/_lib/api';
import { useApiError } from '@/app/_lib/api-error-messages';
import { apiQuery } from '@/app/_lib/api-hooks';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';

import { useLiveQuery } from '@rumtelo/hooks';
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    Button,
    Typography,
    createFormInvalidHandler,
} from '@rumtelo/ui';

import { zodResolver } from '@hookform/resolvers/zod';
import type { IncomeAmountPeriod, IncomeSourcePreset } from '@rumtelo/contracts';
import { Cadence, IncomeKind } from '@rumtelo/contracts';

import { useTranslations } from '@rumtelo/i18n';

import { parseAmountToMinorUnits } from '@/app/_lib/money-input';
import { isLiveData } from '@/app/_lib/preview';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';
import { useFormDismiss } from '@/app/_lib/use-form-dismiss';
import { useAppShell } from '@/components/features/shell/app-shell-context';
import { useAuth } from '@/components/features/shell/auth-provider';
import { FormCreateEditShell } from '@/components/layout/form-create-edit-shell';
import { ConfirmActionButton } from './confirm-action-button';
import { createIncomeFormSchema, type IncomeFormSchemaValues } from './form-zod';
import { FormInput } from './form-input';
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
    defaultValues?: Partial<IncomeFormValues>;
    periods?: IncomeAmountPeriod[];
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
    const { showToast } = useAppShell();
    const apiError = useApiError();
    const dismiss = useFormDismiss(onSuccess);
    const live = isLiveData(householdId);

    const presetsQuery = useLiveQuery(
        apiQuery.money.catalogs.incomeSourcePresets.list.queryOptions({
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

    const incomeFormSchema = useMemo(() => createIncomeFormSchema(tForm), [tForm]);

    const form = useForm<IncomeFormValues>({
        defaultValues: {
            name: defaultValues?.name ?? '',
            amount: defaultValues?.amount ?? '',
            kind: defaultValues?.kind ?? IncomeKind.SALARY,
            cadence: defaultValues?.cadence ?? Cadence.MONTHLY,
            amountEffectiveFrom: defaultValues?.amountEffectiveFrom ?? todayIso(),
        },
        resolver: zodResolver(incomeFormSchema),
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

    const saveMutation = useMutation({
        mutationFn: async (values: IncomeFormValues) => {
            if (!householdId) throw new Error('No household');
            const cents = parseAmountToMinorUnits(values.amount);
            if (cents === null || cents <= 0) throw new Error('Invalid amount');
            const name = values.name.trim();
            if (mode === 'edit' && entityId) {
                return api.money.income.update({
                    id: entityId,
                    householdId,
                    name,
                    amount: cents,
                    kind: values.kind,
                    cadence: values.cadence,
                    amountEffectiveFrom: values.amountEffectiveFrom?.slice(0, 10) || todayIso(),
                });
            }
            return api.money.income.create({
                householdId,
                name,
                amount: cents,
                kind: values.kind,
                cadence: values.cadence,
                expectedDay: null,
                isActive: true,
                startedOn: null,
            });
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: apiQuery.money.income.list.key() });
            void queryClient.invalidateQueries({ queryKey: apiQuery.money.jars.balances.key() });
            void queryClient.invalidateQueries({ queryKey: apiQuery.money.dashboard.get.key() });
            void queryClient.invalidateQueries({ queryKey: apiQuery.money.goals.list.key() });
            void queryClient.invalidateQueries({
                queryKey: apiQuery.money.goals.projections.key(),
            });
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

    const removeMutation = useMutation({
        mutationFn: async () => {
            if (!householdId || !entityId) throw new Error('No household');
            return api.money.income.remove({ householdId, id: entityId });
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: apiQuery.money.income.list.key() });
            void queryClient.invalidateQueries({ queryKey: apiQuery.money.jars.balances.key() });
            void queryClient.invalidateQueries({ queryKey: apiQuery.money.dashboard.get.key() });
            void queryClient.invalidateQueries({ queryKey: apiQuery.money.goals.list.key() });
            showToast(t('common.message.entity.income_deleted'), 'success');
            dismiss();
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
                        {saveMutation.isPending || form.formState.isSubmitting
                            ? tForm('working')
                            : mode === 'edit'
                              ? tForm('save_changes')
                              : tIncome('save')}
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
                name="name"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>{tForm('fields.name')}</FormLabel>
                        <FormControl>
                            {mode === 'create' ? (
                                <PresetNameField
                                    value={field.value}
                                    onChange={field.onChange}
                                    placeholder={tIncome('name_placeholder')}
                                    freeTextPlaceholder={tIncome('free_text_placeholder')}
                                    options={presetOptions}
                                    lockPresets
                                    freeTextKeys={['OTHER']}
                                    onClear={() => {
                                        form.setValue('kind', IncomeKind.SALARY);
                                        form.setValue('cadence', Cadence.MONTHLY);
                                    }}
                                    onSelect={opt => {
                                        const full = presetOptions.find(
                                            preset => preset.key === opt.key
                                        );
                                        if (!full) return;
                                        // OTHER keeps key in the field; kind/cadence become OTHER defaults.
                                        form.setValue('kind', full.kind);
                                        form.setValue('cadence', full.cadence);
                                    }}
                                />
                            ) : (
                                <FormInput placeholder={tIncome('name_placeholder')} {...field} />
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
                            <FormControl>
                                <FormInput
                                    type="date"
                                    pickerAriaLabel={tForm('aria.open_date_picker')}
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            ) : null}

            <FormField
                control={form.control}
                name="cadence"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>{tIncome('how_often')}</FormLabel>
                        <FormControl>
                            <select
                                className="h-11 w-full rounded-lg border border-line bg-raised px-3 text-sm text-fg focus:border-accent focus:outline-none"
                                {...field}>
                                <option value={Cadence.WEEKLY}>{tIncome('cadence_weekly')}</option>
                                <option value={Cadence.MONTHLY}>
                                    {tIncome('cadence_monthly')}
                                </option>
                                <option value={Cadence.QUARTERLY}>
                                    {tIncome('cadence_quarterly')}
                                </option>
                                <option value={Cadence.YEARLY}>{tIncome('cadence_yearly')}</option>
                                <option value={Cadence.ONCE}>{tIncome('cadence_once')}</option>
                            </select>
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
                        <FormLabel>{tIncome('type')}</FormLabel>
                        <FormControl>
                            <select
                                className="h-11 w-full rounded-lg border border-line bg-raised px-3 text-sm text-fg focus:border-accent focus:outline-none"
                                {...field}>
                                <option value="SALARY">{tIncome('kind_salary')}</option>
                                <option value="FREELANCE">{tIncome('kind_freelance')}</option>
                                <option value="BENEFIT">{tIncome('kind_benefit')}</option>
                                <option value="RENTAL">{tIncome('kind_rental')}</option>
                                <option value="DIVIDEND">{tIncome('kind_dividend')}</option>
                                <option value="OTHER">{tIncome('kind_other')}</option>
                            </select>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            {mode === 'edit' && periods.length > 0 ? (
                <div className="grid gap-2 border-t border-line pt-4">
                    <Typography as="p" variant="eyebrow" color="muted">
                        {tIncome('amount_history')}
                    </Typography>
                    <ul className="grid gap-1.5">
                        {periods.map(period => (
                            <li
                                key={period.id}
                                className="flex items-baseline justify-between gap-3 text-sm">
                                <span className="font-mono text-xs text-fg-muted">
                                    {period.effectiveOn}
                                </span>
                                <span className="font-mono text-fg">
                                    {formatMoney(period.amount)}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            ) : null}
        </FormCreateEditShell>
    );
}
