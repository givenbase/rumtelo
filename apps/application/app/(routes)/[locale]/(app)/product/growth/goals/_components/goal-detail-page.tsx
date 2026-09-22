'use client';

import { apiQuery } from '@/app/_lib/api-hooks';
import Link from 'next/link';
import { useMemo } from 'react';

import type { Goal, GoalProjection } from '@rumtelo/contracts';
import { GoalKind, GoalStatus } from '@rumtelo/contracts';
import { useTranslations, type TranslateFn } from '@rumtelo/i18n';
import { useLiveQuery } from '@rumtelo/hooks';
import { Icon, Button, Card, Meter, Typography } from '@rumtelo/ui';
import {
    earnGoalProgress,
    monthlyNetAsOf,
    describePeriodTravel,
    endOfPeriodIso,
    projectGoalsAtHorizon,
    toPeriodKey,
} from '@rumtelo/utils';

import { createMoveHref, goalDetailHref, updateHref } from '@/app/_lib/create-routes';
import { givingCauseCopy } from '@/app/_lib/giving';
import { isFocusSaveGoal, saveGoalProgressCents, saveGoalRank } from '@/app/_lib/goal-focus';
import { evaluateGoalPace, type GoalPaceVerdict } from '@/app/_lib/goal-pace';
import { bgClassToCssVar } from '@/app/_lib/jar-chrome';
import { jarChrome } from '@/app/_lib/jar-meta';
import { jarKeyToSlug } from '@/app/_lib/jar-slug';
import { isLiveData } from '@/app/_lib/preview';
import { productPath } from '@/app/_lib/routes';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';
import { useJarCatalog } from '@/app/_lib/use-jar-catalog';
import { SaveGoalManifestActions } from '@/components/features/growth/save-goal-manifest-actions';
import { JarBadge, MetaChip, formatBookedDate } from '@/components/features/money/jar-badge';
import { useAuth } from '@/components/features/shell/auth-provider';
import { useAppShell } from '@/components/features/shell/app-shell-context';
import { useLocale } from 'next-intl';

function kindEyebrow(kind: GoalKind, t: TranslateFn): string {
    if (kind === GoalKind.EARN) return t('kind_earn');
    if (kind === GoalKind.GIVE) return t('kind_give');
    return t('kind_save');
}

function kindTint(kind: GoalKind): string {
    if (kind === GoalKind.EARN) return 'var(--color-accent)';
    if (kind === GoalKind.GIVE) return 'var(--color-jar-give)';
    return 'var(--color-jar-lts)';
}

function kindIcon(goal: Goal): string {
    if (goal.icon?.trim()) return goal.icon.trim();
    if (goal.kind === GoalKind.EARN) return '📈';
    if (goal.kind === GoalKind.GIVE) return '💛';
    return '🎯';
}

function formatMonthYear(iso: string | null | undefined, locale: string): string | null {
    if (!iso) return null;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return null;
    return new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric' }).format(date);
}

function todayIso(): string {
    return new Date().toISOString().slice(0, 10);
}

function paceAdvice(input: {
    goal: Goal;
    verdict: GoalPaceVerdict | null;
    projection: GoalProjection | null;
    formatMoney: (amount: number) => string;
    jarName: string | null;
    headroom: number | null;
    siblingCount: number;
    locale: string;
    t: TranslateFn;
}): { title: string; body: string }[] {
    const { goal, verdict, projection, formatMoney, jarName, headroom, siblingCount, locale, t } =
        input;
    const tips: { title: string; body: string }[] = [];

    if (
        goal.status === GoalStatus.REACHED ||
        (goal.saved >= goal.target && goal.kind !== GoalKind.EARN)
    ) {
        tips.push({
            title: t('advice_made_it_title'),
            body: t('advice_made_it_body'),
        });
        return tips;
    }

    if (goal.kind === GoalKind.EARN) {
        tips.push({
            title: t('advice_earn_engine_title'),
            body: t('advice_earn_engine_body'),
        });
        if (projection && !projection.onTrack) {
            tips.push({
                title: t('advice_earn_short_title'),
                body: t('advice_earn_short_body'),
            });
        }
        return tips;
    }

    if (goal.kind === GoalKind.GIVE) {
        tips.push({
            title: t('advice_give_planned_title'),
            body: jarName
                ? t('advice_give_planned_body_jar', { jar: jarName })
                : t('advice_give_planned_body'),
        });
        if (projection && projection.shortfallPerMonth > 0) {
            tips.push({
                title: t('advice_give_gap_title'),
                body: t('advice_give_gap_body', {
                    amount: formatMoney(projection.shortfallPerMonth),
                }),
            });
        }
        return tips;
    }

    if (verdict === 'no-plan' || goal.monthlyContribution <= 0) {
        tips.push({
            title: t('advice_save_amount_title'),
            body: t('advice_save_amount_body'),
        });
    } else if (
        verdict === 'ahead' ||
        (projection?.onTrack && projection.monthsRemaining !== null)
    ) {
        tips.push({
            title: t('advice_save_pace_title'),
            body: projection?.projectedDate
                ? t('advice_save_pace_body_date', {
                      monthly: formatMoney(goal.monthlyContribution),
                      date: formatMonthYear(projection.projectedDate, locale) ?? '',
                  })
                : t('advice_save_pace_body'),
        });
    } else if (verdict === 'behind-room' && headroom !== null && headroom > 0) {
        tips.push({
            title: t('advice_save_room_title'),
            body: t('advice_save_room_body', {
                jar: jarName ?? t('this_jar'),
                amount: formatMoney(headroom),
            }),
        });
    } else if (verdict === 'behind-income' || (projection && !projection.onTrack)) {
        tips.push({
            title: t('advice_save_fuel_title'),
            body:
                projection && projection.shortfallPerMonth > 0
                    ? t('advice_save_fuel_body_gap', {
                          amount: formatMoney(projection.shortfallPerMonth),
                      })
                    : t('advice_save_fuel_body'),
        });
    }

    if (siblingCount > 0 && jarName) {
        tips.push({
            title:
                siblingCount === 1
                    ? t('advice_siblings_title', { count: siblingCount, jar: jarName })
                    : t('advice_siblings_title_plural', { count: siblingCount, jar: jarName }),
            body: t('advice_siblings_body'),
        });
    }

    if (tips.length === 0) {
        tips.push({
            title: t('advice_default_title'),
            body: t('advice_default_body'),
        });
    }

    return tips;
}

/**
 * Goal detail — progress, pace, jar context, and plain advice.
 * List stays compact; this page is where motivation and next steps live.
 */
export function GoalDetailPageClient({ goalId }: { goalId: string }) {
    const { householdId } = useAuth();
    const { period } = useAppShell();
    const { formatMoney } = useHouseholdCurrency();
    const t = useTranslations();
    const td = useTranslations('features.growth.goals.detail');
    const tGoals = useTranslations('features.growth.goals');
    const tAction = useTranslations('common.action');
    const locale = useLocale();
    const live = isLiveData(householdId);
    const { byKey: jarByKey } = useJarCatalog();

    const goalsQuery = useLiveQuery(
        apiQuery.money.goals.list.queryOptions({ input: { householdId: householdId! } }),
        [] as never,
        live
    );
    const projectionsQuery = useLiveQuery(
        apiQuery.money.goals.projections.queryOptions({ input: { householdId: householdId! } }),
        [] as never,
        live
    );
    const jarsQuery = useLiveQuery(
        apiQuery.money.jars.list.queryOptions({ input: { householdId: householdId! } }),
        [] as never,
        live
    );
    const balancesQuery = useLiveQuery(
        apiQuery.money.jars.balances.queryOptions({ input: { householdId: householdId! } }),
        [] as never,
        live
    );
    const incomeQuery = useLiveQuery(
        apiQuery.money.income.list.queryOptions({ input: { householdId: householdId! } }),
        [],
        live
    );

    const goal = (goalsQuery.data ?? []).find(row => row.id === goalId);
    const projection = (projectionsQuery.data ?? []).find(row => row.goalId === goalId) ?? null;
    const currentNet = useMemo(
        () => monthlyNetAsOf(incomeQuery.data ?? [], todayIso()),
        [incomeQuery.data]
    );

    if (live && goalsQuery.isLoading && !goal) {
        return (
            <Typography as="p" size="sm" color="muted">
                {td('loading')}
            </Typography>
        );
    }

    if (!goal) {
        return (
            <div className="grid gap-4">
                <Link
                    href="/product/growth/goals"
                    className="w-fit font-mono text-xs font-medium tracking-wide text-fg-faint uppercase hover:text-accent">
                    {td('back')}
                </Link>
                <Typography as="p" size="sm" color="muted">
                    {td('not_found')}
                </Typography>
            </div>
        );
    }

    const jar = goal.jarId ? (jarsQuery.data ?? []).find(row => row.id === goal.jarId) : undefined;
    const jarBalance = jar ? (balancesQuery.data ?? []).find(row => row.id === jar.id) : undefined;
    const jarHref = jar?.key ? `/product/money/jars/${jarKeyToSlug(jar.key)}` : null;
    const jarIcon =
        jar?.icon?.trim() || (jar?.key ? jarByKey.get(jar.key)?.icon?.trim() : null) || '◇';
    const jarTone = jar?.key ? bgClassToCssVar(jarChrome(jar.key).color) : null;

    const siblings = (goalsQuery.data ?? []).filter(
        row =>
            row.id !== goal.id &&
            row.jarId === goal.jarId &&
            row.jarId !== null &&
            row.status !== GoalStatus.ARCHIVED &&
            row.status !== GoalStatus.REACHED &&
            row.kind === GoalKind.SAVE
    );
    const siblingPlanned = siblings.reduce((sum, row) => sum + row.monthlyContribution, 0);

    const isEarn = goal.kind === GoalKind.EARN;
    const earn = isEarn ? earnGoalProgress({ target: goal.target, currentNet }) : null;
    const isFocus =
        goal.kind === GoalKind.SAVE ? isFocusSaveGoal(goal, goalsQuery.data ?? []) : false;
    const rank = goal.kind === GoalKind.SAVE ? saveGoalRank(goal, goalsQuery.data ?? []) : null;
    const current = isEarn
        ? earn!.current
        : goal.kind === GoalKind.SAVE
          ? saveGoalProgressCents({
                goal,
                isFocus,
                jarAvailableCents: jarBalance?.available,
            })
          : goal.saved;
    const travel = describePeriodTravel(period);
    const periodKey = toPeriodKey(period.year, period.month);
    const atPeriod =
        travel.direction === 'current' || isEarn
            ? null
            : (projectGoalsAtHorizon({
                  monthsDelta: travel.monthsDelta,
                  direction: travel.direction,
                  selectedPeriodEndIso: endOfPeriodIso(periodKey),
                  goals: [
                      {
                          id: goal.id,
                          name: goal.name,
                          jarKey: jar?.key ?? null,
                          kind: goal.kind,
                          status: goal.status,
                          saved: goal.saved,
                          target: goal.target,
                          monthlyContribution: goal.monthlyContribution,
                          targetOn: goal.targetOn,
                          fulfilledOn: goal.fulfilledOn,
                      },
                  ],
              })[0] ?? null);
    const shown = atPeriod?.projectedSaved ?? current;
    const reachedByThen = atPeriod?.fulfilledByPeriod === true;
    const reachedMonth = atPeriod?.reachedOn ? formatMonthYear(atPeriod.reachedOn, locale) : null;
    const progress = goal.target > 0 ? Math.min(1, Math.max(0, shown / goal.target)) : 0;
    const remaining = Math.max(0, goal.target - shown);
    const reached =
        goal.status === GoalStatus.REACHED ||
        (isEarn ? earn!.reached : goal.saved >= goal.target) ||
        reachedByThen;

    const wantMonths =
        goal.targetOn !== null
            ? Math.max(
                  1,
                  (new Date(goal.targetOn).getUTCFullYear() - new Date().getUTCFullYear()) * 12 +
                      (new Date(goal.targetOn).getUTCMonth() - new Date().getUTCMonth())
              )
            : projection?.monthsRemaining && projection.monthsRemaining > 0
              ? projection.monthsRemaining
              : 12;

    const pace =
        goal.kind === GoalKind.SAVE && jarBalance
            ? evaluateGoalPace({
                  simIncomeCents: currentNet,
                  goal,
                  jar: {
                      name: jarBalance.name,
                      percentage: jarBalance.percentage,
                      committedOut: jarBalance.committedOut,
                  },
                  siblingPlannedCents: siblingPlanned,
                  wantMonths,
              })
            : null;

    const advice = paceAdvice({
        goal,
        verdict: pace?.verdict ?? null,
        projection,
        formatMoney,
        jarName: jar?.name ?? null,
        headroom: pace?.jarHeadroomCents ?? null,
        siblingCount: siblings.length,
        locale,
        t: td,
    });

    const related: Array<{ title: string; subtitle: string; href: string }> = [];
    if (jarHref && jar) {
        related.push({
            title: jar.name,
            subtitle: td('open_jar'),
            href: jarHref,
        });
    }
    if (goal.kind === GoalKind.GIVE) {
        related.push({
            title: td('giving'),
            subtitle: td('giving_sub'),
            href: productPath('soul/giving'),
        });
    }
    if (goal.kind === GoalKind.EARN) {
        related.push({
            title: td('income'),
            subtitle: td('income_sub'),
            href: productPath('growth/income'),
        });
    }
    if (jar && goal.kind === GoalKind.SAVE) {
        related.push({
            title: td('move_money'),
            subtitle: td('feed_jar', { name: jar.name }),
            href: createMoveHref({
                returnTo: goalDetailHref(goal.id),
            }),
        });
    }

    return (
        <div className="grid animate-rise gap-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="grid gap-3">
                    <Link
                        href="/product/growth/goals"
                        className="w-fit font-mono text-xs font-medium tracking-wide text-fg-faint uppercase hover:text-accent">
                        {td('back')}
                    </Link>
                    <div className="flex items-start gap-3">
                        <span
                            className="grid size-10 shrink-0 place-items-center rounded-xl border border-line text-xl"
                            style={{
                                background: kindTint(goal.kind),
                                color: 'var(--color-on-accent)',
                            }}
                            aria-hidden>
                            {kindIcon(goal)}
                        </span>
                        <div>
                            <p className="font-mono text-[10px] tracking-widest text-fg-muted uppercase">
                                {kindEyebrow(goal.kind, td)}
                            </p>
                            <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-fg">
                                {goal.name}
                            </h1>
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {householdId && goal.kind === GoalKind.SAVE ? (
                        <SaveGoalManifestActions
                            goal={goal}
                            allGoals={goalsQuery.data ?? []}
                            householdId={householdId}
                            jarAvailableCents={jarBalance?.available ?? null}
                            formatMoney={formatMoney}
                        />
                    ) : null}
                    <Button as={Link} href={updateHref('goal', goal.id)} variant="secondary">
                        <Icon name="pencil" size="sm" />
                        {tAction('edit')}
                    </Button>
                </div>
            </div>

            <Card className="grid gap-4 p-5">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <p className="font-mono text-[10px] tracking-wider text-fg-muted uppercase">
                            {goal.kind === GoalKind.SAVE && isFocus && !reached
                                ? td('jar_toward_focus')
                                : td('progress')}
                        </p>
                        <div className="mt-1 flex flex-wrap items-baseline gap-2">
                            {atPeriod && atPeriod.projectedSaved !== current ? (
                                <span className="text-2xl font-semibold tracking-tight">
                                    <span className="text-fg-faint">{formatMoney(current)}</span>
                                    <span className="mx-1 text-fg-faint">→</span>
                                    <span className="text-success">{formatMoney(shown)}</span>
                                </span>
                            ) : (
                                <span className="text-2xl font-semibold text-accent">
                                    {formatMoney(current)}
                                </span>
                            )}
                            <span className="font-mono text-xs text-fg-muted">
                                {tGoals('of')} {formatMoney(goal.target)}
                                {isEarn ? tGoals('per_month') : ''}
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {rank !== null && !reached ? (
                            <MetaChip className="border-accent/30 text-accent">
                                {isFocus ? td('focus_rank') : td('rank', { rank })}
                            </MetaChip>
                        ) : null}
                        <MetaChip
                            className={
                                reached
                                    ? 'border-success/30 text-success'
                                    : projection?.onTrack === false
                                      ? 'border-danger/30 text-danger'
                                      : 'border-success/30 text-success'
                            }>
                            {reachedByThen && reachedMonth
                                ? td('reached_month', { month: reachedMonth })
                                : reached
                                  ? td('reached')
                                  : projection?.onTrack === false
                                    ? td('needs_attention')
                                    : td('on_track')}
                        </MetaChip>
                        <MetaChip>{Math.round(progress * 100)}%</MetaChip>
                    </div>
                </div>
                <Meter value={progress} />
                <p className="font-mono text-xs text-fg-muted">
                    {reachedByThen && reachedMonth
                        ? td('reached_marker', { when: reachedMonth })
                        : reached
                          ? goal.fulfilledOn
                              ? td('reached_marker', {
                                    when: formatBookedDate(goal.fulfilledOn, locale),
                                })
                              : td('target_met')
                          : isEarn
                            ? td('earn_remaining', { amount: formatMoney(remaining) })
                            : goal.kind === GoalKind.GIVE
                              ? td('give_remaining', {
                                    amount: formatMoney(remaining),
                                    by: goal.targetOn
                                        ? td('give_by', { year: goal.targetOn.slice(0, 4) })
                                        : '',
                                })
                              : td('save_pace', {
                                    monthly: formatMoney(goal.monthlyContribution),
                                    date:
                                        formatMonthYear(projection?.projectedDate, locale) ??
                                        formatMonthYear(goal.targetOn, locale) ??
                                        td('date_open'),
                                })}
                </p>
                {goal.why?.trim() ? (
                    <p className="border-t border-line pt-4 text-sm leading-relaxed text-fg-secondary italic">
                        “{goal.why.trim()}”
                    </p>
                ) : null}
            </Card>

            {jar && goal.kind !== GoalKind.EARN ? (
                <Card className="grid gap-4 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="font-mono text-[10px] tracking-wider text-fg-muted uppercase">
                            {td('jar_context')}
                        </p>
                        {jarHref ? (
                            <Link
                                href={jarHref}
                                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-raised py-0.5 pr-2 pl-1 outline-none hover:border-accent-hover focus-visible:ring-2 focus-visible:ring-accent/25">
                                <span
                                    className="grid size-5 place-items-center rounded-md text-[11px]"
                                    style={
                                        jarTone
                                            ? { background: jarTone }
                                            : { background: 'var(--color-raised)' }
                                    }
                                    aria-hidden>
                                    {jarIcon}
                                </span>
                                <JarBadge
                                    jarKey={jar.key}
                                    name={jar.name}
                                    className="border-0 bg-transparent p-0"
                                />
                            </Link>
                        ) : (
                            <JarBadge jarKey={jar.key} name={jar.name} />
                        )}
                    </div>
                    <dl className="grid gap-3 text-sm sm:grid-cols-3">
                        {jarBalance ? (
                            <>
                                <div>
                                    <dt className="font-mono text-[10px] tracking-wide text-fg-faint uppercase">
                                        {td('available')}
                                    </dt>
                                    <dd className="mt-0.5 font-mono text-fg">
                                        {formatMoney(jarBalance.available)}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="font-mono text-[10px] tracking-wide text-fg-faint uppercase">
                                        {td('fixed_out')}
                                    </dt>
                                    <dd className="mt-0.5 font-mono text-fg">
                                        {formatMoney(jarBalance.committedOut)}
                                    </dd>
                                </div>
                            </>
                        ) : null}
                        {pace?.jarHeadroomCents !== null && pace?.jarHeadroomCents !== undefined ? (
                            <div>
                                <dt className="font-mono text-[10px] tracking-wide text-fg-faint uppercase">
                                    {td('headroom')}
                                </dt>
                                <dd
                                    className={`mt-0.5 font-mono ${
                                        pace.jarHeadroomCents >= 0 ? 'text-success' : 'text-danger'
                                    }`}>
                                    {formatMoney(pace.jarHeadroomCents)}
                                </dd>
                            </div>
                        ) : null}
                    </dl>
                    {siblings.length > 0 ? (
                        <div className="grid gap-2 border-t border-line pt-3">
                            <p className="font-mono text-[10px] tracking-wide text-fg-faint uppercase">
                                {td('other_goals')}
                            </p>
                            <ul className="grid gap-1.5">
                                {siblings.map(sibling => {
                                    const pct =
                                        sibling.target > 0
                                            ? Math.round(
                                                  Math.min(1, sibling.saved / sibling.target) * 100
                                              )
                                            : 0;
                                    return (
                                        <li key={sibling.id}>
                                            <Link
                                                href={goalDetailHref(sibling.id)}
                                                className="flex w-full items-center justify-between gap-3 rounded-lg border border-line px-3 py-2 text-left hover:border-accent-hover hover:bg-raised">
                                                <span className="truncate text-sm text-fg">
                                                    {sibling.icon ? `${sibling.icon} ` : ''}
                                                    {sibling.name}
                                                </span>
                                                <span className="shrink-0 font-mono text-[11px] text-fg-muted">
                                                    {pct}%
                                                </span>
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ) : null}
                </Card>
            ) : null}

            <section className="grid gap-3">
                <Typography as="h2" variant="eyebrow" color="primary">
                    {td('how_to_get_there')}
                </Typography>
                <div className="grid gap-3">
                    {advice.map(tip => (
                        <Card key={tip.title} className="grid gap-1.5 p-5">
                            <p className="text-sm font-medium text-fg">{tip.title}</p>
                            <p className="text-sm leading-relaxed text-fg-secondary">{tip.body}</p>
                        </Card>
                    ))}
                </div>
            </section>

            {related.length > 0 ? (
                <section className="grid gap-3">
                    <Typography as="h2" variant="eyebrow" color="primary">
                        {td('opportunities')}
                    </Typography>
                    <Card className="p-0">
                        {related.map(item => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="flex w-full items-center justify-between gap-3 border-b border-line px-5 py-4 text-left last:border-b-0 hover:bg-raised">
                                <span>
                                    <span className="block text-sm text-fg">{item.title}</span>
                                    <span className="mt-0.5 block font-mono text-[11px] text-fg-faint">
                                        {item.subtitle}
                                    </span>
                                </span>
                                <span className="font-mono text-xs text-accent uppercase">
                                    {td('open_link')}
                                </span>
                            </Link>
                        ))}
                    </Card>
                </section>
            ) : null}

            <Card className="grid gap-3 p-5">
                <p className="font-mono text-[10px] tracking-wider text-fg-muted uppercase">
                    {td('plan')}
                </p>
                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                    {!isEarn ? (
                        <div>
                            <dt className="font-mono text-[10px] tracking-wide text-fg-faint uppercase">
                                {td('monthly')}
                            </dt>
                            <dd className="mt-0.5 text-fg">
                                {formatMoney(goal.monthlyContribution)}
                            </dd>
                        </div>
                    ) : null}
                    {goal.targetOn ? (
                        <div>
                            <dt className="font-mono text-[10px] tracking-wide text-fg-faint uppercase">
                                {td('target_date')}
                            </dt>
                            <dd className="mt-0.5 text-fg">
                                {formatBookedDate(goal.targetOn, locale)}
                            </dd>
                        </div>
                    ) : null}
                    {projection?.projectedDate ? (
                        <div>
                            <dt className="font-mono text-[10px] tracking-wide text-fg-faint uppercase">
                                {td('at_current_pace')}
                            </dt>
                            <dd className="mt-0.5 text-fg">
                                {formatMonthYear(projection.projectedDate, locale)}
                            </dd>
                        </div>
                    ) : null}
                    {goal.cause ? (
                        <div>
                            <dt className="font-mono text-[10px] tracking-wide text-fg-faint uppercase">
                                {td('cause')}
                            </dt>
                            <dd className="mt-0.5 text-fg">
                                {givingCauseCopy(t, goal.cause).name}
                            </dd>
                        </div>
                    ) : null}
                </dl>
            </Card>
        </div>
    );
}
