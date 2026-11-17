'use client';

import Link from 'next/link';

import { useTranslations } from '@rumtelo/i18n';
import { Button, Eyebrow, Typography } from '@rumtelo/ui';

export type DoneAllocation = { jarId: string; name: string; amount: number };

/** The Done summary: what moved, the intention, next week's three. */
export function WeekCheckDone({
    weekNumber,
    allocations,
    intention,
    nextThree,
    offerCourse,
    formatMoney,
    onPlanCourse,
    onLookAgain,
}: {
    weekNumber: number;
    allocations: readonly DoneAllocation[];
    intention: string;
    nextThree: readonly string[];
    /** Course part still open for a Plus or Max writer ("Plan Course anyway"). */
    offerCourse: boolean;
    formatMoney: (minor: number) => string;
    onPlanCourse: () => void;
    onLookAgain: () => void;
}) {
    const t = useTranslations('features.money.week_check');

    return (
        <div className="grid gap-5">
            <div className="animate-rise rounded-2xl border border-line bg-surface p-5 shadow-md sm:p-6">
                <Eyebrow>{t('done_eyebrow')}</Eyebrow>
                <Typography as="h2" className="mt-1.5">
                    {t('done_title', { week: weekNumber })}
                </Typography>
                <Typography as="p" size="sm" color="muted" className="mt-1">
                    {t('done_lead')}
                </Typography>

                <div className="mt-5 grid gap-3">
                    {allocations.length > 0 ? (
                        <div className="rounded-xl border border-line bg-raised px-4 py-3">
                            <Typography as="p" size="xs" color="muted" className="mb-1">
                                {t('done_allocations_label')}
                            </Typography>
                            <ul className="grid gap-1">
                                {allocations.map(allocation => (
                                    <li
                                        key={allocation.jarId}
                                        className="flex min-w-0 items-baseline justify-between gap-3 text-sm">
                                        <span className="min-w-0 text-pretty">
                                            {allocation.name}
                                        </span>
                                        <span className="shrink-0 font-mono tabular-nums">
                                            {formatMoney(allocation.amount)}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : null}
                    {intention ? (
                        <div className="rounded-xl border border-line bg-raised px-4 py-3">
                            <Typography as="p" size="xs" color="muted" className="mb-1">
                                {t('done_intention_label')}
                            </Typography>
                            <Typography as="p" size="sm" weight="medium" className="text-pretty">
                                {intention}
                            </Typography>
                        </div>
                    ) : null}
                    {nextThree.length > 0 ? (
                        <div className="rounded-xl border border-line bg-raised px-4 py-3">
                            <Typography as="p" size="xs" color="muted" className="mb-1">
                                {t('done_next_three_label')}
                            </Typography>
                            <ul className="grid gap-1 text-sm">
                                {nextThree.map(name => (
                                    <li key={name} className="min-w-0 text-pretty">
                                        {name}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : null}
                    {offerCourse ? (
                        <div className="grid justify-items-start gap-2 rounded-xl border border-line bg-raised px-4 py-3">
                            <Typography as="p" size="sm" color="muted">
                                {t('done_course_open')}
                            </Typography>
                            <Button
                                type="button"
                                variant="secondary"
                                className="h-12 sm:h-10"
                                onClick={onPlanCourse}>
                                {t('done_course_open_cta')}
                            </Button>
                        </div>
                    ) : null}
                </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3">
                <Button
                    type="button"
                    variant="ghost"
                    className="h-12 sm:h-10"
                    onClick={onLookAgain}>
                    {t('look_again')}
                </Button>
                <Button as={Link} href="/" className="h-12 sm:h-10">
                    {t('done_home')}
                </Button>
            </div>
        </div>
    );
}
