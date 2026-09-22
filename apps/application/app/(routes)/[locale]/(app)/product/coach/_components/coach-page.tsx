'use client';

import { api } from '@/app/_lib/api';
import { apiQuery } from '@/app/_lib/api-hooks';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useTranslations } from '@rumtelo/i18n';
import { useLiveQuery } from '@rumtelo/hooks';
import { Button, Eyebrow, Typography } from '@rumtelo/ui';
import { toPeriodKey } from '@rumtelo/utils';

import Link from 'next/link';

import { useApiError } from '@/app/_lib/api-error-messages';
import { coachKindDisplay } from '@/app/_lib/coach-kind-label';
import { resolveCoachMessage } from '@/app/_lib/coach-message-copy';
import { isLiveData } from '@/app/_lib/preview';
import { useAppShell } from '@/components/features/shell/app-shell-context';
import { useAuth } from '@/components/features/shell/auth-provider';
import { PageContent } from '@/components/layout/page-content';

/**
 * Platform coach inbox — cross-product tips and next moves.
 * Not the weekly week check (that lives at /product/money/week-check).
 */
export function CoachPageClient() {
    const t = useTranslations('features.coach');
    const tKind = useTranslations('features.coach.verdict');
    const tRoot = useTranslations();
    const queryClient = useQueryClient();
    const { householdId } = useAuth();
    const { period, showToast } = useAppShell();
    const apiError = useApiError();
    const periodKey = toPeriodKey(period.year, period.month);
    const live = isLiveData(householdId);

    const feedQuery = useLiveQuery(
        apiQuery.coach.feed.queryOptions({
            input: { householdId: householdId!, period: periodKey },
        }),
        [] as never,
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

    const messages = feedQuery.data ?? [];

    return (
        <PageContent width="narrow" className="grid gap-8">
            <div>
                <Eyebrow>{t('eyebrow')}</Eyebrow>
                <Typography as="h1" className="mt-2">
                    {t('page_title')}
                </Typography>
                <Typography as="p" size="sm" color="muted" className="mt-2 max-w-prose">
                    {t('lead')}
                </Typography>
            </div>

            {messages.length === 0 ? (
                <div className="grid gap-3 rounded-2xl border border-line bg-surface px-5 py-6">
                    <Typography as="p" size="sm" color="muted">
                        {t('empty_quiet')}
                    </Typography>
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
            ) : (
                <ul className="grid gap-3">
                    {messages.map(message => {
                        const copy = resolveCoachMessage(message, t, tRoot);
                        return (
                            <li
                                key={message.id}
                                className="grid gap-3 rounded-2xl border border-line bg-surface px-5 py-4">
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
                                <Typography as="h3" className="leading-snug">
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
            )}
        </PageContent>
    );
}
