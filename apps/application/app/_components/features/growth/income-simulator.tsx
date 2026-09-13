'use client';

import { useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import type { Goal } from '@rumtelo/contracts';
import { Card } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import { CREATE_HREF, updateHref } from '@/app/_lib/create-routes';
import { evaluateGoalPace } from '@/app/_lib/goal-pace';
import { bgClassToCssVar } from '@/app/_lib/jar-chrome';
import { JAR_META } from '@/app/_lib/jar-meta';
import { CoachMark, CoachTipCard, useHelpersEnabled } from '@/components/features/helpers';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';

type SimulatorJar = {
    id: string;
    key: string;
    name: string;
    percentage: number;
    committedOut: number;
};

type IncomeSimulatorProps = {
    /** Current household monthly net (cents). */
    netCents: number;
    /** Active Earn-goal target (cents); null when none is set. */
    targetCents: number | null;
    jars: SimulatorJar[];
    /** SAVE goals only. */
    goals: Goal[];
    className?: string;
};

type PaceTip = {
    title: string;
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

function formatMonthYear(date: Date) {
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
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

function isGoalOpen(goal: { saved: number; target: number; status?: string }) {
    if (goal.status === 'REACHED' || goal.status === 'ARCHIVED') return false;
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
    jars,
    goals,
    className,
}: IncomeSimulatorProps) {
    const router = useRouter();
    const coachGuidesEnabled = useHelpersEnabled();
    const { formatMoney } = useHouseholdCurrency();

    /** User override only — `null` means "follow the target (or current income)". */
    const [simOverrideMajor, setSimOverrideMajor] = useState<number | null>(null);
    const [goalId, setGoalId] = useState<string>('');
    /** User horizon override — `null` means "follow the goal's own date / pace". */
    const [wantOverrideMonths, setWantOverrideMonths] = useState<number | null>(null);

    const range = simRange(netCents, targetCents);
    const targetMajor = targetCents && targetCents > 0 ? roundToStep(targetCents / 100) : null;
    const defaultMajor = targetMajor ?? range.current ?? roundToStep((range.min + range.max) / 2);
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
    const jarName = goalJar?.name ?? 'No jar';
    const doneLabel = pace?.doneOn ? formatMonthYear(pace.doneOn) : '—';
    const yourDateLabel = goal?.targetOn ? formatMonthYear(new Date(goal.targetOn)) : null;
    const followsYourDate = wantOverrideMonths === null && pace?.planMonths !== null;

    const paceTip = useMemo<PaceTip | null>(() => {
        if (!goal || !pace) return null;
        const planned = formatMoney(pace.plannedCents);
        const need = formatMoney(pace.needCents);
        const months = pace.monthsAtPlan ?? 0;

        switch (pace.verdict) {
            case 'no-plan':
                return {
                    title: 'No monthly amount yet',
                    body:
                        `This goal has no monthly amount, so there is no date to project.` +
                        (pace.jarFlowCents !== null && pace.jarHeadroomCents !== null
                            ? ` At this income ${jarName} receives ${formatMoney(pace.jarFlowCents)}/mo; ${formatMoney(Math.max(0, pace.jarHeadroomCents))} of that is free after fixed costs and other goals.`
                            : ''),
                    action: 'Set monthly amount',
                    tone: 'default',
                };
            case 'on-target':
                return {
                    title: 'Right on your date',
                    body: `${planned}/mo finishes this in about ${months} months (${doneLabel}).`,
                    tone: 'default',
                };
            case 'ahead':
                return {
                    title: 'Ahead of your date',
                    body: `${planned}/mo finishes this in about ${months} months (${doneLabel}) — ${wantMonths - months} months early. ${need}/mo would be enough; the other ${formatMoney(pace.plannedCents - pace.needCents)}/mo could go to the next goal.`,
                    tone: 'default',
                };
            case 'behind-room':
                return {
                    title: 'Room to speed up',
                    body: `To finish in ${wantMonths} months this goal needs ${need}/mo (now ${planned}). At this income ${jarName} has ${formatMoney(pace.jarHeadroomCents ?? 0)}/mo free after fixed costs and other goals — raise the monthly amount and you are there.`,
                    action: 'Raise monthly amount',
                    tone: 'default',
                };
            case 'behind-income':
                if (pace.jarFlowCents === null) {
                    return {
                        title: 'Not at this amount',
                        body: `To finish in ${wantMonths} months this goal needs ${need}/mo (now ${planned}). Fund it from a jar to see whether your income covers that.`,
                        tone: 'warning',
                    };
                }
                return {
                    title: 'Not at this income',
                    body:
                        `To finish in ${wantMonths} months this goal needs ${need}/mo (now ${planned}). ` +
                        `${jarName} receives ${formatMoney(pace.jarFlowCents)}/mo here; after ${formatMoney(pace.jarFixedCents)} fixed costs and ${formatMoney(pace.jarGoalsCents - pace.plannedCents)} for other goals, ${formatMoney(Math.max(0, pace.jarHeadroomCents ?? 0))} is free.` +
                        (pace.incomeForNeedCents !== null
                            ? ` Roughly ${formatMoney(pace.incomeForNeedCents)}/mo income covers it at your current split — or give ${jarName} a larger share.`
                            : ''),
                    tone: 'warning',
                };
            default:
                return null;
        }
    }, [doneLabel, goal, jarName, pace, wantMonths, formatMoney]);

    const planFits = pace?.jarHeadroomCents === null ? null : (pace?.jarHeadroomCents ?? 0) >= 0;

    const hasNextGoal = Boolean(nextOpenGoal && goal && nextOpenGoal.id !== goal.id);
    const nextGoal = hasNextGoal ? nextOpenGoal : null;
    const reachedBody = hasNextGoal
        ? 'This goal is done — keep the momentum going.'
        : openGoals.length === 0
          ? 'Every goal here is done. Set the next one.'
          : 'This goal is done.';

    const goToNextGoal = () => {
        if (!nextGoal) return;
        setGoalId(nextGoal.id);
        setWantOverrideMonths(null);
    };

    const editGoalAction = (label: string) =>
        goal ? (
            <button
                type="button"
                onClick={() => router.push(updateHref('goal', goal.id))}
                className="font-mono text-xs font-medium tracking-wide text-accent uppercase underline-offset-2 hover:underline">
                {label} →
            </button>
        ) : null;

    const reachedAction = nextGoal ? (
        <button
            type="button"
            onClick={goToNextGoal}
            className="font-mono text-xs font-medium tracking-wide text-accent uppercase underline-offset-2 hover:underline">
            Next: {nextGoal.name}
        </button>
    ) : (
        <button
            type="button"
            onClick={() => router.push(CREATE_HREF.goal)}
            className="font-mono text-xs font-medium tracking-wide text-accent uppercase underline-offset-2 hover:underline">
            + Add goal
        </button>
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
                    <span className="font-mono text-xs font-medium tracking-widest text-accent uppercase">
                        {coachGuidesEnabled ? 'What a raise does' : '✦ What a raise does'}
                    </span>
                </div>
                <p className="mt-2 max-w-prose text-sm leading-relaxed text-pretty text-fg-muted">
                    Drag to any monthly net. The split runs on every income automatically, so this
                    is what each jar would receive — and what that does for a goal.
                </p>

                <div className="my-5 flex flex-wrap items-center gap-4">
                    <input
                        type="range"
                        min={range.min}
                        max={range.max}
                        step={SIM_STEP_MAJOR}
                        value={simMajor}
                        onChange={event => setSimOverrideMajor(Number(event.target.value))}
                        className="min-w-0 flex-1 accent-accent"
                        aria-label="Simulate income"
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
                            Now {formatMoney(range.current * 100)}
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
                            Target {formatMoney(targetMajor * 100)}
                        </button>
                    ) : null}
                    <span>
                        Range {formatMoney(range.min * 100)} – {formatMoney(range.max * 100)}
                    </span>
                    {netCents > 0 && simDeltaPct !== 0 ? (
                        <>
                            <span aria-hidden>·</span>
                            <span className="text-fg-secondary">
                                {simDeltaPct > 0 ? '+' : ''}
                                {simDeltaPct}% vs now
                            </span>
                        </>
                    ) : null}
                </div>

                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
                    {jars.map(j => {
                        const meta = JAR_META.find(entry => entry.key === j.key);
                        const color = meta?.color ?? 'bg-jar-nec';
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
                                        now {formatMoney(now)}
                                    </div>
                                ) : null}
                            </div>
                        );
                    })}
                </div>

                <CoachTipCard className="mt-5" title="Same split, every income">
                    Percentages stay put — only the amounts move. Drag up to feel a raise; drag down
                    to feel a cut. Change the split in Settings → Jars when the mix itself needs
                    work.
                </CoachTipCard>

                <div className="mt-6 border-t border-line pt-5">
                    <div className="flex flex-wrap items-center gap-2">
                        {coachGuidesEnabled ? <CoachMark size="sm" /> : null}
                        <span className="font-mono text-xs font-medium tracking-widest text-accent uppercase">
                            {coachGuidesEnabled ? 'And what it buys you' : '✦ And what it buys you'}
                        </span>
                    </div>
                    <p className="mt-2 max-w-prose text-sm leading-relaxed text-pretty text-fg-muted">
                        Pick a goal. It moves at the monthly amount you set on it — the same date as
                        on Goals. Income changes how much room its jar has to speed it up.
                    </p>

                    {goals.length > 0 ? (
                        <div className="my-4 flex flex-wrap gap-1.5">
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
                                                Done
                                            </span>
                                        ) : null}
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="my-4 rounded-xl border border-line bg-raised px-3.5 py-4 text-sm text-fg-secondary">
                            No goals yet. Add one to see when this income gets you there.
                            <button
                                type="button"
                                onClick={() => router.push(CREATE_HREF.goal)}
                                className="mt-3 block font-mono text-xs font-medium tracking-wide text-accent uppercase underline-offset-2 hover:underline">
                                + Add goal
                            </button>
                        </div>
                    )}

                    {goal && pace && (
                        <div className="flex flex-wrap items-start gap-4 rounded-xl border border-line bg-raised p-4 lg:gap-8 lg:p-5">
                            <div className="grid min-w-0 flex-1 gap-2.5">
                                <span className="flex flex-wrap items-baseline gap-2.5">
                                    <span className="font-display text-xl font-semibold tracking-tight text-fg">
                                        {goal.name}
                                    </span>
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
                                    {formatMoney(goal.saved)} of {formatMoney(goal.target)}
                                    {!goalReached && pace.plannedCents > 0
                                        ? ` · ${formatMoney(pace.plannedCents)}/mo planned`
                                        : null}
                                </span>
                                {goalReached ? (
                                    <p className="mt-1 text-sm leading-relaxed text-pretty text-fg-secondary">
                                        Already reached. Pick the next one — this is where momentum
                                        comes from.
                                    </p>
                                ) : pace.jarFlowCents !== null && pace.jarHeadroomCents !== null ? (
                                    <p className="mt-1 text-sm leading-relaxed text-pretty text-fg-secondary">
                                        At this income {jarName} receives{' '}
                                        <span className="font-mono text-fg">
                                            {formatMoney(pace.jarFlowCents)}
                                        </span>
                                        /mo. Fixed costs take{' '}
                                        <span className="font-mono text-fg">
                                            {formatMoney(pace.jarFixedCents)}
                                        </span>
                                        , goal plans{' '}
                                        <span className="font-mono text-fg">
                                            {formatMoney(pace.jarGoalsCents)}
                                        </span>
                                        {' — '}
                                        <span
                                            className={cn(
                                                'font-mono',
                                                planFits ? 'text-success' : 'text-danger'
                                            )}>
                                            {planFits
                                                ? `${formatMoney(pace.jarHeadroomCents)} free`
                                                : `${formatMoney(-pace.jarHeadroomCents)} short`}
                                        </span>
                                        .
                                    </p>
                                ) : (
                                    <p className="mt-1 text-sm leading-relaxed text-pretty text-fg-secondary">
                                        This goal is not funded from a jar, so income does not
                                        change its pace here.
                                    </p>
                                )}
                            </div>
                            <div className="grid w-full gap-3.5 sm:w-52">
                                <span className="grid gap-1">
                                    <span className="font-mono text-xs font-medium tracking-wide whitespace-nowrap text-fg-faint uppercase">
                                        Done around
                                    </span>
                                    <span className="font-display text-2xl leading-none font-semibold tracking-tight text-accent">
                                        {goalReached ? 'Done' : doneLabel}
                                    </span>
                                    {!goalReached && pace.monthsAtPlan !== null ? (
                                        <span className="font-mono text-[11px] text-fg-muted">
                                            {pace.monthsAtPlan} months at{' '}
                                            {formatMoney(pace.plannedCents)}/mo
                                        </span>
                                    ) : null}
                                </span>
                                <span className="grid gap-1">
                                    <span className="font-mono text-xs font-medium tracking-wide whitespace-nowrap text-fg-faint uppercase">
                                        Your date
                                    </span>
                                    <span className="font-mono text-base font-medium text-fg">
                                        {yourDateLabel ?? 'Not set'}
                                    </span>
                                </span>
                            </div>
                        </div>
                    )}

                    {!goalReached && goal && pace && paceTip ? (
                        <>
                            <div className="mt-4 flex flex-wrap items-center gap-3.5">
                                <span className="font-mono text-xs font-medium tracking-wide whitespace-nowrap text-fg-faint uppercase">
                                    {yourDateLabel ? 'I want it in' : 'Or I want it in'}
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
                                    aria-label="Target months"
                                />
                                <span className="font-mono text-sm font-medium whitespace-nowrap text-fg-secondary">
                                    {wantMonths} months
                                    {followsYourDate ? (
                                        <span className="text-fg-faint"> · your date</span>
                                    ) : null}
                                </span>
                                {wantOverrideMonths !== null ? (
                                    <button
                                        type="button"
                                        onClick={() => setWantOverrideMonths(null)}
                                        className="font-mono text-xs text-accent underline-offset-2 hover:underline">
                                        {yourDateLabel ? 'Reset to your date' : 'Reset to pace'}
                                    </button>
                                ) : null}
                            </div>
                            {coachGuidesEnabled ? (
                                <CoachTipCard
                                    className="mt-3"
                                    title={paceTip.title}
                                    tone={paceTip.tone}
                                    actions={
                                        paceTip.action ? editGoalAction(paceTip.action) : undefined
                                    }>
                                    {paceTip.body}
                                </CoachTipCard>
                            ) : (
                                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-raised px-3.5 py-3 text-sm leading-relaxed text-pretty text-fg-secondary">
                                    <span className="min-w-0 flex-1">{paceTip.body}</span>
                                    {paceTip.action ? editGoalAction(paceTip.action) : null}
                                </div>
                            )}
                        </>
                    ) : goal ? (
                        coachGuidesEnabled ? (
                            <CoachTipCard
                                className="mt-4"
                                title="Goal reached"
                                actions={reachedAction}>
                                {reachedBody}
                            </CoachTipCard>
                        ) : (
                            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-raised px-3.5 py-3 text-sm text-fg-secondary">
                                <span>{reachedBody}</span>
                                {reachedAction}
                            </div>
                        )
                    ) : null}
                </div>
            </Card>
        </div>
    );
}
