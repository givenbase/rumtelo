'use client';

import { api } from '@/app/_lib/api';
import { useEffect, useMemo, useState } from 'react';

import {
    Currency,
    DEFAULT_JAR_SPLIT,
    IncomeStability,
    JarKey,
    Locale,
    SpendingStyle,
} from '@rumtelo/contracts';
import { useLocale, useTranslations } from '@rumtelo/i18n';
import { Button, Field, Input, Typography } from '@rumtelo/ui';
import { cn, formatMoney, currencySymbol } from '@rumtelo/utils';

import { useApiError } from '@/app/_lib/api-error-messages';
import { jarChrome } from '@/app/_lib/jar-meta';
import { useJarCatalog } from '@/app/_lib/use-jar-catalog';
import { writeHelpersEnabled } from '@/app/_lib/feature-helpers';
import { usePageTour } from '@/components/features/tour';
import { useAppShell } from '@/components/features/shell/app-shell-context';
import { useAuth } from '@/components/features/shell/auth-provider';
import { useOptionalPlanIntent } from '@/components/features/shell/plan-intent-provider';

const ONBOARDING_CURRENCIES = [
    { code: Currency.EUR },
    { code: Currency.USD },
    { code: Currency.GBP },
] as const;

const STEP_KEYS = ['welcome', 'income', 'jars', 'money_style', 'why', 'coach'] as const;

const JAR_NAME_KEYS: Record<
    JarKey,
    | 'features.brand.auth_manifesto.jars.necessity.name'
    | 'features.brand.auth_manifesto.jars.freedom.name'
    | 'features.brand.auth_manifesto.jars.savings.name'
    | 'features.brand.auth_manifesto.jars.education.name'
    | 'features.brand.auth_manifesto.jars.play.name'
    | 'features.brand.auth_manifesto.jars.give.name'
> = {
    [JarKey.NECESSITIES]: 'features.brand.auth_manifesto.jars.necessity.name',
    [JarKey.FINANCIAL_FREEDOM]: 'features.brand.auth_manifesto.jars.freedom.name',
    [JarKey.LONG_TERM_SAVINGS]: 'features.brand.auth_manifesto.jars.savings.name',
    [JarKey.EDUCATION]: 'features.brand.auth_manifesto.jars.education.name',
    [JarKey.PLAY]: 'features.brand.auth_manifesto.jars.play.name',
    [JarKey.GIVE]: 'features.brand.auth_manifesto.jars.give.name',
};

export function OnboardingOverlay() {
    const t = useTranslations('pages.onboarding');
    const tRoot = useTranslations();
    const apiError = useApiError();
    const appLocale = useLocale();
    const steps = useMemo(
        () =>
            STEP_KEYS.map(key => ({
                title: t(key),
                body: t(`${key}_body`),
            })),
        [t]
    );

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

    const defaultHouseholdName = t('household_default');
    const [householdNameDraft, setHouseholdNameDraft] = useState<string | null>(null);
    const householdName = householdNameDraft ?? defaultHouseholdName;
    const [currency, setCurrency] = useState<Currency>(Currency.EUR);
    const [monthlyIncome, setMonthlyIncome] = useState('4300');
    const [why, setWhy] = useState('');
    const [spendingStyle, setSpendingStyle] = useState(SpendingStyle.UNKNOWN);
    const [incomeStability, setIncomeStability] = useState(IncomeStability.STABLE);
    const [pending, setPending] = useState(false);
    const { jars: catalogJars } = useJarCatalog();
    const displayJars =
        catalogJars.length > 0
            ? catalogJars
            : (Object.values(JarKey) as JarKey[]).map(key => ({
                  key,
                  name: tRoot(JAR_NAME_KEYS[key]),
                  icon: '◇',
                  pct: DEFAULT_JAR_SPLIT[key],
                  text: jarChrome(key).text,
              }));

    if (!session) return null;
    if (householdId) return null;
    if (!onboardingOpen) return null;

    const step = steps[onboardingStep] ?? steps[0]!;
    const isLast = onboardingStep >= steps.length - 1;

    async function finish() {
        setPending(true);
        try {
            const minorUnits = Math.round(parseFloat(monthlyIncome.replace(',', '.')) * 100);
            const split = displayJars.map(jar => ({ key: jar.key, percentage: jar.pct }));
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
            writeHelpersEnabled(true);
            closeOnboarding(true);
            showToast(t('household_created'), 'success');

            if (!planIntent?.intent) {
                requestTourOffer();
            }
        } catch (error) {
            console.error('onboard failed', error);
            showToast(apiError(error), 'error');
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
                aria-label={t('dialog_label')}
                className="fixed top-1/2 left-1/2 z-71 w-full max-w-md -translate-1/2 animate-rise rounded-2xl border border-line-strong bg-surface p-6 shadow-xl">
                <div className="mb-5 flex items-center justify-between">
                    <p className="font-mono text-xs font-semibold tracking-widest text-accent uppercase">
                        {t('step_of', { current: onboardingStep + 1, total: steps.length })}
                    </p>
                </div>

                <Typography as="h2">{step.title}</Typography>
                <Typography as="p" size="sm" color="muted" className="mt-2">
                    {step.body}
                </Typography>

                {onboardingStep === 1 && (
                    <div className="mt-4 grid gap-3">
                        <div>
                            <p className="mb-2 font-mono text-[10px] tracking-[0.12em] text-fg-muted uppercase">
                                {t('currency')}
                            </p>
                            <div
                                className="flex flex-wrap gap-1.5"
                                role="group"
                                aria-label={t('currency')}>
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
                                                    locale: appLocale,
                                                })}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <Field
                            label={t('net_income_label', {
                                symbol: currencySymbol(currency),
                            })}
                            htmlFor="income">
                            <Input
                                id="income"
                                inputMode="decimal"
                                value={monthlyIncome}
                                onChange={event => setMonthlyIncome(event.target.value)}
                            />
                        </Field>
                        <Field label={t('household_name')} htmlFor="hh-name">
                            <Input
                                id="hh-name"
                                value={householdName}
                                onChange={event => setHouseholdNameDraft(event.target.value)}
                            />
                        </Field>
                    </div>
                )}

                {onboardingStep === 2 && (
                    <ul className="mt-4 grid gap-2">
                        {displayJars.map(jar => (
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
                                {t('spending_style_label')}
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {(
                                    [
                                        {
                                            key: SpendingStyle.SPENDER,
                                            label: t('spending_styles.spender'),
                                        },
                                        {
                                            key: SpendingStyle.SAVER,
                                            label: t('spending_styles.saver'),
                                        },
                                        {
                                            key: SpendingStyle.BALANCED,
                                            label: t('spending_styles.balanced'),
                                        },
                                        {
                                            key: SpendingStyle.UNKNOWN,
                                            label: t('spending_styles.unknown'),
                                        },
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
                                {t('income_stability_label')}
                            </p>
                            <div className="flex gap-1.5">
                                {(
                                    [
                                        {
                                            key: IncomeStability.STABLE,
                                            label: t('income_stability.stable'),
                                        },
                                        {
                                            key: IncomeStability.VARIABLE,
                                            label: t('income_stability.variable'),
                                        },
                                        {
                                            key: IncomeStability.NONE,
                                            label: t('income_stability.none'),
                                        },
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
                        <Field label={t('why_label')} htmlFor="why">
                            <Input
                                id="why"
                                value={why}
                                onChange={event => setWhy(event.target.value)}
                                placeholder={t('why_placeholder')}
                            />
                        </Field>
                    </div>
                )}

                <div className="mt-6 flex items-center justify-between gap-3">
                    <div className="flex gap-1">
                        {steps.map((_, index) => (
                            <span
                                key={steps[index]!.title}
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
                                {t('back')}
                            </Button>
                        )}
                        {isLast ? (
                            <Button size="sm" disabled={pending} onClick={() => void finish()}>
                                {pending ? t('creating') : t('start')}
                            </Button>
                        ) : (
                            <Button size="sm" onClick={() => setOnboardingStep(onboardingStep + 1)}>
                                {t('next')}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
