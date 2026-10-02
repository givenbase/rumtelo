'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import {
    Currency,
    DEFAULT_JAR_SPLIT,
    fromIntlLocale,
    HouseholdAnswerKey,
    IncomeStability,
    JarExperience,
    JarKey,
    SpendingStyle,
} from '@rumtelo/contracts';
import { useLocale, useTranslations } from '@rumtelo/i18n';
import {
    Button,
    Form,
    Icon,
    Typography,
    bindFormSubmit,
    celebrateFireworks,
    createFormInvalidHandler,
} from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import { api } from '@/app/_lib/api';
import { useApiError } from '@/app/_lib/api-error-messages';
import { writeHelpersEnabled } from '@/app/_lib/feature-helpers';
import { jarChrome, jarIcon } from '@/app/_lib/jar-meta';
import { useJarCatalog } from '@/app/_lib/use-jar-catalog';
import { useAuth } from '@/components/features/shell/auth-provider';
import { useHouseholdShell } from '@/components/features/shell/household-shell-context';

import {
    JAR_NAME_KEYS,
    STEP_ICONS,
    STEP_KEYS,
    onboardingSchema,
    type DisplayJar,
    type OnboardingStepKey,
    type OnboardingValues,
} from './onboarding-shared';
import { IncomeStep } from './steps/income-step';
import { JarsStep } from './steps/jars-step';
import { WelcomeStep } from './steps/welcome-step';
import { WhyStep } from './steps/why-step';

export interface JarBankSetupParams {
    experience: JarExperience;
}

const STEP_FIELDS: Record<OnboardingStepKey, (keyof OnboardingValues)[]> = {
    welcome: [],
    income: ['currency', 'monthlyIncome', 'householdName'],
    jars: [],
    why: ['why'],
};

export function OnboardingFlow({
    onHouseholdReady,
}: {
    onHouseholdReady?: (params: JarBankSetupParams) => void;
}) {
    const t = useTranslations('pages.onboarding');
    const tRoot = useTranslations();
    const tForm = useTranslations('ui.form');
    const tJars = useTranslations('features.money.jars');
    const appLocale = useLocale();
    const apiError = useApiError();
    const steps = useMemo(
        () =>
            STEP_KEYS.map(key => ({
                key,
                title: t(key),
                body: t(`${key}_body`),
                icon: STEP_ICONS[key],
            })),
        [t]
    );

    const { setActiveHousehold, refreshSession } = useAuth();
    const { showToast } = useHouseholdShell();

    const [step, setStep] = useState(0);
    const titleRef = useRef<HTMLHeadingElement>(null);
    const defaultHouseholdName = t('household_default');
    const form = useForm<OnboardingValues>({
        resolver: zodResolver(onboardingSchema),
        defaultValues: {
            householdName: defaultHouseholdName,
            currency: Currency.EUR,
            monthlyIncome: '',
            why: '',
        },
    });

    const onInvalid = createFormInvalidHandler(
        ({ title, description }) => {
            showToast(description ?? title, 'error');
        },
        {
            title: tForm('incomplete_title'),
            description: tForm('incomplete_description'),
        }
    );

    const [pending, setPending] = useState(false);
    const { jars: catalogJars, byKey: catalogByKey } = useJarCatalog();
    const displayJars = useMemo((): DisplayJar[] => {
        const catalogOrder = catalogJars.length > 0 ? catalogJars.map(jar => jar.key) : null;
        const keys = catalogOrder ?? Object.values(JarKey);
        return keys.map(key => {
            const catalog = catalogByKey.get(key);
            return {
                key,
                name: catalog?.name ?? tRoot(JAR_NAME_KEYS[key]),
                icon: jarIcon(key, catalog?.icon),
                pct: catalog?.pct ?? DEFAULT_JAR_SPLIT[key],
                subtitle: tJars.has(`guides.${key}.subtitle`)
                    ? tJars(`guides.${key}.subtitle`)
                    : (catalog?.subtitle ?? ''),
                note: tJars.has(`guides.${key}.note`)
                    ? tJars(`guides.${key}.note`)
                    : (catalog?.guide?.note ?? ''),
                text: jarChrome(key).text,
            };
        });
    }, [catalogByKey, catalogJars, tJars, tRoot]);

    const currentStep = steps[step] ?? steps[0]!;
    const isLast = step >= steps.length - 1;

    useEffect(() => {
        if (!currentStep.key) return;
        titleRef.current?.focus({ preventScroll: true });
    }, [currentStep.key]);

    async function goNext() {
        const fields = STEP_FIELDS[currentStep.key] ?? [];
        if (fields.length > 0) {
            const ok = await form.trigger(fields);
            if (!ok) {
                onInvalid(form.formState.errors);
                return;
            }
        }
        setStep(current => current + 1);
    }

    async function finish(values: OnboardingValues) {
        setPending(true);
        try {
            const minorUnits = Math.round(parseFloat(values.monthlyIncome.replace(',', '.')) * 100);
            const split = displayJars.map(jar => ({ key: jar.key, percentage: jar.pct }));
            const household = await api.household.onboard({
                householdName: values.householdName,
                currency: values.currency,
                locale: fromIntlLocale(appLocale),
                spendingStyle: SpendingStyle.UNKNOWN,
                incomeStability: IncomeStability.STABLE,
                monthlyNetIncome: Number.isFinite(minorUnits) ? minorUnits : 0,
                split,
                why: values.why.trim() || null,
            });

            await api.household.updateSettings({
                householdId: household.id,
                answers: {
                    [HouseholdAnswerKey.JAR_EXPERIENCE]: JarExperience.NEW,
                    [HouseholdAnswerKey.JAR_BANK_SETUP_DONE]: false,
                },
            });

            await celebrateFireworks({ durationMs: 1800, zIndex: 80 });

            onHouseholdReady?.({
                experience: JarExperience.NEW,
            });

            await setActiveHousehold(household.id);
            await refreshSession();
            writeHelpersEnabled(true);
            showToast(t('household_created'), 'success');
        } catch (error) {
            console.error('onboard failed', error);
            showToast(apiError(error), 'error');
        } finally {
            setPending(false);
        }
    }

    return (
        <Form {...form}>
            <form
                className="flex flex-col"
                onSubmit={bindFormSubmit(form, finish, onInvalid)}
                noValidate>
                <div className="min-h-0 flex-1 overflow-y-auto p-6 pb-4">
                    <div className="mb-5 flex items-start justify-between gap-3">
                        <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-accent/20 bg-accent-soft text-accent">
                            <Icon name={currentStep.icon} size="md" color="inherit" />
                        </span>
                        <span className="rounded-full border border-accent/25 bg-accent-soft px-2.5 py-1 font-mono text-[10px] font-semibold tracking-widest text-accent uppercase">
                            {t('step_of', {
                                current: step + 1,
                                total: steps.length,
                            })}
                        </span>
                    </div>

                    <Typography
                        as="h2"
                        size="lg"
                        weight="bold"
                        ref={titleRef}
                        tabIndex={-1}
                        className="outline-none">
                        {currentStep.title}
                    </Typography>
                    <Typography as="p" variant="lead" size="sm" className="mt-2">
                        {currentStep.body}
                    </Typography>

                    {currentStep.key === 'welcome' ? <WelcomeStep /> : null}
                    {currentStep.key === 'income' ? <IncomeStep /> : null}
                    {currentStep.key === 'jars' ? <JarsStep displayJars={displayJars} /> : null}
                    {currentStep.key === 'why' ? <WhyStep /> : null}
                </div>

                <div className="flex shrink-0 items-center justify-between gap-3 border-t border-line bg-raised/50 px-6 py-4">
                    <div className="flex gap-1.5" aria-hidden="true">
                        {steps.map((item, index) => {
                            const done = index < step;
                            const current = index === step;
                            return (
                                <span
                                    key={item.key}
                                    className={cn(
                                        'h-1.5 rounded-full transition-all',
                                        current && 'w-6 bg-accent',
                                        done && !current && 'w-1.5 bg-accent/50',
                                        !done && !current && 'w-1.5 bg-sunken'
                                    )}
                                />
                            );
                        })}
                    </div>
                    <div className="flex gap-2">
                        {step > 0 && (
                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => setStep(step - 1)}>
                                {t('back')}
                            </Button>
                        )}
                        {isLast ? (
                            <Button type="submit" size="sm" disabled={pending}>
                                {pending ? t('creating') : t('start')}
                            </Button>
                        ) : (
                            <Button type="button" size="sm" onClick={() => void goNext()}>
                                {t('next')}
                            </Button>
                        )}
                    </div>
                </div>
            </form>
        </Form>
    );
}
