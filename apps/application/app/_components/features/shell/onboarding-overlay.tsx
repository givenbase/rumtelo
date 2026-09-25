'use client';

import { api } from '@/app/_lib/api';
import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import {
    Currency,
    DEFAULT_JAR_SPLIT,
    IncomeStability,
    JarKey,
    Locale,
    SpendingStyle,
} from '@rumtelo/contracts';
import { useLocale, useTranslations } from '@rumtelo/i18n';
import {
    Badge,
    Button,
    celebrateFireworks,
    Field,
    Icon,
    Input,
    Typography,
    type IconName,
} from '@rumtelo/ui';
import { cn, currencySymbol, formatMoney } from '@rumtelo/utils';
import { z } from 'zod';

import { useApiError } from '@/app/_lib/api-error-messages';
import { webOrigin } from '@/app/_lib/auth';
import { writeHelpersEnabled } from '@/app/_lib/feature-helpers';
import { jarChrome, jarIcon } from '@/app/_lib/jar-meta';
import { useJarCatalog } from '@/app/_lib/use-jar-catalog';
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

const STEP_ICONS: Record<(typeof STEP_KEYS)[number], IconName> = {
    welcome: 'sparkles',
    income: 'wallet',
    jars: 'target',
    money_style: 'compass',
    why: 'flag',
    coach: 'info',
};

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

const onboardingSchema = z.object({
    householdName: z.string().min(1).max(120),
    currency: z.enum(Currency),
    monthlyIncome: z.string().min(1),
    why: z.string().max(500),
    spendingStyle: z.enum(SpendingStyle),
    incomeStability: z.enum(IncomeStability),
});

type OnboardingValues = z.infer<typeof onboardingSchema>;

function ChoiceCard({
    selected,
    icon,
    label,
    onClick,
}: {
    selected: boolean;
    icon: IconName;
    label: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            aria-pressed={selected}
            onClick={onClick}
            className={cn(
                'flex items-center gap-2.5 rounded-xl border px-3 py-3 text-left transition-all',
                selected
                    ? 'border-accent bg-accent-soft shadow-[inset_0_0_0_1px] shadow-accent/30'
                    : 'border-line bg-raised hover:border-accent/40 hover:bg-card'
            )}>
            <span
                className={cn(
                    'grid size-9 shrink-0 place-items-center rounded-lg border',
                    selected
                        ? 'border-accent/30 bg-surface text-accent'
                        : 'border-line bg-surface text-fg-muted'
                )}>
                <Icon name={icon} size="sm" color="inherit" />
            </span>
            <span
                className={cn(
                    'min-w-0 flex-1 text-sm font-semibold',
                    selected ? 'text-accent' : 'text-fg'
                )}>
                {label}
            </span>
            {selected ? (
                <Icon name="circle-check" size="sm" className="shrink-0 text-accent" />
            ) : null}
        </button>
    );
}

function PointChip({ icon, label }: { icon: IconName; label: string }) {
    return (
        <span className="inline-flex items-center gap-2 rounded-full border border-line bg-raised px-3 py-1.5">
            <Icon name={icon} size="sm" color="primary" />
            <Typography as="span" size="sm" weight="medium">
                {label}
            </Typography>
        </span>
    );
}

export function OnboardingOverlay() {
    const t = useTranslations('pages.onboarding');
    const tRoot = useTranslations();
    const tJars = useTranslations('features.money.jars');
    const apiError = useApiError();
    const appLocale = useLocale();
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

    const { session, householdId, isPending, householdReady, setActiveHousehold, refreshSession } =
        useAuth();
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
        if (isPending || !householdReady) return;
        if (householdId) {
            closeOnboarding();
            return;
        }
        if (session) openOnboarding();
    }, [session, householdId, isPending, householdReady, openOnboarding, closeOnboarding]);

    const defaultHouseholdName = t('household_default');
    const form = useForm<OnboardingValues>({
        resolver: zodResolver(onboardingSchema),
        defaultValues: {
            householdName: defaultHouseholdName,
            currency: Currency.EUR,
            monthlyIncome: '4300',
            why: '',
            spendingStyle: SpendingStyle.UNKNOWN,
            incomeStability: IncomeStability.STABLE,
        },
    });

    const householdName = useWatch({ control: form.control, name: 'householdName' });
    const currency = useWatch({ control: form.control, name: 'currency' });
    const monthlyIncome = useWatch({ control: form.control, name: 'monthlyIncome' });
    const why = useWatch({ control: form.control, name: 'why' });
    const spendingStyle = useWatch({ control: form.control, name: 'spendingStyle' });
    const incomeStability = useWatch({ control: form.control, name: 'incomeStability' });

    const [pending, setPending] = useState(false);
    const [expandedJar, setExpandedJar] = useState<JarKey | null>(null);
    const { jars: catalogJars, byKey: catalogByKey } = useJarCatalog();
    const displayJars = useMemo(() => {
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
    const jarsLearnMoreHref = `${webOrigin()}/${appLocale}#jars`;

    if (!session) return null;
    if (householdId) return null;
    if (!onboardingOpen) return null;

    const step = steps[onboardingStep] ?? steps[0]!;
    const isLast = onboardingStep >= steps.length - 1;

    async function finish(values: OnboardingValues) {
        setPending(true);
        try {
            const minorUnits = Math.round(parseFloat(values.monthlyIncome.replace(',', '.')) * 100);
            const split = displayJars.map(jar => ({ key: jar.key, percentage: jar.pct }));
            const household = await api.household.onboard({
                householdName: values.householdName,
                currency: values.currency,
                locale: Locale.NL,
                spendingStyle: values.spendingStyle,
                incomeStability: values.incomeStability,
                monthlyNetIncome: Number.isFinite(minorUnits) ? minorUnits : 0,
                split,
                why: values.why.trim() || null,
            });

            await celebrateFireworks({ durationMs: 1800, zIndex: 80 });

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
                className="fixed top-1/2 left-1/2 z-71 flex max-h-[90dvh] w-full max-w-md -translate-1/2 animate-rise flex-col overflow-hidden rounded-2xl border border-line-strong bg-surface shadow-xl">
                <div className="min-h-0 flex-1 overflow-y-auto p-6 pb-4">
                    <div className="mb-5 flex items-start justify-between gap-3">
                        <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-accent/20 bg-accent-soft text-accent">
                            <Icon name={step.icon} size="md" color="inherit" />
                        </span>
                        <span className="rounded-full border border-accent/25 bg-accent-soft px-2.5 py-1 font-mono text-[10px] font-semibold tracking-widest text-accent uppercase">
                            {t('step_of', {
                                current: onboardingStep + 1,
                                total: steps.length,
                            })}
                        </span>
                    </div>

                    <Typography as="h2" size="lg" weight="bold">
                        {step.title}
                    </Typography>
                    <Typography as="p" variant="lead" size="sm" className="mt-2">
                        {step.body}
                    </Typography>

                    {onboardingStep === 0 && (
                        <div className="mt-5 flex flex-wrap gap-2">
                            <PointChip icon="target" label={t('welcome_points.jars')} />
                            <PointChip icon="eye" label={t('welcome_points.overview')} />
                            <PointChip icon="sparkles" label={t('welcome_points.coach')} />
                        </div>
                    )}

                    {onboardingStep === 1 && (
                        <div className="mt-5 grid gap-4">
                            <div className="grid gap-2">
                                <Typography as="p" variant="eyebrow">
                                    {t('currency')}
                                </Typography>
                                <div
                                    className="grid grid-cols-3 gap-2"
                                    role="group"
                                    aria-label={t('currency')}>
                                    {ONBOARDING_CURRENCIES.map(option => {
                                        const on = currency === option.code;
                                        return (
                                            <button
                                                key={option.code}
                                                type="button"
                                                aria-pressed={on}
                                                onClick={() =>
                                                    form.setValue('currency', option.code)
                                                }
                                                className={cn(
                                                    'grid gap-1 rounded-xl border px-2.5 py-3 text-center transition-all',
                                                    on
                                                        ? 'border-accent bg-accent-soft shadow-[inset_0_0_0_1px] shadow-accent/30'
                                                        : 'border-line bg-raised hover:border-accent/40'
                                                )}>
                                                <span
                                                    className={cn(
                                                        'font-mono text-xs font-bold tracking-wide',
                                                        on ? 'text-accent' : 'text-fg'
                                                    )}>
                                                    {option.code}
                                                </span>
                                                <span className="font-mono text-[10px] text-fg-muted">
                                                    {formatMoney(430_000, {
                                                        currency: option.code,
                                                        locale: appLocale,
                                                    })}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                                <Typography as="p" variant="caption">
                                    {t('currency_hint')}
                                </Typography>
                            </div>
                            <Field
                                label={t('net_income_label', {
                                    symbol: currencySymbol(currency),
                                })}
                                hint={t('net_income_hint')}
                                htmlFor="income">
                                <Input
                                    id="income"
                                    inputMode="decimal"
                                    value={monthlyIncome}
                                    onChange={event =>
                                        form.setValue('monthlyIncome', event.target.value)
                                    }
                                />
                            </Field>
                            <Field
                                label={t('household_name')}
                                hint={t('household_name_hint')}
                                htmlFor="hh-name">
                                <Input
                                    id="hh-name"
                                    value={householdName}
                                    onChange={event =>
                                        form.setValue('householdName', event.target.value)
                                    }
                                />
                            </Field>
                        </div>
                    )}

                    {onboardingStep === 2 && (
                        <div className="mt-5 grid gap-3">
                            <Typography as="p" size="sm" weight="medium" color="muted">
                                {t('jars_tap_hint')}
                            </Typography>
                            <ul className="grid gap-2">
                                {displayJars.map(jar => {
                                    const open = expandedJar === jar.key;
                                    return (
                                        <li
                                            key={jar.key}
                                            className={cn(
                                                'rounded-xl border transition-colors',
                                                open
                                                    ? 'border-accent/40 bg-accent-soft/30'
                                                    : 'border-line bg-raised'
                                            )}>
                                            <button
                                                type="button"
                                                aria-expanded={open}
                                                onClick={() =>
                                                    setExpandedJar(open ? null : jar.key)
                                                }
                                                className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-card/60">
                                                <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-line bg-card text-lg">
                                                    {jar.icon}
                                                </span>
                                                <span className="grid min-w-0 flex-1 gap-0.5">
                                                    <span className="flex flex-wrap items-center gap-2">
                                                        <span className="truncate text-sm font-bold text-fg">
                                                            {jar.name}
                                                        </span>
                                                        <Badge tone="neutral">{jar.pct}%</Badge>
                                                    </span>
                                                    {jar.subtitle ? (
                                                        <span className="truncate text-xs font-medium text-fg-muted">
                                                            {jar.subtitle}
                                                        </span>
                                                    ) : null}
                                                </span>
                                                <Icon
                                                    name="chevron-down"
                                                    size="sm"
                                                    color="muted"
                                                    className={cn(
                                                        'shrink-0 transition-transform',
                                                        open && 'rotate-180'
                                                    )}
                                                />
                                            </button>
                                            {open && jar.note ? (
                                                <div className="border-t border-line px-3 py-3">
                                                    <Typography
                                                        as="p"
                                                        size="sm"
                                                        weight="medium"
                                                        color="muted">
                                                        {jar.note}
                                                    </Typography>
                                                </div>
                                            ) : null}
                                        </li>
                                    );
                                })}
                            </ul>
                            <a
                                href={jarsLearnMoreHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent underline-offset-2 hover:underline">
                                {t('jars_read_more')}
                                <Icon name="chevron-right" size="sm" color="inherit" />
                            </a>
                        </div>
                    )}

                    {onboardingStep === 3 && (
                        <div className="mt-5 grid gap-5">
                            <div className="grid gap-2">
                                <Typography as="p" variant="eyebrow">
                                    {t('spending_style_label')}
                                </Typography>
                                <div className="grid grid-cols-2 gap-2">
                                    {(
                                        [
                                            {
                                                key: SpendingStyle.SPENDER,
                                                label: t('spending_styles.spender'),
                                                icon: 'wallet' as const,
                                            },
                                            {
                                                key: SpendingStyle.SAVER,
                                                label: t('spending_styles.saver'),
                                                icon: 'shield' as const,
                                            },
                                            {
                                                key: SpendingStyle.BALANCED,
                                                label: t('spending_styles.balanced'),
                                                icon: 'compass' as const,
                                            },
                                            {
                                                key: SpendingStyle.UNKNOWN,
                                                label: t('spending_styles.unknown'),
                                                icon: 'circle-help' as const,
                                            },
                                        ] as const
                                    ).map(option => (
                                        <ChoiceCard
                                            key={option.key}
                                            selected={spendingStyle === option.key}
                                            icon={option.icon}
                                            label={option.label}
                                            onClick={() =>
                                                form.setValue('spendingStyle', option.key)
                                            }
                                        />
                                    ))}
                                </div>
                                <Typography as="p" variant="caption">
                                    {t('spending_style_hint')}
                                </Typography>
                            </div>
                            <div className="grid gap-2">
                                <Typography as="p" variant="eyebrow">
                                    {t('income_stability_label')}
                                </Typography>
                                <div className="grid gap-2">
                                    {(
                                        [
                                            {
                                                key: IncomeStability.STABLE,
                                                label: t('income_stability.stable'),
                                                icon: 'trending-up' as const,
                                            },
                                            {
                                                key: IncomeStability.VARIABLE,
                                                label: t('income_stability.variable'),
                                                icon: 'activity' as const,
                                            },
                                            {
                                                key: IncomeStability.NONE,
                                                label: t('income_stability.none'),
                                                icon: 'circle' as const,
                                            },
                                        ] as const
                                    ).map(option => (
                                        <ChoiceCard
                                            key={option.key}
                                            selected={incomeStability === option.key}
                                            icon={option.icon}
                                            label={option.label}
                                            onClick={() =>
                                                form.setValue('incomeStability', option.key)
                                            }
                                        />
                                    ))}
                                </div>
                                <Typography as="p" variant="caption">
                                    {t('income_stability_hint')}
                                </Typography>
                            </div>
                        </div>
                    )}

                    {onboardingStep === 4 && (
                        <div className="mt-5 grid gap-4">
                            <p className="rounded-xl border border-accent/20 bg-accent-soft/40 px-3.5 py-2.5 text-sm font-medium text-accent">
                                {t('why_tip')}
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {(
                                    [
                                        'why_examples.house',
                                        'why_examples.calm',
                                        'why_examples.free',
                                    ] as const
                                ).map(key => (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => form.setValue('why', t(key))}
                                        className={cn(
                                            'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                                            why === t(key)
                                                ? 'border-accent bg-accent-soft text-accent'
                                                : 'border-line bg-raised text-fg-muted hover:border-accent/40 hover:text-fg'
                                        )}>
                                        {t(key)}
                                    </button>
                                ))}
                            </div>
                            <Field label={t('why_label')} hint={t('why_hint')} htmlFor="why">
                                <Input
                                    id="why"
                                    value={why}
                                    onChange={event => form.setValue('why', event.target.value)}
                                    placeholder={t('why_placeholder')}
                                />
                            </Field>
                        </div>
                    )}

                    {onboardingStep === 5 && (
                        <div className="mt-5 flex flex-wrap gap-2">
                            <PointChip icon="sparkles" label={t('coach_points.tips')} />
                            <PointChip icon="info" label={t('coach_points.open')} />
                            <PointChip icon="check" label={t('coach_points.settings')} />
                        </div>
                    )}
                </div>

                <div className="flex shrink-0 items-center justify-between gap-3 border-t border-line bg-raised/50 px-6 py-4">
                    <div className="flex gap-1.5" aria-hidden="true">
                        {steps.map((item, index) => {
                            const done = index < onboardingStep;
                            const current = index === onboardingStep;
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
                        {onboardingStep > 0 && (
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setOnboardingStep(onboardingStep - 1)}>
                                {t('back')}
                            </Button>
                        )}
                        {isLast ? (
                            <Button
                                size="sm"
                                disabled={pending}
                                onClick={() => void form.handleSubmit(finish)()}>
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
