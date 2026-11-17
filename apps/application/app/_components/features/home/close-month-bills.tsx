'use client';

import type { MonthCloseBillDisposition, MonthCloseDueBill } from '@rumtelo/contracts';
import { FIXED_COST_ARREARS_DEBT_THRESHOLD } from '@rumtelo/contracts';
import { useTranslations } from '@rumtelo/i18n';
import { cn } from '@rumtelo/utils';

export type BillAction = MonthCloseBillDisposition['action'];

const CHOICE =
    'min-h-11 rounded-lg border px-3 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent/35';

/**
 * The unpaid bills of the month being closed: carry each into next month or skip it.
 * List only. The close flow owns the choices, the buttons and the request. Carry is the
 * default; the two choices are real buttons (`aria-pressed`) 44 px tall.
 */
export function CloseMonthBills({
    bills,
    actions,
    onChange,
    pending = false,
    formatMoney,
}: {
    bills: readonly MonthCloseDueBill[];
    actions: Readonly<Record<string, BillAction>>;
    onChange: (fixedCostId: string, action: BillAction) => void;
    pending?: boolean;
    formatMoney: (cents: number) => string;
}) {
    const t = useTranslations('pages.dashboard');

    return (
        <ul className="grid gap-3 py-1">
            {bills.map(bill => {
                const action = actions[bill.fixedCostId] ?? 'roll';
                /** After carrying this month, next open month owes 1 (fresh) + rolled chain. */
                const nextDueMultiplier = bill.arrearsMonths + 2;
                return (
                    <li
                        key={bill.fixedCostId}
                        className="rounded-xl border border-line bg-raised/40 px-3.5 py-3">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <p className="min-w-0 text-sm font-medium text-pretty text-fg">
                                {bill.name}
                            </p>
                            <p className="font-mono text-xs text-fg-muted">
                                {formatMoney(bill.amount)}
                            </p>
                        </div>
                        <p className="mt-1 text-xs text-pretty text-fg-secondary">
                            {action === 'roll'
                                ? bill.arrearsMonths + 1 >= FIXED_COST_ARREARS_DEBT_THRESHOLD
                                    ? t('close_bills_roll_debt_hint', {
                                          count: bill.arrearsMonths + 1,
                                      })
                                    : t('close_bills_roll_hint', {
                                          count: nextDueMultiplier,
                                          due: formatMoney(bill.amount * nextDueMultiplier),
                                      })
                                : t('close_bills_skip_hint')}
                        </p>
                        <div
                            className="mt-2.5 grid grid-cols-2 gap-2"
                            role="group"
                            aria-label={bill.name}>
                            <button
                                type="button"
                                data-mutate
                                disabled={pending}
                                aria-pressed={action === 'roll'}
                                onClick={() => onChange(bill.fixedCostId, 'roll')}
                                className={cn(
                                    CHOICE,
                                    action === 'roll'
                                        ? 'border-accent bg-accent-soft text-accent'
                                        : 'border-line text-fg-muted hover:border-accent hover:text-accent'
                                )}>
                                {t('close_bills_roll')}
                            </button>
                            <button
                                type="button"
                                data-mutate
                                disabled={pending}
                                aria-pressed={action === 'skip'}
                                onClick={() => onChange(bill.fixedCostId, 'skip')}
                                className={cn(
                                    CHOICE,
                                    action === 'skip'
                                        ? 'border-fg-muted bg-raised text-fg'
                                        : 'border-line text-fg-muted hover:border-fg-muted hover:text-fg'
                                )}>
                                {t('close_bills_skip')}
                            </button>
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}
