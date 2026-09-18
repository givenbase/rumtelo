'use client';

import { api } from '@/app/_lib/api';
import { apiQuery } from '@/app/_lib/api-hooks';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useLiveQuery } from '@rumtelo/hooks';
import { Button, Eyebrow, Typography } from '@rumtelo/ui';
import { toPeriodKey } from '@rumtelo/utils';

import Link from 'next/link';

import { isLiveData } from '@/app/_lib/preview';
import { useAppShell } from '@/components/features/shell/app-shell-context';
import { useAuth } from '@/components/features/shell/auth-provider';
import { PageContent } from '@/components/layout/page-content';

/**
 * Platform coach inbox — cross-product tips and next moves.
 * Not the weekly week check (that lives at /product/money/week-check).
 */
export function CoachPageClient() {
    const queryClient = useQueryClient();
    const { householdId } = useAuth();
    const { period } = useAppShell();
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
    });

    const messages = feedQuery.data ?? [];

    return (
        <PageContent width="narrow" className="grid gap-8">
            <div>
                <Eyebrow>Across every portal</Eyebrow>
                <Typography as="h1" className="mt-2">
                    The Coach
                </Typography>
                <Typography as="p" size="sm" color="muted" className="mt-2 max-w-prose">
                    Suggestions and next moves from money, growth, energy, and soul — one tip at a
                    time, never shame.
                </Typography>
            </div>

            {messages.length === 0 ? (
                <div className="grid gap-3 rounded-2xl border border-line bg-surface px-5 py-6">
                    <Typography as="p" size="sm" color="muted">
                        No open tips right now. The Coach speaks when a jar, habit, or week needs a
                        nudge.
                    </Typography>
                    <Link
                        href="/product/money/week-check"
                        className="text-sm font-medium text-accent hover:underline">
                        Open the week check →
                    </Link>
                </div>
            ) : (
                <ul className="grid gap-3">
                    {messages.map(message => (
                        <li
                            key={message.id}
                            className="grid gap-3 rounded-2xl border border-line bg-surface px-5 py-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <Typography as="span" variant="eyebrow" color="primary">
                                    {message.kind}
                                </Typography>
                                {live ? (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => dismiss.mutate(message.id)}>
                                        Dismiss
                                    </Button>
                                ) : null}
                            </div>
                            <Typography as="h3" className="leading-snug">
                                {message.text}
                            </Typography>
                            {message.ctaHref && message.ctaLabel ? (
                                <Link
                                    href={message.ctaHref}
                                    className="text-sm font-medium text-accent hover:underline">
                                    {message.ctaLabel} →
                                </Link>
                            ) : null}
                        </li>
                    ))}
                </ul>
            )}
        </PageContent>
    );
}
