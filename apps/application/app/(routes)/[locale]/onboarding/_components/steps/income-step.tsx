'use client';

import { useFormContext, useWatch } from 'react-hook-form';

import { useTranslations } from '@rumtelo/i18n';
import {
    Field,
    FormControl,
    FormField,
    FormItem,
    FormMessage,
    Input,
    Typography,
} from '@rumtelo/ui';
import { cn, currencySymbol } from '@rumtelo/utils';

import { ONBOARDING_CURRENCIES, type OnboardingValues } from '../onboarding-shared';

export function IncomeStep() {
    const t = useTranslations('pages.onboarding');
    const { control } = useFormContext<OnboardingValues>();
    const currency = useWatch({ control, name: 'currency' });

    return (
        <div className="mt-5 grid gap-4">
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
                                role="group"
                                aria-labelledby="onboarding-currency-label">
                                {ONBOARDING_CURRENCIES.map(option => {
                                    const on = field.value === option.code;
                                    return (
                                        <button
                                            key={option.code}
                                            type="button"
                                            aria-pressed={on}
                                            onClick={() => field.onChange(option.code)}
                                            className={cn(
                                                'grid gap-0.5 rounded-xl border px-2.5 py-3 text-center transition-all',
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
                            <Typography as="p" variant="caption">
                                {t('currency_hint')}
                            </Typography>
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
                            label={t('net_income_label', {
                                symbol: currencySymbol(currency),
                            })}
                            hint={t('net_income_hint')}
                            htmlFor="income">
                            <FormControl>
                                <Input id="income" inputMode="decimal" {...field} />
                            </FormControl>
                        </Field>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={control}
                name="householdName"
                render={({ field }) => (
                    <FormItem>
                        <Field
                            label={t('household_name')}
                            hint={t('household_name_hint')}
                            htmlFor="hh-name">
                            <FormControl>
                                <Input id="hh-name" {...field} />
                            </FormControl>
                        </Field>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
    );
}
