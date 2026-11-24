'use client';

import { useId } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useWatch } from 'react-hook-form';

import type { AccountSettings } from '@rumtelo/contracts';
import { useTranslations } from '@rumtelo/i18n';
import {
    Button,
    Field,
    Form,
    FormControl,
    FormField,
    FormItem,
    FormMessage,
    Input,
    Textarea,
    Typography,
} from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import { api } from '@/app/_lib/api';
import { useApiError } from '@/app/_lib/api-error-messages';
import { apiQuery } from '@/app/_lib/api-hooks';
import { useHouseholdShell } from '@/components/features/shell/household-shell-context';

import {
    DIRECTION_MAX_LENGTH,
    YEAR_INTENTIONS,
    directionFormSchema,
    directionFormValues,
    directionPatch,
    isNearLimit,
    type DirectionFormValues,
} from '../_utils/direction-form';

/** A counter "12 of 280". Visible to everyone; read out politely only near the limit. */
function Counter({ id, length, label }: { id: string; length: number; label: string }) {
    return (
        <>
            <p id={id} aria-hidden className="text-right text-xs text-fg-muted tabular-nums">
                {label}
            </p>
            <span role="status" aria-live="polite" className="sr-only">
                {isNearLimit(length) ? label : ''}
            </span>
        </>
    );
}

/**
 * The person's own direction: where they want to be a year from now, and what it is for.
 * All of it is optional and saved together; an empty text clears it. Personal: it goes to
 * the account, never to the household.
 */
export function DirectionForm({ settings }: { settings: AccountSettings | null }) {
    const t = useTranslations('features.soul.direction');
    const tForm = useTranslations('features.soul.direction.form');
    const tPlan = useTranslations('features.growth.course.plan');
    const queryClient = useQueryClient();
    const apiError = useApiError();
    const { showToast } = useHouseholdShell();
    const directionId = useId();
    const directionHintId = useId();
    const directionCounterId = useId();
    const whyId = useId();
    const whyHintId = useId();
    const whyCounterId = useId();
    const intentionLabelId = useId();

    const form = useForm<DirectionFormValues>({
        defaultValues: directionFormValues(settings),
        resolver: zodResolver(directionFormSchema),
    });
    const directionLength = (useWatch({ control: form.control, name: 'direction' }) ?? '').length;
    const whyLength = (useWatch({ control: form.control, name: 'directionWhy' }) ?? '').length;

    const save = useMutation({
        mutationFn: (values: DirectionFormValues) =>
            api.account.updateSettings(directionPatch(values)),
        onSuccess: async (_saved, values) => {
            await queryClient.invalidateQueries({ queryKey: apiQuery.account.settings.key() });
            const patch = directionPatch(values);
            // What is stored is the trimmed text: the form now matches it and is clean again.
            form.reset(
                directionFormValues({
                    direction: patch.direction,
                    directionWhy: patch.directionWhy,
                    yearIntention: patch.yearIntention,
                })
            );
            showToast(tForm('saved'), 'success');
        },
        onError: error => showToast(apiError(error), 'error'),
    });

    return (
        <Form {...form}>
            <form
                className="grid min-w-0 gap-5 rounded-2xl border border-line bg-surface p-4 sm:p-5"
                onSubmit={form.handleSubmit(values => save.mutate(values))}
                noValidate>
                <FormField
                    control={form.control}
                    name="direction"
                    render={({ field }) => (
                        <FormItem>
                            <Field label={tForm('direction_label')} htmlFor={directionId}>
                                <FormControl>
                                    <Textarea
                                        {...field}
                                        id={directionId}
                                        rows={3}
                                        maxLength={DIRECTION_MAX_LENGTH}
                                        aria-describedby={`${directionHintId} ${directionCounterId}`}
                                        className="bg-raised"
                                    />
                                </FormControl>
                            </Field>
                            <div className="mt-1.5 flex min-w-0 items-start justify-between gap-3">
                                <p
                                    id={directionHintId}
                                    className="min-w-0 text-xs text-pretty text-fg-muted">
                                    {tForm('direction_hint')}
                                </p>
                                <Counter
                                    id={directionCounterId}
                                    length={directionLength}
                                    label={tForm('counter', {
                                        count: directionLength,
                                        max: DIRECTION_MAX_LENGTH,
                                    })}
                                />
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid gap-3">
                    <div className="grid gap-0.5">
                        <Typography as="h2" id={intentionLabelId} className="text-pretty">
                            {tForm('why_title')}
                        </Typography>
                        <Typography as="p" size="sm" color="muted" className="text-pretty">
                            {tForm('why_lead')}
                        </Typography>
                    </div>

                    <FormField
                        control={form.control}
                        name="yearIntention"
                        render={({ field }) => (
                            <FormItem>
                                <div
                                    role="group"
                                    aria-labelledby={intentionLabelId}
                                    className="flex flex-wrap gap-2">
                                    {YEAR_INTENTIONS.map(intention => {
                                        const selected = field.value === intention;
                                        return (
                                            <button
                                                key={intention}
                                                type="button"
                                                aria-pressed={selected}
                                                // Pressing the chosen one again unselects it.
                                                onClick={() =>
                                                    field.onChange(selected ? null : intention)
                                                }
                                                className={cn(
                                                    'min-h-11 min-w-0 rounded-full border px-4 py-2 text-left text-sm font-medium text-pretty transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
                                                    selected
                                                        ? 'border-accent bg-accent-soft text-accent'
                                                        : 'border-line text-fg hover:border-accent/50'
                                                )}>
                                                {tPlan(`intention_${intention}`)}
                                            </button>
                                        );
                                    })}
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="directionWhy"
                        render={({ field }) => (
                            <FormItem>
                                <Field label={tForm('why_words_label')} htmlFor={whyId}>
                                    <FormControl>
                                        <Input
                                            {...field}
                                            id={whyId}
                                            maxLength={DIRECTION_MAX_LENGTH}
                                            aria-describedby={`${whyHintId} ${whyCounterId}`}
                                            className="bg-raised"
                                        />
                                    </FormControl>
                                </Field>
                                <div className="mt-1.5 flex min-w-0 items-start justify-between gap-3">
                                    <p
                                        id={whyHintId}
                                        className="min-w-0 text-xs text-pretty text-fg-muted">
                                        {tForm('why_words_hint')}
                                    </p>
                                    <Counter
                                        id={whyCounterId}
                                        length={whyLength}
                                        label={tForm('counter', {
                                            count: whyLength,
                                            max: DIRECTION_MAX_LENGTH,
                                        })}
                                    />
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="min-w-0 text-sm text-pretty text-fg-muted">{t('private_note')}</p>
                    <Button
                        type="submit"
                        className="h-12 sm:h-10"
                        disabled={!form.formState.isDirty || save.isPending}>
                        {save.isPending ? tForm('saving') : tForm('save')}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
