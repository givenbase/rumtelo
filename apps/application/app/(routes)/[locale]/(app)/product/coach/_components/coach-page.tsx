'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';

import { useTranslations } from '@rumtelo/i18n';
import { useLiveQuery } from '@rumtelo/hooks';
import { Button, EmptyState, Eyebrow, Typography } from '@rumtelo/ui';
import { toPeriodKey } from '@rumtelo/utils';

import { useApiError } from '@/app/_lib/api-error-messages';
import { api } from '@/app/_lib/api';
import { apiQuery } from '@/app/_lib/api-hooks';
import { coachKindDisplay } from '@/app/_lib/coach-kind-label';
import { resolveCoachMessage } from '@/app/_lib/coach-message-copy';
import { isLiveData } from '@/app/_lib/preview';
import { useAppShell } from '@/components/features/shell/app-shell-context';
import { useAuth } from '@/components/features/shell/auth-provider';
import { PageContent } from '@/components/layout/page-content';

import { CoachStepCard } from './steps/coach-step-card';

const EMPTY_MESSAGES: never[] = [];

/**
 * Smart Coach walkthrough — one fillable move, insights secondary, quiet when caught up.
 */
export function CoachPageClient() {
    const t = useTranslations('features.coach');
    const tSession = useTranslations('features.coach.session');
    const tKind = useTranslations('features.coach.verdict');
    const tRoot = useTranslations();
    const queryClient = useQueryClient();
    const searchParams = useSearchParams();
    const stepParam = searchParams.get('step');
    const { householdId } = useAuth();
    const { period, showToast } = useAppShell();
    const apiError = useApiError();
    const periodKey = toPeriodKey(period.year, period.month);
    const live = isLiveData(householdId);

    const sessionQuery = useLiveQuery(
        apiQuery.coach.session.queryOptions({
            input: { householdId: householdId! },
        }),
        {
            householdId: householdId ?? '',
            period: periodKey,
            week: '',
            steps: [],
            totalAvailable: 0,
            quiet: true,
        },
        live
    );

    const feedQuery = useLiveQuery(
        apiQuery.coach.feed.queryOptions({
            input: { householdId: householdId!, period: periodKey },
        }),
        EMPTY_MESSAGES,
        live
    );

    const dismiss = useMutation({
        mutationFn: async (id: string) => {
            if (householdId) {
                await api.coach.dismiss({ householdId, id });
            }
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: apiQuery.coach.feed.key() });
        },
        onError: (error: unknown) => showToast(apiError(error), 'error'),
    });

    const session = sessionQuery.data;
    const messages = feedQuery.data ?? EMPTY_MESSAGES;

    const activeStep = useMemo(() => {
        const steps = session?.steps ?? [];
        if (steps.length === 0) return null;
        if (stepParam) {
            const match = steps.find(step => step.id === stepParam);
            if (match) return match;
        }
        return steps[0] ?? null;
    }, [session?.steps, stepParam]);

    const quiet = session?.quiet || !activeStep;
    const totalAvailable = session?.totalAvailable ?? 0;
    const progressLabel =
        totalAvailable > 0
            ? tSession('progress', {
                  done: 1,
                  total: Math.min(totalAvailable, 3),
              })
            : '';

    return (
        <PageContent width="narrow" className="grid gap-10">
            <header className="grid gap-1.5">
                <Eyebrow>{t('eyebrow')}</Eyebrow>
                <Typography as="h1">{t('page_title')}</Typography>
                {quiet ? (
                    <Typography as="p" size="sm" color="muted" className="mt-1 max-w-prose">
                        {tSession('lead')}
                    </Typography>
                ) : null}
            </header>

            {quiet ? (
                <EmptyState
                    icon="diamond"
                    title={tSession('quiet_title')}
                    body={tSession('quiet_body')}
                    action={
                        <div className="flex flex-col items-center gap-2">
                            <Link
                                href="/product/energy/week"
                                className="text-sm font-medium text-accent hover:underline">
                                {t('open_week')}
                            </Link>
                            <Link
                                href="/product/money/week-check"
                                className="text-sm font-medium text-accent hover:underline">
                                {t('open_week_check')}
                            </Link>
                        </div>
                    }
                />
            ) : householdId && activeStep ? (
                <CoachStepCard
                    householdId={householdId}
                    step={activeStep}
                    progressLabel={progressLabel}
                    onAdvanced={() => {
                        void queryClient.invalidateQueries({
                            queryKey: apiQuery.coach.session.key(),
                        });
                    }}
                />
            ) : null}

            {messages.length > 0 ? (
                <section className="grid gap-4 border-t border-line pt-8">
                    <div className="grid gap-1">
                        <Typography as="h2" size="lg">
                            {tSession('insights_title')}
                        </Typography>
                        <Typography as="p" size="sm" color="muted">
                            {tSession('insights_lead')}
                        </Typography>
                    </div>
                    <ul className="grid gap-0 divide-y divide-line">
                        {messages.map(message => {
                            const copy = resolveCoachMessage(message, t, tRoot);
                            return (
                                <li key={message.id} className="grid gap-2.5 py-4 first:pt-0">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <Typography as="span" variant="eyebrow" color="primary">
                                            {coachKindDisplay(message.kind, tKind)}
                                        </Typography>
                                        {live ? (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => dismiss.mutate(message.id)}>
                                                {t('dismiss')}
                                            </Button>
                                        ) : null}
                                    </div>
                                    <Typography as="p" className="leading-snug text-fg-secondary">
                                        {copy.text}
                                    </Typography>
                                    {message.ctaHref && copy.ctaLabel ? (
                                        <Link
                                            href={message.ctaHref}
                                            className="text-sm font-medium text-accent hover:underline">
                                            {copy.ctaLabel} →
                                        </Link>
                                    ) : null}
                                </li>
                            );
                        })}
                    </ul>
                </section>
            ) : null}
        </PageContent>
    );
}
