'use client';

import Link from 'next/link';

import { HouseholdRole, PracticeClientAccess, PracticeClientLinkStatus } from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { useTranslations } from '@rumtelo/i18n';
import { Badge, Button, Icon } from '@rumtelo/ui';

import { api } from '@/app/_lib/api';
import { apiQuery } from '@/app/_lib/api-hooks';
import { isLiveData } from '@/app/_lib/preview';
import { settingsHref } from '@/app/_lib/settings-tabs';
import { useAuth } from '@/components/features/shell/auth-provider';
import { useSettingsMutation } from '@/household/settings/_utils/use-settings-mutation';

/**
 * Household home: member count + Practice link status.
 * Pending Practice invites (OWNER/ADMIN) can accept here — same dual-consent as Settings.
 */
export function HouseholdPeopleCard() {
    const t = useTranslations();
    const { session, householdId } = useAuth();
    const live = isLiveData(householdId);

    const membersQuery = useLiveQuery(
        apiQuery.household.members.queryOptions({ input: { householdId: householdId! } }),
        [],
        live
    );

    const myMember = (membersQuery.data ?? []).find(m => m.userId === session?.user?.id);
    const canManage =
        myMember?.role === HouseholdRole.OWNER || myMember?.role === HouseholdRole.ADMIN;

    const linksQuery = useLiveQuery(
        apiQuery.household.practiceLinks.list.queryOptions({
            input: { householdId: householdId! },
        }),
        [],
        live && canManage
    );

    const members = membersQuery.data ?? [];
    const links = linksQuery.data ?? [];
    const pending = links.filter(link => link.status === PracticeClientLinkStatus.INVITED);
    const active = links.filter(link => link.status === PracticeClientLinkStatus.ACTIVE);

    const accept = useSettingsMutation({
        mutationFn: (linkId: string) =>
            api.household.practiceLinks.accept({ householdId: householdId!, linkId }),
        invalidateKeys: [
            apiQuery.household.practiceLinks.list.key(),
            apiQuery.household.settings.key(),
        ],
        successMessage: t('pages.settings.practice_links.accepted'),
    });
    const reject = useSettingsMutation({
        mutationFn: (linkId: string) =>
            api.household.practiceLinks.reject({ householdId: householdId!, linkId }),
        invalidateKeys: [apiQuery.household.practiceLinks.list.key()],
        successMessage: t('pages.settings.practice_links.rejected'),
    });

    if (!live) return null;

    const practiceSummary =
        pending.length > 0
            ? t('pages.dashboard.household.practice_pending', { count: pending.length })
            : active.length > 0
              ? t('pages.dashboard.household.practice_active', {
                    name: active[0]?.practiceName ?? '',
                    count: active.length,
                })
              : t('pages.dashboard.household.practice_none');

    return (
        <div className="overflow-hidden rounded-2xl border border-line bg-surface">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-5">
                <div className="min-w-0">
                    <p className="font-mono text-[10px] tracking-[0.14em] text-fg-muted uppercase">
                        {t('pages.dashboard.household.eyebrow')}
                    </p>
                    <p className="mt-1 text-sm text-fg-muted">
                        {t('pages.dashboard.household.blurb')}
                    </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                    <Link
                        href={settingsHref('household')}
                        className="font-mono text-[10px] text-accent hover:underline">
                        {t('pages.dashboard.household.open_settings')}
                    </Link>
                    {canManage ? (
                        <Link
                            href={settingsHref('practice')}
                            className="font-mono text-[10px] text-accent hover:underline">
                            {t('pages.dashboard.household.open_practice')}
                        </Link>
                    ) : null}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-px bg-line">
                <div className="bg-surface px-4 py-3.5 sm:px-5">
                    <p className="font-mono text-[10px] tracking-wide text-fg-muted uppercase">
                        {t('pages.dashboard.household.members_label')}
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-fg tabular-nums">
                        {members.length}
                    </p>
                    <p className="mt-0.5 text-xs text-fg-muted">
                        {t('pages.dashboard.household.members_hint')}
                    </p>
                </div>
                <div className="bg-surface px-4 py-3.5 sm:px-5">
                    <p className="font-mono text-[10px] tracking-wide text-fg-muted uppercase">
                        {t('pages.dashboard.household.practice_label')}
                    </p>
                    <p className="mt-1 text-sm font-medium text-fg">{practiceSummary}</p>
                    <p className="mt-0.5 text-xs text-fg-muted">
                        {t('pages.dashboard.household.practice_hint')}
                    </p>
                </div>
            </div>

            {canManage && pending.length > 0 ? (
                <div className="border-t border-line">
                    <div className="px-4 pt-3.5 sm:px-5">
                        <p className="font-mono text-[10px] tracking-[0.14em] text-warning uppercase">
                            {t('pages.dashboard.household.attention_eyebrow')}
                        </p>
                        <p className="mt-1 text-sm text-fg-muted">
                            {t('pages.dashboard.household.attention_blurb')}
                        </p>
                    </div>
                    <ul className="mt-2 divide-y divide-line">
                        {pending.map(link => {
                            const accessLabel =
                                link.access === PracticeClientAccess.MANAGE
                                    ? t('pages.settings.practice_links.access_manage')
                                    : t('pages.settings.practice_links.access_view');
                            return (
                                <li
                                    key={link.id}
                                    className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium text-fg">
                                            {link.practiceName}
                                        </p>
                                        <p className="truncate text-xs text-fg-muted">
                                            {t('pages.settings.practice_links.pending_sub', {
                                                access: accessLabel,
                                            })}
                                        </p>
                                    </div>
                                    <Badge tone="warning">
                                        {t('pages.settings.practice_links.status_invited')}
                                    </Badge>
                                    <div className="flex flex-wrap gap-2">
                                        <Button
                                            size="sm"
                                            data-testid="practice-link-accept-home"
                                            disabled={accept.isPending}
                                            onClick={() => accept.mutate(link.id)}>
                                            {t('pages.settings.practice_links.accept')}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            disabled={reject.isPending}
                                            onClick={() => reject.mutate(link.id)}>
                                            {t('pages.settings.practice_links.reject')}
                                        </Button>
                                    </div>
                                    <Icon
                                        name="chevron-right"
                                        size="sm"
                                        className="hidden shrink-0 text-fg-faint sm:block"
                                    />
                                </li>
                            );
                        })}
                    </ul>
                </div>
            ) : null}
        </div>
    );
}
