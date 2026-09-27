'use client';

import { useState } from 'react';

import { PracticeClientLinkStatus } from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { useTranslations } from '@rumtelo/i18n';
import { Button, Icon } from '@rumtelo/ui';

import { api } from '@/app/_lib/api';
import { apiQuery } from '@/app/_lib/api-hooks';

import { PracticeAddClientDialog } from './practice-add-client-dialog';
import { PracticeClientsTable } from './practice-clients-table';
import { PracticeInkCard, PracticePageHeader, PracticePanel } from './practice-chrome';
import { usePractice } from './practice-context';
import { usePracticeMutation } from './use-practice-mutation';

export function PracticeClientsPage() {
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

    const revokeClient = usePracticeMutation({
        mutationFn: async (linkId: string) => {
            if (!activePractice) throw new Error('No active practice');
            return api.practice.revokeClient({ practiceId: activePractice.id, linkId });
        },
        invalidateKeys: [apiQuery.practice.clients.key(), apiQuery.practice.billingStatus.key()],
        successMessage: t('pages.practice.clients.revoked'),
    });

    const clients = (clientsQuery.data ?? []).filter(
        client => client.status !== PracticeClientLinkStatus.REVOKED
    );

    return (
        <PracticePanel>
            <PracticePageHeader
                title={t('pages.practice.clients.title')}
                blurb={t('pages.practice.clients.blurb')}
                action={
                    <Button
                        size="sm"
                        data-testid="practice-add-client"
                        onClick={() => setAddOpen(true)}>
                        <Icon name="plus" size="sm" />
                        {t('pages.practice.clients.add_title')}
                    </Button>
                }
            />

            <PracticeInkCard
                eyebrow={t('pages.practice.clients.title')}
                badge={
                    <span className="font-mono text-[10px] text-fg-muted tabular-nums">
                        {clients.length}
                    </span>
                }
                bodyClassName="px-0 sm:px-0">
                <PracticeClientsTable
                    clients={clients}
                    onRevoke={linkId => revokeClient.mutate(linkId)}
                    revokePending={revokeClient.isPending}
                    emptyAction={
                        <Button onClick={() => setAddOpen(true)}>
                            <Icon name="plus" size="sm" />
                            {t('pages.practice.clients.add_title')}
                        </Button>
                    }
                />
            </PracticeInkCard>

            <PracticeAddClientDialog open={addOpen} onOpenChange={setAddOpen} />
        </PracticePanel>
    );
}
