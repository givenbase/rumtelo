'use client';

import { api } from '@/app/_lib/api';
import { useApiError } from '@/app/_lib/api-error-messages';
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
    Typography,
    VendorMark,
    createFormInvalidHandler,
} from '@rumtelo/ui';

import { zodResolver } from '@hookform/resolvers/zod';
import { Cadence, DebtKind, DebtScheduleKind, JarKey } from '@rumtelo/contracts';

import { useTranslations } from '@rumtelo/i18n';

import { catalogMarkChrome } from '@/app/_lib/party-mark-chrome';
import { partyMark } from '@/app/_lib/vendor-brands';
import { parseAmountToMinorUnits } from '@/app/_lib/money-input';
import { isLiveData } from '@/app/_lib/preview';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';
import { useJarCatalog } from '@/app/_lib/use-jar-catalog';
import { useFormDismiss } from '@/app/_lib/use-form-dismiss';
import { useAppShell } from '@/components/features/shell/app-shell-context';
import { useAuth } from '@/components/features/shell/auth-provider';
import { FormCreateEditShell } from '@/components/layout/form-create-edit-shell';
import { createDebtFormSchema, type DebtFormSchemaValues } from './form-zod';
import { CatalogChipPicker } from './catalog-chip-picker';
import { ConfirmActionButton } from './confirm-action-button';
import { FormInput } from './form-input';
import { merchantsToNameOptions } from './merchant-name-options';
import { PresetNameField, type NamePresetOption } from './preset-name-field';
import type { MerchantPreset } from '@rumtelo/contracts';

export type DebtFormValues = DebtFormSchemaValues;

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
    const t = useTranslations();
    const tDebt = useTranslations('features.money.debt.form');
    const tForm = useTranslations('ui.form');
    const tBtn = useTranslations('ui.button.actions');
    const scheduleOptions: ReadonlyArray<{
        id: DebtScheduleKind;
        label: string;
        hint: string;
    }> = [
        {
            id: DebtScheduleKind.OPEN,
            label: tDebt('schedule_open'),
            hint: tDebt('schedule_open_hint'),
        },
        {
            id: DebtScheduleKind.TERM,
            label: tDebt('schedule_term'),
            hint: tDebt('schedule_term_hint'),
        },
        {
            id: DebtScheduleKind.DEADLINE,
            label: tDebt('schedule_deadline'),
            hint: tDebt('schedule_deadline_hint'),
        },
    ];
    const cadenceOptions: ReadonlyArray<{
        id: DebtFormValues['paymentCadence'];
        label: string;
    }> = [
        { id: Cadence.WEEKLY, label: tDebt('cadence_weekly') },
        { id: Cadence.MONTHLY, label: tDebt('cadence_monthly') },
        { id: Cadence.QUARTERLY, label: tDebt('cadence_quarterly') },
        { id: Cadence.YEARLY, label: tDebt('cadence_yearly') },
    ];
    const { showToast } = useAppShell();
    const apiError = useApiError();
    const dismiss = useFormDismiss(onSuccess);
    const live = isLiveData(householdId);
    const [typeKey, setTypeKey] = useState<string | null>(null);
    const [typeQuery, setTypeQuery] = useState('');
    const [customLender, setCustomLender] = useState(false);
    const [lenderQuery, setLenderQuery] = useState('');

    const debtTypesQuery = useLiveQuery(
        apiQuery.money.catalogs.debtPresets.list.queryOptions({
            input: { householdId: householdId! },
        }),
        [],
        live && mode === 'create'
    );
    const merchantsQuery = useLiveQuery(
        apiQuery.money.catalogs.merchantPresets.list.queryOptions({
            input: { householdId: householdId! },
        }),
        [],
        live
    );
    const debtTypes = debtTypesQuery.data ?? [];
    const merchants = merchantsQuery.data ?? [];
    const { byKey: jarByKey } = useJarCatalog();
    const selectedType = debtTypes.find(option => option.key === typeKey) ?? null;
    const lenderChrome = catalogMarkChrome({
        icon: selectedType?.icon,
        jarKey: JarKey.NECESSITIES,
        jarByKey,
    });
    const lendersForType: MerchantPreset[] = (() => {
        const keys = selectedType?.merchantKeys ?? [];
        if (keys.length === 0) return [];
        const byKey = new Map(merchants.map(merchant => [merchant.key, merchant]));
        return keys
            .map(key => byKey.get(key))
            .filter((merchant): merchant is MerchantPreset => Boolean(merchant));
    })();

    /** Suggested lenders + full merchant catalog (banks, BNPL, …) for typeahead. */
    const fromMerchants = merchantsToNameOptions(merchants);
    const lenderOptions: NamePresetOption[] = fromMerchants;
    const debtFormSchema = useMemo(() => createDebtFormSchema(tForm), [tForm]);

    const form = useForm<DebtFormValues>({
        defaultValues: {
            name: defaultValues?.name ?? '',
            balance: defaultValues?.balance ?? '',
            interestRate: defaultValues?.interestRate ?? '0',
            minimumPayment: defaultValues?.minimumPayment ?? '',
            extraPayment: defaultValues?.extraPayment ?? '',
            dueDay: defaultValues?.dueDay ?? '',
            startedOn: defaultValues?.startedOn ?? '',
            scheduleKind: defaultValues?.scheduleKind ?? DebtScheduleKind.OPEN,
            paymentCadence: defaultValues?.paymentCadence ?? Cadence.MONTHLY,
            termPayments: defaultValues?.termPayments ?? '',
            maturityOn: defaultValues?.maturityOn ?? '',
            linkFixedCost: defaultValues?.linkFixedCost ?? true,
            kind: defaultValues?.kind ?? DebtKind.LOAN,
        },
        resolver: zodResolver(debtFormSchema),
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

    const scheduleKind = useWatch({ control: form.control, name: 'scheduleKind' });
    const paymentCadence = useWatch({ control: form.control, name: 'paymentCadence' });

    const saveMutation = useMutation({
        mutationFn: async (values: DebtFormValues) => {
            if (!householdId) throw new Error('No household');
            const balance = parseAmountToMinorUnits(values.balance);
            if (balance === null || balance < 0) throw new Error('Invalid balance');
            const minimumRaw = values.minimumPayment?.trim()
                ? parseAmountToMinorUnits(values.minimumPayment)
                : 0;
            const minimumPayment = minimumRaw === null ? 0 : minimumRaw;
            const extraRaw = values.extraPayment?.trim()
                ? parseAmountToMinorUnits(values.extraPayment)
                : 0;
            const extraPayment = extraRaw === null ? 0 : extraRaw;
            const interestRate = Number(values.interestRate.replace(',', '.'));
            const name = values.name.trim();
            const dueDayRaw = values.dueDay?.trim() ? Number(values.dueDay) : null;
            const dueDay =
                dueDayRaw !== null &&
                Number.isFinite(dueDayRaw) &&
                dueDayRaw >= 1 &&
                dueDayRaw <= 31
                    ? dueDayRaw
                    : null;
            const startedOn = values.startedOn?.trim() || null;
            const termPayments =
                values.scheduleKind === DebtScheduleKind.TERM ? Number(values.termPayments) : null;
            const maturityOn =
                values.scheduleKind === DebtScheduleKind.DEADLINE
                    ? values.maturityOn?.trim() || null
                    : null;

            const schedule = {
                scheduleKind: values.scheduleKind,
                paymentCadence: values.paymentCadence,
                termPayments,
                maturityOn,
                startedOn,
                dueDay,
                extraPayment,
            };

            if (mode === 'edit' && entityId) {
                return api.money.debts.update({
                    id: entityId,
                    householdId,
                    name,
                    kind: values.kind,
                    balance,
                    interestRate,
                    minimumPayment,
                    ...schedule,
                    linkFixedCost: values.linkFixedCost || undefined,
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
                closedOn: null,
                linkFixedCost: values.linkFixedCost,
                ...schedule,
            });
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: apiQuery.money.debts.key() });
            void queryClient.invalidateQueries({ queryKey: apiQuery.money.fixedCosts.key() });
            showToast(
                mode === 'edit'
                    ? t('common.message.success.updated', {
                          entity: t('common.message.entity.names.debt'),
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
            return api.money.debts.remove({ householdId, id: entityId });
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: apiQuery.money.debts.list.key() });
            void queryClient.invalidateQueries({ queryKey: apiQuery.money.debts.plan.key() });
            showToast(t('common.message.entity.debt_deleted'), 'success');
            dismiss();
        },
        onError: (error: unknown) => showToast(apiError(error), 'error'),
    });

    async function onSubmit(values: DebtFormValues) {
        if (!live) {
            showToast(t('common.message.error.sign_in_to_save'), 'error');
            return;
        }
        if (mode === 'create' && !typeKey) {
            showToast(t('features.money.debt.pick_type_first'), 'error');
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
                            ? tForm('working')
                            : mode === 'edit'
                              ? tForm('save_changes')
                              : tDebt('save')}
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
            {mode === 'create' ? (
                <>
                    <div className="grid gap-2">
                        <p className="font-mono text-[10px] font-semibold tracking-wider text-fg-muted uppercase">
                            {tDebt('kind_heading')}
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
                                        form.setValue('kind', DebtKind.LOAN);
                                    }}>
                                    {tForm('change')}
                                </button>
                            </div>
                        ) : (
                            <PresetNameField
                                value={typeQuery}
                                onChange={setTypeQuery}
                                placeholder={tDebt('type_placeholder')}
                                options={debtTypes}
                                onSelect={opt => {
                                    const full = debtTypes.find(preset => preset.key === opt.key);
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
                                {tDebt('who_heading')}
                            </p>
                            {lendersForType.length > 0 && !customLender ? (
                                <CatalogChipPicker
                                    query={lenderQuery}
                                    onQueryChange={setLenderQuery}
                                    items={lendersForType}
                                    placeholder={tDebt('lender_search')}
                                    noMatchesLabel={tForm('no_matches')}
                                    disabled={busy}
                                    otherLabel={tForm('other')}
                                    onOther={() => {
                                        setCustomLender(true);
                                        form.setValue('name', '', {
                                            shouldValidate: false,
                                        });
                                    }}
                                    renderChip={lender => {
                                        const selected =
                                            selectedLenderName.toLowerCase() ===
                                            lender.name.toLowerCase();
                                        const mark = partyMark(
                                            {
                                                key: lender.key,
                                                name: lender.name,
                                                logoDomain: lender.logoDomain,
                                                website: lender.website,
                                            },
                                            lenderChrome
                                        );
                                        return (
                                            <button
                                                type="button"
                                                disabled={busy}
                                                className={
                                                    selected
                                                        ? 'inline-flex items-center gap-2 rounded-xl border border-accent bg-accent/15 px-2.5 py-1.5 text-sm text-accent'
                                                        : 'inline-flex items-center gap-2 rounded-xl border border-line bg-raised px-2.5 py-1.5 text-sm text-fg hover:border-accent hover:text-accent'
                                                }
                                                onClick={() =>
                                                    form.setValue('name', lender.name, {
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
                                                {lender.name}
                                            </button>
                                        );
                                    }}
                                />
                            ) : null}
                            {showLenderInput ? (
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <PresetNameField
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                    options={lenderOptions}
                                                    placeholder={
                                                        lendersForType.length > 0
                                                            ? tDebt('lender_search_or_bank')
                                                            : tDebt('lender_example')
                                                    }
                                                    freeTextPlaceholder={tDebt('lender_free')}
                                                    disabled={busy}
                                                    onSelect={opt => {
                                                        field.onChange(opt.name);
                                                    }}
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
                                <FormLabel>{tDebt('who_label')}</FormLabel>
                                <FormControl>
                                    <PresetNameField
                                        value={field.value}
                                        onChange={field.onChange}
                                        options={lenderOptions}
                                        placeholder={tDebt('lender_example_short')}
                                        freeTextPlaceholder={tDebt('lender_free')}
                                        disabled={busy}
                                        onSelect={opt => {
                                            field.onChange(opt.name);
                                        }}
                                    />
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
                                <FormLabel>{tForm('type')}</FormLabel>
                                <FormControl>
                                    <select
                                        className="h-11 w-full rounded-lg border border-line bg-raised px-3 text-sm text-fg focus:border-accent focus:outline-none"
                                        {...field}>
                                        <option value="CREDIT_CARD">
                                            {tDebt('kind_credit_card')}
                                        </option>
                                        <option value="LOAN">{tDebt('kind_loan')}</option>
                                        <option value="STUDENT">{tDebt('kind_student')}</option>
                                        <option value="MORTGAGE">{tDebt('kind_mortgage')}</option>
                                        <option value="FAMILY">{tDebt('kind_family')}</option>
                                        <option value="OTHER">{tDebt('kind_other')}</option>
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
                        <FormLabel>{tDebt('balance', { symbol })}</FormLabel>
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

            <FormField
                control={form.control}
                name="interestRate"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>{tDebt('interest')}</FormLabel>
                        <FormControl>
                            <FormInput
                                inputMode="decimal"
                                placeholder={tDebt('interest_placeholder')}
                                {...field}
                            />
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
                        <FormLabel>{tDebt('minimum', { symbol })}</FormLabel>
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

            <FormField
                control={form.control}
                name="extraPayment"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>{tDebt('extra', { symbol })}</FormLabel>
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

            <div className="grid gap-2">
                <p className="font-mono text-[10px] font-semibold tracking-wider text-fg-muted uppercase">
                    {tDebt('cadence_heading')}
                </p>
                <div className="flex flex-wrap gap-1.5">
                    {cadenceOptions.map(option => {
                        const selected = paymentCadence === option.id;
                        return (
                            <button
                                key={option.id}
                                type="button"
                                disabled={busy}
                                className={
                                    selected
                                        ? 'rounded-xl border border-accent bg-accent/15 px-3 py-1.5 text-sm text-accent'
                                        : 'rounded-xl border border-line bg-raised px-3 py-1.5 text-sm text-fg hover:border-accent'
                                }
                                onClick={() =>
                                    form.setValue('paymentCadence', option.id, {
                                        shouldValidate: true,
                                    })
                                }>
                                {option.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            <FormField
                control={form.control}
                name="dueDay"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>{tDebt('due_day')}</FormLabel>
                        <FormControl>
                            <FormInput
                                inputMode="numeric"
                                placeholder={tDebt('due_day_placeholder')}
                                {...field}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="startedOn"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>{tDebt('started_on')}</FormLabel>
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

            <div className="grid gap-2">
                <p className="font-mono text-[10px] font-semibold tracking-wider text-fg-muted uppercase">
                    {tDebt('schedule_heading')}
                </p>
                <div className="grid gap-2 sm:grid-cols-3">
                    {scheduleOptions.map(option => {
                        const selected = scheduleKind === option.id;
                        return (
                            <button
                                key={option.id}
                                type="button"
                                disabled={busy}
                                className={
                                    selected
                                        ? 'rounded-xl border border-accent bg-accent/15 px-3 py-2.5 text-left'
                                        : 'rounded-xl border border-line bg-raised px-3 py-2.5 text-left hover:border-accent'
                                }
                                onClick={() => {
                                    form.setValue('scheduleKind', option.id, {
                                        shouldValidate: true,
                                    });
                                    if (option.id !== DebtScheduleKind.TERM) {
                                        form.setValue('termPayments', '');
                                    }
                                    if (option.id !== DebtScheduleKind.DEADLINE) {
                                        form.setValue('maturityOn', '');
                                    }
                                }}>
                                <span className="block text-sm font-medium text-fg">
                                    {option.label}
                                </span>
                                <Typography as="span" variant="caption" className="mt-0.5 block">
                                    {option.hint}
                                </Typography>
                            </button>
                        );
                    })}
                </div>
            </div>

            {scheduleKind === DebtScheduleKind.TERM ? (
                <FormField
                    control={form.control}
                    name="termPayments"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{tDebt('term_count')}</FormLabel>
                            <FormControl>
                                <FormInput
                                    inputMode="numeric"
                                    placeholder={tDebt('term_placeholder')}
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            ) : null}

            {scheduleKind === DebtScheduleKind.DEADLINE ? (
                <FormField
                    control={form.control}
                    name="maturityOn"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{tDebt('pay_off_by')}</FormLabel>
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
                name="linkFixedCost"
                render={({ field }) => (
                    <FormItem>
                        <div className="flex items-start gap-3 rounded-xl border border-line bg-raised px-3 py-3">
                            <input
                                id="debt-link-fixed-cost"
                                type="checkbox"
                                className="mt-1"
                                checked={field.value}
                                onChange={event => field.onChange(event.target.checked)}
                                disabled={busy}
                            />
                            <label htmlFor="debt-link-fixed-cost" className="cursor-pointer">
                                <span className="block text-sm font-medium text-fg">
                                    {tDebt('link_fixed_title')}
                                </span>
                                <Typography as="span" variant="caption" className="mt-0.5 block">
                                    {tDebt('link_fixed_body')}
                                </Typography>
                            </label>
                        </div>
                    </FormItem>
                )}
            />
        </FormCreateEditShell>
    );
}
