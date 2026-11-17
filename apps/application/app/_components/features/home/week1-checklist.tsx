'use client';

import { useId } from 'react';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { HouseholdAnswerKey, HouseholdRole } from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { useTranslations } from '@rumtelo/i18n';
import { Button, Typography } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import { api } from '@/app/_lib/api';
import { useApiError } from '@/app/_lib/api-error-messages';
import { apiQuery } from '@/app/_lib/api-hooks';
import { isLiveData } from '@/app/_lib/preview';
import { settingsPath } from '@/app/_lib/routes';
import { useBoardWriteAccess } from '@/app/_lib/use-board-write-access';
import { useAuth } from '@/components/features/shell/auth-provider';
import { useHouseholdShell } from '@/components/features/shell/household-shell-context';

type ChecklistKey = 'bank' | 'dream' | 'invite';

type ChecklistItem = {
    key: ChecklistKey;
    done: boolean;
    href: string;
    /** Done, but waiting on someone else (a pending invitation). */
    invited?: boolean;
};

const ROW = 'flex min-h-12 min-w-0 items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm';

/**
 * Week 1 on Home: three optional things onboarding no longer asks. Links only, no primary
 * button. Done is plain data (no progress is stored); an OWNER may hide it for everyone.
 * Renders nothing while loading, on error, once every visible item is done, or when hidden.
 */
export function Week1Checklist() {
    const t = useTranslations('pages.dashboard.checklist');
    const queryClient = useQueryClient();
    const apiError = useApiError();
    const headingId = useId();
    const { householdId } = useAuth();
    const { showToast } = useHouseholdShell();
    const { membershipRole, practicePreview } = useBoardWriteAccess();
    const live = isLiveData(householdId);

    const isOwner = membershipRole === HouseholdRole.OWNER;
    const isWriter = isOwner || membershipRole === HouseholdRole.MEMBER;
    const enabled = live && isWriter && !practicePreview;

    const settingsQuery = useLiveQuery(
        apiQuery.household.settings.queryOptions({ input: { householdId: householdId! } }),
        null,
        enabled
    );
    const accountsQuery = useLiveQuery(
        apiQuery.money.accounts.list.queryOptions({ input: { householdId: householdId! } }),
        [],
        enabled
    );
    // Seats as the server counts them: members plus pending, unexpired invitations.
    const seatsQuery = useLiveQuery(
        apiQuery.household.seats.queryOptions({ input: { householdId: householdId! } }),
        null,
        enabled
    );

    const dismiss = useMutation({
        mutationFn: () =>
            api.household.updateSettings({
                householdId: householdId!,
                answers: { [HouseholdAnswerKey.WEEK1_CHECKLIST_DISMISSED]: true },
            }),
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: apiQuery.household.settings.key() }),
        onError: error => showToast(apiError(error), 'error'),
    });

    // A failed seats read only drops the invite item; bank and dream still help.
    const loading = settingsQuery.isPending || accountsQuery.isPending || seatsQuery.isPending;
    const failed = settingsQuery.isError || accountsQuery.isError;
    const settings = settingsQuery.data;
    if (!enabled || loading || failed || !settings) return null;
    if (settings.answers?.[HouseholdAnswerKey.WEEK1_CHECKLIST_DISMISSED] === true) return null;

    const items: ChecklistItem[] = [
        {
            key: 'bank',
            done: accountsQuery.data.some(account => Boolean(account.bankId)),
            href: settingsPath('product/money/bank/setup'),
        },
    ];
    if (isOwner) {
        items.push({
            key: 'dream',
            done: Boolean(settings.why?.trim()),
            href: settingsPath('general/household'),
        });
    }
    const seats = seatsQuery.isError ? null : seatsQuery.data;
    if (seats) {
        const invitePath = settingsPath('general/household');
        const seatLeft =
            seats.maxMembers === null || seats.members + seats.pendingInvites < seats.maxMembers;
        if (seats.members > 1) {
            items.push({ key: 'invite', done: true, href: invitePath });
        } else if (seats.pendingInvites > 0) {
            // Counts as done: they have done their part.
            items.push({ key: 'invite', done: true, invited: true, href: invitePath });
        } else if (seatLeft) {
            items.push({ key: 'invite', done: false, href: invitePath });
        }
        // Otherwise hidden (never shown as locked): the plan has no seat left.
    }

    const doneCount = items.filter(item => item.done).length;
    if (items.length === 0 || doneCount === items.length) return null;

    return (
        <section
            aria-labelledby={headingId}
            className="rounded-2xl border border-line bg-raised p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
                <Typography as="p" variant="eyebrow" color="primary">
                    {t('eyebrow', { done: doneCount, total: items.length })}
                </Typography>
                {isOwner ? (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="min-h-11"
                        disabled={dismiss.isPending}
                        aria-label={t('hide_aria')}
                        onClick={() => dismiss.mutate()}>
                        {t('hide')}
                    </Button>
                ) : null}
            </div>
            <Typography as="h3" id={headingId} weight="semibold" className="mt-1 text-pretty">
                {t('title', { count: items.length })}
            </Typography>
            <ul className="mt-3 grid gap-1">
                {items.map(item => {
                    const label = t(`items.${item.key}`);
                    return (
                        <li key={item.key}>
                            {item.done ? (
                                <div className={cn(ROW, 'text-fg-muted')}>
                                    <span className="flex min-w-0 items-center gap-3">
                                        <span
                                            aria-hidden="true"
                                            className="size-4 shrink-0 rounded-full bg-accent"
                                        />
                                        <span className="grid min-w-0">
                                            <span className="text-pretty">{label}</span>
                                            {item.invited ? (
                                                <span className="text-xs text-pretty text-fg-muted">
                                                    {t('invited')}
                                                </span>
                                            ) : null}
                                        </span>
                                    </span>
                                    {item.invited ? null : (
                                        <span className="shrink-0 text-xs">{t('done')}</span>
                                    )}
                                </div>
                            ) : (
                                <Link
                                    href={item.href}
                                    aria-label={label}
                                    className={cn(
                                        ROW,
                                        'text-fg hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'
                                    )}>
                                    <span className="flex min-w-0 items-center gap-3">
                                        <span
                                            aria-hidden="true"
                                            className="size-4 shrink-0 rounded-full border-2 border-line-strong"
                                        />
                                        <span className="min-w-0 text-pretty">{label}</span>
                                    </span>
                                    <span aria-hidden="true" className="shrink-0 text-fg-muted">
                                        ›
                                    </span>
                                </Link>
                            )}
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
