'use client';

import { useLocale, useTranslations } from '@rumtelo/i18n';
import {
    Button,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@rumtelo/ui';

import { planLabel, type PlanChangeDiff } from '@/app/_lib/plan';

type PlanChangeDialogProps = {
    open: boolean;
    diff: PlanChangeDiff | null;
    busy?: boolean;
    /** When true, confirm continues to Stripe Checkout (paid upgrade). */
    stripeCheckout?: boolean;
    /** When true, downgrade is scheduled for period end (Stripe live). */
    periodEndDowngrade?: boolean;
    /** ISO date when the current paid period ends (for copy). */
    periodEndsAt?: string | null;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
};

function formatPeriodEnd(iso: string | null | undefined, locale: string): string | null {
    if (!iso) return null;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

function ChangeList({
    title,
    tone,
    items,
}: {
    title: string;
    tone: 'gain' | 'loss';
    items: { name: string; description: string }[];
}) {
    if (items.length === 0) return null;
    return (
        <div className="grid gap-1.5">
            <p
                className={
                    tone === 'gain'
                        ? 'font-mono text-[10px] font-medium tracking-widest text-accent uppercase'
                        : 'font-mono text-[10px] font-medium tracking-widest text-fg-muted uppercase'
                }>
                {title}
            </p>
            {/* Two columns on desktop so Plus/Max unlock lists fit without scrolling. */}
            <ul className="grid gap-1 sm:grid-cols-2 sm:gap-1.5">
                {items.map(item => (
                    <li
                        key={item.name + item.description}
                        className="rounded-md border border-line bg-raised/40 px-2.5 py-1.5">
                        <span className="text-sm font-medium text-fg">{item.name}</span>
                        <p className="text-xs leading-snug text-fg-muted">{item.description}</p>
                    </li>
                ))}
            </ul>
        </div>
    );
}

/** Confirm upgrade / downgrade with capability + limit deltas. */
export function PlanChangeDialog({
    open,
    diff,
    busy = false,
    stripeCheckout = false,
    periodEndDowngrade = false,
    periodEndsAt = null,
    onOpenChange,
    onConfirm,
}: PlanChangeDialogProps) {
    const t = useTranslations();
    const tp = useTranslations('pages.settings.plan');
    const locale = useLocale();

    if (!diff) return null;

    const toLabel = planLabel(diff.to, t);
    const fromLabel = planLabel(diff.from, t);
    const upgrading = diff.direction === 'upgrade';
    const endsLabel = formatPeriodEnd(periodEndsAt, locale);
    const periodFallback = tp('period_end_fallback');

    const confirmLabel = busy
        ? '…'
        : stripeCheckout
          ? tp('confirm_stripe', { plan: toLabel })
          : upgrading
            ? tp('confirm_upgrade', { plan: toLabel })
            : periodEndDowngrade
              ? tp('confirm_schedule', { plan: toLabel })
              : tp('confirm_downgrade', { plan: toLabel });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="max-h-[90dvh] overflow-y-auto sm:max-h-none sm:max-w-xl sm:overflow-visible"
                closeLabel={t('ui.button.actions.close')}>
                <DialogHeader>
                    <DialogTitle>
                        {upgrading
                            ? tp('upgrade_title', { plan: toLabel })
                            : tp('downgrade_title', { plan: toLabel })}
                    </DialogTitle>
                    <DialogDescription>
                        {upgrading
                            ? stripeCheckout
                                ? tp('desc_upgrade_stripe', { from: fromLabel, to: toLabel })
                                : tp('desc_upgrade', { from: fromLabel, to: toLabel })
                            : periodEndDowngrade
                              ? tp('desc_downgrade_period', {
                                    from: fromLabel,
                                    to: toLabel,
                                    ends: endsLabel ?? periodFallback,
                                })
                              : tp('desc_downgrade', { from: fromLabel, to: toLabel })}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-3 py-1 sm:gap-4">
                    <ChangeList title={tp('unlock')} tone="gain" items={diff.gained} />
                    <ChangeList
                        title={
                            periodEndDowngrade
                                ? tp('disabled_after', {
                                      date: endsLabel ?? tp('period_end_short'),
                                  })
                                : tp('disabled_on_plan')
                        }
                        tone="loss"
                        items={diff.lost}
                    />

                    {diff.limitChanges.length > 0 ? (
                        <div className="grid gap-1.5">
                            <p className="font-mono text-[10px] font-medium tracking-widest text-fg-muted uppercase">
                                {tp('limits')}
                            </p>
                            <ul className="grid gap-1">
                                {diff.limitChanges.map(change => (
                                    <li
                                        key={change.label}
                                        className="flex flex-wrap items-baseline gap-x-2 text-xs text-fg-secondary">
                                        <span className="font-medium text-fg">{change.label}</span>
                                        <span className="text-fg-faint">{change.from}</span>
                                        <span aria-hidden>→</span>
                                        <span
                                            className={change.expanded ? 'text-accent' : 'text-fg'}>
                                            {change.to}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : null}

                    {diff.kindNotes.map(note => (
                        <p key={note} className="text-xs leading-snug text-fg-muted">
                            {note}
                        </p>
                    ))}

                    {upgrading && stripeCheckout ? (
                        <p className="rounded-md border border-line bg-surface px-2.5 py-2 text-xs leading-snug text-fg-secondary">
                            {tp('after_pay_note', { plan: toLabel })}
                        </p>
                    ) : null}

                    {!upgrading ? (
                        <p className="rounded-md border border-line bg-surface px-2.5 py-2 text-xs leading-snug text-fg-secondary">
                            {periodEndDowngrade
                                ? tp('downgrade_period_note')
                                : tp('downgrade_lock_note')}
                        </p>
                    ) : null}
                </div>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => onOpenChange(false)}>
                        {t('ui.button.actions.cancel')}
                    </Button>
                    <Button
                        type="button"
                        variant={upgrading ? 'primary' : 'secondary'}
                        disabled={busy}
                        onClick={onConfirm}>
                        {confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
