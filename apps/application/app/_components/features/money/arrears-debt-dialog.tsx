'use client';

import { useState } from 'react';

import { Cadence, DebtScheduleKind, FIXED_COST_ARREARS_DEBT_THRESHOLD } from '@rumtelo/contracts';
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

export type ArrearsDebtTarget = {
    fixedCostId: string;
    name: string;
    /** Single-month plan amount (minor units). */
    amount: number;
    /** Uncleared carried months (≥ threshold). */
    arrearsMonths: number;
};

/**
 * Register carried fixed-cost months as a debt — collection notice, fees, terms.
 */
export function ArrearsDebtDialog({
    open,
    onOpenChange,
    target,
    pending = false,
    formatMoney,
    parseMoney,
    onConfirm,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    target: ArrearsDebtTarget | null;
    pending?: boolean;
    formatMoney: (cents: number) => string;
    /** Major → minor units for the fees field. */
    parseMoney: (major: string) => number;
    onConfirm: (input: {
        collectionNoticeSent: boolean;
        collectionFees: number;
        scheduleKind: DebtScheduleKind;
        termPayments: number | null;
        maturityOn: string | null;
        paymentCadence: Cadence.MONTHLY;
    }) => void;
}) {
    const t = useTranslations('features.money.fixed');
    const tUi = useTranslations();
    const [noticeSent, setNoticeSent] = useState(false);
    const [feesMajor, setFeesMajor] = useState('');
    const [scheduleKind, setScheduleKind] = useState<DebtScheduleKind>(DebtScheduleKind.TERM);
    const [termPayments, setTermPayments] = useState('3');
    const [maturityOn, setMaturityOn] = useState('');

    if (!target) return null;

    const arrearsBase = target.amount * target.arrearsMonths;
    const fees = noticeSent ? Math.max(0, parseMoney(feesMajor || '0')) : 0;
    const total = arrearsBase + fees;
    const termsOk =
        scheduleKind !== DebtScheduleKind.TERM ||
        (Number(termPayments) >= 1 && Number.isFinite(Number(termPayments)));
    const deadlineOk = scheduleKind !== DebtScheduleKind.DEADLINE || Boolean(maturityOn.trim());
    const ready =
        termsOk && deadlineOk && target.arrearsMonths >= FIXED_COST_ARREARS_DEBT_THRESHOLD;

    function resetAndClose(next: boolean) {
        if (next) {
            setNoticeSent(false);
            setFeesMajor('');
            setScheduleKind(DebtScheduleKind.TERM);
            setTermPayments(String(Math.max(3, target?.arrearsMonths ?? 3)));
            setMaturityOn('');
        }
        onOpenChange(next);
    }

    return (
        <Dialog open={open} onOpenChange={resetAndClose}>
            <DialogContent className="sm:max-w-lg" closeLabel={tUi('ui.button.actions.close')}>
                <DialogHeader>
                    <DialogTitle>{t('arrears_debt_title')}</DialogTitle>
                    <DialogDescription>
                        {t('arrears_debt_body', {
                            name: target.name,
                            count: target.arrearsMonths,
                            amount: formatMoney(arrearsBase),
                        })}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4">
                    <fieldset className="grid gap-2">
                        <legend className="font-mono text-[10px] font-bold tracking-[0.12em] text-fg-muted uppercase">
                            {t('arrears_debt_notice_legend')}
                        </legend>
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                data-mutate
                                disabled={pending}
                                onClick={() => setNoticeSent(true)}
                                className={cn(
                                    'rounded-lg border px-2.5 py-1.5 font-mono text-[10px] font-medium tracking-wide uppercase',
                                    noticeSent
                                        ? 'border-warning bg-warning/10 text-warning'
                                        : 'border-line text-fg-muted hover:border-warning'
                                )}>
                                {t('arrears_debt_notice_yes')}
                            </button>
                            <button
                                type="button"
                                data-mutate
                                disabled={pending}
                                onClick={() => {
                                    setNoticeSent(false);
                                    setFeesMajor('');
                                }}
                                className={cn(
                                    'rounded-lg border px-2.5 py-1.5 font-mono text-[10px] font-medium tracking-wide uppercase',
                                    !noticeSent
                                        ? 'border-accent bg-accent-soft text-accent'
                                        : 'border-line text-fg-muted hover:border-accent'
                                )}>
                                {t('arrears_debt_notice_no')}
                            </button>
                        </div>
                        {noticeSent ? (
                            <label className="grid gap-1">
                                <span className="text-xs text-fg-secondary">
                                    {t('arrears_debt_fees_label')}
                                </span>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={feesMajor}
                                    disabled={pending}
                                    onChange={event => setFeesMajor(event.target.value)}
                                    placeholder="0"
                                    className="h-10 rounded-lg border border-line bg-surface px-3 font-mono text-sm text-fg outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
                                />
                            </label>
                        ) : null}
                    </fieldset>

                    <fieldset className="grid gap-2">
                        <legend className="font-mono text-[10px] font-bold tracking-[0.12em] text-fg-muted uppercase">
                            {t('arrears_debt_schedule_legend')}
                        </legend>
                        <div className="flex flex-wrap gap-2">
                            {(
                                [
                                    DebtScheduleKind.TERM,
                                    DebtScheduleKind.OPEN,
                                    DebtScheduleKind.DEADLINE,
                                ] as const
                            ).map(kind => (
                                <button
                                    key={kind}
                                    type="button"
                                    data-mutate
                                    disabled={pending}
                                    onClick={() => setScheduleKind(kind)}
                                    className={cn(
                                        'rounded-lg border px-2.5 py-1.5 font-mono text-[10px] font-medium tracking-wide uppercase',
                                        scheduleKind === kind
                                            ? 'border-accent bg-accent-soft text-accent'
                                            : 'border-line text-fg-muted hover:border-accent'
                                    )}>
                                    {t(`arrears_debt_schedule_${kind.toLowerCase()}`)}
                                </button>
                            ))}
                        </div>
                        {scheduleKind === DebtScheduleKind.TERM ? (
                            <label className="grid gap-1">
                                <span className="text-xs text-fg-secondary">
                                    {t('arrears_debt_term_payments')}
                                </span>
                                <input
                                    type="number"
                                    min={1}
                                    step={1}
                                    value={termPayments}
                                    disabled={pending}
                                    onChange={event => setTermPayments(event.target.value)}
                                    className="h-10 rounded-lg border border-line bg-surface px-3 font-mono text-sm text-fg outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
                                />
                            </label>
                        ) : null}
                        {scheduleKind === DebtScheduleKind.DEADLINE ? (
                            <label className="grid gap-1">
                                <span className="text-xs text-fg-secondary">
                                    {t('arrears_debt_maturity')}
                                </span>
                                <input
                                    type="date"
                                    value={maturityOn}
                                    disabled={pending}
                                    onChange={event => setMaturityOn(event.target.value)}
                                    className="h-10 rounded-lg border border-line bg-surface px-3 font-mono text-sm text-fg outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
                                />
                            </label>
                        ) : null}
                    </fieldset>

                    <p className="rounded-xl border border-line bg-raised/50 px-3.5 py-3 text-sm text-fg-secondary">
                        {t('arrears_debt_total', { amount: formatMoney(total) })}
                    </p>
                </div>

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
                            onConfirm({
                                collectionNoticeSent: noticeSent,
                                collectionFees: fees,
                                scheduleKind,
                                termPayments:
                                    scheduleKind === DebtScheduleKind.TERM
                                        ? Number(termPayments)
                                        : null,
                                maturityOn:
                                    scheduleKind === DebtScheduleKind.DEADLINE ? maturityOn : null,
                                paymentCadence: Cadence.MONTHLY,
                            });
                        }}>
                        {pending ? t('arrears_debt_pending') : t('arrears_debt_confirm')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
