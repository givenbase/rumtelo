'use client';

import { useEffect, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

import { useLocale, useTranslations } from '@rumtelo/i18n';
import {
    Field,
    FormControl,
    FormField,
    FormItem,
    FormMessage,
    Input,
    Typography,
} from '@rumtelo/ui';
import { cn, currencySymbol, formatMoney } from '@rumtelo/utils';

import { parseLocaleAmount } from '@/app/_lib/money-input';

import { ONBOARDING_CURRENCIES, type OnboardingValues } from '../onboarding-shared';

/** The live echo trails typing by this long, so a screen reader isn't read every keystroke. */
const ECHO_DELAY_MS = 400;

export function IncomeStep() {
    const t = useTranslations('pages.onboarding');
    const locale = useLocale();
    const { control } = useFormContext<OnboardingValues>();
    const currency = useWatch({ control, name: 'currency' });
    const income = useWatch({ control, name: 'monthlyIncome' });

    const [settledIncome, setSettledIncome] = useState(income);
    useEffect(() => {
        const timer = window.setTimeout(() => setSettledIncome(income), ECHO_DELAY_MS);
        return () => window.clearTimeout(timer);
    }, [income]);

    const parsed = parseLocaleAmount(settledIncome, locale);
    const echo = parsed.ok
        ? t('income_echo', { amount: formatMoney(parsed.minor, { currency, locale }) })
        : '';

    return (
        <div className="mt-5 grid gap-5">
            <FormField
                control={control}
                name="currency"
                render={({ field }) => (
                    <FormItem>
                        <div className="grid gap-2">
                            <Typography as="p" variant="eyebrow" id="onboarding-currency-label">
                                {t('currency')}
                            </Typography>
                            <div
                                className="grid grid-cols-3 gap-2"
                                role="radiogroup"
                                aria-labelledby="onboarding-currency-label">
                                {ONBOARDING_CURRENCIES.map(option => {
                                    const on = field.value === option.code;
                                    return (
                                        <button
                                            key={option.code}
                                            type="button"
                                            role="radio"
                                            aria-checked={on}
                                            onClick={() => field.onChange(option.code)}
                                            className={cn(
                                                'grid min-h-12 content-center gap-0.5 rounded-xl border px-2.5 py-2.5 text-center transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
                                                on
                                                    ? 'border-accent bg-accent-soft shadow-[inset_0_0_0_1px] shadow-accent/30'
                                                    : 'border-line bg-raised hover:border-accent'
                                            )}>
                                            <span
                                                className={cn(
                                                    'font-mono text-xs font-bold tracking-wide',
                                                    on ? 'text-accent' : 'text-fg'
                                                )}>
                                                {option.code}
                                            </span>
                                            <span className="font-mono text-[11px] text-fg-muted">
                                                {currencySymbol(option.code)}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={control}
                name="monthlyIncome"
                render={({ field }) => (
                    <FormItem>
                        <Field
                            label={t('net_income_label')}
                            hint={t('net_income_hint')}
                            htmlFor="income">
                            <div className="relative">
                                <span
                                    aria-hidden="true"
                                    className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center font-mono text-sm text-fg-muted">
                                    {currencySymbol(currency)}
                                </span>
                                <FormControl>
                                    <Input
                                        id="income"
                                        inputMode="decimal"
                                        autoComplete="off"
                                        placeholder={t('net_income_placeholder')}
                                        className="pl-9"
                                        {...field}
                                    />
                                </FormControl>
                            </div>
                        </Field>
                        <p
                            aria-live="polite"
                            className={cn('min-h-5 text-sm text-fg-secondary', !echo && 'sr-only')}>
                            {echo}
                        </p>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
    );
}
