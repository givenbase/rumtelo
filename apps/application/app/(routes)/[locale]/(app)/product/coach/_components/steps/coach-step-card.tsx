'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';

import type { CoachStep } from '@rumtelo/contracts';
import { EnergyMetric, WeekCheckStage } from '@rumtelo/contracts';
import { useTranslations } from '@rumtelo/i18n';
import { Button, Typography } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import { useApiError } from '@/app/_lib/api-error-messages';
import { api } from '@/app/_lib/api';
import { apiQuery } from '@/app/_lib/api-hooks';
import { useAppShell } from '@/components/features/shell/app-shell-context';

import { typicalDayEntries } from '../../_utils/typical-day';
import { CoachVoiceControls } from '../coach-voice-controls';

const SCORE_CHIPS = [
    { value: 25, labelKey: 'score_low' as const },
    { value: 50, labelKey: 'score_ok' as const },
    { value: 75, labelKey: 'score_good' as const },
    { value: 100, labelKey: 'score_great' as const },
];

type Props = {
    householdId: string;
    step: CoachStep;
    progressLabel: string;
    onAdvanced: () => void;
};

async function invalidateCoach(queryClient: ReturnType<typeof useQueryClient>) {
    await Promise.all([
        queryClient.invalidateQueries({ queryKey: apiQuery.coach.session.key() }),
        queryClient.invalidateQueries({ queryKey: apiQuery.coach.feed.key() }),
    ]);
}

/**
 * One fillable Coach card — prompt + structured answer; writes go through product APIs.
 * Remount on step change so draft / voice confirm state resets without an effect.
 */
export function CoachStepCard(props: Props) {
    return <CoachStepCardInner key={props.step.id} {...props} />;
}

function CoachStepCardInner({ householdId, step, progressLabel, onAdvanced }: Props) {
    const t = useTranslations('features.coach.session');
    const apiError = useApiError();
    const queryClient = useQueryClient();
    const { showToast } = useAppShell();
    const [text, setText] = useState('');
    const [heard, setHeard] = useState('');
    const [pendingConfirm, setPendingConfirm] = useState<string | null>(null);

    const fail = (error: unknown) => showToast(apiError(error), 'error');

    const sortInbox = useMutation({
        mutationFn: (jarId: string) => {
            if (step.payload.type !== 'inbox_sort') throw new Error('bad step');
            return api.money.transactions.sort({
                householdId,
                transactionId: step.payload.transactionId,
                jarId,
                createRule: false,
            });
        },
        onSuccess: async () => {
            await Promise.all([
                invalidateCoach(queryClient),
                queryClient.invalidateQueries({ queryKey: apiQuery.money.transactions.list.key() }),
            ]);
            showToast(t('toast_sorted'), 'success');
            onAdvanced();
        },
        onError: fail,
    });

    const billAction = useMutation({
        mutationFn: async (action: 'paid' | 'skip') => {
            if (step.payload.type !== 'due_bill') throw new Error('bad step');
            const input = {
                householdId,
                fixedCostId: step.payload.fixedCostId,
                period: step.payload.period,
            };
            return action === 'paid'
                ? api.money.fixedCosts.markPaid(input)
                : api.money.fixedCosts.skip(input);
        },
        onSuccess: async (_data, action) => {
            await Promise.all([
                invalidateCoach(queryClient),
                queryClient.invalidateQueries({ queryKey: apiQuery.money.fixedCosts.list.key() }),
            ]);
            showToast(action === 'paid' ? t('toast_paid') : t('toast_skipped'), 'success');
            onAdvanced();
        },
        onError: fail,
    });

    const timeTypical = useMutation({
        mutationFn: async () => {
            const templates = await api.energy.timeTemplates.list({ householdId });
            const days =
                step.payload.type === 'time_catch_up'
                    ? step.payload.days.map(day => day.on)
                    : step.payload.type === 'time_day'
                      ? [step.payload.on]
                      : [];
            await Promise.all(
                days.map(async on => {
                    const entries = typicalDayEntries(templates, on);
                    if (!entries) throw new Error(t('toast_need_templates'));
                    return api.energy.time.create({ householdId, on, entries });
                })
            );
        },
        onSuccess: async () => {
            await Promise.all([
                invalidateCoach(queryClient),
                queryClient.invalidateQueries({ queryKey: apiQuery.energy.time.list.key() }),
                queryClient.invalidateQueries({ queryKey: apiQuery.energy.time.summary.key() }),
            ]);
            showToast(t('toast_time_logged'), 'success');
            onAdvanced();
        },
        onError: fail,
    });

    const gratitude = useMutation({
        mutationFn: (line: string) => {
            if (step.payload.type !== 'gratitude') throw new Error('bad step');
            return api.soul.gratitude.create({
                householdId,
                week: step.payload.week,
                text: line,
            });
        },
        onSuccess: async () => {
            await Promise.all([
                invalidateCoach(queryClient),
                queryClient.invalidateQueries({ queryKey: apiQuery.soul.gratitude.list.key() }),
            ]);
            showToast(t('toast_gratitude'), 'success');
            onAdvanced();
        },
        onError: fail,
    });

    const score = useMutation({
        mutationFn: (value: number) => {
            if (step.payload.type !== 'energy_score') throw new Error('bad step');
            return api.energy.logs.create({
                householdId,
                on: step.payload.on,
                metric: step.payload.metric,
                value,
                note: null,
            });
        },
        onSuccess: async () => {
            await Promise.all([
                invalidateCoach(queryClient),
                queryClient.invalidateQueries({ queryKey: apiQuery.energy.logs.summary.key() }),
            ]);
            showToast(t('toast_score'), 'success');
            onAdvanced();
        },
        onError: fail,
    });

    const weekCheck = useMutation({
        mutationFn: (input: {
            stage: WeekCheckStage;
            intention?: string;
            allocations?: { jarId: string; amount: number }[];
        }) => {
            const week =
                step.payload.type === 'week_check_look' ||
                step.payload.type === 'week_check_redirect' ||
                step.payload.type === 'week_check_intend'
                    ? step.payload.week
                    : '';
            return api.money.weekCheck.advance({
                householdId,
                week,
                stage: input.stage,
                intention: input.intention,
                allocations: input.allocations,
            });
        },
        onSuccess: async () => {
            await Promise.all([
                invalidateCoach(queryClient),
                queryClient.invalidateQueries({ queryKey: apiQuery.money.weekCheck.current.key() }),
            ]);
            showToast(t('toast_week_check'), 'success');
            onAdvanced();
        },
        onError: fail,
    });

    const busy =
        sortInbox.isPending ||
        billAction.isPending ||
        timeTypical.isPending ||
        gratitude.isPending ||
        score.isPending ||
        weekCheck.isPending;

    const applyHeard = (transcript: string) => {
        setHeard(transcript);
        const lower = transcript.toLowerCase();

        if (step.input === 'jar_pick' && step.payload.type === 'inbox_sort') {
            const match = step.payload.jars.find(
                jar =>
                    lower.includes(jar.name.toLowerCase()) || lower.includes(jar.key.toLowerCase())
            );
            if (match) setPendingConfirm(match.id);
            return;
        }
        if (step.input === 'paid_skip') {
            if (/\b(paid|betaald|yes|ja)\b/.test(lower)) setPendingConfirm('paid');
            else if (/\b(skip|overslaan|nee|no)\b/.test(lower)) setPendingConfirm('skip');
            return;
        }
        if (step.input === 'yes_typical') {
            if (/\b(yes|ja|typical|typisch)\b/.test(lower)) setPendingConfirm('yes');
            return;
        }
        if (step.input === 'gratitude_text' || step.input === 'week_check_intend') {
            setText(transcript);
            return;
        }
        if (step.input === 'score_chips') {
            if (/\b(great|uitstekend|100)\b/.test(lower)) setPendingConfirm('100');
            else if (/\b(good|goed|75)\b/.test(lower)) setPendingConfirm('75');
            else if (/\b(ok|okay|50)\b/.test(lower)) setPendingConfirm('50');
            else if (/\b(low|laag|25)\b/.test(lower)) setPendingConfirm('25');
        }
    };

    const confirmHeard = () => {
        if (!pendingConfirm) return;
        if (step.input === 'jar_pick') sortInbox.mutate(pendingConfirm);
        else if (step.input === 'paid_skip')
            billAction.mutate(pendingConfirm === 'paid' ? 'paid' : 'skip');
        else if (step.input === 'yes_typical') timeTypical.mutate();
        else if (step.input === 'score_chips') score.mutate(Number(pendingConfirm));
        setPendingConfirm(null);
    };

    return (
        <section className="grid gap-4 rounded-2xl border border-accent/30 bg-surface px-5 py-5 shadow-md">
            <div className="flex flex-wrap items-start justify-between gap-2">
                <Typography as="span" variant="eyebrow" color="primary">
                    {t('card_eyebrow')}
                </Typography>
                <Typography as="span" size="sm" color="muted">
                    {progressLabel}
                </Typography>
            </div>

            <Typography as="h2" className="leading-snug">
                {step.prompt}
            </Typography>

            <CoachVoiceControls prompt={step.prompt} voice={step.voice} onHeard={applyHeard} />

            {heard || pendingConfirm ? (
                <div className="grid gap-2 rounded-xl border border-line bg-raised/40 px-3 py-2.5">
                    {heard ? (
                        <Typography as="p" size="sm" color="muted">
                            {t('voice_heard', { text: heard })}
                        </Typography>
                    ) : null}
                    {pendingConfirm ? (
                        <div className="flex flex-wrap gap-2">
                            <Button type="button" size="sm" disabled={busy} onClick={confirmHeard}>
                                {t('voice_confirm')}
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                    setPendingConfirm(null);
                                    setHeard('');
                                }}>
                                {t('voice_discard')}
                            </Button>
                        </div>
                    ) : null}
                </div>
            ) : null}

            {step.input === 'jar_pick' && step.payload.type === 'inbox_sort' ? (
                <div className="flex flex-wrap gap-2">
                    {step.payload.jars.map(jar => (
                        <button
                            key={jar.id}
                            type="button"
                            disabled={busy}
                            onClick={() => sortInbox.mutate(jar.id)}
                            className={cn(
                                'rounded-full border border-line px-3.5 py-2 text-sm transition-colors hover:border-accent hover:bg-accent-soft',
                                pendingConfirm === jar.id && 'border-accent bg-accent-soft'
                            )}>
                            {jar.name}
                        </button>
                    ))}
                </div>
            ) : null}

            {step.input === 'paid_skip' ? (
                <div className="flex flex-wrap gap-2">
                    <Button type="button" disabled={busy} onClick={() => billAction.mutate('paid')}>
                        {t('paid')}
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => billAction.mutate('skip')}>
                        {t('skip')}
                    </Button>
                </div>
            ) : null}

            {step.input === 'yes_typical' ? (
                <div className="flex flex-wrap gap-2">
                    <Button type="button" disabled={busy} onClick={() => timeTypical.mutate()}>
                        {t('yes_typical')}
                    </Button>
                    {step.href ? (
                        <Link
                            href={step.href}
                            className="inline-flex items-center text-sm font-medium text-accent hover:underline">
                            {step.hrefLabel ?? t('adjust')}
                        </Link>
                    ) : null}
                </div>
            ) : null}

            {step.input === 'gratitude_text' ? (
                <form
                    className="grid gap-3"
                    onSubmit={event => {
                        event.preventDefault();
                        const line = text.trim();
                        if (line) gratitude.mutate(line);
                    }}>
                    <input
                        value={text}
                        onChange={event => setText(event.target.value)}
                        maxLength={280}
                        placeholder={t('gratitude_placeholder')}
                        className="w-full rounded-xl border border-line bg-raised px-3.5 py-2.5 text-sm outline-none focus:border-accent"
                    />
                    <Button type="submit" disabled={busy || !text.trim()}>
                        {t('save')}
                    </Button>
                </form>
            ) : null}

            {step.input === 'score_chips' && step.payload.type === 'energy_score' ? (
                <div className="grid gap-2">
                    <Typography as="p" size="sm" color="muted">
                        {metricHint(step.payload.metric, t)}
                    </Typography>
                    <div className="flex flex-wrap gap-2">
                        {SCORE_CHIPS.map(chip => (
                            <button
                                key={chip.value}
                                type="button"
                                disabled={busy}
                                onClick={() => score.mutate(chip.value)}
                                className="rounded-full border border-line px-3.5 py-2 text-sm transition-colors hover:border-accent hover:bg-accent-soft">
                                {t(chip.labelKey)}
                            </button>
                        ))}
                    </div>
                </div>
            ) : null}

            {step.input === 'week_check_look' ? (
                <div className="flex flex-wrap gap-2">
                    <Button
                        type="button"
                        disabled={busy}
                        onClick={() => weekCheck.mutate({ stage: WeekCheckStage.REDIRECT })}>
                        {t('look_continue')}
                    </Button>
                    {step.href ? (
                        <Link
                            href={step.href}
                            className="inline-flex items-center text-sm font-medium text-accent hover:underline">
                            {step.hrefLabel}
                        </Link>
                    ) : null}
                </div>
            ) : null}

            {step.input === 'week_check_redirect' && step.payload.type === 'week_check_redirect' ? (
                <div className="grid gap-3">
                    {step.payload.surplus > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {step.payload.jars.map(jar => (
                                <button
                                    key={jar.id}
                                    type="button"
                                    disabled={busy}
                                    onClick={() =>
                                        weekCheck.mutate({
                                            stage: WeekCheckStage.INTEND,
                                            allocations: [
                                                {
                                                    jarId: jar.id,
                                                    amount:
                                                        step.payload.type === 'week_check_redirect'
                                                            ? step.payload.surplus
                                                            : 0,
                                                },
                                            ],
                                        })
                                    }
                                    className="rounded-full border border-line px-3.5 py-2 text-sm transition-colors hover:border-accent hover:bg-accent-soft">
                                    {jar.name}
                                </button>
                            ))}
                        </div>
                    ) : null}
                    <Button
                        type="button"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => weekCheck.mutate({ stage: WeekCheckStage.INTEND })}>
                        {t('redirect_skip')}
                    </Button>
                </div>
            ) : null}

            {step.input === 'week_check_intend' ? (
                <form
                    className="grid gap-3"
                    onSubmit={event => {
                        event.preventDefault();
                        const intention = text.trim();
                        if (!intention) return;
                        weekCheck.mutate({ stage: WeekCheckStage.DONE, intention });
                    }}>
                    <input
                        value={text}
                        onChange={event => setText(event.target.value)}
                        maxLength={280}
                        placeholder={t('intend_placeholder')}
                        className="w-full rounded-xl border border-line bg-raised px-3.5 py-2.5 text-sm outline-none focus:border-accent"
                    />
                    <Button type="submit" disabled={busy || !text.trim()}>
                        {t('intend_save')}
                    </Button>
                </form>
            ) : null}

            {step.input === 'link_only' && step.href ? (
                <Link
                    href={step.href}
                    className="inline-flex w-fit items-center rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-on-accent">
                    {step.hrefLabel ?? t('open')}
                </Link>
            ) : null}

            {step.href &&
            step.input !== 'link_only' &&
            step.input !== 'yes_typical' &&
            step.input !== 'week_check_look' ? (
                <Link href={step.href} className="text-sm font-medium text-accent hover:underline">
                    {step.hrefLabel ?? t('open')} →
                </Link>
            ) : null}
        </section>
    );
}

function metricHint(metric: EnergyMetric, t: (key: string) => string): string {
    switch (metric) {
        case EnergyMetric.SLEEP:
            return t('metric_sleep');
        case EnergyMetric.FOOD:
            return t('metric_food');
        case EnergyMetric.TRAIN:
            return t('metric_train');
        case EnergyMetric.MIND:
            return t('metric_mind');
        default:
            return '';
    }
}
