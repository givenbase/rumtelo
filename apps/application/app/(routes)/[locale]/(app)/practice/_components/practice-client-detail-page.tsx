'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';

import {
    PracticeClientAccess,
    PracticeClientLinkStatus,
    type PracticeClientLink,
} from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { useLocale, useTranslations } from '@rumtelo/i18n';
import { Badge, Button, Icon, StubNotice } from '@rumtelo/ui';
import { cn, formatMoney } from '@rumtelo/utils';

import { apiQuery } from '@/app/_lib/api-hooks';
import { practicePath } from '@/app/_lib/routes';
import { usePracticePreview } from '@/components/features/shell/practice-preview';

import { usePractice } from './practice-context';
import { PracticeInkCard, PracticePageHeader, PracticePanel } from './practice-chrome';

function statusTone(
    status: PracticeClientLink['status']
): 'success' | 'warning' | 'neutral' | 'danger' {
    if (status === PracticeClientLinkStatus.ACTIVE) return 'success';
    if (status === PracticeClientLinkStatus.INVITED) return 'warning';
    if (status === PracticeClientLinkStatus.REVOKED) return 'danger';
    return 'neutral';
}

export function PracticeClientDetailPage({ linkId }: { linkId: string }) {
    const t = useTranslations();
    const locale = useLocale();
    const router = useRouter();
    const queryClient = useQueryClient();
    const { activePractice } = usePractice();
    const { enterPreview } = usePracticePreview();

    const clientsQuery = useLiveQuery(
        apiQuery.practice.clients.queryOptions({
            input: { practiceId: activePractice?.id ?? '' },
        }),
        [],
        Boolean(activePractice)
    );

    const client = (clientsQuery.data ?? []).find(row => row.id === linkId);
    const isActive = client?.status === PracticeClientLinkStatus.ACTIVE;
    const practiceId = activePractice?.id;
    const snapshotEnabled = Boolean(isActive && practiceId);

    const snapshotQuery = useLiveQuery(
        apiQuery.practice.clientPortalSnapshot.queryOptions({
            input: { practiceId: practiceId!, linkId },
        }),
        null,
        snapshotEnabled
    );

    const snapshot = snapshotQuery.data;
    const currency = snapshot?.currency ?? 'EUR';

    if (!activePractice) {
        return (
            <PracticePanel>
                <StubNotice
                    prefix={t('pages.practice.overview.no_practice_title')}
                    what={t('pages.practice.overview.no_practice_body')}
                />
            </PracticePanel>
        );
    }

    if (clientsQuery.isPending) {
        return (
            <PracticePanel>
                <p className="py-12 text-center text-sm text-fg-muted">…</p>
            </PracticePanel>
        );
    }

    if (!client) {
        return (
            <PracticePanel>
                <div className="grid place-items-center py-16 text-center">
                    <h1 className="text-xl font-semibold text-fg">
                        {t('pages.practice.clients.not_found_title')}
                    </h1>
                    <p className="mt-2 max-w-sm text-sm text-fg-muted">
                        {t('pages.practice.clients.not_found_body')}
                    </p>
                    <Button
                        as={Link}
                        href={practicePath('clients')}
                        className="mt-6"
                        variant="secondary">
                        <Icon name="arrow-left" size="sm" />
                        {t('pages.practice.clients.back_to_roster')}
                    </Button>
                </div>
            </PracticePanel>
        );
    }

    const isManaged = client.access === PracticeClientAccess.MANAGE && isActive;
    const progressNote = !isActive
        ? t('pages.practice.clients.progress_pending')
        : isManaged
          ? t('pages.practice.clients.progress_blurb')
          : t('pages.practice.clients.progress_view_only');

    const snapshotPending = snapshotEnabled && snapshotQuery.isPending;

    const portals = [
        {
            key: 'money',
            labelKey: 'pages.practice.clients.portal_money' as const,
            rail: 'border-l-accent',
            value: snapshot ? formatMoney(snapshot.moneySpentTotal, { currency, locale }) : null,
            hint: t('pages.practice.clients.portal_money_hint'),
        },
        {
            key: 'growth',
            labelKey: 'pages.practice.clients.portal_growth' as const,
            rail: 'border-l-fg-secondary',
            value: snapshot
                ? formatMoney(snapshot.growthIncomeMonthly, { currency, locale })
                : null,
            hint: t('pages.practice.clients.portal_growth_hint'),
        },
        {
            key: 'energy',
            labelKey: 'pages.practice.clients.portal_energy' as const,
            rail: 'border-l-warning',
            value: snapshot
                ? t('pages.practice.clients.portal_energy_value', {
                      count: snapshot.energyTrainSessionsThisWeek,
                  })
                : null,
            hint: t('pages.practice.clients.portal_energy_hint'),
        },
        {
            key: 'soul',
            labelKey: 'pages.practice.clients.portal_soul' as const,
            rail: 'border-l-success',
            value: snapshot
                ? snapshot.soulStillnessStreakDays !== null
                    ? t('pages.practice.clients.portal_soul_value', {
                          count: snapshot.soulStillnessStreakDays,
                      })
                    : t('pages.practice.clients.portal_placeholder')
                : null,
            hint: t('pages.practice.clients.portal_soul_hint'),
        },
    ];

    function openHouseholdBoard() {
        if (!isActive || !activePractice) return;
        // Set preview headers first; board product APIs authorize via ACTIVE link
        // + x-household-id / x-practice-id (not BA org switch).
        enterPreview({
            practiceId: activePractice.id,
            householdId: client.householdId,
            householdName: client.householdName,
            linkId: client.id,
            access: client.access,
        });
        router.push('/');
        // Invalidate after navigate so PracticeShell unmount cleanup can cancel
        // its deferred preview-clear before queries refetch under new headers.
        window.setTimeout(() => {
            void queryClient.invalidateQueries();
        }, 0);
    }

    return (
        <PracticePanel>
            <div className="mb-1">
                <Link
                    href={practicePath('clients')}
                    className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.12em] text-fg-secondary uppercase transition-colors hover:text-fg">
                    <Icon name="arrow-left" size="sm" />
                    {t('pages.practice.clients.back_to_roster')}
                </Link>
            </div>

            <PracticePageHeader
                title={client.householdName}
                blurb={t('pages.practice.clients.detail_blurb')}
                action={
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={statusTone(client.status)}>
                            {client.status === PracticeClientLinkStatus.ACTIVE
                                ? t('pages.practice.clients.status_active')
                                : client.status === PracticeClientLinkStatus.INVITED
                                  ? t('pages.practice.clients.status_invited')
                                  : t('pages.practice.clients.status_revoked')}
                        </Badge>
                        {isActive ? (
                            <Button size="sm" onClick={openHouseholdBoard}>
                                <Icon name="eye" size="sm" />
                                {t('pages.practice.clients.open_board')}
                            </Button>
                        ) : null}
                    </div>
                }
            />

            <PracticeInkCard eyebrow={t('pages.practice.clients.access_eyebrow')}>
                <div className="grid gap-3 py-3 sm:grid-cols-2 lg:grid-cols-4">
                    <MetaBlock
                        label={t('pages.practice.clients.household_label')}
                        value={client.householdName}
                    />
                    <MetaBlock
                        label={t('pages.practice.clients.owner_meta_label')}
                        value={client.ownerName ?? t('pages.practice.clients.owner_unknown')}
                    />
                    <MetaBlock
                        label={t('pages.practice.clients.members_meta_label')}
                        value={t('pages.practice.clients.members_count', {
                            count: client.memberCount,
                        })}
                    />
                    <MetaBlock
                        label={t('pages.practice.clients.access_label')}
                        value={
                            client.access === PracticeClientAccess.MANAGE
                                ? t('pages.practice.clients.access_manage')
                                : t('pages.practice.clients.access_view')
                        }
                    />
                </div>
                <p className="border-t border-line py-3 text-xs leading-snug text-fg-muted">
                    {isActive
                        ? t('pages.practice.clients.open_board_hint')
                        : t('pages.practice.clients.open_board_blocked')}
                </p>
            </PracticeInkCard>

            <PracticeInkCard
                eyebrow={t('pages.practice.clients.progress_eyebrow')}
                blurb={progressNote}>
                <div className="grid gap-3 py-4 sm:grid-cols-2 lg:grid-cols-4">
                    {portals.map(portal => (
                        <div
                            key={portal.key}
                            className={cn(
                                'rounded-xl border border-l-4 border-line px-3.5 py-3',
                                portal.rail
                            )}>
                            <p className="font-mono text-[10px] tracking-[0.12em] text-fg-muted uppercase">
                                {t(portal.labelKey)}
                            </p>
                            <p
                                className={cn(
                                    'mt-2 font-mono text-2xl font-semibold tabular-nums',
                                    portal.value ? 'text-fg' : 'text-fg-faint'
                                )}>
                                {!isActive
                                    ? t('pages.practice.clients.portal_placeholder')
                                    : snapshotPending
                                      ? '…'
                                      : (portal.value ??
                                        t('pages.practice.clients.portal_placeholder'))}
                            </p>
                            <p className="mt-1 text-[11px] leading-snug text-fg-faint">
                                {!isActive
                                    ? t('pages.practice.clients.portal_coming')
                                    : portal.hint}
                            </p>
                        </div>
                    ))}
                </div>
            </PracticeInkCard>
        </PracticePanel>
    );
}

function MetaBlock({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
    return (
        <div className="min-w-0">
            <p className="font-mono text-[10px] tracking-[0.12em] text-fg-muted uppercase">
                {label}
            </p>
            <p
                className={cn(
                    'mt-1 truncate text-sm font-medium text-fg',
                    mono && 'font-mono text-xs'
                )}>
                {value}
            </p>
        </div>
    );
}
