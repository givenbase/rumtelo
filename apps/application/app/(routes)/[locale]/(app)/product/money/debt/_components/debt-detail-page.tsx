'use client';

import { api } from '@/app/_lib/api';
import { apiQuery } from '@/app/_lib/api-hooks';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';

import { DebtScheduleKind, JarKey } from '@rumtelo/contracts';
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
import { cadenceWord, scheduleHint } from '@/app/_lib/debt-schedule';
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

const paymentSchema = z.object({
    amount: z
        .string()
        .min(1, 'Amount is required')
        .refine(value => {
            const cents = parseAmountToMinorUnits(value);
            return cents !== null && cents > 0;
        }, 'Enter a valid amount'),
    bookedOn: z.string().min(1, 'Date is required'),
    note: z.string().max(500).optional(),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

/**
 * Debt detail — progress, schedule, payment log, linked fixed cost.
 */
export function DebtDetailPageClient({ debtId }: { debtId: string }) {
    const { householdId } = useAuth();
    const router = useRouter();
    const queryClient = useQueryClient();
    const { formatMoney, symbol } = useHouseholdCurrency();
    const { showToast } = useAppShell();
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
            showToast('Payment recorded', 'success');
            setPaying(false);
            paymentForm.reset({
                amount: debt
                    ? minorUnitsToAmountInput(debt.minimumPayment + debt.extraPayment)
                    : '',
                bookedOn: todayIsoDate(),
                note: '',
            });
        },
        onError: () => showToast('Payment failed', 'error'),
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
            showToast('Monthly payment added to Necessities', 'success');
        },
        onError: () => showToast('Could not add fixed cost', 'error'),
    });

    if (live && detailQuery.isLoading && !detail) {
        return (
            <Typography as="p" size="sm" color="muted">
                Loading…
            </Typography>
        );
    }
    if (!debt || !detail) {
        return (
            <div className="grid gap-4">
                <Link
                    href={productPath('money/debt')}
                    className="font-mono text-xs tracking-wide text-accent uppercase hover:underline">
                    ← Debts
                </Link>
                <p className="text-sm text-fg-muted">Debt not found.</p>
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
    const hint = scheduleHint(debt, detail.paymentsMade);
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
                        ← Debts
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
                                {debt.kind.replaceAll('_', ' ').toLowerCase()} · {debt.interestRate}
                                % APR
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button type="button" onClick={openPay}>
                        Record payment
                    </Button>
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={() => router.push(updateHref('debt', debt.id))}>
                        Edit
                    </Button>
                </div>
            </div>

            <Card className="grid gap-4 p-5">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <p className="font-mono text-[10px] tracking-wider text-fg-muted uppercase">
                            Progress
                        </p>
                        <p className="mt-1 text-2xl font-semibold text-fg">
                            {formatMoney(detail.remaining)}
                            <span className="ml-2 text-sm font-normal text-fg-muted">
                                of {formatMoney(debt.originalBalance)} left
                            </span>
                        </p>
                    </div>
                    <Badge tone={paidPct >= 100 ? 'success' : 'neutral'}>{paidPct}% paid</Badge>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-line">
                    <div
                        className="h-full rounded-full bg-accent transition-[width]"
                        style={{ width: `${paidPct}%` }}
                    />
                </div>
                <div className="flex flex-wrap gap-4 font-mono text-xs text-fg-muted">
                    <span>Paid {formatMoney(detail.paidAmount)}</span>
                    <span>{detail.paymentsMade} payments logged</span>
                    {detail.paymentsRemaining !== null ? (
                        <span>{detail.paymentsRemaining} scheduled left</span>
                    ) : null}
                    {hint ? <span>{hint}</span> : null}
                </div>
            </Card>

            <Card className="grid gap-3 p-5">
                <p className="font-mono text-[10px] tracking-wider text-fg-muted uppercase">
                    Schedule
                </p>
                <div className="flex flex-wrap gap-1.5">
                    {debt.startedOn ? (
                        <MetaChip>Starts {formatBookedDate(debt.startedOn)}</MetaChip>
                    ) : (
                        <MetaChip>Start not set</MetaChip>
                    )}
                    <MetaChip>{cadenceLabel(debt.paymentCadence)}</MetaChip>
                    {debt.dueDay ? <MetaChip>{formatDueDay(debt.dueDay)}</MetaChip> : null}
                    {debt.scheduleKind === DebtScheduleKind.TERM && debt.termPayments !== null ? (
                        <MetaChip>{debt.termPayments} payments</MetaChip>
                    ) : null}
                    {debt.scheduleKind === DebtScheduleKind.DEADLINE && debt.maturityOn ? (
                        <MetaChip>Deadline {formatBookedDate(debt.maturityOn)}</MetaChip>
                    ) : null}
                    {debt.scheduleKind === DebtScheduleKind.OPEN ? (
                        <MetaChip>Open-ended</MetaChip>
                    ) : null}
                </div>
                <p className="text-sm text-fg">
                    {formatMoney(debt.minimumPayment)}
                    {debt.extraPayment > 0 ? ` + ${formatMoney(debt.extraPayment)} extra` : ''}
                    <span className="text-fg-muted">
                        {' '}
                        / {cadenceWord(debt.paymentCadence).replace('ly', '') || 'period'}
                    </span>
                </p>
            </Card>

            {paying ? (
                <Card className="grid gap-4 p-5">
                    <div className="flex items-center justify-between gap-2">
                        <p className="font-mono text-[10px] tracking-wider text-fg-muted uppercase">
                            Record payment
                        </p>
                        <button
                            type="button"
                            className="font-mono text-xs text-fg-muted uppercase hover:text-fg"
                            onClick={() => setPaying(false)}>
                            Cancel
                        </button>
                    </div>
                    <Form {...paymentForm}>
                        <form
                            className="grid gap-3 sm:grid-cols-2"
                            onSubmit={paymentForm.handleSubmit(
                                values => void recordMutation.mutateAsync(values),
                                createFormInvalidHandler(({ title, description }) => {
                                    showToast(description ?? title, 'error');
                                })
                            )}>
                            <FormField
                                control={paymentForm.control}
                                name="amount"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Amount ({symbol})</FormLabel>
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
                                        <FormLabel>Date</FormLabel>
                                        <FormControl>
                                            <FormInput {...field} type="date" />
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
                                        <FormLabel>Note</FormLabel>
                                        <FormControl>
                                            <FormInput {...field} placeholder="Optional" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="sm:col-span-2">
                                <Button type="submit" disabled={recordMutation.isPending}>
                                    {recordMutation.isPending ? 'Saving…' : 'Save payment'}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </Card>
            ) : null}

            <Card className="p-0">
                <div className="flex items-center justify-between gap-2 border-b border-line px-5 py-3">
                    <p className="font-mono text-[10px] tracking-wider text-fg-muted uppercase">
                        Payment log
                    </p>
                    {detail.payments.length === 0 ? (
                        <button
                            type="button"
                            className="font-mono text-xs tracking-wide text-accent uppercase hover:underline"
                            onClick={openPay}>
                            Record first payment
                        </button>
                    ) : null}
                </div>
                {detail.payments.length === 0 ? (
                    <p className="px-5 py-6 text-sm text-fg-muted">
                        No payments logged yet. Record one or sort a transaction to this debt.
                    </p>
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
                                subtitle={formatBookedDate(payment.bookedOn)}
                                mark={paymentMark}
                                amount={formatMoney(Math.abs(payment.amount))}
                                onClick={() => router.push(txDetailHref(payment.id))}
                            />
                        );
                    })
                )}
            </Card>

            <Card className="grid gap-3 p-5">
                <p className="font-mono text-[10px] tracking-wider text-fg-muted uppercase">
                    Planned payment
                </p>
                {detail.linkedFixedCost ? (
                    <MoneyPartyRow
                        title={detail.linkedFixedCost.name}
                        subtitle={`${cadenceLabel(detail.linkedFixedCost.cadence)}${
                            detail.linkedFixedCost.dueDay
                                ? ` · ${formatDueDay(detail.linkedFixedCost.dueDay)}`
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
                        badges={<MetaChip>Necessities</MetaChip>}
                        onClick={() => router.push(fixedDetailHref(detail.linkedFixedCost!.id))}
                    />
                ) : (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-fg-muted">
                            No recurring bill linked yet. Add one so Necessities sees this payment.
                        </p>
                        <Button
                            type="button"
                            variant="secondary"
                            disabled={linkFixedMutation.isPending}
                            onClick={() => void linkFixedMutation.mutateAsync()}>
                            Add to Necessities
                        </Button>
                    </div>
                )}
            </Card>
        </div>
    );
}
