'use client';

import { apiQuery } from '@/app/_lib/api-hooks';
import Link from 'next/link';
import { useState } from 'react';

import type { Debt, MerchantPreset } from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { Badge, Typography, VendorMark } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import { debtDetailHref } from '@/app/_lib/create-routes';
import { scheduleHint } from '@/app/_lib/debt-schedule';
import { isLiveData } from '@/app/_lib/preview';
import { findCatalogVendor, partyMark } from '@/app/_lib/vendor-brands';
import { MetaChip, formatBookedDate, formatDueDay } from '@/components/features/money/jar-badge';
import { useAuth } from '@/components/features/shell/auth-provider';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';
import { useLocale, useTranslations } from '@rumtelo/i18n';

const EXPENSIVE_RATE = 10;

type DebtListRowProps = {
    debt: Debt;
    merchants: readonly MerchantPreset[];
    payoffRank: number;
    showPayoffRanks: boolean;
    isFocus: boolean;
    markChrome?: { fallbackIcon?: string | null; tone?: string | null };
    /** Live balance when Looking Ahead — shows current → projected. */
    baselineBalance?: number | null;
    clearedByPeriod?: boolean;
    /** e.g. "Oct 2026" when this debt clears on the plan. */
    clearedOnLabel?: string | null;
};

/** Debt card with optional expand for schedule + recent payments (lazy get). */
export function DebtListRow({
    debt,
    merchants,
    payoffRank,
    showPayoffRanks,
    isFocus,
    markChrome,
    baselineBalance = null,
    clearedByPeriod = false,
    clearedOnLabel = null,
}: DebtListRowProps) {
    const { householdId } = useAuth();
    const { formatMoney } = useHouseholdCurrency();
    const appLocale = useLocale();
    const t = useTranslations('features.money.debt');
    const tChips = useTranslations('features.money.chips');
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
    const hint = scheduleHint(
        debt,
        paymentsMade,
        (key, values) => t(`detail.${key}`, values),
        appLocale
    );
    const due = formatDueDay(debt.dueDay, tChips);
    const recent = (detailQuery.data?.payments ?? []).slice(0, 3);
    const showDelta =
        baselineBalance !== null &&
        baselineBalance !== undefined &&
        baselineBalance !== debt.balance &&
        !clearedByPeriod;

    return (
        <div
            className={cn(
                'rounded-2xl border bg-raised transition-colors',
                clearedByPeriod
                    ? 'border-success/35 bg-success/5 opacity-80'
                    : isFocus
                      ? 'border-accent/40 ring-1 ring-accent/15'
                      : 'border-line'
            )}>
            <div className="flex w-full items-start gap-2 p-4.5">
                <Link
                    href={debtDetailHref(debt.id)}
                    aria-label={debt.name}
                    className="min-w-0 flex-1 text-left hover:opacity-90">
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <span className="font-mono text-xs text-accent">
                                {clearedByPeriod
                                    ? '✓'
                                    : showPayoffRanks && payoffRank >= 0
                                      ? `#${payoffRank + 1}`
                                      : '·'}
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
                                    <span
                                        className={cn(
                                            'text-base text-fg',
                                            clearedByPeriod && 'text-fg-muted line-through'
                                        )}>
                                        {debt.name}
                                    </span>
                                    {clearedByPeriod ? (
                                        <Badge tone="success">
                                            {clearedOnLabel
                                                ? t('badge_cleared', { when: clearedOnLabel })
                                                : t('badge_cleared_by_then')}
                                        </Badge>
                                    ) : (
                                        <>
                                            <Badge
                                                tone={
                                                    debt.interestRate >= EXPENSIVE_RATE
                                                        ? 'danger'
                                                        : 'neutral'
                                                }>
                                                {t('interest_badge', { rate: debt.interestRate })}
                                            </Badge>
                                            {isFocus ? (
                                                <Badge tone="success">{t('extra_goes_here')}</Badge>
                                            ) : null}
                                        </>
                                    )}
                                </div>
                                <div className="mt-1 font-mono text-xs tracking-normal text-fg-faint">
                                    {clearedByPeriod
                                        ? clearedOnLabel
                                            ? t('paid_off_plan_when', { when: clearedOnLabel })
                                            : t('paid_off_plan')
                                        : `${t('minimum_per_mo', {
                                              amount: formatMoney(debt.minimumPayment),
                                          })}${
                                              showPayoffRanks
                                                  ? payoffRank === 0
                                                      ? t('payoff_focus_suffix')
                                                      : t('payoff_waiting_suffix')
                                                  : ''
                                          }${hint ? ` · ${hint}` : ''}`}
                                </div>
                            </div>
                        </div>
                        <div className="text-right font-mono text-base text-fg">
                            {clearedByPeriod ? (
                                <>
                                    <div className="text-fg-faint line-through">
                                        {formatMoney(baselineBalance ?? debt.balance)}
                                    </div>
                                    <div className="text-sm text-success">{formatMoney(0)}</div>
                                </>
                            ) : showDelta ? (
                                <>
                                    <div>
                                        <span className="text-fg-faint">
                                            {formatMoney(baselineBalance ?? 0)}
                                        </span>
                                        <span className="mx-1 text-fg-faint">→</span>
                                        <span className="text-success">
                                            {formatMoney(debt.balance)}
                                        </span>
                                    </div>
                                </>
                            ) : (
                                formatMoney(debt.balance)
                            )}
                        </div>
                    </div>
                </Link>
                <button
                    type="button"
                    aria-expanded={open}
                    aria-label={
                        open
                            ? t('hide_payments_aria', { name: debt.name })
                            : t('show_payments_aria', { name: debt.name })
                    }
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
                                {t(
                                    detailQuery.data.paymentsMade === 1
                                        ? 'detail.payments_logged_one'
                                        : 'detail.payments_logged',
                                    { count: detailQuery.data.paymentsMade }
                                )}
                            </MetaChip>
                        ) : (
                            <MetaChip>{t('detail.loading')}</MetaChip>
                        )}
                    </div>
                    {recent.length === 0 && detailQuery.data ? (
                        <Typography as="p" size="sm" color="muted">
                            {t('detail.no_payments_short')}
                        </Typography>
                    ) : (
                        <ul className="grid gap-1.5">
                            {recent.map(tx => (
                                <li
                                    key={tx.id}
                                    className="flex items-center justify-between gap-3 font-mono text-xs text-fg-muted">
                                    <span>{formatBookedDate(tx.bookedOn, appLocale)}</span>
                                    <span className="text-fg">
                                        {formatMoney(Math.abs(tx.amount))}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                    <Link
                        href={debtDetailHref(debt.id)}
                        className="font-mono text-xs font-medium tracking-wide text-accent uppercase hover:underline">
                        {t('detail.open_debt')}
                    </Link>
                </div>
            ) : null}
        </div>
    );
}
