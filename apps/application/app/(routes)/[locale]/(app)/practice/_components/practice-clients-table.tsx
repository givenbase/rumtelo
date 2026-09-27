'use client';

import type { ReactNode } from 'react';

import Link from 'next/link';

import {
    PracticeClientAccess,
    PracticeClientLinkStatus,
    type PracticeClientLink,
} from '@rumtelo/contracts';
import { useTranslations } from '@rumtelo/i18n';
import {
    Badge,
    Button,
    Icon,
    StubNotice,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@rumtelo/ui';

import { practicePath } from '@/app/_lib/routes';

function statusTone(
    status: PracticeClientLink['status']
): 'success' | 'warning' | 'neutral' | 'danger' {
    if (status === PracticeClientLinkStatus.ACTIVE) return 'success';
    if (status === PracticeClientLinkStatus.INVITED) return 'warning';
    if (status === PracticeClientLinkStatus.REVOKED) return 'danger';
    return 'neutral';
}

export function PracticeClientsTable({
    clients,
    onRevoke,
    revokePending,
    emptyAction,
}: {
    clients: PracticeClientLink[];
    onRevoke?: (linkId: string) => void;
    revokePending?: boolean;
    emptyAction?: ReactNode;
}) {
    const t = useTranslations();

    if (clients.length === 0) {
        return (
            <div className="py-10 text-center">
                <StubNotice
                    prefix={t('pages.practice.overview.empty_prefix')}
                    what={t('pages.practice.clients.empty')}
                />
                {emptyAction ? <div className="mt-5 flex justify-center">{emptyAction}</div> : null}
            </div>
        );
    }

    return (
        <Table>
            <TableHeader>
                <TableRow className="hover:bg-transparent">
                    <TableHead>{t('pages.practice.clients.col_household')}</TableHead>
                    <TableHead className="hidden sm:table-cell">
                        {t('pages.practice.clients.col_owner')}
                    </TableHead>
                    <TableHead className="hidden md:table-cell">
                        {t('pages.practice.clients.col_members')}
                    </TableHead>
                    <TableHead>{t('pages.practice.clients.col_status')}</TableHead>
                    <TableHead className="hidden lg:table-cell">
                        {t('pages.practice.clients.col_access')}
                    </TableHead>
                    <TableHead className="text-right">
                        <span className="sr-only">{t('pages.practice.overview.open_client')}</span>
                    </TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {clients.map(client => (
                    <TableRow key={client.id}>
                        <TableCell>
                            <Link
                                href={practicePath('clients', client.id)}
                                className="font-medium text-fg hover:text-accent">
                                {client.householdName}
                            </Link>
                            <p className="mt-0.5 text-[11px] text-fg-muted sm:hidden">
                                {client.ownerName ?? t('pages.practice.clients.owner_unknown')}
                                {' · '}
                                {t('pages.practice.clients.members_count', {
                                    count: client.memberCount,
                                })}
                            </p>
                        </TableCell>
                        <TableCell className="hidden text-fg-secondary sm:table-cell">
                            {client.ownerName ?? '—'}
                        </TableCell>
                        <TableCell className="hidden font-mono text-fg-secondary tabular-nums md:table-cell">
                            {client.memberCount}
                        </TableCell>
                        <TableCell>
                            <Badge tone={statusTone(client.status)}>
                                {client.status === PracticeClientLinkStatus.ACTIVE
                                    ? t('pages.practice.clients.status_active')
                                    : client.status === PracticeClientLinkStatus.INVITED
                                      ? t('pages.practice.clients.status_invited')
                                      : t('pages.practice.clients.status_revoked')}
                            </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                            <span className="font-mono text-[10px] tracking-wide text-fg-faint uppercase">
                                {client.access === PracticeClientAccess.MANAGE
                                    ? t('pages.practice.clients.access_manage_short')
                                    : t('pages.practice.clients.access_view_short')}
                            </span>
                        </TableCell>
                        <TableCell className="text-right">
                            <div className="inline-flex items-center justify-end gap-1">
                                {onRevoke && client.status !== PracticeClientLinkStatus.REVOKED ? (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-danger hover:text-danger"
                                        disabled={revokePending}
                                        onClick={() => onRevoke(client.id)}>
                                        {t('pages.practice.clients.revoke')}
                                    </Button>
                                ) : null}
                                <Button
                                    as={Link}
                                    href={practicePath('clients', client.id)}
                                    variant="ghost"
                                    size="sm">
                                    {t('pages.practice.overview.open_client')}
                                    <Icon name="chevron-right" size="sm" />
                                </Button>
                            </div>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
