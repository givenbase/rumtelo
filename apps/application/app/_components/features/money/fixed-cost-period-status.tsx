'use client';

import { useState } from 'react';

import { FixedCostPeriodStatus } from '@rumtelo/contracts';
import { cn } from '@rumtelo/utils';

import type { FixedCostStatus } from '@/app/_lib/fixed-cost-match';

const META_CHIP =
    'inline-flex min-h-6 items-center rounded-full border px-2.5 py-1 font-mono text-[10px] font-medium tracking-wide uppercase';
const CHIP_FOCUS =
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

type Labels = {
    taken: string;
    due: string;
    skipped: string;
    rolled?: string;
    planned: string;
    markPaidAria: string;
    /** Second-tap label — two-click confirm before mark-paid. */
    markPaidConfirm: string;
    markPaidPending?: string;
};

/**
 * Period status pill — same control on the fixed-cost list and detail.
 * Due is a two-tap mark-paid control; other states are read-only chips.
 */
export function FixedCostPeriodStatusControl({
    status,
    labels,
    canMarkPaid = false,
    pending = false,
    onMarkPaid,
    className,
}: {
    status: FixedCostStatus;
    labels: Labels;
    canMarkPaid?: boolean;
    pending?: boolean;
    onMarkPaid?: () => void;
    className?: string;
}) {
    const [armed, setArmed] = useState(false);

    if (status === FixedCostPeriodStatus.TAKEN) {
        return (
            <span className={cn(META_CHIP, 'border-success bg-success/5 text-success', className)}>
                {labels.taken}
            </span>
        );
    }
    if (status === FixedCostPeriodStatus.DUE) {
        if (canMarkPaid && onMarkPaid) {
            return (
                <button
                    type="button"
                    data-mutate
                    disabled={pending}
                    aria-busy={pending || undefined}
                    title={armed ? labels.markPaidConfirm : labels.markPaidAria}
                    aria-label={armed ? labels.markPaidConfirm : labels.markPaidAria}
                    onBlur={() => setArmed(false)}
                    onClick={() => {
                        if (!armed) {
                            setArmed(true);
                            return;
                        }
                        setArmed(false);
                        onMarkPaid();
                    }}
                    className={cn(
                        META_CHIP,
                        CHIP_FOCUS,
                        'cursor-pointer transition-colors active:scale-[0.98] disabled:cursor-wait',
                        armed
                            ? 'border-accent bg-accent-soft text-accent hover:bg-accent/15'
                            : 'border-danger bg-danger/5 text-danger hover:bg-danger/15',
                        className
                    )}>
                    {pending
                        ? (labels.markPaidPending ?? labels.markPaidConfirm)
                        : armed
                          ? labels.markPaidConfirm
                          : labels.due}
                </button>
            );
        }
        return (
            <span className={cn(META_CHIP, 'border-danger bg-danger/5 text-danger', className)}>
                {labels.due}
            </span>
        );
    }
    if (status === FixedCostPeriodStatus.SKIPPED) {
        return (
            <span className={cn(META_CHIP, 'border-fg-muted bg-raised text-fg-muted', className)}>
                {labels.skipped}
            </span>
        );
    }
    if (status === FixedCostPeriodStatus.ROLLED) {
        return (
            <span className={cn(META_CHIP, 'border-warning bg-warning/8 text-warning', className)}>
                {labels.rolled ?? labels.skipped}
            </span>
        );
    }
    return (
        <span className={cn(META_CHIP, 'border-line bg-raised text-fg-muted', className)}>
            {labels.planned}
        </span>
    );
}
