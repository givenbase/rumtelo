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
import { useLiveQuery } from '@rumtelo/hooks';
import { Badge, Button, Card, Eyebrow, Section, Typography } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import { isLiveData } from '@/app/_lib/preview';
import {
    TIME_EVIDENCE_META,
    TIME_KIND_META,
    TIME_KIND_ORDER,
    TIME_STATUS_META,
    formatBandRange,
    formatMinutes,
} from '@/app/_lib/time-meta';
import { formatDayLabel, shiftWeek, todayIso, weekKeyOf, weekRangeOf } from '@/app/_lib/week-key';
import { useAuth } from '@/components/features/shell/auth-provider';

import { CatchUpRow } from './catch-up-row';
import { DayCheckIn } from './day-check-in';
import { DayLogForm } from './day-log-form';
import { TimeBandCard } from './time-band-card';
import { TimeSources } from './time-sources';
import { previewWeekSummary } from './week-fixture';
import { WeekSetupWizard } from './week-setup-wizard';

const METRIC_LABEL: Record<EnergyMetric, string> = {
    [EnergyMetric.SLEEP]: 'Sleep',
    [EnergyMetric.TRAIN]: 'Training',
    [EnergyMetric.FOOD]: 'Nutrition',
    [EnergyMetric.MIND]: 'Stillness',
};

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
    const { householdId, userId } = useAuth();
    const live = isLiveData(householdId);
    const thisWeek = weekKeyOf(todayIso());
    const [week, setWeek] = useState(thisWeek);
    const [day, setDay] = useState(todayIso);
    const [logMode, setLogMode] = useState<LogMode>('checkIn');
    const range = weekRangeOf(week);

    // Picking a day anywhere moves the visible week with it, and vice versa.
    const selectDay = (iso: string) => {
        setDay(iso);
        setWeek(weekKeyOf(iso));
    };
    const selectWeek = (key: string) => {
        setWeek(key);
        setDay(key === thisWeek ? todayIso() : weekRangeOf(key).from);
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
            input: { householdId: householdId!, from: range.from, to: range.to },
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
        if (accountId === myAccountId) return 'You';
        return (
            membersQuery.data.find(member => member.accountId === accountId)?.displayName ??
            `Member ${index + 1}`
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
        true
    );

    const orderedCategories = TIME_CATEGORY_ORDER.map(category =>
        summary.categories.find(row => row.category === category)
    ).filter((row): row is NonNullable<typeof row> => Boolean(row));

    return (
        <div className="grid animate-rise gap-6">
            <Section eyebrow="My week" title="Every hour gets a job too.">
                <Typography as="p" variant="lead" size="default">
                    Log where a day went, in hours. The week is compared with what public-health
                    bodies and field studies on three continents actually found — not with your jar
                    percentages.
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
                                {METRIC_LABEL[stat.metric]}
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
                                    <Eyebrow>Every category</Eyebrow>
                                    <p className="mt-2 max-w-prose text-sm leading-relaxed text-fg-muted">
                                        The full diary, in hours. Rough is fine — quarter-hours are
                                        finer than national time-use surveys ask for.
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setLogMode('checkIn')}>
                                    Back to quick log
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
                            <Eyebrow>Log a day</Eyebrow>
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
                                    from={range.from}
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
                            {week === thisWeek ? 'This week' : week} · {formatDayLabel(range.from)}{' '}
                            – {formatDayLabel(range.to)}
                        </Eyebrow>
                        <p className="mt-1 font-mono text-xs text-fg-muted">
                            {hasData
                                ? `${summary.daysLogged} of 7 days logged`
                                : 'Nothing logged yet for this week'}
                        </p>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            aria-label="Previous week"
                            onClick={() => selectWeek(shiftWeek(week, -1))}>
                            ←
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={week === thisWeek}
                            onClick={() => selectWeek(thisWeek)}>
                            Today
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            aria-label="Next week"
                            disabled={week >= thisWeek}
                            onClick={() => selectWeek(shiftWeek(week, 1))}>
                            →
                        </Button>
                    </div>
                </div>

                {/* ── 168-hour bar ── */}
                <div>
                    <Eyebrow>Your week has 168 hours</Eyebrow>
                    <div className="mt-3 flex h-3 gap-0.5 overflow-hidden rounded-full bg-sunken">
                        {hasData &&
                            TIME_KIND_ORDER.map(kind => (
                                <span
                                    key={kind}
                                    title={`${TIME_KIND_META[kind].name} — ${formatMinutes(kindMinutes[kind])}`}
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
                                {TIME_KIND_META[kind].name}{' '}
                                {hasData ? formatMinutes(kindMinutes[kind]) : '—'}
                            </span>
                        ))}
                        {hasData && summary.unloggedMinutes > 0 ? (
                            <span className="flex items-baseline gap-2 font-mono text-xs text-fg-faint">
                                <span className="size-2 rounded-sm bg-sunken" />
                                Unlogged {formatMinutes(summary.unloggedMinutes)}
                            </span>
                        ) : null}
                    </div>
                    <p className="mt-3 max-w-prose text-sm leading-relaxed text-fg-muted">
                        Body, paid and unpaid are the split every national time-use survey uses. The
                        last slice is the part you steer — and the only one where the amount has a
                        sweet spot rather than a minimum.
                    </p>
                </div>

                {/* ── You steer ── */}
                <div className="grid gap-3 border-t border-line pt-5 sm:grid-cols-[auto_1fr] sm:items-start sm:gap-6">
                    <div>
                        <Typography as="span" variant="eyebrow" color="primary">
                            Of which you steer
                        </Typography>
                        <div className="mt-1 flex items-baseline gap-2">
                            <span className="font-display text-3xl font-semibold text-accent tabular-nums">
                                {hasData ? formatMinutes(summary.discretionary.dailyAverage) : '—'}
                            </span>
                            <span className="font-mono text-xs text-fg-faint">/ day</span>
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                            {hasData ? (
                                <Badge tone={discretionaryStatus.tone}>
                                    {discretionaryStatus.name}
                                </Badge>
                            ) : null}
                            <span className="text-sm text-fg-secondary">
                                Sweet spot {discretionaryRange} a day. Under two hours reads as
                                stress; past five, well-being only holds when the time is social or
                                purposeful.
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
                        <span className="font-medium text-fg">No days logged this week.</span>
                        <span>
                            Log one day above and the 168-hour bar, the sweet-spot check and the
                            per-category bands fill in from your own minutes.
                        </span>
                    </div>
                )}

                {/* ── Household split ── */}
                {summary.members.length > 1 ? (
                    <div className="border-t border-line pt-5">
                        <Typography as="span" variant="eyebrow" color="primary">
                            ✦ Where the hours land in this household
                        </Typography>
                        <p className="mt-2 max-w-prose text-sm leading-relaxed text-fg-secondary">
                            Paid and unpaid hours side by side, per person. In every national survey
                            this is where the largest gap hides.
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
                                                paid {formatMinutes(member.minutes[TimeKind.PAID])}{' '}
                                                · unpaid{' '}
                                                {formatMinutes(member.minutes[TimeKind.UNPAID])} ·{' '}
                                                {member.daysLogged}d
                                            </span>
                                        </div>
                                        <div className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-sunken">
                                            {TIME_KIND_ORDER.map(kind => (
                                                <span
                                                    key={kind}
                                                    className="block h-full"
                                                    title={`${TIME_KIND_META[kind].name} — ${formatMinutes(member.minutes[kind])}`}
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
                        ✦ How to read the bands
                    </Typography>
                    <div className="grid gap-2 sm:grid-cols-3">
                        {(Object.values(TimeEvidence) as TimeEvidence[]).map(evidence => (
                            <div
                                key={evidence}
                                className="grid gap-1 rounded-xl border border-line bg-raised p-3">
                                <span className="font-mono text-xs font-semibold tracking-wide text-fg uppercase">
                                    {TIME_EVIDENCE_META[evidence].name}
                                </span>
                                <span className="text-xs leading-relaxed text-fg-muted">
                                    {TIME_EVIDENCE_META[evidence].blurb}
                                </span>
                            </div>
                        ))}
                    </div>
                    <p className="max-w-prose text-sm leading-relaxed text-fg-muted">
                        Targets come mostly from Canadian and WHO guidelines. Floors are set lower
                        on purpose: Japan’s ministry of health accepts six hours of sleep, and
                        people in Tanzania and Namibia without electricity average 6.4. Categories
                        marked “your call” have no defensible number anywhere — set your own target
                        and hold yourself to it, but do not let anyone call it medicine.
                    </p>
                </div>
            </Card>
        </div>
    );
}
