'use client';

import { useState } from 'react';

import { WeekCheckStage } from '@rumtelo/contracts';
import { Button, Eyebrow } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';

interface WizardJar {
    id: string;
    key: string;
    name: string;
    icon: string;
    available: number;
    overspent: boolean;
}

const STEPS = [
    {
        key: WeekCheckStage.LOOK,
        label: 'Look',
        sub: 'What happened this week?',
    },
    {
        key: WeekCheckStage.REDIRECT,
        label: 'Direct',
        sub: 'Where does the surplus go?',
    },
    {
        key: WeekCheckStage.INTEND,
        label: 'Intend',
        sub: 'What is your intention for next week?',
    },
] as const;

/**
 * Three-step WEEKTELLING wizard (design: `week-check`).
 *
 * Step 1 — Kijken: show week recap per jar (available vs plan).
 * Step 2 — Richten: show surplus amount and let user redirect it to jars.
 * Step 3 — Intentie: free-text intention for the coming week.
 *
 * Step dots at the top double as navigation so users can jump between steps.
 */
export function WeekCheckWizard({
    jars,
    surplus,
    initialStage,
    onStepComplete,
}: {
    jars: readonly WizardJar[];
    surplus: number;
    initialStage?: WeekCheckStage;
    onStepComplete?: (
        stage: WeekCheckStage,
        payload?: {
            intention?: string;
            allocations?: { jarId: string; amount: number }[];
        }
    ) => Promise<unknown>;
}) {
    const stageIndex =
        initialStage && initialStage !== WeekCheckStage.DONE
            ? STEPS.findIndex(stageItem => stageItem.key === initialStage)
            : 0;
    const [step, setStep] = useState(Math.max(0, stageIndex));
    const [intent, setIntent] = useState('');
    const [redirectJarId, setRedirectJarId] = useState<string | null>(null);
    const { formatMoney } = useHouseholdCurrency();

    const current = STEPS[step]!;

    async function goNext() {
        if (onStepComplete) {
            const payload =
                current.key === WeekCheckStage.REDIRECT && redirectJarId && surplus > 0
                    ? { allocations: [{ jarId: redirectJarId, amount: surplus }] }
                    : current.key === WeekCheckStage.INTEND
                      ? { intention: intent }
                      : undefined;
            await onStepComplete(current.key, payload);
        }
        if (step < STEPS.length - 1) setStep(previous => previous + 1);
    }

    async function finish() {
        if (onStepComplete) {
            await onStepComplete(WeekCheckStage.DONE, { intention: intent || undefined });
        }
    }

    return (
        <div className="grid gap-6">
            {/* Step indicator strip */}
            <div className="flex items-stretch overflow-hidden rounded-2xl border border-line bg-surface shadow-md">
                {STEPS.map((stageItem, i) => (
                    <button
                        key={stageItem.key}
                        type="button"
                        onClick={() => setStep(i)}
                        className={cn(
                            'flex flex-1 flex-col gap-1 border-r border-line px-5 py-4 text-left transition-colors last:border-r-0',
                            i === step
                                ? 'bg-accent-soft'
                                : i < step
                                  ? 'hover:bg-raised'
                                  : 'hover:bg-raised'
                        )}>
                        <span
                            className={cn(
                                'font-mono text-xs font-semibold tracking-widest uppercase',
                                i === step ? 'text-accent' : 'text-fg-faint'
                            )}>
                            Step {i + 1}
                        </span>
                        <span
                            className={cn(
                                'font-display text-sm font-semibold',
                                i === step ? 'text-fg' : 'text-fg-secondary'
                            )}>
                            {stageItem.label}
                        </span>
                        <span className="text-xs leading-tight text-fg-faint">{stageItem.sub}</span>
                        {/* Progress pip */}
                        <span
                            className={cn(
                                'mt-2 h-0.5 rounded-full transition-colors',
                                i === step ? 'bg-accent' : i < step ? 'bg-success' : 'bg-sunken'
                            )}
                        />
                    </button>
                ))}
            </div>

            {/* Step content */}
            <div className="animate-rise rounded-2xl border border-line bg-surface p-6 shadow-md">
                {/* ── Step 1: Look ─────────────────────────────────────────── */}
                {current.key === WeekCheckStage.LOOK && (
                    <div className="grid gap-5">
                        <div>
                            <Eyebrow>✦ Look</Eyebrow>
                            <h2 className="mt-1.5 font-display text-2xl font-semibold tracking-tight text-fg">
                                What did you do this week?
                            </h2>
                            <p className="mt-1 text-sm text-fg-muted">
                                No judgment. Information is all we need.
                            </p>
                        </div>
                        <div className="grid gap-2">
                            {jars.map(jar => (
                                <div
                                    key={jar.id}
                                    className="flex items-center justify-between gap-3 rounded-xl border border-line bg-raised px-4 py-3">
                                    <span className="flex items-center gap-2.5 text-sm text-fg">
                                        <span aria-hidden className="text-base">
                                            {jar.icon}
                                        </span>
                                        {jar.name}
                                    </span>
                                    <span
                                        className={cn(
                                            'font-mono text-sm',
                                            jar.overspent ? 'text-danger' : 'text-success'
                                        )}>
                                        {formatMoney(jar.available, { signed: true })}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Step 2: Direct ────────────────────────────────────────── */}
                {current.key === WeekCheckStage.REDIRECT && (
                    <div className="grid gap-5">
                        <div>
                            <Eyebrow>✦ Direct</Eyebrow>
                            <h2 className="mt-1.5 font-display text-2xl font-semibold tracking-tight text-fg">
                                Distribute surplus
                            </h2>
                            <p className="mt-1 text-sm text-fg-muted">
                                {surplus > 0 ? (
                                    <>
                                        <span className="font-semibold text-fg">
                                            {formatMoney(surplus)}
                                        </span>{' '}
                                        has no direction yet. Send it where it works.
                                    </>
                                ) : (
                                    <>
                                        No surplus this week — nothing to redirect. Continue when
                                        you&apos;re ready.
                                    </>
                                )}
                            </p>
                        </div>
                        {surplus > 0 ? (
                            <div className="grid gap-2">
                                {jars
                                    .filter(j => j.key !== 'NECESSITIES')
                                    .map(jar => (
                                        <div
                                            key={jar.id}
                                            className="flex items-center justify-between gap-3 rounded-xl border border-line bg-raised px-4 py-3">
                                            <span className="flex items-center gap-2.5 text-sm text-fg">
                                                <span aria-hidden className="text-base">
                                                    {jar.icon}
                                                </span>
                                                {jar.name}
                                            </span>
                                            <Button
                                                variant={
                                                    redirectJarId === jar.id
                                                        ? 'primary'
                                                        : 'secondary'
                                                }
                                                size="sm"
                                                className="h-8 px-3 text-xs"
                                                onClick={() => setRedirectJarId(jar.id)}>
                                                {redirectJarId === jar.id
                                                    ? 'Selected'
                                                    : 'Send here'}
                                            </Button>
                                        </div>
                                    ))}
                            </div>
                        ) : null}
                    </div>
                )}

                {/* ── Step 3: Intend ───────────────────────────────────────── */}
                {current.key === WeekCheckStage.INTEND && (
                    <div className="grid gap-5">
                        <div>
                            <Eyebrow>✦ Intend</Eyebrow>
                            <h2 className="mt-1.5 font-display text-2xl font-semibold tracking-tight text-fg">
                                My intention for next week
                            </h2>
                            <p className="mt-1 text-sm text-fg-muted">
                                One sentence. What will you do differently?
                            </p>
                        </div>
                        <textarea
                            rows={4}
                            value={intent}
                            onChange={event => setIntent(event.target.value)}
                            placeholder="Write your intention here..."
                            className="w-full resize-none rounded-xl border border-line bg-raised px-4 py-3 text-sm text-fg transition-colors placeholder:text-fg-faint focus:border-accent focus:outline-none"
                            aria-label="Intention for next week"
                        />
                        {intent.trim().length > 0 && (
                            <p className="text-xs text-fg-muted">
                                Good. Remember this when the week feels hard.
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* Navigation row */}
            <div className="flex items-center justify-between gap-3">
                {step > 0 ? (
                    <Button variant="ghost" onClick={() => setStep(previous => previous - 1)}>
                        ← Back
                    </Button>
                ) : (
                    <span />
                )}

                {step < STEPS.length - 1 ? (
                    <Button onClick={() => void goNext()}>Next →</Button>
                ) : (
                    <Button onClick={() => void finish()}>Complete week check ✓</Button>
                )}
            </div>
        </div>
    );
}
