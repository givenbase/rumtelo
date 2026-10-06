'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';

import { useTranslations, type TranslateFn } from '@rumtelo/i18n';
import { Typography } from '@rumtelo/ui';

import { goalDetailHref } from '@/app/_lib/create-routes';
import {
    overviewGoalCurrent,
    overviewGoalProgressPct,
    type OverviewLane,
    type OverviewRow,
} from '@/app/_lib/growth-overview-pick';
import { productPath } from '@/app/_lib/routes';
import { useGrowthOverviewPick } from '@/app/_lib/use-growth-overview-pick';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';
import { GoalKindMark } from '@/components/features/growth/goal-kind-mark';

const LANE_KEY: Record<
    OverviewLane,
    'lane_edu' | 'lane_earn' | 'lane_due_now' | 'lane_due_month' | 'lane_due_on' | 'lane_next'
> = {
    edu: 'lane_edu',
    earn: 'lane_earn',
    due_now: 'lane_due_now',
    due_month: 'lane_due_month',
    due_on: 'lane_due_on',
    next: 'lane_next',
};

function formatWhen(iso: string, locale: string): string {
    const [year, month] = iso.split('-').map(Number);
    if (!year || !month) return iso;
    return new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric' }).format(
        new Date(year, month - 1, 1)
    );
}

function laneCopy(row: OverviewRow, locale: string, t: TranslateFn): string {
    if (row.lane === 'due_on' && row.goal.targetOn) {
        return t('lane_due_on', { when: formatWhen(row.goal.targetOn, locale) });
    }
    return t(LANE_KEY[row.lane]);
}

/** Observe-only stack. Add/edit stays on the Goals pill. */
export function GrowthGoalsStatus() {
    const t = useTranslations('features.growth.hub.overview');
    const locale = useLocale();
    const { formatMoney } = useHouseholdCurrency();
    const { rows, currentNet } = useGrowthOverviewPick();

    return (
        <div className="grid gap-3">
            <Typography as="h2" variant="eyebrow" color="primary">
                {t('eyebrow')}
            </Typography>

            {rows.length === 0 ? (
                <Typography as="p" size="sm" color="muted">
                    {t('empty')}
                </Typography>
            ) : (
                <div className="grid gap-2">
                    {rows.map(row => {
                        const { goal } = row;
                        const pct = overviewGoalProgressPct(goal, currentNet);
                        const current = overviewGoalCurrent(goal, currentNet);
                        const why = laneCopy(row, locale, t);
                        return (
                            <Link
                                key={goal.id}
                                href={goalDetailHref(goal.id)}
                                aria-label={goal.name}
                                className="grid gap-2 rounded-xl border border-line bg-card px-4 py-3.5 transition-colors hover:border-line-strong hover:bg-raised">
                                <span className="flex items-center gap-3">
                                    <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-line bg-raised">
                                        <GoalKindMark goal={goal} merchants={[]} size={18} />
                                    </span>
                                    <span className="grid min-w-0 flex-1 gap-0.5">
                                        <span className="truncate font-medium text-fg">
                                            {goal.name}
                                        </span>
                                        <span className="font-mono text-xs text-fg-faint">
                                            {why} · {formatMoney(current)} /{' '}
                                            {formatMoney(goal.target)}
                                        </span>
                                    </span>
                                    <span className="font-mono text-xs text-fg-muted tabular-nums">
                                        {pct}%
                                    </span>
                                </span>
                                <span
                                    className="h-1 overflow-hidden rounded-full bg-sunken"
                                    aria-hidden>
                                    <span
                                        className="block h-full rounded-full bg-accent"
                                        style={{ width: `${pct}%` }}
                                    />
                                </span>
                            </Link>
                        );
                    })}
                </div>
            )}

            <Link
                href={productPath('growth/goals')}
                className="w-fit font-mono text-xs font-medium text-accent underline-offset-2 hover:underline">
                {t('open_goals')}
            </Link>
        </div>
    );
}
