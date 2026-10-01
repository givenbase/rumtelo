'use client';

import { useFormContext, useWatch } from 'react-hook-form';

import { useTranslations } from '@rumtelo/i18n';
import { Field, FormControl, FormField, FormItem, FormMessage, Input } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import { type OnboardingValues } from '../onboarding-shared';

const WHY_EXAMPLE_KEYS = ['why_examples.house', 'why_examples.calm', 'why_examples.free'] as const;

export function WhyStep() {
    const t = useTranslations('pages.onboarding');
    const { control, setValue } = useFormContext<OnboardingValues>();
    const why = useWatch({ control, name: 'why' }) ?? '';

    return (
        <div className="mt-5 grid gap-4">
            <p className="rounded-xl border border-accent/20 bg-accent-soft/40 px-3.5 py-2.5 text-sm font-medium text-accent">
                {t('why_tip')}
            </p>
            <div className="flex flex-wrap gap-2" role="group" aria-label={t('why_label')}>
                {WHY_EXAMPLE_KEYS.map(key => {
                    const label = t(key);
                    const selected = why === label;
                    return (
                        <button
                            key={key}
                            type="button"
                            aria-pressed={selected}
                            onClick={() =>
                                setValue('why', label, { shouldDirty: true, shouldValidate: true })
                            }
                            className={cn(
                                'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                                selected
                                    ? 'border-accent bg-accent-soft text-accent'
                                    : 'border-line bg-raised text-fg-muted hover:border-accent hover:text-fg'
                            )}>
                            {label}
                        </button>
                    );
                })}
            </div>
            <FormField
                control={control}
                name="why"
                render={({ field }) => (
                    <FormItem>
                        <Field label={t('why_label')} hint={t('why_hint')} htmlFor="why">
                            <FormControl>
                                <Input id="why" {...field} placeholder={t('why_placeholder')} />
                            </FormControl>
                        </Field>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
    );
}
