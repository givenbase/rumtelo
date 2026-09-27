'use client';

import { HouseholdRole, PracticeClientAccess, PracticeClientLinkStatus } from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { useTranslations } from '@rumtelo/i18n';
import { Badge, Button } from '@rumtelo/ui';

import { api } from '@/app/_lib/api';
import { apiQuery } from '@/app/_lib/api-hooks';
import { isLiveData } from '@/app/_lib/preview';
import { useAuth } from '@/components/features/shell/auth-provider';

import { SettingsInkCard, SettingsRow, SettingsRowLabel } from './settings-chrome';
import { useSettingsMutation } from '../_utils/use-settings-mutation';

/**
 * Dual-consent Practice contracts — household OWNER/ADMIN accept or decline.
 * Outside household membership seats (VIEWER ≠ Practice staff).
 */
export function PracticeLinksSettings() {
    const t = useTranslations();
    const { session, householdId } = useAuth();
    const live = isLiveData(householdId);

    const membersQuery = useLiveQuery(
        apiQuery.household.members.queryOptions({ input: { householdId: householdId! } }),
        [],
        live
    );
    const linksQuery = useLiveQuery(
        apiQuery.household.practiceLinks.list.queryOptions({
            input: { householdId: householdId! },
        }),
        [],
        live
    );

    const myMember = (membersQuery.data ?? []).find(m => m.userId === session?.user?.id);
    const canManage =
        myMember?.role === HouseholdRole.OWNER || myMember?.role === HouseholdRole.ADMIN;

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
    const unlink = useSettingsMutation({
        mutationFn: (linkId: string) =>
            api.household.practiceLinks.unlink({ householdId: householdId!, linkId }),
        invalidateKeys: [
            apiQuery.household.practiceLinks.list.key(),
            apiQuery.household.settings.key(),
        ],
        successMessage: t('pages.settings.practice_links.unlinked'),
    });

    if (!canManage) return null;

    const links = linksQuery.data ?? [];
    const pending = links.filter(link => link.status === PracticeClientLinkStatus.INVITED);
    const active = links.filter(link => link.status === PracticeClientLinkStatus.ACTIVE);
    const rows = [...pending, ...active];

    return (
        <SettingsInkCard
            eyebrow={t('pages.settings.practice_links.eyebrow')}
            blurb={t('pages.settings.practice_links.blurb')}>
            {linksQuery.isPending ? (
                <p className="py-4 text-sm text-fg-muted">…</p>
            ) : rows.length === 0 ? (
                <p className="py-4 text-sm text-fg-muted">
                    {t('pages.settings.practice_links.empty')}
                </p>
            ) : (
                <div className="divide-y divide-line">
                    {rows.map((link, index) => {
                        const isPending = link.status === PracticeClientLinkStatus.INVITED;
                        const accessLabel =
                            link.access === PracticeClientAccess.MANAGE
                                ? t('pages.settings.practice_links.access_manage')
                                : t('pages.settings.practice_links.access_view');
                        return (
                            <SettingsRow key={link.id} last={index === rows.length - 1}>
                                <SettingsRowLabel
                                    title={link.practiceName}
                                    sub={
                                        isPending
                                            ? t('pages.settings.practice_links.pending_sub', {
                                                  access: accessLabel,
                                              })
                                            : t('pages.settings.practice_links.active_sub', {
                                                  access: accessLabel,
                                              })
                                    }
                                />
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge tone={isPending ? 'warning' : 'success'}>
                                        {isPending
                                            ? t('pages.settings.practice_links.status_invited')
                                            : t('pages.settings.practice_links.status_active')}
                                    </Badge>
                                    {isPending ? (
                                        <>
                                            <Button
                                                size="sm"
                                                disabled={!live || accept.isPending}
                                                onClick={() => accept.mutate(link.id)}>
                                                {t('pages.settings.practice_links.accept')}
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                disabled={!live || reject.isPending}
                                                onClick={() => reject.mutate(link.id)}>
                                                {t('pages.settings.practice_links.reject')}
                                            </Button>
                                        </>
                                    ) : (
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            disabled={!live || unlink.isPending}
                                            onClick={() => unlink.mutate(link.id)}>
                                            {t('pages.settings.practice_links.unlink')}
                                        </Button>
                                    )}
                                </div>
                            </SettingsRow>
                        );
                    })}
                </div>
            )}
        </SettingsInkCard>
    );
}
