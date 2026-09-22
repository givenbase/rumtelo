'use client';

import { api } from '@/app/_lib/api';
import { useApiError } from '@/app/_lib/api-error-messages';
import { apiQuery } from '@/app/_lib/api-hooks';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';

import { DebtKind, DebtScheduleKind, JarKey } from '@rumtelo/contracts';
import { useLocale, useTranslations, type TranslateFn } from '@rumtelo/i18n';
import { useLiveQuery } from '@rumtelo/hooks';
import {
    Badge,
    Button,
    Card,
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    VendorMark,
    Typography,
    createFormInvalidHandler,
} from '@rumtelo/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { fixedDetailHref, txDetailHref, updateHref } from '@/app/_lib/create-routes';
import { cadencePeriodUnit, scheduleHint } from '@/app/_lib/debt-schedule';
import { cadenceLabel } from '@/app/_lib/jar-chrome';
import {
    minorUnitsToAmountInput,
    parseAmountToMinorUnits,
    todayIsoDate,
} from '@/app/_lib/money-input';
import { catalogMarkChrome } from '@/app/_lib/party-mark-chrome';
import { isLiveData } from '@/app/_lib/preview';
import { productPath } from '@/app/_lib/routes';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';
import { useJarCatalog } from '@/app/_lib/use-jar-catalog';
import { findCatalogVendor, partyMark } from '@/app/_lib/vendor-brands';
import { FormInput } from '@/components/features/forms/form-input';
import { MetaChip, formatBookedDate, formatDueDay } from '@/components/features/money/jar-badge';
import { MoneyPartyRow } from '@/components/features/money/money-party-row';
import { useAppShell } from '@/components/features/shell/app-shell-context';
import { useAuth } from '@/components/features/shell/auth-provider';
import { EditIcon } from '@/components/features/ui/action-icons';

type PaymentFormValues = {
    amount: string;
    bookedOn: string;
    note?: string;
};

function debtKindLabel(kind: DebtKind, t: TranslateFn): string {
    switch (kind) {
        case DebtKind.CREDIT_CARD:
            return t('form.kind_credit_card');
        case DebtKind.LOAN:
            return t('form.kind_loan');
        case DebtKind.STUDENT:
            return t('form.kind_student');
        case DebtKind.MORTGAGE:
            return t('form.kind_mortgage');
        case DebtKind.FAMILY:
            return t('form.kind_family');
        case DebtKind.OTHER:
            return t('form.kind_other');
        default:
            return String(kind);
    }
}

/**
 * Debt detail — progress, schedule, payment log, linked fixed cost.
 */
export function DebtDetailPageClient({ debtId }: { debtId: string }) {
    const { householdId } = useAuth();
    const queryClient = useQueryClient();
    const { formatMoney, symbol } = useHouseholdCurrency();
    const t = useTranslations('features.money.debt');
    const td = useTranslations('features.money.debt.detail');
    const tForm = useTranslations('ui.form');
    const tAction = useTranslations('common.action');
    const tChips = useTranslations('features.money.chips');
    const appLocale = useLocale();
    const { showToast } = useAppShell();
    const apiError = useApiError();

    const paymentSchema = useMemo(
        () =>
            z.object({
                amount: z
                    .string()
                    .min(1, td('validation_amount_required'))
                    .refine(value => {
                        const cents = parseAmountToMinorUnits(value);
                        return cents !== null && cents > 0;
                    }, td('validation_amount_valid')),
                bookedOn: z.string().min(1, td('validation_date_required')),
                note: z.string().max(500).optional(),
            }),
        [td]
    );
    const live = isLiveData(householdId);
    const [paying, setPaying] = useState(false);

    const detailQuery = useLiveQuery(
        apiQuery.money.debts.get.queryOptions({
            input: { householdId: householdId!, id: debtId },
        }),
        null as never,
        live
    );
    const merchantsQuery = useLiveQuery(
        apiQuery.money.catalogs.merchantPresets.list.queryOptions({
            input: { householdId: householdId! },
        }),
        [] as never,
        live
    );

    const detail = detailQuery.data;
    const debt = detail?.debt;
    const merchants = merchantsQuery.data ?? [];
    const { byKey: jarByKey } = useJarCatalog();
    const debtChrome = catalogMarkChrome({
        jarKey: JarKey.NECESSITIES,
        jarByKey,
    });

    const paymentForm = useForm<PaymentFormValues>({
        defaultValues: {
            amount: '',
            bookedOn: todayIsoDate(),
            note: '',
        },
        resolver: zodResolver(paymentSchema),
    });

    const recordMutation = useMutation({
        mutationFn: async (values: PaymentFormValues) => {
            if (!householdId) throw new Error('No household');
            const amount = parseAmountToMinorUnits(values.amount);
            if (amount === null || amount <= 0) throw new Error('Invalid amount');
            return api.money.debts.recordPayment({
                householdId,
                debtId,
                amount,
                bookedOn: values.bookedOn,
                note: values.note?.trim() || null,
            });
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: apiQuery.money.debts.key() });
            void queryClient.invalidateQueries({ queryKey: apiQuery.money.transactions.key() });
            void queryClient.invalidateQueries({ queryKey: apiQuery.money.fixedCosts.key() });
            showToast(t('toast_payment_recorded'), 'success');
            setPaying(false);
            paymentForm.reset({
                amount: debt
                    ? minorUnitsToAmountInput(debt.minimumPayment + debt.extraPayment)
                    : '',
                bookedOn: todayIsoDate(),
                note: '',
            });
        },
        onError: (error: unknown) => showToast(apiError(error), 'error'),
    });

    const linkFixedMutation = useMutation({
        mutationFn: async () => {
            if (!householdId || !debt) throw new Error('No household');
            return api.money.debts.update({
                id: debt.id,
                householdId,
                linkFixedCost: true,
            });
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: apiQuery.money.debts.key() });
            void queryClient.invalidateQueries({ queryKey: apiQuery.money.fixedCosts.key() });
            showToast(t('toast_monthly_added'), 'success');
        },
        onError: (error: unknown) => showToast(apiError(error), 'error'),
    });

    if (live && detailQuery.isLoading && !detail) {
        return (
            <Typography as="p" size="sm" color="muted">
                {td('loading')}
            </Typography>
        );
    }
    if (!debt || !detail) {
        return (
            <div className="grid gap-4">
                <Link
                    href={productPath('money/debt')}
                    className="font-mono text-xs tracking-wide text-accent uppercase hover:underline">
                    {td('back')}
                </Link>
                <p className="text-sm text-fg-muted">{td('not_found')}</p>
            </div>
        );
    }

    const mark = partyMark(
        findCatalogVendor(debt.name, merchants) ?? { name: debt.name },
        debtChrome
    );
    const paidPct =
        debt.originalBalance > 0
            ? Math.min(100, Math.round((detail.paidAmount / debt.originalBalance) * 100))
            : 0;
    const hint = scheduleHint(debt, detail.paymentsMade, td, appLocale);
    const defaultPay = debt.minimumPayment + debt.extraPayment;

    function openPay() {
        if (!debt) return;
        paymentForm.reset({
            amount: minorUnitsToAmountInput(defaultPay > 0 ? defaultPay : debt.minimumPayment),
            bookedOn: todayIsoDate(),
            note: '',
        });
        setPaying(true);
    }

    return (
        <div className="grid gap-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="grid gap-2">
                    <Link
                        href={productPath('money/debt')}
                        className="font-mono text-xs tracking-wide text-accent uppercase hover:underline">
                        {td('back')}
                    </Link>
                    <div className="flex items-center gap-3">
                        <VendorMark
                            name={mark.name}
                            src={mark.src}
                            fallbackIcon={mark.fallbackIcon}
                            tone={mark.tone}
                            size={40}
                        />
                        <div>
                            <h1 className="text-2xl font-semibold tracking-tight text-fg">
                                {debt.name}
                            </h1>
                            <p className="mt-0.5 font-mono text-xs text-fg-muted">
                                {debtKindLabel(debt.kind, t)} ·{' '}
                                {td('apr', { rate: debt.interestRate })}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button type="button" onClick={openPay}>
                        {td('record_payment')}
                    </Button>
                    <Button as={Link} href={updateHref('debt', debt.id)} variant="secondary">
                        <EditIcon />
                        {tAction('edit')}
                    </Button>
                </div>
            </div>

            <Card className="grid gap-4 p-5">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <p className="font-mono text-[10px] tracking-wider text-fg-muted uppercase">
                            {td('progress')}
                        </p>
                        <p className="mt-1 text-2xl font-semibold text-fg">
                            {formatMoney(detail.remaining)}
                            <span className="ml-2 text-sm font-normal text-fg-muted">
                                {td('of_left', { amount: formatMoney(debt.originalBalance) })}
                            </span>
                        </p>
                    </div>
                    <Badge tone={paidPct >= 100 ? 'success' : 'neutral'}>
                        {td('paid_pct', { pct: paidPct })}
                    </Badge>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-line">
                    <div
                        className="h-full rounded-full bg-accent transition-[width]"
                        style={{ width: `${paidPct}%` }}
                    />
                </div>
                <div className="flex flex-wrap gap-4 font-mono text-xs text-fg-muted">
                    <span>{td('paid_amount', { amount: formatMoney(detail.paidAmount) })}</span>
                    <span>{td('payments_logged', { count: detail.paymentsMade })}</span>
                    {detail.paymentsRemaining !== null ? (
                        <span>{td('scheduled_left', { count: detail.paymentsRemaining })}</span>
                    ) : null}
                    {hint ? <span>{hint}</span> : null}
                </div>
            </Card>

            <Card className="grid gap-3 p-5">
                <p className="font-mono text-[10px] tracking-wider text-fg-muted uppercase">
                    {td('schedule')}
                </p>
                <div className="flex flex-wrap gap-1.5">
                    {debt.startedOn ? (
                        <MetaChip>
                            {td('starts', { date: formatBookedDate(debt.startedOn, appLocale) })}
                        </MetaChip>
                    ) : (
                        <MetaChip>{td('start_not_set')}</MetaChip>
                    )}
                    <MetaChip>{cadenceLabel(debt.paymentCadence, tChips)}</MetaChip>
                    {debt.dueDay ? <MetaChip>{formatDueDay(debt.dueDay, tChips)}</MetaChip> : null}
                    {debt.scheduleKind === DebtScheduleKind.TERM && debt.termPayments !== null ? (
                        <MetaChip>{td('payments_count', { count: debt.termPayments })}</MetaChip>
                    ) : null}
                    {debt.scheduleKind === DebtScheduleKind.DEADLINE && debt.maturityOn ? (
                        <MetaChip>
                            {td('deadline', { date: formatBookedDate(debt.maturityOn, appLocale) })}
                        </MetaChip>
                    ) : null}
                    {debt.scheduleKind === DebtScheduleKind.OPEN ? (
                        <MetaChip>{td('open_ended')}</MetaChip>
                    ) : null}
                </div>
                <p className="text-sm text-fg">
                    {formatMoney(debt.minimumPayment)}
                    {debt.extraPayment > 0
                        ? td('extra_suffix', { amount: formatMoney(debt.extraPayment) })
                        : ''}
                    <span className="text-fg-muted">
                        {' '}
                        / {cadencePeriodUnit(debt.paymentCadence, td)}
                    </span>
                </p>
            </Card>

            {paying ? (
                <Card className="grid gap-4 p-5">
                    <div className="flex items-center justify-between gap-2">
                        <p className="font-mono text-[10px] tracking-wider text-fg-muted uppercase">
                            {td('record_payment')}
                        </p>
                        <button
                            type="button"
                            className="font-mono text-xs text-fg-muted uppercase hover:text-fg"
                            onClick={() => setPaying(false)}>
                            {td('cancel')}
                        </button>
                    </div>
                    <Form {...paymentForm}>
                        <form
                            className="grid gap-3 sm:grid-cols-2"
                            onSubmit={paymentForm.handleSubmit(
                                values => void recordMutation.mutateAsync(values),
                                createFormInvalidHandler(
                                    ({ title, description }) => {
                                        showToast(description ?? title, 'error');
                                    },
                                    {
                                        title: tForm('incomplete_title'),
                                        description: tForm('incomplete_description'),
                                    }
                                )
                            )}>
                            <FormField
                                control={paymentForm.control}
                                name="amount"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{td('amount_label', { symbol })}</FormLabel>
                                        <FormControl>
                                            <FormInput {...field} inputMode="decimal" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={paymentForm.control}
                                name="bookedOn"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{tForm('fields.date')}</FormLabel>
                                        <FormControl>
                                            <FormInput
                                                {...field}
                                                type="date"
                                                pickerAriaLabel={tForm('aria.open_date_picker')}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={paymentForm.control}
                                name="note"
                                render={({ field }) => (
                                    <FormItem className="sm:col-span-2">
                                        <FormLabel>{tForm('fields.note')}</FormLabel>
                                        <FormControl>
                                            <FormInput
                                                {...field}
                                                placeholder={td('note_optional')}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="sm:col-span-2">
                                <Button type="submit" disabled={recordMutation.isPending}>
                                    {recordMutation.isPending
                                        ? tForm('saving')
                                        : td('save_payment')}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </Card>
            ) : null}

            <Card className="p-0">
                <div className="flex items-center justify-between gap-2 border-b border-line px-5 py-3">
                    <p className="font-mono text-[10px] tracking-wider text-fg-muted uppercase">
                        {td('payment_log')}
                    </p>
                    {detail.payments.length === 0 ? (
                        <button
                            type="button"
                            className="font-mono text-xs tracking-wide text-accent uppercase hover:underline"
                            onClick={openPay}>
                            {td('record_first')}
                        </button>
                    ) : null}
                </div>
                {detail.payments.length === 0 ? (
                    <p className="px-5 py-6 text-sm text-fg-muted">{td('no_payments')}</p>
                ) : (
                    detail.payments.map(payment => {
                        const paymentMark = partyMark(
                            findCatalogVendor(
                                payment.counterparty ?? payment.description,
                                merchants
                            ) ?? {
                                name: payment.counterparty ?? payment.description,
                            },
                            debtChrome
                        );
                        return (
                            <MoneyPartyRow
                                key={payment.id}
                                title={payment.counterparty || payment.description}
                                subtitle={formatBookedDate(payment.bookedOn, appLocale)}
                                mark={paymentMark}
                                amount={formatMoney(Math.abs(payment.amount))}
                                href={txDetailHref(payment.id)}
                            />
                        );
                    })
                )}
            </Card>

            <Card className="grid gap-3 p-5">
                <p className="font-mono text-[10px] tracking-wider text-fg-muted uppercase">
                    {td('planned_payment')}
                </p>
                {detail.linkedFixedCost ? (
                    <MoneyPartyRow
                        title={detail.linkedFixedCost.name}
                        subtitle={`${cadenceLabel(detail.linkedFixedCost.cadence, tChips)}${
                            detail.linkedFixedCost.dueDay
                                ? ` · ${formatDueDay(detail.linkedFixedCost.dueDay, tChips)}`
                                : ''
                        }`}
                        mark={partyMark(
                            findCatalogVendor(detail.linkedFixedCost.name, merchants) ?? {
                                name: detail.linkedFixedCost.name,
                            },
                            catalogMarkChrome({
                                billName: detail.linkedFixedCost.name,
                                jarKey: JarKey.NECESSITIES,
                                jarByKey,
                            })
                        )}
                        amount={formatMoney(detail.linkedFixedCost.amount)}
                        badges={<MetaChip>{td('necessities')}</MetaChip>}
                        href={fixedDetailHref(detail.linkedFixedCost.id)}
                    />
                ) : (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-fg-muted">{td('no_fixed_linked')}</p>
                        <Button
                            type="button"
                            variant="secondary"
                            disabled={linkFixedMutation.isPending}
                            onClick={() => void linkFixedMutation.mutateAsync()}>
                            {td('add_to_necessities')}
                        </Button>
                    </div>
                )}
            </Card>
        </div>
    );
}
