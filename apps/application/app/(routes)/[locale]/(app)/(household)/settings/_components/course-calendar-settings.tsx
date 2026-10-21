'use client';

import { useState } from 'react';

import {
    MONTH_CLOSE_LEAD_DAYS,
    type CourseFeedSettings,
    type CourseFeedSources,
} from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { useTranslations } from '@rumtelo/i18n';
import {
    Button,
    Input,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Toggle,
} from '@rumtelo/ui';

import { api } from '@/app/_lib/api';
import { apiQuery } from '@/app/_lib/api-hooks';
import { CAPABILITIES } from '@/app/_lib/plan';
import { isLiveData } from '@/app/_lib/preview';
import { useAuth } from '@/components/features/shell/auth-provider';
import { useHouseholdShell } from '@/components/features/shell/household-shell-context';
import { usePlanCapabilities } from '@/components/features/shell/use-plan-capabilities';

import { useSettingsMutation } from '../_utils/use-settings-mutation';
import { SettingsInkCard } from './settings-chrome';

const SOURCES: ReadonlyArray<{ key: keyof CourseFeedSources; copy: string }> = [
    { key: 'isFocusWeekShown', copy: 'focus_week' },
    { key: 'isFocusDayShown', copy: 'focus_day' },
    { key: 'isRhythmShown', copy: 'rhythm' },
    { key: 'isRitualsShown', copy: 'rituals' },
    { key: 'isSleepShown', copy: 'sleep' },
    { key: 'isPartnerShown', copy: 'partner' },
];

/**
 * Settings › Growth › Calendar: a one-way mirror of Course into Google, Apple or
 * Outlook through a secret address. Per person; each source on or off.
 */
export function CourseCalendarSettings() {
    const t = useTranslations('pages.settings.panels.course_calendar');
    const { householdId } = useAuth();
    const { showToast } = useHouseholdShell();
    const { hasCapability } = usePlanCapabilities();
    const live = isLiveData(householdId);
    const [isCopied, setIsCopied] = useState(false);

    const feedQuery = useLiveQuery(
        apiQuery.growth.course.feed.get.queryOptions({ input: { householdId: householdId! } }),
        null,
        live
    );
    const invalidateKeys = [apiQuery.growth.course.feed.key()];
    const enable = useSettingsMutation({
        mutationFn: () => api.growth.course.feed.enable({ householdId: householdId! }),
        invalidateKeys,
        successMessage: t('enabled'),
    });
    const update = useSettingsMutation({
        mutationFn: (
            patch: Partial<CourseFeedSources> & {
                monthCloseLeadDays?: CourseFeedSettings['monthCloseLeadDays'];
            }
        ) => api.growth.course.feed.update({ householdId: householdId!, ...patch }),
        invalidateKeys,
        successMessage: t('saved'),
    });
    const rotate = useSettingsMutation({
        mutationFn: () => api.growth.course.feed.rotate({ householdId: householdId! }),
        invalidateKeys,
        successMessage: t('rotated'),
    });
    const disable = useSettingsMutation({
        mutationFn: () => api.growth.course.feed.disable({ householdId: householdId! }),
        invalidateKeys,
        successMessage: t('disabled'),
    });

    if (!hasCapability(CAPABILITIES.growthCourse)) return null;
    const feed = feedQuery.data;
    const isPending = enable.isPending || update.isPending || rotate.isPending || disable.isPending;

    const copy = async (url: string) => {
        try {
            await navigator.clipboard.writeText(url);
            setIsCopied(true);
            showToast(t('copied'), 'success');
        } catch {
            showToast(t('copy_failed'), 'error');
        }
    };

    return (
        <SettingsInkCard eyebrow={t('eyebrow')} blurb={t('blurb')}>
            {!feed?.isEnabled ? (
                <div className="grid gap-3 py-3">
                    <p className="text-sm text-fg-muted">{t('off_lead')}</p>
                    <Button
                        type="button"
                        className="justify-self-start"
                        disabled={!live || isPending}
                        onClick={() => enable.mutate()}>
                        {t('enable')}
                    </Button>
                </div>
            ) : (
                <div className="grid gap-4 py-3">
                    {feed.url ? (
                        <div className="grid gap-2">
                            <label
                                htmlFor="course-calendar-url"
                                className="text-sm font-medium text-fg">
                                {t('url_label')}
                            </label>
                            <div className="flex flex-wrap gap-2">
                                <Input
                                    id="course-calendar-url"
                                    readOnly
                                    value={feed.url}
                                    onFocus={event => event.currentTarget.select()}
                                    className="min-w-0 flex-1 font-mono text-xs"
                                />
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => copy(feed.url!)}>
                                    {isCopied ? t('copied_short') : t('copy')}
                                </Button>
                            </div>
                            <p className="text-xs text-fg-muted">{t('url_secret')}</p>
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    as="a"
                                    href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(feed.webcalUrl ?? feed.url)}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    size="sm"
                                    variant="secondary">
                                    {t('add_google')}
                                </Button>
                                <Button
                                    as="a"
                                    href={feed.webcalUrl ?? feed.url}
                                    size="sm"
                                    variant="secondary">
                                    {t('add_apple')}
                                </Button>
                                <Button
                                    as="a"
                                    href={`https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(feed.url)}&name=${encodeURIComponent('Rumtelo')}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    size="sm"
                                    variant="secondary">
                                    {t('add_outlook')}
                                </Button>
                            </div>
                            <p className="text-xs text-fg-muted">{t('refresh_note')}</p>
                        </div>
                    ) : null}

                    <div className="grid gap-1">
                        {SOURCES.map(source => (
                            <Toggle
                                key={source.key}
                                checked={feed[source.key]}
                                label={t(`source_${source.copy}_title`)}
                                hint={t(`source_${source.copy}_sub`)}
                                disabled={!live || isPending}
                                onCheckedChange={next => update.mutate({ [source.key]: next })}
                            />
                        ))}
                    </div>

                    <div className="grid gap-1.5">
                        <span className="text-sm font-medium text-fg">{t('lead_label')}</span>
                        <Select
                            value={String(feed.monthCloseLeadDays)}
                            onValueChange={value =>
                                update.mutate({
                                    monthCloseLeadDays: Number(
                                        value
                                    ) as CourseFeedSettings['monthCloseLeadDays'],
                                })
                            }>
                            <SelectTrigger aria-label={t('lead_label')} className="w-56">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent position="popper">
                                {MONTH_CLOSE_LEAD_DAYS.map(days => (
                                    <SelectItem key={days} value={String(days)}>
                                        {days === 0
                                            ? t('lead_same_day')
                                            : t('lead_days', { count: days })}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-fg-muted">{t('lead_hint')}</p>
                    </div>

                    {feed.lastFetchedAt ? (
                        <p className="font-mono text-[11px] tracking-wide text-fg-muted uppercase">
                            {t('last_fetched', { when: new Date(feed.lastFetchedAt) })}
                        </p>
                    ) : null}

                    <div className="flex flex-wrap gap-2 border-t border-line pt-3">
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={isPending}
                            onClick={() => rotate.mutate()}>
                            {t('rotate')}
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={isPending}
                            onClick={() => disable.mutate()}>
                            {t('disable')}
                        </Button>
                    </div>
                </div>
            )}
        </SettingsInkCard>
    );
}
