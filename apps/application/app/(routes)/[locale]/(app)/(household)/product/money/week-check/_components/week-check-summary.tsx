'use client';

import { useTranslations } from '@rumtelo/i18n';
import { Typography } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import type { WeekCheck } from '@rumtelo/contracts';

import { LookStage, type StageJar } from './money-stages';

/**
 * Read-only week check for a VIEWER or a Practice preview: status, the Look recap and the
 * intention. No buttons, no Course, no writes.
 */
export function WeekCheckSummary({
    check,
    jars,
    doneOn,
    formatMoney,
}: {
    check: WeekCheck;
    jars: readonly StageJar[];
    /** Weekday name of the day it was done, or null when open. */
    doneOn: string | null;
    formatMoney: (minor: number) => string;
}) {
    const t = useTranslations('features.money.week_check');
    const done = Boolean(check.completedAt);

    return (
        <div className="grid gap-5">
            <div className="grid justify-items-start gap-2">
                <span
                    className={cn(
                        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold',
                        done
                            ? 'border-accent/30 bg-accent-soft text-accent'
                            : 'border-line bg-raised text-fg-muted'
                    )}>
                    {done && doneOn
                        ? t('summary_status_done', { day: doneOn })
                        : t('summary_status_open')}
                </span>
                <Typography as="p" size="sm" color="muted">
                    {t('summary_read_only')}
                </Typography>
            </div>
            <div className="rounded-2xl border border-line bg-surface p-5 shadow-md sm:p-6">
                <LookStage jars={jars} canAct={false} formatMoney={formatMoney} />
            </div>
            {check.intention ? (
                <div className="rounded-xl border border-line bg-raised px-4 py-3">
                    <Typography as="p" size="xs" color="muted" className="mb-1">
                        {t('done_intention_label')}
                    </Typography>
                    <Typography as="p" size="sm" weight="medium" className="text-pretty">
                        {check.intention}
                    </Typography>
                </div>
            ) : null}
        </div>
    );
}
