'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useState } from 'react';

import type { Goal, JarBalance } from '@rumtelo/contracts';
import { GoalKind, GoalStatus } from '@rumtelo/contracts';
import { useTranslations } from '@rumtelo/i18n';
import { Card, Typography } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import { CREATE_HREF, createGoalHref, goalDetailHref } from '@/app/_lib/create-routes';
import { evaluateGoalPace } from '@/app/_lib/goal-pace';
import { bgClassToCssVar } from '@/app/_lib/jar-chrome';
import { jarChrome } from '@/app/_lib/jar-meta';
import { CoachMark, useHelpersEnabled } from '@/components/features/helpers';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';

type SimulatorJar = Pick<JarBalance, 'id' | 'key' | 'name' | 'percentage' | 'committedOut'>;

type IncomeSimulatorProps = {
    /** Current household monthly net (cents). */
    netCents: number;
    /** Active Earn-goal target (cents); null when none is set. */
    targetCents: number | null;
    /** Name of the earn goal already cleared. Null while one is still open. */
    clearedName?: string | null;
    jars: SimulatorJar[];
    /** SAVE goals only. */
    goals: Goal[];
    className?: string;
};

type PaceTip = {
    body: string;
    tone: 'default' | 'warning';
    /** Label for the "edit this goal" CTA, when the next move is on the goal itself. */
    action?: string;
};

/**
 * Simulator bounds relative to real monthly income.
 * 0.5× covers a pay cut / one income gone; 2× covers a raise or side income.
 * The Earn target always fits inside the range. Tune here, nowhere else.
 */
const SIM_STEP_MAJOR = 50;
const SIM_FLOOR_MAJOR = 500;
const SIM_MIN_RATIO = 0.5;
const SIM_MAX_RATIO = 2;
/** Used only when the household has no active income yet. */
const SIM_FALLBACK_RANGE_MAJOR = { min: 500, max: 8_000 } as const;
/** "I want it in" slider ceiling — ten years is past what a jar plan can promise. */
const SIM_WANT_MAX_MONTHS = 120;

function roundToStep(major: number) {
    return Math.round(major / SIM_STEP_MAJOR) * SIM_STEP_MAJOR;
}

function formatMonthYear(date: Date, locale: string) {
    return new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric' }).format(date);
}

/** Slider bounds anchored on real income, stretched so the Earn target is reachable. */
function simRange(netMonthlyCents: number, targetCents: number | null) {
    const targetMajor = targetCents && targetCents > 0 ? roundToStep(targetCents / 100) : null;
    if (netMonthlyCents <= 0) {
        const max = Math.max(SIM_FALLBACK_RANGE_MAJOR.max, targetMajor ?? 0);
        return { min: SIM_FALLBACK_RANGE_MAJOR.min, max, current: null };
    }
    const current = roundToStep(netMonthlyCents / 100);
    const min = Math.max(SIM_FLOOR_MAJOR, roundToStep(current * SIM_MIN_RATIO));
    const max = Math.max(
        min + SIM_STEP_MAJOR,
        roundToStep(current * SIM_MAX_RATIO),
        targetMajor ?? 0
    );
    return { min, max, current };
}

function isGoalOpen(goal: Pick<Goal, 'saved' | 'target' | 'status'>) {
    if (goal.status === GoalStatus.REACHED || goal.status === GoalStatus.ARCHIVED) return false;
    return goal.saved < goal.target;
}

/**
 * Income what-if — Growth → Income.
 *
 * Lever: monthly net. Mechanism: the jar split (percentages never change here).
 * Outcome: room in each jar and what that does for a goal's pace.
 * Goal math lives in `_lib/goal-pace.ts` and matches the Goals page + backend projection.
 */
export function IncomeSimulator({
    netCents,
    targetCents,
    clearedName = null,
    jars,
    goals,
    className,
}: IncomeSimulatorProps) {
    const t = useTranslations('features.growth.income_simulator');
    const locale = useLocale();
    const coachGuidesEnabled = useHelpersEnabled();
    const { formatMoney } = useHouseholdCurrency();

    /** User override only — `null` means "follow the target (or current income)". */
    const [simOverrideMajor, setSimOverrideMajor] = useState<number | null>(null);
    const [goalId, setGoalId] = useState<string>('');
    /** User horizon override — `null` means "follow the goal's own date / pace". */
    const [wantOverrideMonths, setWantOverrideMonths] = useState<number | null>(null);

    const range = simRange(netCents, targetCents);
    const targetMajor = targetCents && targetCents > 0 ? roundToStep(targetCents / 100) : null;
    const defaultMajor =
        clearedName && range.current !== null
            ? range.current
            : (targetMajor ?? range.current ?? roundToStep((range.min + range.max) / 2));
    const simMajor = Math.min(range.max, Math.max(range.min, simOverrideMajor ?? defaultMajor));
    const simCents = simMajor * 100;
    const simDeltaPct = netCents > 0 ? Math.round(((simCents - netCents) / netCents) * 100) : 0;
    const atCurrent = range.current !== null && simMajor === range.current;
    const atTarget = targetMajor !== null && simMajor === targetMajor;

    const openGoals = goals.filter(isGoalOpen);
    const picked = goals.find(candidate => candidate.id === goalId);
    // Default to the first open goal so the pacing slider has something to do.
    const goal = picked ?? openGoals[0] ?? goals[0];
    const nextOpenGoal = openGoals.find(candidate => candidate.id !== goal?.id) ?? openGoals[0];
    // Only the jar the goal is actually funded from — no guessing a fallback jar.
    const goalJar = goal?.jarId ? jars.find(j => j.id === goal.jarId) : undefined;
    const siblingPlanned =
        goal && goalJar
            ? openGoals
                  .filter(other => other.id !== goal.id && other.jarId === goalJar.id)
                  .reduce((total, other) => total + other.monthlyContribution, 0)
            : 0;

    const paceInput = goal
        ? {
              simIncomeCents: simCents,
              goal,
              jar: goalJar
                  ? {
                        name: goalJar.name,
                        percentage: goalJar.percentage,
                        committedOut: goalJar.committedOut,
                    }
                  : null,
              siblingPlannedCents: siblingPlanned,
          }
        : null;

    // Horizon defaults to the goal's own date, else its pace at the planned amount.
    const draftPace = paceInput ? evaluateGoalPace({ ...paceInput, wantMonths: 1 }) : null;
    const suggestedWant = Math.min(
        SIM_WANT_MAX_MONTHS,
        Math.max(1, draftPace?.planMonths ?? draftPace?.monthsAtPlan ?? 24)
    );
    const wantMonths = wantOverrideMonths ?? suggestedWant;
    const pace = paceInput ? evaluateGoalPace({ ...paceInput, wantMonths }) : null;

    const goalReached = pace?.verdict === 'reached';
    const jarName = goalJar?.name ?? t('no_jar');
    const doneLabel = pace?.doneOn ? formatMonthYear(pace.doneOn, locale) : t('date_unknown');
    const yourDateLabel = goal?.targetOn ? formatMonthYear(new Date(goal.targetOn), locale) : null;
    const followsYourDate = wantOverrideMonths === null && pace?.planMonths !== null;

    let paceTip: PaceTip | null = null;
    if (goal && pace) {
        const need = formatMoney(pace.needCents);

        switch (pace.verdict) {
            case 'no-plan':
                paceTip = {
                    body: t('tip_no_plan'),
                    action: t('tip_set_monthly_amount'),
                    tone: 'default',
                };
                break;
            case 'on-target':
            case 'ahead':
                break;
            case 'behind-room':
                paceTip = {
                    body: t('tip_behind_room', { need, months: wantMonths }),
                    action: t('tip_raise_monthly_amount'),
                    tone: 'default',
                };
                break;
            case 'behind-income':
                paceTip =
                    pace.jarFlowCents === null
                        ? {
                              body: t('tip_behind_income_no_jar', { need, months: wantMonths }),
                              tone: 'warning',
                          }
                        : {
                              body: t('tip_behind_income', {
                                  need,
                                  months: wantMonths,
                                  jar: jarName,
                              }),
                              tone: 'warning',
                          };
                break;
            default:
                break;
        }
    }

    const planFits = pace?.jarHeadroomCents === null ? null : (pace?.jarHeadroomCents ?? 0) >= 0;

    const nextGoal = nextOpenGoal && goal && nextOpenGoal.id !== goal.id ? nextOpenGoal : null;

    const goToNextGoal = () => {
        if (!nextGoal) return;
        setGoalId(nextGoal.id);
        setWantOverrideMonths(null);
    };

    const editGoalAction = (label: string) =>
        goal ? (
            <Link
                href={goalDetailHref(goal.id)}
                className="font-mono text-xs font-medium tracking-wide text-accent uppercase underline-offset-2 hover:underline">
                {label} →
            </Link>
        ) : null;

    const reachedAction = nextGoal ? (
        <button
            type="button"
            onClick={goToNextGoal}
            className="font-mono text-xs font-medium tracking-wide text-accent uppercase underline-offset-2 hover:underline">
            {t('next_goal', { name: nextGoal.name })}
        </button>
    ) : (
        <Link
            href={CREATE_HREF.goal}
            className="font-mono text-xs font-medium tracking-wide text-accent uppercase underline-offset-2 hover:underline">
            {t('add_goal')}
        </Link>
    );

    return (
        <div
            data-coach-guide={coachGuidesEnabled ? 'income-simulator' : undefined}
            className={className}>
            <Card
                className={cn(
                    'p-5 lg:p-6',
                    coachGuidesEnabled && 'border-accent/20 ring-1 ring-accent/10'
                )}>
                <div className="flex flex-wrap items-center gap-2">
                    {coachGuidesEnabled ? <CoachMark size="sm" /> : null}
                    <Typography as="span" variant="eyebrow" color="primary">
                        {coachGuidesEnabled ? t('eyebrow') : t('eyebrow_with_mark')}
                    </Typography>
                </div>
                {clearedName ? (
                    <p className="mt-2 max-w-prose text-sm leading-relaxed text-pretty text-fg-secondary">
                        {t('cleared_intro', { name: clearedName })}{' '}
                        <Link
                            href={createGoalHref({ kind: GoalKind.EARN })}
                            className="font-medium text-accent underline-offset-2 hover:underline">
                            {t('set_next_target')}
                        </Link>
                    </p>
                ) : (
                    <p className="mt-2 max-w-prose text-sm leading-relaxed text-pretty text-fg-muted">
                        {t('intro')}
                    </p>
                )}

                <div className="my-5 flex flex-wrap items-center gap-4">
                    <input
                        type="range"
                        min={range.min}
                        max={range.max}
                        step={SIM_STEP_MAJOR}
                        value={simMajor}
                        onChange={event => setSimOverrideMajor(Number(event.target.value))}
                        className="min-w-0 flex-1 accent-accent"
                        aria-label={t('aria_simulate_income')}
                    />
                    <span className="shrink-0 font-display text-2xl font-semibold tracking-tight text-accent sm:min-w-36 sm:text-3xl">
                        {formatMoney(simCents)}
                    </span>
                </div>

                <div className="-mt-3 mb-5 flex flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-xs text-fg-faint">
                    {range.current !== null ? (
                        <button
                            type="button"
                            onClick={() => setSimOverrideMajor(range.current)}
                            aria-pressed={atCurrent}
                            className={cn(
                                'rounded-full border px-2.5 py-1 transition-colors',
                                atCurrent
                                    ? 'border-accent/40 bg-accent-soft text-accent'
                                    : 'border-line text-fg-secondary hover:border-accent hover:text-accent'
                            )}>
                            {t('now', { amount: formatMoney(range.current * 100) })}
                        </button>
                    ) : null}
                    {targetMajor !== null ? (
                        <button
                            type="button"
                            onClick={() => setSimOverrideMajor(null)}
                            aria-pressed={atTarget}
                            className={cn(
                                'rounded-full border px-2.5 py-1 transition-colors',
                                atTarget
                                    ? 'border-accent/40 bg-accent-soft text-accent'
                                    : 'border-line text-fg-secondary hover:border-accent hover:text-accent'
                            )}>
                            {t('target', { amount: formatMoney(targetMajor * 100) })}
                        </button>
                    ) : null}
                    {netCents > 0 && simDeltaPct !== 0 ? (
                        <span className="text-fg-secondary">
                            {t('vs_now', {
                                pct: `${simDeltaPct > 0 ? '+' : ''}${simDeltaPct}`,
                            })}
                        </span>
                    ) : null}
                </div>

                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
                    {jars.map(j => {
                        const color = jarChrome(j.key).color;
                        const now =
                            netCents > 0 ? Math.round((netCents * j.percentage) / 100) : null;
                        const then = Math.round((simCents * j.percentage) / 100);
                        return (
                            <div
                                key={j.id}
                                className="rounded-xl border border-line bg-raised p-3.5">
                                <div
                                    className="font-mono text-xs font-medium tracking-wide uppercase"
                                    style={{ color: bgClassToCssVar(color) }}>
                                    {j.name}
                                </div>
                                <div className="mt-2 font-mono text-lg text-fg">
                                    {formatMoney(then)}
                                </div>
                                {now !== null && now !== then ? (
                                    <div className="mt-0.5 font-mono text-[11px] text-fg-faint">
                                        {t('jar_now', { amount: formatMoney(now) })}
                                    </div>
                                ) : null}
                            </div>
                        );
                    })}
                </div>

                <div className="mt-6 border-t border-line pt-5">
                    {goals.length > 0 ? (
                        <div className="mb-4 flex flex-wrap gap-1.5">
                            {goals.map(goalItem => {
                                const isActive = goalItem.id === goal?.id;
                                const reached = !isGoalOpen(goalItem);
                                return (
                                    <button
                                        key={goalItem.id}
                                        type="button"
                                        onClick={() => {
                                            setGoalId(goalItem.id);
                                            setWantOverrideMonths(null);
                                        }}
                                        className={cn(
                                            'flex items-center gap-2 rounded-full border px-3 py-2 text-sm whitespace-nowrap transition-colors',
                                            isActive
                                                ? 'border-accent/40 bg-accent-soft text-accent'
                                                : 'border-line text-fg-secondary hover:border-accent hover:text-accent',
                                            reached && !isActive && 'opacity-60'
                                        )}>
                                        <span>{goalItem.icon}</span>
                                        {goalItem.name}
                                        {reached ? (
                                            <span className="font-mono text-[10px] tracking-wide uppercase">
                                                {t('done')}
                                            </span>
                                        ) : null}
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="my-4 rounded-xl border border-line bg-raised px-3.5 py-4 text-sm text-fg-secondary">
                            {t('no_goals_yet')}
                            <Link
                                href={CREATE_HREF.goal}
                                className="mt-3 block font-mono text-xs font-medium tracking-wide text-accent uppercase underline-offset-2 hover:underline">
                                {t('add_goal')}
                            </Link>
                        </div>
                    )}

                    {goal && pace && (
                        <div className="flex flex-wrap items-start gap-4 rounded-xl border border-line bg-raised p-4 lg:gap-8 lg:p-5">
                            <div className="grid min-w-0 flex-1 gap-2.5">
                                <span className="flex flex-wrap items-baseline gap-2.5">
                                    <Typography as="h3" size="lg" className="text-xl">
                                        {goal.name}
                                    </Typography>
                                    <span className="font-mono text-xs font-medium tracking-wide text-accent uppercase">
                                        {jarName}
                                    </span>
                                </span>
                                <span className="block h-2 overflow-hidden rounded-full bg-sunken">
                                    <span
                                        className="block h-full rounded-full bg-accent"
                                        style={{
                                            width: `${Math.min(100, Math.round((goal.saved / goal.target) * 100))}%`,
                                        }}
                                    />
                                </span>
                                <span className="font-mono text-xs font-medium text-fg-faint">
                                    {t('saved_of_target', {
                                        saved: formatMoney(goal.saved),
                                        target: formatMoney(goal.target),
                                    })}
                                    {!goalReached && pace.plannedCents > 0
                                        ? t('planned_per_month', {
                                              amount: formatMoney(pace.plannedCents),
                                          })
                                        : null}
                                </span>
                                {goalReached ? (
                                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-fg-secondary">
                                        <span>{t('done_sentence')}</span>
                                        {reachedAction}
                                    </p>
                                ) : pace.jarFlowCents !== null && pace.jarHeadroomCents !== null ? (
                                    <p className="mt-1 text-sm text-pretty text-fg-secondary">
                                        <span
                                            className={cn(
                                                'font-mono',
                                                planFits ? 'text-success' : 'text-danger'
                                            )}>
                                            {planFits
                                                ? t('amount_free', {
                                                      amount: formatMoney(pace.jarHeadroomCents),
                                                  })
                                                : t('amount_short', {
                                                      amount: formatMoney(-pace.jarHeadroomCents),
                                                  })}
                                        </span>{' '}
                                        {t('jar_headroom', { jar: jarName })}
                                    </p>
                                ) : (
                                    <p className="mt-1 text-sm text-pretty text-fg-secondary">
                                        {t('not_funded_from_jar')}
                                    </p>
                                )}
                            </div>
                            <div className="grid w-full gap-3.5 sm:w-52">
                                <span className="grid gap-1">
                                    <span className="font-mono text-xs font-medium tracking-wide whitespace-nowrap text-fg-faint uppercase">
                                        {t('done_around')}
                                    </span>
                                    <span className="font-display text-2xl leading-none font-semibold tracking-tight text-accent">
                                        {goalReached ? t('done') : doneLabel}
                                    </span>
                                    {!goalReached && pace.monthsAtPlan !== null ? (
                                        <span className="font-mono text-[11px] text-fg-muted">
                                            {t('months_at_plan', {
                                                months: pace.monthsAtPlan,
                                                amount: formatMoney(pace.plannedCents),
                                            })}
                                        </span>
                                    ) : null}
                                </span>
                                <span className="grid gap-1">
                                    <span className="font-mono text-xs font-medium tracking-wide whitespace-nowrap text-fg-faint uppercase">
                                        {t('your_date')}
                                    </span>
                                    <span className="font-mono text-base font-medium text-fg">
                                        {yourDateLabel ?? t('not_set')}
                                    </span>
                                </span>
                            </div>
                        </div>
                    )}

                    {!goalReached && goal && pace ? (
                        <>
                            <div className="mt-4 flex flex-wrap items-center gap-3.5">
                                <span className="font-mono text-xs font-medium tracking-wide whitespace-nowrap text-fg-faint uppercase">
                                    {yourDateLabel ? t('i_want_it_in') : t('or_i_want_it_in')}
                                </span>
                                <input
                                    type="range"
                                    min={1}
                                    max={SIM_WANT_MAX_MONTHS}
                                    step={1}
                                    value={wantMonths}
                                    onChange={event =>
                                        setWantOverrideMonths(Number(event.target.value))
                                    }
                                    className="min-w-0 flex-1 accent-accent"
                                    aria-label={t('aria_target_months')}
                                />
                                <span className="font-mono text-sm font-medium whitespace-nowrap text-fg-secondary">
                                    {t('months_count', { months: wantMonths })}
                                    {followsYourDate ? (
                                        <span className="text-fg-faint">
                                            {t('your_date_suffix')}
                                        </span>
                                    ) : null}
                                </span>
                                {wantOverrideMonths !== null ? (
                                    <button
                                        type="button"
                                        onClick={() => setWantOverrideMonths(null)}
                                        className="font-mono text-xs text-accent underline-offset-2 hover:underline">
                                        {yourDateLabel
                                            ? t('reset_to_your_date')
                                            : t('reset_to_pace')}
                                    </button>
                                ) : null}
                            </div>
                            {paceTip ? (
                                <p
                                    className={cn(
                                        'mt-3 text-sm text-pretty',
                                        paceTip.tone === 'warning'
                                            ? 'text-warning'
                                            : 'text-fg-secondary'
                                    )}>
                                    {paceTip.body}{' '}
                                    {paceTip.action ? editGoalAction(paceTip.action) : null}
                                </p>
                            ) : null}
                        </>
                    ) : null}
                </div>
            </Card>
        </div>
    );
}
