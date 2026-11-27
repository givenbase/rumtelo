'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';

import { zodResolver } from '@hookform/resolvers/zod';
import {
    Currency,
    IncomeStability,
    SpendingStyle,
    fromIntlLocale,
    type OnboardingSplitPreview,
} from '@rumtelo/contracts';
import { useLocale, useTranslations } from '@rumtelo/i18n';
import { Button, Form, Icon, Typography, celebrateFireworks } from '@rumtelo/ui';
import { formatMoney } from '@rumtelo/utils';

import { api } from '@/app/_lib/api';
import { useApiError } from '@/app/_lib/api-error-messages';
import { writeHelpersEnabled } from '@/app/_lib/feature-helpers';
import { parseLocaleAmount } from '@/app/_lib/money-input';
import { useAuth } from '@/components/features/shell/auth-provider';
import { useHouseholdShell } from '@/components/features/shell/household-shell-context';

import {
    SPLIT_STEP_PARAM,
    createOnboardingSchema,
    type OnboardingScreen,
    type OnboardingValues,
} from './onboarding-shared';
import { IncomeStep } from './steps/income-step';
import { SplitStep } from './steps/split-step';

const TOTAL_SCREENS = 2;

/** The preview is keyed by what produced it, so Back then Next doesn't call the server again. */
function previewKeyOf(currency: Currency, minor: number): string {
    return `${currency}:${minor}`;
}

/**
 * Onboarding in two screens: net income, then the split in money.
 * `previewSplit` shows the numbers (nothing is written); one `onboard` call creates the
 * household, jars, income and the main account, and the user lands on Home.
 */
export function OnboardingFlow() {
    const t = useTranslations('pages.onboarding');
    const tUi = useTranslations();
    const locale = useLocale();
    const apiError = useApiError();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { session, setActiveHousehold, refreshSession } = useAuth();
    const { showToast } = useHouseholdShell();
    const titleRef = useRef<HTMLHeadingElement>(null);

    const [preview, setPreview] = useState<{
        key: string;
        data: OnboardingSplitPreview;
    } | null>(null);
    // Without a preview (a reload on ?step=split) the split screen has nothing to show.
    const screen: OnboardingScreen =
        searchParams.get('step') === SPLIT_STEP_PARAM && preview ? 'split' : 'income';

    const schema = useMemo(
        () => createOnboardingSchema(locale, key => t(key as 'income_error_empty')),
        [locale, t]
    );
    const form = useForm<OnboardingValues>({
        resolver: zodResolver(schema),
        defaultValues: { currency: Currency.EUR, monthlyIncome: '' },
    });

    const previewSplit = useMutation({
        mutationFn: (input: { currency: Currency; minor: number }) =>
            api.household.previewSplit({
                currency: input.currency,
                monthlyNetIncome: input.minor,
            }),
        onSuccess: (data, input) => {
            setPreview({ key: previewKeyOf(input.currency, input.minor), data });
            router.push(`${pathname}?step=${SPLIT_STEP_PARAM}`);
        },
        onError: error => showToast(apiError(error), 'error'),
    });

    const onboard = useMutation({
        mutationFn: async (data: OnboardingSplitPreview) => {
            const firstName = session?.user?.name?.trim().split(/\s+/)[0] ?? '';
            const household = await api.household.onboard({
                householdName: firstName
                    ? t('household_default_named', { name: firstName })
                    : t('household_default'),
                currency: data.currency,
                locale: fromIntlLocale(locale),
                spendingStyle: SpendingStyle.UNKNOWN,
                incomeStability: IncomeStability.STABLE,
                monthlyNetIncome: data.monthlyNetIncome,
                // Create exactly what screen 2 showed.
                split: data.jars.map(jar => ({ key: jar.key, percentage: jar.percentage })),
                why: null,
            });
            return household;
        },
        onSuccess: async household => {
            await celebrateFireworks({ durationMs: 1200, zIndex: 80 });
            await setActiveHousehold(household.id);
            await refreshSession();
            writeHelpersEnabled(true);
            showToast(t('household_created'), 'success');
            router.replace('/');
        },
        onError: error => showToast(apiError(error), 'error'),
    });

    useEffect(() => {
        titleRef.current?.focus({ preventScroll: true });
    }, [screen]);

    async function goToSplit(values: OnboardingValues) {
        const parsed = parseLocaleAmount(values.monthlyIncome, locale);
        if (!parsed.ok) return;
        const key = previewKeyOf(values.currency, parsed.minor);
        if (preview?.key === key) {
            router.push(`${pathname}?step=${SPLIT_STEP_PARAM}`);
            return;
        }
        previewSplit.mutate({ currency: values.currency, minor: parsed.minor });
    }

    const splitData = preview?.data ?? null;
    const titleAmount = splitData
        ? formatMoney(splitData.monthlyNetIncome, { currency: splitData.currency, locale })
        : '';
    const busy = onboard.isPending || onboard.isSuccess;

    return (
        <Form {...form}>
            <form
                className="flex flex-col"
                onSubmit={event => {
                    event.preventDefault();
                    if (screen === 'income') void form.handleSubmit(goToSplit)(event);
                    else if (splitData && !busy) onboard.mutate(splitData);
                }}
                noValidate>
                <div className="min-h-0 flex-1 p-6 pb-4">
                    <div className="mb-5 flex items-start justify-between gap-3">
                        <span
                            aria-hidden="true"
                            className="grid size-11 shrink-0 place-items-center rounded-2xl border border-accent/20 bg-accent-soft text-accent">
                            <Icon
                                name={screen === 'income' ? 'wallet' : 'target'}
                                size="md"
                                color="inherit"
                            />
                        </span>
                        <span className="rounded-full border border-accent/25 bg-accent-soft px-2.5 py-1 font-mono text-[10px] font-semibold tracking-widest text-accent uppercase">
                            {t('step_of', {
                                current: screen === 'income' ? 1 : 2,
                                total: TOTAL_SCREENS,
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
                        {screen === 'income'
                            ? t('income')
                            : t('split_title', { amount: titleAmount })}
                    </Typography>
                    <Typography as="p" variant="lead" size="sm" className="mt-2">
                        {screen === 'income' ? t('income_lead') : t('split_lead')}
                    </Typography>

                    {screen === 'income' ? <IncomeStep /> : null}
                    {screen === 'split' && splitData ? <SplitStep preview={splitData} /> : null}

                    {previewSplit.isError && screen === 'income' ? (
                        <p
                            role="alert"
                            className="mt-4 rounded-lg border border-danger bg-danger/5 px-4 py-3 text-sm text-danger">
                            {t('split_error')}
                        </p>
                    ) : null}
                    {onboard.isError && screen === 'split' ? (
                        <p
                            role="alert"
                            className="mt-4 rounded-lg border border-danger bg-danger/5 px-4 py-3 text-sm text-danger">
                            {t('onboard_error')}
                        </p>
                    ) : null}
                </div>

                <div className="sticky bottom-0 flex shrink-0 items-center justify-between gap-3 border-t border-line bg-raised/95 px-6 py-4 backdrop-blur">
                    <div className="flex gap-1.5" aria-hidden="true">
                        {[0, 1].map(index => {
                            const current = (screen === 'income' ? 0 : 1) === index;
                            return (
                                <span
                                    key={index}
                                    className={
                                        current
                                            ? 'h-1.5 w-6 rounded-full bg-accent transition-all'
                                            : 'h-1.5 w-1.5 rounded-full bg-sunken transition-all'
                                    }
                                />
                            );
                        })}
                    </div>
                    <div className="flex gap-2">
                        {screen === 'split' ? (
                            <Button
                                type="button"
                                variant="secondary"
                                disabled={busy}
                                className="h-12 sm:h-10"
                                onClick={() => router.back()}>
                                {t('back')}
                            </Button>
                        ) : null}
                        {screen === 'income' ? (
                            <Button
                                type="submit"
                                disabled={previewSplit.isPending}
                                aria-busy={previewSplit.isPending}
                                className="h-12 sm:h-10">
                                {previewSplit.isPending ? tUi('ui.form.working') : t('next')}
                            </Button>
                        ) : (
                            <Button
                                type="submit"
                                disabled={busy}
                                aria-busy={busy}
                                className="h-12 sm:h-10">
                                {busy
                                    ? t('split_cta_pending')
                                    : onboard.isError
                                      ? tUi('ui.button.actions.try_again')
                                      : t('split_cta')}
                            </Button>
                        )}
                    </div>
                </div>
            </form>
        </Form>
    );
}
