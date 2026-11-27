'use client';

import { useId } from 'react';
import Link from 'next/link';

import { HouseholdPermissionSection, HouseholdRole, roleCanSee } from '@rumtelo/contracts';
import type { WorkSituation, YearIntention } from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { useLocale, useTranslations } from '@rumtelo/i18n';
import { Typography } from '@rumtelo/ui';
import { cn, currentPeriod } from '@rumtelo/utils';

import { apiQuery } from '@/app/_lib/api-hooks';
import { formatShare, GROUP_CHROME } from '@/app/_lib/jar-group';
import { CAPABILITIES } from '@/app/_lib/plan';
import { isLiveData } from '@/app/_lib/preview';
import { moneyPath } from '@/app/_lib/routes';
import { useBoardWriteAccess } from '@/app/_lib/use-board-write-access';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';
import { useJarName } from '@/app/_lib/use-jar-name';
import { useAuth } from '@/components/features/shell/auth-provider';
import { usePlanCapabilities } from '@/components/features/shell/use-plan-capabilities';
import { monthYearOf } from '@/product/growth/course/_utils/course-goals';

import { buildDirectionNow } from '../_utils/direction-now';

/**
 * Where you are now: read from the board, never asked, and neutral (no score, no verdict).
 * The split of this month per group, what the Buffer holds, the debt-free date when there are
 * debts. Below it, quietly, what the person told us in the Course wizard.
 */
export function DirectionNow({
    workSituation,
    yearIntention,
}: {
    workSituation: WorkSituation | null;
    yearIntention: YearIntention | null;
}) {
    const t = useTranslations('features.soul.direction');
    const tNow = useTranslations('features.soul.direction.now');
    const tPlan = useTranslations('features.growth.course.plan');
    const tGroups = useTranslations('features.money.groups');
    const locale = useLocale();
    const headingId = useId();
    const { householdId } = useAuth();
    const { role } = useBoardWriteAccess();
    const { hasCapability } = usePlanCapabilities();
    const { formatMoney } = useHouseholdCurrency();
    const jarName = useJarName();

    const canSeeMoney = roleCanSee(role, HouseholdPermissionSection.MONEY);
    const query = useLiveQuery(
        apiQuery.money.dashboard.get.queryOptions({
            // Always today's month: the heading says "this month", whatever month the board is showing.
            input: { householdId: householdId!, period: currentPeriod() },
        }),
        null,
        isLiveData(householdId) && canSeeMoney
    );

    const told = [
        workSituation ? tPlan(`work_${workSituation}`) : null,
        yearIntention ? tPlan(`intention_${yearIntention}`) : null,
    ].filter((label): label is string => label !== null);

    // A role without Money keeps the person's own words and nothing from the board.
    if (!canSeeMoney && told.length === 0) return null;

    const dashboard = query.data;
    const now = dashboard
        ? buildDirectionNow({
              jars: dashboard.jars,
              incomeTotal: dashboard.incomeTotal,
              debtFreeOn: dashboard.debtFreeOn,
              // Debt follows the plan and the role, like the Debt page does.
              includeDebt: hasCapability(CAPABILITIES.moneyDebt),
          })
        : null;
    const canAddIncome = role !== HouseholdRole.VIEWER;
    const debtFreeLabel = now?.kind === 'split' ? monthYearOf(now.debtFreeOn, locale) : null;
    const bufferJar =
        now?.kind === 'split' && now.buffer
            ? dashboard?.jars.find(jar => jar.key === now.buffer?.jarKey)
            : undefined;

    return (
        <section
            aria-labelledby={headingId}
            aria-busy={canSeeMoney && query.isPending}
            className="grid min-w-0 gap-3 rounded-2xl border border-line bg-raised p-4 sm:p-5">
            <div className="grid gap-1">
                <Typography as="h2" id={headingId} className="text-pretty">
                    {tNow('title')}
                </Typography>
                <Typography as="p" size="sm" color="muted" className="text-pretty">
                    {tNow('lead')}
                </Typography>
            </div>

            {canSeeMoney ? (
                query.isPending ? (
                    <div aria-hidden className="grid gap-2">
                        {[0, 1, 2].map(row => (
                            <div key={row} className="h-9 animate-pulse rounded-lg bg-surface" />
                        ))}
                    </div>
                ) : query.isError || !now ? (
                    <p role="alert" className="text-sm text-pretty text-fg-muted">
                        {t('load_error')}
                    </p>
                ) : now.kind === 'no_income' ? (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="min-w-0 text-sm text-pretty text-fg-secondary">
                            {canAddIncome ? tNow('no_income_writer') : tNow('no_income_viewer')}
                        </p>
                        {canAddIncome ? (
                            <Link
                                href={moneyPath('income')}
                                className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-line-strong px-4 text-sm font-semibold text-fg hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
                                {tNow('no_income_cta')}
                            </Link>
                        ) : null}
                    </div>
                ) : (
                    <div className="grid gap-3">
                        <div className="grid gap-1.5">
                            <p className="font-mono text-xs tracking-wide text-fg-muted uppercase">
                                {tNow('split_title')}
                            </p>
                            <ul className="grid gap-1.5">
                                {now.groups.map(row => (
                                    <li
                                        key={row.group}
                                        className="flex min-h-9 min-w-0 items-center justify-between gap-3 rounded-lg bg-surface px-3 py-1.5 text-sm">
                                        <span className="flex min-w-0 items-center gap-2">
                                            <span
                                                aria-hidden
                                                className={cn(
                                                    'size-2.5 shrink-0 rounded-full',
                                                    GROUP_CHROME[row.group].color
                                                )}
                                            />
                                            <span className="min-w-0 text-pretty">
                                                {tGroups(`${row.group}.title`)}
                                            </span>
                                        </span>
                                        <span className="shrink-0 text-right font-mono tabular-nums">
                                            {formatShare(row.percent, locale)}%
                                            <span className="ml-2 text-fg-muted">
                                                {formatMoney(row.allocated)}
                                            </span>
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        {now.buffer && bufferJar ? (
                            <p className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 text-sm">
                                <span className="min-w-0 text-pretty text-fg-secondary">
                                    {tNow('buffer_row', {
                                        pot: jarName(bufferJar),
                                    })}
                                </span>
                                <span className="shrink-0 font-mono tabular-nums">
                                    {formatMoney(now.buffer.saved)}
                                </span>
                            </p>
                        ) : null}
                        {debtFreeLabel ? (
                            <p className="text-sm text-pretty text-fg-secondary">
                                {tNow('debt_free_row', { date: debtFreeLabel })}
                            </p>
                        ) : null}
                    </div>
                )
            ) : null}

            {told.length > 0 ? (
                <p className="text-sm text-pretty text-fg-muted">
                    {tNow('you_told_us', { summary: told.join(' · ') })}
                </p>
            ) : null}
        </section>
    );
}
