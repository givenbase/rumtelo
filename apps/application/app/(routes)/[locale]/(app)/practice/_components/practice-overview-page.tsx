'use client';

import { useState } from 'react';

import Link from 'next/link';

import {
    PRACTICE_BASE_UNIT_CENTS,
    PRACTICE_CLIENT_SEAT_UNIT_CENTS,
    PRACTICE_STAFF_SEAT_UNIT_CENTS,
    PracticeClientAccess,
    PracticeClientLinkStatus,
} from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { useTranslations } from '@rumtelo/i18n';
import { Badge, Button, Icon } from '@rumtelo/ui';

import { apiQuery } from '@/app/_lib/api-hooks';
import { practiceSettingsHref } from '@/app/_lib/practice-settings-tabs';
import { practicePath } from '@/app/_lib/routes';

import { formatPracticePrice } from '../_utils/practice-pricing';
import { PracticeAddClientDialog } from './practice-add-client-dialog';
import {
    PracticeInkCard,
    PracticeInsight,
    PracticePageHeader,
    PracticePanel,
} from './practice-chrome';
import { usePractice } from './practice-context';

export function PracticeOverviewPage() {
    const t = useTranslations();
    const { activePractice } = usePractice();
    const [addOpen, setAddOpen] = useState(false);

    const clientsQuery = useLiveQuery(
        apiQuery.practice.clients.queryOptions({
            input: { practiceId: activePractice?.id ?? '' },
        }),
        [],
        Boolean(activePractice)
    );

    const membersQuery = useLiveQuery(
        apiQuery.practice.members.queryOptions({
            input: { practiceId: activePractice?.id ?? '' },
        }),
        [],
        Boolean(activePractice)
    );

    const billingQuery = useLiveQuery(
        apiQuery.practice.billingStatus.queryOptions({
            input: { practiceId: activePractice?.id ?? '' },
        }),
        null,
        Boolean(activePractice)
    );

    if (!activePractice) {
        return (
            <div className="grid place-items-center py-24 text-center">
                <span
                    aria-hidden
                    className="mb-4 grid size-14 place-items-center rounded-2xl bg-accent-soft text-2xl">
                    ✦
                </span>
                <h1 className="text-xl font-semibold text-fg">
                    {t('pages.practice.overview.no_practice_title')}
                </h1>
                <p className="mt-2 max-w-sm text-sm text-fg-muted">
                    {t('pages.practice.overview.no_practice_body')}
                </p>
                <Button as={Link} href={practicePath('create')} className="mt-6">
                    {t('pages.practice.overview.create_cta')}
                </Button>
            </div>
        );
    }

    const clients = (clientsQuery.data ?? []).filter(
        client => client.status !== PracticeClientLinkStatus.REVOKED
    );
    const pendingClients = clients.filter(
        client => client.status === PracticeClientLinkStatus.INVITED
    );
    const pendingInvites = pendingClients.length;
    const peopleCoached = clients
        .filter(client => client.status === PracticeClientLinkStatus.ACTIVE)
        .reduce((sum, client) => sum + client.memberCount, 0);
    const staffSeats =
        billingQuery.data?.billableSeatCount ??
        (membersQuery.data ?? []).filter(member => member.isSeatBillable).length;
    const managedClients = clients.filter(
        client =>
            client.status === PracticeClientLinkStatus.ACTIVE &&
            client.access === PracticeClientAccess.MANAGE
    ).length;
    const monthlyCents =
        PRACTICE_BASE_UNIT_CENTS +
        staffSeats * PRACTICE_STAFF_SEAT_UNIT_CENTS +
        managedClients * PRACTICE_CLIENT_SEAT_UNIT_CENTS;

    return (
        <PracticePanel>
            <PracticePageHeader
                title={t('pages.practice.overview.title')}
                blurb={t('pages.practice.overview.blurb')}
                action={
                    <Button size="sm" onClick={() => setAddOpen(true)}>
                        <Icon name="plus" size="sm" />
                        {t('pages.practice.clients.add_title')}
                    </Button>
                }
            />

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <PracticeInsight
                    label={t('pages.practice.overview.insight_people')}
                    value={peopleCoached}
                    hint={t('pages.practice.overview.insight_people_hint')}
                />
                <PracticeInsight
                    label={t('pages.practice.overview.insight_pending')}
                    value={pendingInvites}
                    hint={t('pages.practice.overview.insight_pending_hint')}
                    href={pendingInvites > 0 ? practicePath('clients') : undefined}
                />
                <PracticeInsight
                    label={t('pages.practice.overview.insight_staff')}
                    value={staffSeats}
                    hint={t('pages.practice.overview.insight_staff_hint')}
                    href={practicePath('staff')}
                />
                <PracticeInsight
                    label={t('pages.practice.overview.insight_cost')}
                    value={formatPracticePrice(monthlyCents)}
                    hint={t('pages.practice.overview.insight_cost_hint')}
                    href={practiceSettingsHref('billing')}
                />
            </div>

            {/* Only when something needs follow-up — full roster lives under Clients. */}
            {pendingClients.length > 0 ? (
                <PracticeInkCard
                    eyebrow={t('pages.practice.overview.attention_eyebrow')}
                    blurb={t('pages.practice.overview.attention_blurb')}
                    badge={
                        <Link
                            href={practicePath('clients')}
                            className="font-mono text-[10px] text-accent hover:underline">
                            {t('pages.practice.overview.attention_view_all')}
                        </Link>
                    }>
                    <ul className="divide-y divide-line">
                        {pendingClients.map(client => (
                            <li key={client.id}>
                                <Link
                                    href={practicePath('clients', client.id)}
                                    className="flex items-center gap-3 py-3 transition-colors hover:bg-raised/60">
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium text-fg">
                                            {client.householdName}
                                        </p>
                                        <p className="truncate text-xs text-fg-muted">
                                            {client.ownerName ??
                                                t('pages.practice.clients.owner_unknown')}
                                        </p>
                                    </div>
                                    <Badge tone="warning">
                                        {t('pages.practice.overview.attention_pending')}
                                    </Badge>
                                    <Icon
                                        name="chevron-right"
                                        size="sm"
                                        className="shrink-0 text-fg-faint"
                                    />
                                </Link>
                            </li>
                        ))}
                    </ul>
                </PracticeInkCard>
            ) : null}

            <PracticeAddClientDialog open={addOpen} onOpenChange={setAddOpen} />
        </PracticePanel>
    );
}
