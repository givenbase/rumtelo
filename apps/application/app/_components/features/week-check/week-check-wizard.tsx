'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import type { JarBalance } from '@rumtelo/contracts';
import { WeekCheckStage, JarKey } from '@rumtelo/contracts';
import { useTranslations } from '@rumtelo/i18n';
import {
    Button,
    Eyebrow,
    Form,
    FormControl,
    FormField,
    FormItem,
    FormMessage,
    Textarea,
    Typography,
    createFormInvalidHandler,
} from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';
import { zodResolver } from '@hookform/resolvers/zod';

import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';
import { useHouseholdShell } from '@/components/features/shell/household-shell-context';
import {
    createWeekCheckIntendSchema,
    type WeekCheckIntendSchemaValues,
} from '@/components/features/forms/form-zod';

type WizardJar = Pick<JarBalance, 'id' | 'key' | 'name' | 'icon' | 'available' | 'overspent'>;

/**
 * Three-step WEEKTELLING wizard (design: `week-check`).
 *
 * Step 1 — Look: show week recap per jar (available vs plan).
 * Step 2 — Direct: redirect surplus to jars (omitted when surplus is 0).
 * Step 3 — Intend: free-text intention for the coming week (useForm + zod).
 */
export function WeekCheckWizard({
    jars,
    surplus,
    initialStage,
    completedAt,
    initialIntention = '',
    busy = false,
    onStepComplete,
}: {
    jars: readonly WizardJar[];
    surplus: number;
    initialStage?: WeekCheckStage;
    completedAt?: string | null;
    initialIntention?: string;
    busy?: boolean;
    onStepComplete?: (
        stage: WeekCheckStage,
        payload?: {
            intention?: string;
            allocations?: { jarId: string; amount: number }[];
        }
    ) => Promise<unknown>;
}) {
    const t = useTranslations('features.money.week_check');
    const tForm = useTranslations('ui.form');
    const { showToast } = useHouseholdShell();
    const { formatMoney } = useHouseholdCurrency();

    const hasSurplus = surplus > 0;

    const steps = useMemo(() => {
        const all = [
            {
                key: WeekCheckStage.LOOK,
                label: t('look_label'),
                sub: t('look_sub'),
            },
            {
                key: WeekCheckStage.REDIRECT,
                label: t('direct_label'),
                sub: t('direct_sub'),
            },
            {
                key: WeekCheckStage.INTEND,
                label: t('intend_label'),
                sub: t('intend_sub'),
            },
        ] as const;
        // No surplus → nothing to direct; skip that step entirely.
        return hasSurplus
            ? [...all]
            : all.filter(stageItem => stageItem.key !== WeekCheckStage.REDIRECT);
    }, [t, hasSurplus]);

    const stageIndex = (() => {
        if (!initialStage || initialStage === WeekCheckStage.DONE) return 0;
        // Resume on skipped Direct → land on Intend.
        if (!hasSurplus && initialStage === WeekCheckStage.REDIRECT) {
            return Math.max(
                0,
                steps.findIndex(stageItem => stageItem.key === WeekCheckStage.INTEND)
            );
        }
        const index = steps.findIndex(stageItem => stageItem.key === initialStage);
        return Math.max(0, index);
    })();
    const [step, setStep] = useState(stageIndex);
    const [redirectJarId, setRedirectJarId] = useState<string | null>(null);
    /** Local flag so the done panel shows before the current-query refetch lands. */
    const [finished, setFinished] = useState(false);
    const done = finished || Boolean(completedAt) || initialStage === WeekCheckStage.DONE;

    const intendSchema = useMemo(() => createWeekCheckIntendSchema(tForm), [tForm]);
    const form = useForm<WeekCheckIntendSchemaValues>({
        defaultValues: { intention: initialIntention },
        resolver: zodResolver(intendSchema),
    });
    const intentionWatch = useWatch({ control: form.control, name: 'intention' }) ?? '';

    const onInvalid = createFormInvalidHandler(
        ({ title, description }) => {
            showToast(description ?? title, 'error');
        },
        {
            title: tForm('incomplete_title'),
            description: tForm('incomplete_description'),
        }
    );

    const safeStep = Math.min(step, steps.length - 1);
    const current = steps[safeStep]!;

    async function goNext() {
        if (onStepComplete) {
            const payload =
                current.key === WeekCheckStage.REDIRECT && redirectJarId && hasSurplus
                    ? { allocations: [{ jarId: redirectJarId, amount: surplus }] }
                    : undefined;
            // Skip Direct on the server too when there is nothing to redirect.
            if (current.key === WeekCheckStage.LOOK && !hasSurplus) {
                await onStepComplete(WeekCheckStage.LOOK);
                await onStepComplete(WeekCheckStage.REDIRECT);
            } else {
                await onStepComplete(current.key, payload);
            }
        }
        if (safeStep < steps.length - 1) setStep(safeStep + 1);
    }

    async function finish(values: WeekCheckIntendSchemaValues) {
        await onStepComplete?.(WeekCheckStage.DONE, {
            intention: values.intention.trim(),
        });
        setFinished(true);
    }

    if (done) {
        const intention = (initialIntention || form.getValues('intention')).trim();
        return (
            <div className="grid gap-6">
                <div className="animate-rise rounded-2xl border border-line bg-surface p-6 shadow-md">
                    <Eyebrow>{t('done_eyebrow')}</Eyebrow>
                    <Typography as="h2" className="mt-1.5">
                        {t('done_title')}
                    </Typography>
                    <Typography as="p" size="sm" color="muted" className="mt-1">
                        {t('done_lead')}
                    </Typography>
                    {intention ? (
                        <div className="mt-5 rounded-xl border border-line bg-raised px-4 py-3">
                            <Typography as="p" size="xs" color="muted" className="mb-1">
                                {t('done_intention_label')}
                            </Typography>
                            <Typography as="p" size="sm" weight="medium">
                                {intention}
                            </Typography>
                        </div>
                    ) : null}
                </div>
                <div className="flex justify-end">
                    <Button as={Link} href="/">
                        {t('done_home')}
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <Form {...form}>
            <div className="grid gap-6">
                {/* Step indicator strip */}
                <div className="flex items-stretch overflow-hidden rounded-2xl border border-line bg-surface shadow-md">
                    {steps.map((stageItem, i) => (
                        <button
                            key={stageItem.key}
                            type="button"
                            onClick={() => setStep(i)}
                            className={cn(
                                'flex flex-1 flex-col gap-1 border-r border-line px-5 py-4 text-left transition-colors last:border-r-0',
                                i === safeStep
                                    ? 'bg-accent-soft'
                                    : i < safeStep
                                      ? 'hover:bg-raised'
                                      : 'hover:bg-raised'
                            )}>
                            <Typography
                                as="span"
                                variant="eyebrow"
                                weight="semibold"
                                color={i === safeStep ? 'primary' : 'muted'}
                                className={cn(i !== safeStep && 'text-fg-faint')}>
                                {t('step', { n: i + 1 })}
                            </Typography>
                            <Typography
                                as="h4"
                                weight="semibold"
                                color={i === safeStep ? 'default' : 'secondary'}
                                className="text-sm">
                                {stageItem.label}
                            </Typography>
                            <Typography
                                as="span"
                                size="xs"
                                color="muted"
                                className="leading-tight text-fg-faint">
                                {stageItem.sub}
                            </Typography>
                            <span
                                className={cn(
                                    'mt-2 h-0.5 rounded-full transition-colors',
                                    i === safeStep
                                        ? 'bg-accent'
                                        : i < safeStep
                                          ? 'bg-success'
                                          : 'bg-sunken'
                                )}
                            />
                        </button>
                    ))}
                </div>

                {/* Step content */}
                <div className="animate-rise rounded-2xl border border-line bg-surface p-6 shadow-md">
                    {current.key === WeekCheckStage.LOOK && (
                        <div className="grid gap-5">
                            <div>
                                <Eyebrow>{t('look_eyebrow')}</Eyebrow>
                                <Typography as="h2" className="mt-1.5">
                                    {t('look_title')}
                                </Typography>
                                <Typography as="p" size="sm" color="muted" className="mt-1">
                                    {t('look_lead')}
                                </Typography>
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

                    {current.key === WeekCheckStage.REDIRECT && hasSurplus && (
                        <div className="grid gap-5">
                            <div>
                                <Eyebrow>{t('direct_eyebrow')}</Eyebrow>
                                <Typography as="h2" className="mt-1.5">
                                    {t('direct_title')}
                                </Typography>
                                <Typography as="p" size="sm" color="muted" className="mt-1">
                                    {t('direct_surplus', { amount: formatMoney(surplus) })}
                                </Typography>
                            </div>
                            <div className="grid gap-2">
                                {jars
                                    .filter(j => j.key !== JarKey.NECESSITIES)
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
                                                type="button"
                                                variant={
                                                    redirectJarId === jar.id
                                                        ? 'primary'
                                                        : 'secondary'
                                                }
                                                size="sm"
                                                className="h-8 px-3 text-xs"
                                                onClick={() => setRedirectJarId(jar.id)}>
                                                {redirectJarId === jar.id
                                                    ? tForm('selected')
                                                    : t('send_here')}
                                            </Button>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    )}

                    {current.key === WeekCheckStage.INTEND && (
                        <div className="grid gap-5">
                            <div>
                                <Eyebrow>{t('intend_eyebrow')}</Eyebrow>
                                <Typography as="h2" className="mt-1.5">
                                    {t('intend_title')}
                                </Typography>
                                <Typography as="p" size="sm" color="muted" className="mt-1">
                                    {t('intend_lead')}
                                </Typography>
                            </div>
                            <FormField
                                control={form.control}
                                name="intention"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <Textarea
                                                rows={4}
                                                maxLength={280}
                                                placeholder={t('intend_placeholder')}
                                                aria-label={t('intend_aria')}
                                                className="bg-raised"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            {intentionWatch.trim().length > 0 &&
                            !form.formState.errors.intention ? (
                                <Typography as="p" size="xs" color="muted">
                                    {t('intend_encourage')}
                                </Typography>
                            ) : null}
                        </div>
                    )}
                </div>

                {/* Navigation row */}
                <div className="flex items-center justify-between gap-3">
                    {safeStep > 0 ? (
                        <Button
                            type="button"
                            variant="ghost"
                            disabled={busy}
                            onClick={() => setStep(safeStep - 1)}>
                            {t('back')}
                        </Button>
                    ) : (
                        <span />
                    )}

                    {safeStep < steps.length - 1 ? (
                        <Button type="button" disabled={busy} onClick={() => void goNext()}>
                            {busy ? tForm('working') : t('next')}
                        </Button>
                    ) : (
                        <Button
                            type="button"
                            disabled={busy || form.formState.isSubmitting}
                            onClick={() => void form.handleSubmit(finish, onInvalid)()}>
                            {busy || form.formState.isSubmitting ? tForm('working') : t('complete')}
                        </Button>
                    )}
                </div>
            </div>
        </Form>
    );
}
