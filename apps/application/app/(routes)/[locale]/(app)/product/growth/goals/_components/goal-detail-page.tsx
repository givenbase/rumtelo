'use client';

import { apiQuery } from '@/app/_lib/api-hooks';
import Link from 'next/link';
import { useMemo } from 'react';

import type { Goal, GoalProjection } from '@rumtelo/contracts';
import { GoalKind, GoalStatus } from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { Button, Card, Meter, Typography } from '@rumtelo/ui';
import { earnGoalProgress, monthlyNetAsOf } from '@rumtelo/utils';

import { createMoveHref, goalDetailHref, updateHref } from '@/app/_lib/create-routes';
import { evaluateGoalPace, type GoalPaceVerdict } from '@/app/_lib/goal-pace';
import { bgClassToCssVar } from '@/app/_lib/jar-chrome';
import { jarChrome } from '@/app/_lib/jar-meta';
import { jarKeyToSlug } from '@/app/_lib/jar-slug';
import { isLiveData } from '@/app/_lib/preview';
import { productPath } from '@/app/_lib/routes';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';
import { useJarCatalog } from '@/app/_lib/use-jar-catalog';
import {
    JarBadge,
    MetaChip,
    formatBookedDate,
} from '@/components/features/money/jar-badge';
import { useAuth } from '@/components/features/shell/auth-provider';
import { EditIcon } from '@/components/features/ui/action-icons';

const EN_MONTHS = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
] as const;

function kindEyebrow(kind: GoalKind): string {
    if (kind === GoalKind.EARN) return 'Earn · monthly net';
    if (kind === GoalKind.GIVE) return 'Give · yearly pledge';
    return 'Save · toward a jar';
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

function formatMonthYear(iso: string | null | undefined): string | null {
    if (!iso) return null;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return null;
    return `${EN_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

function todayIso(): string {
    return new Date().toISOString().slice(0, 10);
}

function paceAdvice(input: {
    goal: Goal;
    verdict: GoalPaceVerdict | null;
    projection: GoalProjection | null;
    formatMoney: (n: number) => string;
    jarName: string | null;
    headroom: number | null;
    siblingCount: number;
}): { title: string; body: string }[] {
    const { goal, verdict, projection, formatMoney, jarName, headroom, siblingCount } = input;
    const tips: { title: string; body: string }[] = [];

    if (goal.status === GoalStatus.REACHED || (goal.saved >= goal.target && goal.kind !== GoalKind.EARN)) {
        tips.push({
            title: 'You made it',
            body: 'Protect the win. Keep the habit that got you here — even a smaller monthly amount keeps the muscle warm.',
        });
        return tips;
    }

    if (goal.kind === GoalKind.EARN) {
        tips.push({
            title: 'Income is the engine',
            body: 'Raise net by growing inflow or trimming what leaves before the jars. The earn target is a lifestyle floor, not a wish.',
        });
        if (projection && !projection.onTrack) {
            tips.push({
                title: 'Still short of the floor',
                body: 'Open Income and check sources. A dated raise or a cut in fixed out often closes the gap faster than hoping.',
            });
        }
        return tips;
    }

    if (goal.kind === GoalKind.GIVE) {
        tips.push({
            title: 'Giving is a planned outflow',
            body: jarName
                ? `Money that leaves ${jarName} counts toward this pledge. Automate a monthly give if willpower is the bottleneck.`
                : 'Automate a monthly give if willpower is the bottleneck — the pledge fills from what actually left the Give jar.',
        });
        if (projection && projection.shortfallPerMonth > 0) {
            tips.push({
                title: 'Close the monthly gap',
                body: `About ${formatMoney(projection.shortfallPerMonth)} more per month lands the pledge on time. A fixed give in Necessities or Give makes it boring — in a good way.`,
            });
        }
        return tips;
    }

    // SAVE
    if (verdict === 'no-plan' || goal.monthlyContribution <= 0) {
        tips.push({
            title: 'Set a monthly amount',
            body: 'A target without a pace is a wish. Pick what this jar can spare each month — then the finish date appears.',
        });
    } else if (verdict === 'ahead' || (projection?.onTrack && projection.monthsRemaining !== null)) {
        tips.push({
            title: 'On pace — keep the rhythm',
            body: projection?.projectedDate
                ? `At ${formatMoney(goal.monthlyContribution)} /mo you land around ${formatMonthYear(projection.projectedDate)}. Consistency beats heroic months.`
                : 'You are moving. Consistency beats heroic months.',
        });
    } else if (verdict === 'behind-room' && headroom !== null && headroom > 0) {
        tips.push({
            title: 'Room in the jar',
            body: `${jarName ?? 'This jar'} still has about ${formatMoney(headroom)} of headroom after fixed costs and other goals. Nudging the monthly plan uses money you already allocate.`,
        });
    } else if (verdict === 'behind-income' || (projection && !projection.onTrack)) {
        tips.push({
            title: 'The plan needs fuel',
            body:
                projection && projection.shortfallPerMonth > 0
                    ? `Roughly ${formatMoney(projection.shortfallPerMonth)} more per month (or a longer date) gets you there. Raise income, free jar flow, or ease the deadline — pick one lever.`
                    : 'Raise income, free jar flow, or ease the deadline — pick one lever instead of pushing all three.',
        });
    }

    if (siblingCount > 0 && jarName) {
        tips.push({
            title: `${siblingCount} other goal${siblingCount === 1 ? '' : 's'} share ${jarName}`,
            body: 'They compete for the same monthly flow. Rank what matters this season so the jar is not stretched thin.',
        });
    }

    if (tips.length === 0) {
        tips.push({
            title: 'One decision at a time',
            body: 'Name the next transfer. Goals move when money moves — not when you revisit the number.',
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
    const { formatMoney } = useHouseholdCurrency();
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
    const projection =
        (projectionsQuery.data ?? []).find(row => row.goalId === goalId) ?? null;
    const currentNet = useMemo(
        () => monthlyNetAsOf(incomeQuery.data ?? [], todayIso()),
        [incomeQuery.data]
    );

    if (live && goalsQuery.isLoading && !goal) {
        return (
            <Typography as="p" size="sm" color="muted">
                Loading…
            </Typography>
        );
    }

    if (!goal) {
        return (
            <div className="grid gap-4">
                <Link
                    href="/product/growth/goals"
                    className="w-fit font-mono text-xs font-medium tracking-wide text-fg-faint uppercase hover:text-accent">
                    ← Goals
                </Link>
                <Typography as="p" size="sm" color="muted">
                    Goal not found.
                </Typography>
            </div>
        );
    }

    const jar = goal.jarId
        ? (jarsQuery.data ?? []).find(row => row.id === goal.jarId)
        : undefined;
    const jarBalance = jar
        ? (balancesQuery.data ?? []).find(row => row.id === jar.id)
        : undefined;
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
    const current = isEarn ? earn!.current : goal.saved;
    const progress =
        goal.target > 0 ? Math.min(1, Math.max(0, current / goal.target)) : 0;
    const remaining = Math.max(0, goal.target - current);
    const reached =
        goal.status === GoalStatus.REACHED ||
        (isEarn ? earn!.reached : goal.saved >= goal.target);

    const wantMonths =
        goal.targetOn != null
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
    });

    const related: Array<{ title: string; subtitle: string; href: string }> = [];
    if (jarHref && jar) {
        related.push({
            title: jar.name,
            subtitle: 'Open jar',
            href: jarHref,
        });
    }
    if (goal.kind === GoalKind.GIVE) {
        related.push({
            title: 'Giving',
            subtitle: 'Pledge & organisations',
            href: productPath('soul/giving'),
        });
    }
    if (goal.kind === GoalKind.EARN) {
        related.push({
            title: 'Income',
            subtitle: 'Sources & monthly net',
            href: productPath('growth/income'),
        });
    }
    if (jar && goal.kind === GoalKind.SAVE) {
        related.push({
            title: 'Move money',
            subtitle: `Feed ${jar.name}`,
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
                        ← Goals
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
                                {kindEyebrow(goal.kind)}
                            </p>
                            <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-fg">
                                {goal.name}
                            </h1>
                        </div>
                    </div>
                </div>
                <Button as={Link} href={updateHref('goal', goal.id)} variant="secondary">
                    <EditIcon />
                    Edit
                </Button>
            </div>

            <Card className="grid gap-4 p-5">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <p className="font-mono text-[10px] tracking-wider text-fg-muted uppercase">
                            Progress
                        </p>
                        <div className="mt-1 flex flex-wrap items-baseline gap-2">
                            <span className="text-2xl font-semibold text-accent">
                                {formatMoney(current)}
                            </span>
                            <span className="font-mono text-xs text-fg-muted">
                                of {formatMoney(goal.target)}
                                {isEarn ? ' /mo' : ''}
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        <MetaChip
                            className={
                                reached
                                    ? 'border-success/30 text-success'
                                    : projection?.onTrack === false
                                      ? 'border-danger/30 text-danger'
                                      : 'border-success/30 text-success'
                            }>
                            {reached
                                ? 'Reached'
                                : projection?.onTrack === false
                                  ? 'Needs attention'
                                  : 'On track'}
                        </MetaChip>
                        <MetaChip>{Math.round(progress * 100)}%</MetaChip>
                    </div>
                </div>
                <Meter value={progress} />
                <p className="font-mono text-xs text-fg-muted">
                    {reached
                        ? goal.fulfilledOn
                            ? `◇ Reached ${formatBookedDate(goal.fulfilledOn)}`
                            : '◇ Target met'
                        : isEarn
                          ? `◇ ${formatMoney(remaining)} still to earn each month`
                          : goal.kind === GoalKind.GIVE
                            ? `◇ ${formatMoney(remaining)} left on the pledge${
                                  goal.targetOn ? ` · by ${goal.targetOn.slice(0, 4)}` : ''
                              }`
                            : `◇ ${formatMoney(goal.monthlyContribution)} /mo · ${
                                  formatMonthYear(projection?.projectedDate) ??
                                  formatMonthYear(goal.targetOn) ??
                                  'date open'
                              }`}
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
                            Jar context
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
                                        Available
                                    </dt>
                                    <dd className="mt-0.5 font-mono text-fg">
                                        {formatMoney(jarBalance.available)}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="font-mono text-[10px] tracking-wide text-fg-faint uppercase">
                                        Fixed out
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
                                    Headroom
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
                                Other goals on this jar
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
                    ✦ How to get there
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
                        ✦ Opportunities
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
                                    Open ›
                                </span>
                            </Link>
                        ))}
                    </Card>
                </section>
            ) : null}

            <Card className="grid gap-3 p-5">
                <p className="font-mono text-[10px] tracking-wider text-fg-muted uppercase">Plan</p>
                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                    {!isEarn ? (
                        <div>
                            <dt className="font-mono text-[10px] tracking-wide text-fg-faint uppercase">
                                Monthly
                            </dt>
                            <dd className="mt-0.5 text-fg">
                                {formatMoney(goal.monthlyContribution)}
                            </dd>
                        </div>
                    ) : null}
                    {goal.targetOn ? (
                        <div>
                            <dt className="font-mono text-[10px] tracking-wide text-fg-faint uppercase">
                                Target date
                            </dt>
                            <dd className="mt-0.5 text-fg">{formatBookedDate(goal.targetOn)}</dd>
                        </div>
                    ) : null}
                    {projection?.projectedDate ? (
                        <div>
                            <dt className="font-mono text-[10px] tracking-wide text-fg-faint uppercase">
                                At current pace
                            </dt>
                            <dd className="mt-0.5 text-fg">
                                {formatMonthYear(projection.projectedDate)}
                            </dd>
                        </div>
                    ) : null}
                    {goal.cause ? (
                        <div>
                            <dt className="font-mono text-[10px] tracking-wide text-fg-faint uppercase">
                                Cause
                            </dt>
                            <dd className="mt-0.5 text-fg">{goal.cause.replaceAll('_', ' ')}</dd>
                        </div>
                    ) : null}
                </dl>
            </Card>
        </div>
    );
}
