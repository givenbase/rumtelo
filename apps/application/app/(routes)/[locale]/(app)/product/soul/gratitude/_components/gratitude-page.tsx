'use client';

import { api } from '@/app/_lib/api';
import { apiQuery } from '@/app/_lib/api-hooks';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';

import type { Gratitude } from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { Button, Eyebrow, Input, Section, Typography } from '@rumtelo/ui';
import { currentWeekKey } from '@rumtelo/utils';

import { isLiveData } from '@/app/_lib/preview';
import { useAuth } from '@/components/features/shell/auth-provider';
import { PageContent } from '@/components/layout/page-content';

export function GratitudePageClient() {
    const queryClient = useQueryClient();
    const { householdId } = useAuth();
    const live = isLiveData(householdId);
    const weekKey = currentWeekKey();

    const [text, setText] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const listQuery = useLiveQuery(
        apiQuery.soul.gratitude.list.queryOptions({
            input: { householdId: householdId!, week: weekKey },
        }),
        [] as never,
        live
    );

    const createMutation = useMutation({
        mutationFn: async (newText: string) => {
            if (!householdId) throw new Error('No household');
            return api.soul.gratitude.create({ householdId, week: weekKey, text: newText });
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({
                queryKey: apiQuery.soul.gratitude.list.key(),
            });
            setText('');
            inputRef.current?.focus();
        },
    });

    const entries = (listQuery.data ?? []) as ReadonlyArray<Gratitude>;

    const empty = entries.length === 0;

    function formatDay(entry: Pick<Gratitude, 'createdAt'>): string {
        if (entry.createdAt) {
            const date = new Date(entry.createdAt);
            return date.toLocaleDateString('en-US', { weekday: 'short' });
        }
        return '';
    }

    function handleAdd() {
        const trimmed = text.trim();
        if (!trimmed) return;
        if (live) {
            createMutation.mutate(trimmed);
        } else {
            // Mock-mode: no-op (form reset only)
            setText('');
        }
    }

    return (
        <PageContent width="narrow" className="grid animate-rise gap-6">
            <Section eyebrow="Gratitude" title="One thing per day.">
                <Typography as="p" color="muted">
                    Not because it changes your balance, but because it changes how you see it.
                </Typography>
            </Section>

            {/* ── Add row ── */}
            <div className="flex flex-wrap gap-2.5">
                <Input
                    ref={inputRef}
                    className="w-full min-w-0 flex-1 sm:min-w-65"
                    placeholder="What are you grateful for?"
                    value={text}
                    onChange={event => setText(event.target.value)}
                    onKeyDown={event => {
                        if (event.key === 'Enter') handleAdd();
                    }}
                    disabled={createMutation.isPending}
                />
                <Button
                    type="button"
                    onClick={handleAdd}
                    disabled={!text.trim() || createMutation.isPending}>
                    {createMutation.isPending ? '…' : 'Add'}
                </Button>
            </div>

            {/* ── Entries list ── */}
            {empty ? (
                <Typography as="p" size="sm" color="muted">
                    Nothing written yet. The week check will ask you here.
                </Typography>
            ) : (
                <div className="grid gap-2.5">
                    {entries.map(entry => (
                        <div
                            key={entry.id}
                            className="flex items-center gap-3 rounded-xl border border-l-4 border-line bg-surface px-4 py-3.5"
                            style={{ borderLeftColor: 'var(--color-portal-soul)' }}>
                            <span className="min-w-0 flex-1 text-sm leading-snug text-fg">
                                {entry.text}
                            </span>
                            <span className="font-mono text-xs font-medium tracking-wide whitespace-nowrap text-fg-muted uppercase">
                                {formatDay(entry)}
                            </span>
                            <button
                                type="button"
                                aria-label="Delete"
                                className="shrink-0 text-base leading-none text-fg-faint transition-colors hover:text-danger">
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div className="border-t border-line pt-3">
                <Eyebrow>This week</Eyebrow>
                <Typography as="p" size="sm" color="muted" className="mt-2">
                    One line per week during the week check. No more than that — it is a check-in,
                    not a journal.
                </Typography>
            </div>
        </PageContent>
    );
}
