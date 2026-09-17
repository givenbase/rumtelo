'use client';

import { apiQuery } from '@/app/_lib/api-hooks';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

import type { Debt, MerchantPreset } from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { Badge, VendorMark } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import { debtDetailHref } from '@/app/_lib/create-routes';
import { scheduleHint } from '@/app/_lib/debt-schedule';
import { isLiveData } from '@/app/_lib/preview';
import { findCatalogVendor, partyMark } from '@/app/_lib/vendor-brands';
import { MetaChip, formatBookedDate, formatDueDay } from '@/components/features/money/jar-badge';
import { useAuth } from '@/components/features/shell/auth-provider';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';

const EXPENSIVE_RATE = 10;

type DebtListRowProps = {
    debt: Debt;
    merchants: readonly MerchantPreset[];
    payoffRank: number;
    showPayoffRanks: boolean;
    isFocus: boolean;
    markChrome?: { fallbackIcon?: string | null; tone?: string | null };
};

/** Debt card with optional expand for schedule + recent payments (lazy get). */
export function DebtListRow({
    debt,
    merchants,
    payoffRank,
    showPayoffRanks,
    isFocus,
    markChrome,
}: DebtListRowProps) {
    const { householdId } = useAuth();
    const router = useRouter();
    const { formatMoney } = useHouseholdCurrency();
    const [open, setOpen] = useState(false);
    const live = isLiveData(householdId);

    const detailQuery = useLiveQuery(
        apiQuery.money.debts.get.queryOptions({
            input: { householdId: householdId!, id: debt.id },
        }),
        null as never,
        live && open
    );

    const mark = partyMark(
        findCatalogVendor(debt.name, merchants) ?? { name: debt.name },
        markChrome
    );
    const paymentsMade = detailQuery.data?.paymentsMade ?? 0;
    const hint = scheduleHint(debt, paymentsMade);
    const due = formatDueDay(debt.dueDay);
    const recent = (detailQuery.data?.payments ?? []).slice(0, 3);

    return (
        <div
            className={cn(
                'rounded-2xl border bg-raised transition-colors',
                isFocus ? 'border-accent/40 ring-1 ring-accent/15' : 'border-line'
            )}>
            <div className="flex w-full items-start gap-2 p-4.5">
                <button
                    type="button"
                    aria-label={debt.name}
                    onClick={() => router.push(debtDetailHref(debt.id))}
                    className="min-w-0 flex-1 cursor-pointer text-left hover:opacity-90">
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <span className="font-mono text-xs text-accent">
                                {showPayoffRanks ? `#${payoffRank + 1}` : '·'}
                            </span>
                            <VendorMark
                                name={mark.name}
                                src={mark.src}
                                fallbackIcon={mark.fallbackIcon}
                                tone={mark.tone}
                                size={28}
                            />
                            <div>
                                <div className="flex flex-wrap items-center gap-2.5">
                                    <span className="text-base text-fg">{debt.name}</span>
                                    <Badge
                                        tone={
                                            debt.interestRate >= EXPENSIVE_RATE
                                                ? 'danger'
                                                : 'neutral'
                                        }>
                                        {debt.interestRate}% interest
                                    </Badge>
                                    {isFocus ? <Badge tone="success">Extra goes here</Badge> : null}
                                </div>
                                <div className="mt-1 font-mono text-xs tracking-normal text-fg-faint">
                                    {formatMoney(debt.minimumPayment)}/mo minimum
                                    {showPayoffRanks
                                        ? payoffRank === 0
                                            ? ' · focus'
                                            : ' · waiting'
                                        : ''}
                                    {hint ? ` · ${hint}` : ''}
                                </div>
                            </div>
                        </div>
                        <div className="font-mono text-base text-fg">
                            {formatMoney(debt.balance)}
                        </div>
                    </div>
                </button>
                <button
                    type="button"
                    aria-expanded={open}
                    aria-label={open ? `Hide ${debt.name} payments` : `Show ${debt.name} payments`}
                    onClick={() => setOpen(previous => !previous)}
                    className="mt-1 grid shrink-0 place-items-center rounded-lg px-2 py-2 text-fg-faint hover:bg-surface hover:text-fg">
                    <span
                        className={cn(
                            'text-xs transition-transform duration-200',
                            open && 'rotate-180'
                        )}>
                        ▾
                    </span>
                </button>
            </div>

            {open ? (
                <div className="animate-rise space-y-3 border-t border-line px-4.5 py-3">
                    <div className="flex flex-wrap gap-1.5">
                        {due ? <MetaChip>{due}</MetaChip> : null}
                        <MetaChip>{debt.paymentCadence}</MetaChip>
                        {detailQuery.data ? (
                            <MetaChip>
                                {detailQuery.data.paymentsMade} payment
                                {detailQuery.data.paymentsMade === 1 ? '' : 's'} logged
                            </MetaChip>
                        ) : (
                            <MetaChip>Loading…</MetaChip>
                        )}
                    </div>
                    {recent.length === 0 && detailQuery.data ? (
                        <p className="text-sm text-fg-muted">No payments logged yet.</p>
                    ) : (
                        <ul className="grid gap-1.5">
                            {recent.map(tx => (
                                <li
                                    key={tx.id}
                                    className="flex items-center justify-between gap-3 font-mono text-xs text-fg-muted">
                                    <span>{formatBookedDate(tx.bookedOn)}</span>
                                    <span className="text-fg">
                                        {formatMoney(Math.abs(tx.amount))}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                    <button
                        type="button"
                        onClick={() => router.push(debtDetailHref(debt.id))}
                        className="font-mono text-xs font-medium tracking-wide text-accent uppercase hover:underline">
                        Open debt ›
                    </button>
                </div>
            ) : null}
        </div>
    );
}
