'use client';

import { apiQuery } from '@/app/_lib/api-hooks';
import { useMemo, useState } from 'react';

import type {
    EnergySummary,
    HouseholdMember,
    TimeEntry,
    TimeTemplate,
    TimeWeekSummary,
} from '@rumtelo/contracts';
import {
    DISCRETIONARY_BAND,
    DISCRETIONARY_SOURCES,
    EnergyMetric,
    EnergyTrend,
    TIME_CATEGORY_ORDER,
    TimeBandStatus,
    TimeEvidence,
    TimeKind,
} from '@rumtelo/contracts';
import { useLocale, useTranslations } from '@rumtelo/i18n';
import { useLiveQuery } from '@rumtelo/hooks';
import { Badge, Button, Card, Eyebrow, Section, Typography } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import { isLiveData } from '@/app/_lib/preview';
import {
    TIME_KIND_META,
    TIME_KIND_ORDER,
    TIME_STATUS_META,
    formatBandRange,
    formatMinutes,
    timeEvidenceBlurb,
    timeEvidenceName,
    timeKindName,
    timeStatusName,
} from '@/app/_lib/time-meta';
import { formatDayLabel, shiftWeek, todayIso, weekKeyOf, weekRangeOf } from '@/app/_lib/week-key';
import { useAuth } from '@/components/features/shell/auth-provider';

import { CatchUpRow } from './catch-up-row';
import { DayCheckIn } from './day-check-in';
import { DayLogForm } from './day-log-form';
import { TimeBandCard } from './time-band-card';
import { TimeSources } from './time-sources';
import { previewWeekSummary } from '../_utils/week-fixture';
import { WeekForecast } from './week-forecast';
import { WeekSetupWizard } from './week-setup-wizard';

const TREND_ICON: Record<EnergyTrend, string> = {
    [EnergyTrend.UP]: '↑',
    [EnergyTrend.FLAT]: '→',
    [EnergyTrend.DOWN]: '↓',
};
const TREND_CLASS: Record<EnergyTrend, string> = {
    [EnergyTrend.UP]: 'text-success',
    [EnergyTrend.FLAT]: 'text-fg-muted',
    [EnergyTrend.DOWN]: 'text-danger',
};

const EMPTY_ENTRIES: TimeEntry[] = [];
const EMPTY_TEMPLATES: TimeTemplate[] = [];
const EMPTY_MEMBERS: HouseholdMember[] = [];

type LogMode = 'checkIn' | 'everything' | 'setup';
const EMPTY_SUMMARY_ROWS: EnergySummary[] = [];

function emptySummary(week: string): TimeWeekSummary {
    const { from, to } = weekRangeOf(week);
    return {
        week,
        from,
        to,
        daysLogged: 0,
        loggedMinutes: 0,
        unloggedMinutes: 0,
        categories: [],
        discretionary: { minutes: 0, dailyAverage: 0, status: TimeBandStatus.NO_DATA },
        members: [],
    };
}

export function WeekPageClient() {
    const locale = useLocale();
    const t = useTranslations('features.energy.week');
    const tRoot = useTranslations();
    const tm = useTranslations('features.energy.week.meta');
    const metricLabel: Record<EnergyMetric, string> = {
        [EnergyMetric.SLEEP]: t('metric_sleep'),
        [EnergyMetric.TRAIN]: t('metric_train'),
        [EnergyMetric.FOOD]: t('metric_food'),
        [EnergyMetric.MIND]: t('metric_mind'),
    };
    const { householdId, userId } = useAuth();
    const live = isLiveData(householdId);
    const today = todayIso();
    const thisWeek = weekKeyOf(today);
    // One week ahead is visible: that is where the plan lives before the week starts.
    const lastWeek = shiftWeek(thisWeek, 1);
    const [week, setWeek] = useState(thisWeek);
    const [day, setDay] = useState(today);
    const [logMode, setLogMode] = useState<LogMode>('checkIn');
    const range = weekRangeOf(week);
    // The check-in never leaves the week that holds the selected day; you cannot log the future.
    const logRange = weekRangeOf(weekKeyOf(day));

    // Picking a day anywhere moves the visible week with it, and vice versa.
    const selectDay = (iso: string) => {
        setDay(iso);
        setWeek(weekKeyOf(iso));
    };
    const selectWeek = (key: string) => {
        setWeek(key);
        setDay(key >= thisWeek ? today : weekRangeOf(key).from);
    };

    const energyQuery = useLiveQuery(
        apiQuery.energy.logs.summary.queryOptions({ input: { householdId: householdId! } }),
        EMPTY_SUMMARY_ROWS,
        live
    );
    const summaryQuery = useLiveQuery(
        apiQuery.energy.time.summary.queryOptions({ input: { householdId: householdId!, week } }),
        emptySummary(week),
        live
    );
    const entriesQuery = useLiveQuery(
        apiQuery.energy.time.list.queryOptions({
            // Covers both the visible week and the week being logged when they differ.
            input: {
                householdId: householdId!,
                from: range.from < logRange.from ? range.from : logRange.from,
                to: range.to > logRange.to ? range.to : logRange.to,
            },
        }),
        EMPTY_ENTRIES,
        live
    );
    const membersQuery = useLiveQuery(
        apiQuery.household.members.queryOptions({ input: { householdId: householdId! } }),
        EMPTY_MEMBERS,
        live
    );
    const templatesQuery = useLiveQuery(
        apiQuery.energy.timeTemplates.list.queryOptions({ input: { householdId: householdId! } }),
        EMPTY_TEMPLATES,
        live
    );
    const templates = templatesQuery.data;
    const needsSetup = live && templatesQuery.isSuccess && templates.length === 0;

    const preview = useMemo(() => (live ? null : previewWeekSummary()), [live]);
    const summary = preview ?? summaryQuery.data;
    const energy = energyQuery.data;
    const hasData = summary.daysLogged > 0;

    // Rows are household-wide; the form prefills the current person's day only.
    const myAccountId =
        membersQuery.data.find(member => member.userId === userId)?.accountId ?? null;
    const myEntries = useMemo(
        () =>
            myAccountId
                ? entriesQuery.data.filter(entry => entry.accountId === myAccountId)
                : entriesQuery.data,
        [entriesQuery.data, myAccountId]
    );

    const memberName = (accountId: string, index: number) => {
        if (accountId === myAccountId) return t('member_you');
        return (
            membersQuery.data.find(member => member.accountId === accountId)?.displayName ??
            t('member_fallback', { n: index + 1 })
        );
    };

    // 168-hour bar: the four SNA kinds plus whatever the diary did not account for.
    const kindMinutes = useMemo(() => {
        const totals = Object.fromEntries(TIME_KIND_ORDER.map(kind => [kind, 0])) as Record<
            TimeKind,
            number
        >;
        for (const row of summary.categories) totals[row.kind] += row.minutes;
        return totals;
    }, [summary.categories]);
    const barTotal = Math.max(1, summary.loggedMinutes + summary.unloggedMinutes);
    const discretionaryStatus = TIME_STATUS_META[summary.discretionary.status];
    const discretionaryRange = formatBandRange(
        DISCRETIONARY_BAND.targetLow,
        DISCRETIONARY_BAND.targetHigh,
        true,
        tRoot
    );

    const orderedCategories = TIME_CATEGORY_ORDER.map(category =>
        summary.categories.find(row => row.category === category)
    ).filter((row): row is NonNullable<typeof row> => Boolean(row));

    return (
        <div className="grid animate-rise gap-6">
            <Section eyebrow={t('eyebrow')} title={t('title')}>
                <Typography as="p" variant="lead" size="default">
                    {t('lead')}
                </Typography>
            </Section>

            {/* ── Live energy summary ── */}
            {energy.length > 0 && (
                <div className="flex flex-wrap gap-3">
                    {energy.map(stat => (
                        <div
                            key={stat.metric}
                            className="flex items-center gap-3 rounded-xl border border-line bg-raised px-4 py-2.5">
                            <span className="font-mono text-xs font-medium tracking-wide text-fg-muted uppercase">
                                {metricLabel[stat.metric]}
                            </span>
                            <span className="font-mono text-base font-semibold text-fg">
                                {Math.round(stat.average7d)}
                            </span>
                            <span className={cn('font-mono text-xs', TREND_CLASS[stat.trend])}>
                                {TREND_ICON[stat.trend]}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Log a day ── */}
            {live && householdId ? (
                <Card className="grid gap-5 p-6">
                    {needsSetup || logMode === 'setup' ? (
                        <WeekSetupWizard
                            householdId={householdId}
                            templates={templates}
                            onDone={() => setLogMode('checkIn')}
                            onCancel={needsSetup ? undefined : () => setLogMode('checkIn')}
                        />
                    ) : logMode === 'everything' ? (
                        <>
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <Eyebrow>{t('log_everything')}</Eyebrow>
                                    <p className="mt-2 max-w-prose text-sm leading-relaxed text-fg-muted">
                                        {t('log_everything_body')}
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setLogMode('checkIn')}>
                                    {t('back_quick')}
                                </Button>
                            </div>
                            <DayLogForm
                                key={day}
                                householdId={householdId}
                                entries={myEntries}
                                defaultOn={day}
                                onSaved={on => {
                                    selectDay(on);
                                    setLogMode('checkIn');
                                }}
                            />
                        </>
                    ) : (
                        <>
                            <Eyebrow>{t('log_day')}</Eyebrow>
                            <DayCheckIn
                                key={day}
                                householdId={householdId}
                                templates={templates}
                                entries={myEntries}
                                day={day}
                                onChangeDay={selectDay}
                                onEditEverything={() => setLogMode('everything')}
                                onEditWeek={() => setLogMode('setup')}
                            />
                            <div className="border-t border-line pt-4">
                                <CatchUpRow
                                    householdId={householdId}
                                    templates={templates}
                                    entries={myEntries}
                                    from={logRange.from}
                                    selected={day}
                                    onSelect={selectDay}
                                />
                            </div>
                        </>
                    )}
                </Card>
            ) : null}

            <Card className="grid gap-6 p-6">
                {/* ── Week nav ── */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <Eyebrow>
                            {week === thisWeek
                                ? t('this_week')
                                : week === lastWeek
                                  ? t('next_week')
                                  : week}{' '}
                            · {formatDayLabel(range.from, locale)} –{' '}
                            {formatDayLabel(range.to, locale)}
                        </Eyebrow>
                        <p className="mt-1 font-mono text-xs text-fg-muted">
                            {hasData
                                ? t('days_logged', { logged: summary.daysLogged })
                                : week > thisWeek
                                  ? t('not_started')
                                  : t('nothing_logged')}
                        </p>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            aria-label={t('prev_week')}
                            onClick={() => selectWeek(shiftWeek(week, -1))}>
                            ←
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={week === thisWeek}
                            onClick={() => selectWeek(thisWeek)}>
                            {t('today')}
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            aria-label={t('next_week_btn')}
                            disabled={week >= lastWeek}
                            onClick={() => selectWeek(shiftWeek(week, 1))}>
                            →
                        </Button>
                    </div>
                </div>

                {/* ── The week as it will land ── */}
                {live && week >= thisWeek && !needsSetup ? (
                    <WeekForecast
                        templates={templates}
                        entries={myEntries}
                        from={range.from}
                        today={today}
                        onEditWeek={() => setLogMode('setup')}
                    />
                ) : null}

                {/* ── 168-hour bar ── */}
                <div>
                    <Eyebrow>{t('hours_168')}</Eyebrow>
                    <div className="mt-3 flex h-3 gap-0.5 overflow-hidden rounded-full bg-sunken">
                        {hasData &&
                            TIME_KIND_ORDER.map(kind => (
                                <span
                                    key={kind}
                                    title={`${timeKindName(tm, kind)} — ${formatMinutes(kindMinutes[kind], tRoot)}`}
                                    className="block h-full"
                                    style={{
                                        width: `${(kindMinutes[kind] / barTotal) * 100}%`,
                                        background: TIME_KIND_META[kind].color,
                                    }}
                                />
                            ))}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-4">
                        {TIME_KIND_ORDER.map(kind => (
                            <span
                                key={kind}
                                className="flex items-baseline gap-2 font-mono text-xs text-fg-muted">
                                <span
                                    className="size-2 rounded-sm"
                                    style={{ background: TIME_KIND_META[kind].color }}
                                />
                                {timeKindName(tm, kind)}{' '}
                                {hasData ? formatMinutes(kindMinutes[kind], tRoot) : '—'}
                            </span>
                        ))}
                        {hasData && summary.unloggedMinutes > 0 ? (
                            <span className="flex items-baseline gap-2 font-mono text-xs text-fg-faint">
                                <span className="size-2 rounded-sm bg-sunken" />
                                {t('unlogged', {
                                    time: formatMinutes(summary.unloggedMinutes, tRoot),
                                })}
                            </span>
                        ) : null}
                    </div>
                    <p className="mt-3 max-w-prose text-sm leading-relaxed text-fg-muted">
                        {t('bar_lead')}
                    </p>
                </div>

                {/* ── You steer ── */}
                <div className="grid gap-3 border-t border-line pt-5 sm:grid-cols-[auto_1fr] sm:items-start sm:gap-6">
                    <div>
                        <Typography as="span" variant="eyebrow" color="primary">
                            {t('steer')}
                        </Typography>
                        <div className="mt-1 flex items-baseline gap-2">
                            <span className="font-display text-3xl font-semibold text-accent tabular-nums">
                                {hasData
                                    ? formatMinutes(summary.discretionary.dailyAverage, tRoot)
                                    : '—'}
                            </span>
                            <span className="font-mono text-xs text-fg-faint">{t('per_day')}</span>
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                            {hasData ? (
                                <Badge tone={discretionaryStatus.tone}>
                                    {timeStatusName(tm, summary.discretionary.status)}
                                </Badge>
                            ) : null}
                            <span className="text-sm text-fg-secondary">
                                {discretionaryRange
                                    ? t('sweet_spot', { range: discretionaryRange })
                                    : null}
                            </span>
                        </div>
                        <TimeSources sources={DISCRETIONARY_SOURCES} />
                    </div>
                </div>

                {/* ── Per-category cards ── */}
                {hasData ? (
                    <div className="grid grid-cols-2 gap-3 border-t border-line pt-5 sm:grid-cols-3 lg:grid-cols-4">
                        {orderedCategories.map(row => (
                            <TimeBandCard
                                key={row.category}
                                summary={row}
                                daysLogged={summary.daysLogged}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="grid gap-1 rounded-xl border border-dashed border-line p-5 text-sm text-fg-muted">
                        {week > thisWeek ? (
                            <>
                                <span className="font-medium text-fg">
                                    {t('empty_future_title')}
                                </span>
                                <span>{t('empty_future_body')}</span>
                            </>
                        ) : (
                            <>
                                <span className="font-medium text-fg">
                                    {t('empty_current_title')}
                                </span>
                                <span>{t('empty_current_body')}</span>
                            </>
                        )}
                    </div>
                )}

                {/* ── Household split ── */}
                {summary.members.length > 1 ? (
                    <div className="border-t border-line pt-5">
                        <Typography as="span" variant="eyebrow" color="primary">
                            ✦ {t('household_heading')}
                        </Typography>
                        <p className="mt-2 max-w-prose text-sm leading-relaxed text-fg-secondary">
                            {t('household_lead')}
                        </p>
                        <div className="mt-4 grid gap-3">
                            {summary.members.map((member, index) => {
                                const total = Math.max(
                                    1,
                                    Object.values(member.minutes).reduce(
                                        (sum, minutes) => sum + minutes,
                                        0
                                    )
                                );
                                return (
                                    <div key={member.accountId} className="grid gap-1.5">
                                        <div className="flex items-baseline justify-between gap-3">
                                            <span className="text-sm font-medium text-fg">
                                                {memberName(member.accountId, index)}
                                            </span>
                                            <span className="font-mono text-xs text-fg-muted">
                                                {t('member_paid', {
                                                    time: formatMinutes(
                                                        member.minutes[TimeKind.PAID],
                                                        tRoot
                                                    ),
                                                })}{' '}
                                                ·{' '}
                                                {t('member_unpaid', {
                                                    time: formatMinutes(
                                                        member.minutes[TimeKind.UNPAID],
                                                        tRoot
                                                    ),
                                                })}{' '}
                                                · {member.daysLogged}d
                                            </span>
                                        </div>
                                        <div className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-sunken">
                                            {TIME_KIND_ORDER.map(kind => (
                                                <span
                                                    key={kind}
                                                    className="block h-full"
                                                    title={`${timeKindName(tm, kind)} — ${formatMinutes(member.minutes[kind], tRoot)}`}
                                                    style={{
                                                        width: `${(member.minutes[kind] / total) * 100}%`,
                                                        background: TIME_KIND_META[kind].color,
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : null}

                {/* ── How to read the bands ── */}
                <div className="grid gap-3 border-t border-line pt-5">
                    <Typography as="span" variant="eyebrow" color="primary">
                        ✦ {t('bands_heading')}
                    </Typography>
                    <div className="grid gap-2 sm:grid-cols-3">
                        {(Object.values(TimeEvidence) as TimeEvidence[]).map(evidence => (
                            <div
                                key={evidence}
                                className="grid gap-1 rounded-xl border border-line bg-raised p-3">
                                <span className="font-mono text-xs font-semibold tracking-wide text-fg uppercase">
                                    {timeEvidenceName(tm, evidence)}
                                </span>
                                <span className="text-xs leading-relaxed text-fg-muted">
                                    {timeEvidenceBlurb(tm, evidence)}
                                </span>
                            </div>
                        ))}
                    </div>
                    <p className="max-w-prose text-sm leading-relaxed text-fg-muted">
                        {t('bands_footer')}
                    </p>
                </div>
            </Card>
        </div>
    );
}
