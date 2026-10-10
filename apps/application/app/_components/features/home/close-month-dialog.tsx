'use client';

import { useState } from 'react';

import type { MonthCloseBillDisposition, MonthCloseDueBill } from '@rumtelo/contracts';
import { FIXED_COST_ARREARS_DEBT_THRESHOLD } from '@rumtelo/contracts';
import { useTranslations } from '@rumtelo/i18n';
import {
    Button,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

type Action = MonthCloseBillDisposition['action'];

/**
 * Close-month bill wizard — skip or carry each unpaid bill before locking the period.
 */
export function CloseMonthDialog({
    open,
    onOpenChange,
    dueBills,
    pending = false,
    formatMoney,
    onConfirm,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    dueBills: readonly MonthCloseDueBill[];
    pending?: boolean;
    formatMoney: (cents: number) => string;
    onConfirm: (dispositions: MonthCloseBillDisposition[]) => void;
}) {
    const t = useTranslations('pages.dashboard');
    const tUi = useTranslations();
    const [actions, setActions] = useState<Record<string, Action>>(() =>
        Object.fromEntries(dueBills.map(bill => [bill.fixedCostId, 'roll']))
    );

    function setAction(fixedCostId: string, action: Action) {
        setActions(previous => ({ ...previous, [fixedCostId]: action }));
    }

    function handleOpenChange(next: boolean) {
        if (next) {
            setActions(Object.fromEntries(dueBills.map(bill => [bill.fixedCostId, 'roll'])));
        }
        onOpenChange(next);
    }

    const ready = dueBills.every(bill => actions[bill.fixedCostId]);

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-lg" closeLabel={tUi('ui.button.actions.close')}>
                <DialogHeader>
                    <DialogTitle>{t('close_bills_title')}</DialogTitle>
                    <DialogDescription>{t('close_bills_body')}</DialogDescription>
                </DialogHeader>

                <ul className="grid max-h-[50vh] gap-3 overflow-y-auto py-1">
                    {dueBills.map(bill => {
                        const action = actions[bill.fixedCostId] ?? 'roll';
                        /** After carrying this month, next open month owes 1 (fresh) + rolled chain. */
                        const nextDueMultiplier = bill.arrearsMonths + 2;
                        return (
                            <li
                                key={bill.fixedCostId}
                                className="rounded-xl border border-line bg-raised/40 px-3.5 py-3">
                                <div className="flex flex-wrap items-baseline justify-between gap-2">
                                    <p className="text-sm font-medium text-fg">{bill.name}</p>
                                    <p className="font-mono text-xs text-fg-muted">
                                        {formatMoney(bill.amount)}
                                    </p>
                                </div>
                                {action === 'roll' ? (
                                    <p className="mt-1 text-xs text-pretty text-fg-secondary">
                                        {bill.arrearsMonths + 1 >= FIXED_COST_ARREARS_DEBT_THRESHOLD
                                            ? t('close_bills_roll_debt_hint', {
                                                  count: bill.arrearsMonths + 1,
                                              })
                                            : t('close_bills_roll_hint', {
                                                  count: nextDueMultiplier,
                                                  due: formatMoney(bill.amount * nextDueMultiplier),
                                              })}
                                    </p>
                                ) : (
                                    <p className="mt-1 text-xs text-pretty text-fg-secondary">
                                        {t('close_bills_skip_hint')}
                                    </p>
                                )}
                                <div className="mt-2.5 flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        data-mutate
                                        disabled={pending}
                                        onClick={() => setAction(bill.fixedCostId, 'roll')}
                                        className={cn(
                                            'rounded-lg border px-2.5 py-1 font-mono text-[10px] font-medium tracking-wide uppercase transition-colors',
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
                                        onClick={() => setAction(bill.fixedCostId, 'skip')}
                                        className={cn(
                                            'rounded-lg border px-2.5 py-1 font-mono text-[10px] font-medium tracking-wide uppercase transition-colors',
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

                <DialogFooter>
                    <Button
                        type="button"
                        variant="ghost"
                        disabled={pending}
                        onClick={() => onOpenChange(false)}>
                        {tUi('ui.button.actions.cancel')}
                    </Button>
                    <Button
                        type="button"
                        data-mutate
                        disabled={!ready || pending}
                        onClick={() => {
                            onConfirm(
                                dueBills.map(bill => ({
                                    fixedCostId: bill.fixedCostId,
                                    action: actions[bill.fixedCostId] ?? 'roll',
                                }))
                            );
                        }}>
                        {pending ? t('closing') : t('close_bills_confirm')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
