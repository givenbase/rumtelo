'use client';

import { api } from '@/app/_lib/api';
import { useEffect, useState } from 'react';

import { Currency, IncomeStability, Locale, SpendingStyle } from '@rumtelo/contracts';
import { Button, Field, Input } from '@rumtelo/ui';
import { cn, formatMoney, currencySymbol } from '@rumtelo/utils';

import { JAR_META } from '@/app/_lib/jar-meta';
import { writeHelpersEnabled } from '@/app/_lib/feature-helpers';
import { usePageTour } from '@/components/features/tour';
import { useAppShell } from '@/components/features/shell/app-shell-context';
import { useAuth } from '@/components/features/shell/auth-provider';
import { useOptionalPlanIntent } from '@/components/features/shell/plan-intent-provider';

const ONBOARDING_CURRENCIES = [
    { code: Currency.EUR, sampleLocale: 'nl-NL' },
    { code: Currency.USD, sampleLocale: 'en-US' },
    { code: Currency.GBP, sampleLocale: 'en-GB' },
] as const;

const STEPS = [
    {
        title: 'Welcome to Rumtelo',
        body: 'Stop wondering where it went. Six jars, one calm overview.',
    },
    {
        title: 'Your income',
        body: 'Pick the currency for this household, then your net monthly income.',
    },
    { title: 'The six jars', body: 'Your income is split immediately — pay your future first.' },
    {
        title: 'How you handle money',
        body: 'Soft labels only — so tips fit you. Partners can choose differently later.',
    },
    { title: 'Your why', body: 'One sentence on your dashboard. The check when money gets tight.' },
    {
        title: 'The Coach stays with you',
        body: 'On-screen tips (marked ✦ The Coach) stay on while you learn — tips without shame. Open The Coach anytime for next moves. Turn tips off later in Settings → Account.',
    },
];

export function OnboardingOverlay() {
    const { session, householdId, isPending, setActiveHousehold, refreshSession } = useAuth();
    const {
        onboardingOpen,
        onboardingStep,
        closeOnboarding,
        setOnboardingStep,
        showToast,
        openOnboarding,
    } = useAppShell();
    const { requestTourOffer } = usePageTour();
    const planIntent = useOptionalPlanIntent();

    useEffect(() => {
        if (isPending) return;
        if (householdId) {
            closeOnboarding();
            return;
        }
        if (session) openOnboarding();
    }, [session, householdId, isPending, openOnboarding, closeOnboarding]);

    const [householdName, setHouseholdName] = useState('My household');
    const [currency, setCurrency] = useState<Currency>(Currency.EUR);
    const [monthlyIncome, setMonthlyIncome] = useState('4300');
    const [why, setWhy] = useState('');
    const [spendingStyle, setSpendingStyle] = useState(SpendingStyle.UNKNOWN);
    const [incomeStability, setIncomeStability] = useState(IncomeStability.STABLE);
    const [pending, setPending] = useState(false);

    if (!session) return null;
    if (householdId) return null;
    if (!onboardingOpen) return null;

    const step = STEPS[onboardingStep] ?? STEPS[0]!;
    const isLast = onboardingStep >= STEPS.length - 1;

    async function finish() {
        setPending(true);
        try {
            const minorUnits = Math.round(parseFloat(monthlyIncome.replace(',', '.')) * 100);
            const split = JAR_META.map(jar => ({ key: jar.key, percentage: jar.pct }));
            const household = await api.household.onboard({
                householdName,
                currency,
                locale: Locale.NL,
                spendingStyle,
                incomeStability,
                monthlyNetIncome: Number.isFinite(minorUnits) ? minorUnits : 0,
                split,
                why: why.trim() || null,
            });
            await setActiveHousehold(household.id);
            await refreshSession();
            // Beginners start with Coach guides on; they can turn them off in Settings later.
            writeHelpersEnabled(true);
            closeOnboarding(true);
            showToast('Household created', 'success');

            // Paid plan from marketing → PendingPlanCheckout opens Stripe after this closes.
            if (!planIntent?.intent) {
                requestTourOffer();
            }
        } catch (error) {
            console.error('onboard failed', error);
            const message =
                error instanceof Error && error.message
                    ? error.message
                    : 'Setup failed — please try again';
            showToast(message, 'error');
        } finally {
            setPending(false);
        }
    }

    return (
        <>
            <div aria-hidden="true" className="fixed inset-0 z-70 bg-scrim/70" />
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Welcome to Rumtelo"
                className="fixed top-1/2 left-1/2 z-71 w-full max-w-md -translate-1/2 animate-rise rounded-2xl border border-line-strong bg-surface p-6 shadow-xl">
                <div className="mb-5 flex items-center justify-between">
                    <p className="font-mono text-xs font-semibold tracking-widest text-accent uppercase">
                        Step {onboardingStep + 1} of {STEPS.length}
                    </p>
                </div>

                <h2 className="font-display text-2xl font-semibold tracking-tight text-fg">
                    {step.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-fg-muted">{step.body}</p>

                {onboardingStep === 1 && (
                    <div className="mt-4 grid gap-3">
                        <div>
                            <p className="mb-2 font-mono text-[10px] tracking-[0.12em] text-fg-muted uppercase">
                                Currency
                            </p>
                            <div
                                className="flex flex-wrap gap-1.5"
                                role="group"
                                aria-label="Currency">
                                {ONBOARDING_CURRENCIES.map(option => {
                                    const on = currency === option.code;
                                    return (
                                        <button
                                            key={option.code}
                                            type="button"
                                            aria-pressed={on}
                                            onClick={() => setCurrency(option.code)}
                                            className={cn(
                                                'grid gap-0.5 rounded-[10px] border px-3 py-2 text-left transition-colors',
                                                on
                                                    ? 'border-accent bg-accent-soft'
                                                    : 'border-line hover:border-accent/50'
                                            )}>
                                            <span
                                                className={cn(
                                                    'font-mono text-[10px] font-medium tracking-wide',
                                                    on ? 'text-accent' : 'text-fg'
                                                )}>
                                                {option.code}
                                            </span>
                                            <span className="font-mono text-[10.5px] text-fg-muted">
                                                {formatMoney(430_000, {
                                                    currency: option.code,
                                                    locale: option.sampleLocale,
                                                })}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <Field
                            label={`Net monthly income (${currencySymbol(currency)})`}
                            htmlFor="income">
                            <Input
                                id="income"
                                inputMode="decimal"
                                value={monthlyIncome}
                                onChange={event => setMonthlyIncome(event.target.value)}
                            />
                        </Field>
                        <Field label="Household name" htmlFor="hh-name">
                            <Input
                                id="hh-name"
                                value={householdName}
                                onChange={event => setHouseholdName(event.target.value)}
                            />
                        </Field>
                    </div>
                )}

                {onboardingStep === 2 && (
                    <ul className="mt-4 grid gap-2">
                        {JAR_META.map(jar => (
                            <li
                                key={jar.key}
                                className="flex items-center justify-between rounded-xl border border-line bg-raised px-3 py-2">
                                <span className="text-sm text-fg">
                                    {jar.icon} {jar.name}
                                </span>
                                <span className="font-mono text-xs text-fg-muted">{jar.pct}%</span>
                            </li>
                        ))}
                    </ul>
                )}

                {onboardingStep === 3 && (
                    <div className="mt-4 grid gap-4">
                        <div>
                            <p className="mb-2 font-mono text-[10px] tracking-[0.12em] text-fg-muted uppercase">
                                I tend to…
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {(
                                    [
                                        { key: SpendingStyle.SPENDER, label: 'Spender' },
                                        { key: SpendingStyle.SAVER, label: 'Saver' },
                                        { key: SpendingStyle.BALANCED, label: 'Balanced' },
                                        { key: SpendingStyle.UNKNOWN, label: 'Not sure' },
                                    ] as const
                                ).map(option => (
                                    <button
                                        key={option.key}
                                        type="button"
                                        onClick={() => setSpendingStyle(option.key)}
                                        className={cn(
                                            'rounded-full border px-3 py-1.5 text-xs transition-colors',
                                            spendingStyle === option.key
                                                ? 'border-accent bg-accent-soft text-accent'
                                                : 'border-line text-fg-muted hover:text-fg'
                                        )}>
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <p className="mb-2 font-mono text-[10px] tracking-[0.12em] text-fg-muted uppercase">
                                Income month to month
                            </p>
                            <div className="flex gap-1.5">
                                {(
                                    [
                                        { key: IncomeStability.STABLE, label: 'Stable' },
                                        { key: IncomeStability.VARIABLE, label: 'Variable' },
                                        { key: IncomeStability.NONE, label: 'None' },
                                    ] as const
                                ).map(option => (
                                    <button
                                        key={option.key}
                                        type="button"
                                        onClick={() => setIncomeStability(option.key)}
                                        className={cn(
                                            'rounded-full border px-3 py-1.5 text-xs transition-colors',
                                            incomeStability === option.key
                                                ? 'border-accent bg-accent-soft text-accent'
                                                : 'border-line text-fg-muted hover:text-fg'
                                        )}>
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {onboardingStep === 4 && (
                    <div className="mt-4">
                        <Field label="Why are you here?" htmlFor="why">
                            <Input
                                id="why"
                                value={why}
                                onChange={event => setWhy(event.target.value)}
                                placeholder="e.g. Stop guessing where the money went"
                            />
                        </Field>
                    </div>
                )}

                <div className="mt-6 flex items-center justify-between gap-3">
                    <div className="flex gap-1">
                        {STEPS.map((_, index) => (
                            <span
                                key={STEPS[index]!.title}
                                className={cn(
                                    'h-1.5 rounded-full transition-all',
                                    index === onboardingStep ? 'w-5 bg-accent' : 'w-1.5 bg-sunken'
                                )}
                            />
                        ))}
                    </div>
                    <div className="flex gap-2">
                        {onboardingStep > 0 && (
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setOnboardingStep(onboardingStep - 1)}>
                                Back
                            </Button>
                        )}
                        {isLast ? (
                            <Button size="sm" disabled={pending} onClick={() => void finish()}>
                                {pending ? 'Creating…' : 'Start'}
                            </Button>
                        ) : (
                            <Button size="sm" onClick={() => setOnboardingStep(onboardingStep + 1)}>
                                Next
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
