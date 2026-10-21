import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';
import {
    CAPABILITIES,
    CourseArea,
    CourseHorizon,
    CourseItemStatus,
    CourseLane,
    CourseRitual,
    CourseScheduleKind,
    MONTH_CLOSE_DEFAULT_LEAD_DAYS,
    TIME_REFERENCE,
    TimeCategory,
    coursePeriodOf,
    countsInProgress,
    datesBetween,
    hasCapability,
    isCapabilityDeferredAtLaunch,
    isCountingRhythm,
    isRhythmDueOn,
    isoWeekdayOf,
    monthCloseStage,
    periodRange,
    rhythmPeriodOf,
    rhythmPeriodTarget,
    shiftCoursePeriod,
    weekCheckWeekFor,
    type CapabilityKey,
    type CourseItem as CourseItemDto,
    type CourseScheduleEntry,
    type CourseScheduleView,
    type PlanKey,
} from '@rumtelo/contracts';

import { PlanAccessService } from '../../../../../common/capability';
import { isLaunchProductsDeferred } from '../../../../../common/config/launch-products.util';
import { HouseholdScopedRepository } from '../../../../../common/household/household-scoped.repository';
import { currentHouseholdId } from '../../../../../common/household/household.context';
import { VisibilityService } from '../../../../../common/household/visibility.service';
import { HouseholdSettingsService } from '../../../../auth/household/household-settings/household-settings.service';
import { TimeTemplateService } from '../../energy/time-template/time-template.service';
import { MonthScoreService } from '../../money/month-score/month-score.service';
import { WeekCheckService as MoneyWeekCheckService } from '../../money/week-check/week-check.service';
import { GrowthWeekCheckService } from '../week-check/week-check.service';
import { CourseService } from './course.service';
import { GrowthCourseFeed } from './growth-course-feed.entity';
import { GrowthCourseRitualSnooze } from './growth-course-ritual-snooze.entity';
import { RhythmService } from './rhythm.service';

const COURSE_PATH = '/product/growth/course';

/** How far back an unclosed month still asks to be closed. */
const OVERDUE_LOOKBACK_MONTHS = 12;

/**
 * Course schedule: one read over Focus, routines, the checks around them and the
 * Energy sleep advice, for a date range. Course › Today and › Week, the Home card and
 * the calendar feed read it. Every row comes from its source service and links back
 * there; this service stores nothing except a reminder snooze.
 *
 * Course itself needs `growth-course` (checked on the controller); the money checks
 * need Money; sleep advice needs Energy (off at launch).
 */
@Injectable()
export class CourseScheduleService {
    private readonly snoozes: HouseholdScopedRepository<GrowthCourseRitualSnooze>;
    private readonly feeds: HouseholdScopedRepository<GrowthCourseFeed>;

    constructor(
        @Inject(EntityManager) private readonly em: EntityManager,
        @Inject(VisibilityService) private readonly visibility: VisibilityService,
        @Inject(PlanAccessService) private readonly planAccess: PlanAccessService,
        @Inject(HouseholdSettingsService) private readonly settings: HouseholdSettingsService,
        @Inject(CourseService) private readonly course: CourseService,
        @Inject(RhythmService) private readonly rhythms: RhythmService,
        @Inject(GrowthWeekCheckService) private readonly growthWeekChecks: GrowthWeekCheckService,
        @Inject(MoneyWeekCheckService) private readonly moneyWeekChecks: MoneyWeekCheckService,
        @Inject(MonthScoreService) private readonly monthScores: MonthScoreService,
        @Inject(TimeTemplateService) private readonly timeTemplates: TimeTemplateService
    ) {
        this.snoozes = new HouseholdScopedRepository(em, GrowthCourseRitualSnooze);
        this.feeds = new HouseholdScopedRepository(em, GrowthCourseFeed);
    }

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    async list(from: string, to: string, today = todayUtc()): Promise<CourseScheduleView> {
        const planKey = await this.planAccess.planKeyForCurrentHousehold();
        const can = (key: CapabilityKey) => isGranted(key, planKey);
        const settings = await this.settings.get(currentHouseholdId());
        const viewerAccountId = (await this.visibility.snapshot()).viewer.accountId;

        // Course itself is gated on the controller (`growth-course`, Plus and Max);
        // rows from other portals follow their own capability.
        const lanes = await Promise.all([
            this.focusEntries(from, to, settings.features.isCourseDaysEnabled, viewerAccountId),
            this.rhythmEntries(from, to, viewerAccountId),
            this.growthWeekCheckEntries(from, to),
            can(CAPABILITIES.moneyOverview) ? this.moneyWeekCheckEntries(from, to) : [],
            can(CAPABILITIES.moneyOverview)
                ? this.monthCloseEntries(from, to, today, settings.createdAt, viewerAccountId)
                : [],
            can(CAPABILITIES.energySleep) ? this.sleepEntries(from, to) : [],
        ]);

        const entries = lanes.flat().sort(byDateThenLane);
        return { from, to, today, weekCheckWeek: weekCheckWeekFor(today), entries };
    }

    // ====================================================================
    // ? UPDATE Operations
    // ====================================================================

    /** "Not now" for this person and period. Idempotent. */
    async snooze(ritual: CourseRitual, period: string): Promise<{ ok: true }> {
        const accountId = await this.visibility.requireViewerAccountId();
        const existing = await this.snoozes.findOne({ account: accountId, ritual, period });
        if (!existing) {
            this.em.persist(this.snoozes.create({ account: accountId, ritual, period }));
            await this.em.flush();
        }
        return { ok: true };
    }

    // ====================================================================
    // Private — lanes
    // ====================================================================

    /** One row per maker per week (Mon–Sun), plus one per day when the day layer is on. */
    private async focusEntries(
        from: string,
        to: string,
        isDaysEnabled: boolean,
        viewerAccountId: string | null
    ): Promise<CourseScheduleEntry[]> {
        const weeks = weeksBetween(from, to);
        const entries: CourseScheduleEntry[] = [];

        const weekItems = await this.course.inPeriods(CourseHorizon.WEEK, weeks);
        for (const week of weeks) {
            const range = periodRange(CourseHorizon.WEEK, week);
            for (const [maker, items] of byMaker(weekItems.filter(item => item.period === week))) {
                entries.push(
                    focusEntry({
                        kind: CourseScheduleKind.FOCUS_WEEK,
                        key: `focus-week:${week}:${maker}`,
                        date: range.from,
                        endDate: range.to,
                        period: week,
                        items,
                        href: `${COURSE_PATH}/${week}`,
                        viewerAccountId,
                    })
                );
            }
        }

        if (isDaysEnabled) {
            const days = datesBetween(from, to);
            const dayItems = await this.course.inPeriods(CourseHorizon.DAY, days);
            for (const day of days) {
                for (const [maker, items] of byMaker(
                    dayItems.filter(item => item.period === day)
                )) {
                    entries.push(
                        focusEntry({
                            kind: CourseScheduleKind.FOCUS_DAY,
                            key: `focus-day:${day}:${maker}`,
                            date: day,
                            endDate: day,
                            period: day,
                            items,
                            href: `${COURSE_PATH}/${day}`,
                            viewerAccountId,
                        })
                    );
                }
            }
        }
        return entries;
    }

    /** A routine on each day it is due, or ticked. */
    private async rhythmEntries(
        from: string,
        to: string,
        viewerAccountId: string | null
    ): Promise<CourseScheduleEntry[]> {
        // Ticks must cover whole count periods (a month for MONTHLY) around the range.
        const countFrom = periodRange(CourseHorizon.MONTH, from.slice(0, 7)).from;
        const countTo = periodRange(CourseHorizon.MONTH, to.slice(0, 7)).to;
        const rows = await this.rhythms.activeBetween(
            minDate(countFrom, periodRange(CourseHorizon.WEEK, weekOf(from)).from),
            maxDate(countTo, periodRange(CourseHorizon.WEEK, weekOf(to)).to)
        );

        const entries: CourseScheduleEntry[] = [];
        for (const { rhythm, ticks } of rows) {
            const ticked = new Set(ticks);
            const periodTarget = rhythmPeriodTarget(rhythm.cadence, rhythm.target, rhythm.weekdays);
            for (const date of datesBetween(from, to)) {
                const { horizon, period } = rhythmPeriodOf(rhythm.cadence, weekOf(date));
                const range = periodRange(horizon, period);
                const periodCount = ticks.filter(
                    tick => tick >= range.from && tick <= range.to
                ).length;
                // Count before this day decides whether a free routine still shows up.
                const countBefore = ticks.filter(tick => tick >= range.from && tick < date).length;
                const isDone = ticked.has(date);
                const isDue = isRhythmDueOn({
                    cadence: rhythm.cadence,
                    weekdays: rhythm.weekdays,
                    isoDate: date,
                    periodCount: countBefore,
                    periodTarget,
                });
                if (!isDone && !isDue) continue;
                entries.push({
                    ...blankEntry(),
                    key: `rhythm:${rhythm.id}:${date}`,
                    lane: CourseLane.RHYTHM,
                    kind: CourseScheduleKind.RHYTHM,
                    area: rhythm.area ?? CourseArea.GROWTH,
                    date,
                    endDate: date,
                    names: [rhythm.name],
                    sourceIds: [rhythm.id],
                    isDone,
                    rhythmKind: rhythm.kind,
                    // A habit has no score: only a discipline shows "2 of 3".
                    doneCount: isCountingRhythm(rhythm.kind) ? periodCount : null,
                    totalCount: isCountingRhythm(rhythm.kind) ? periodTarget : null,
                    period,
                    accountId: rhythm.account,
                    isMine: rhythm.account !== null && rhythm.account === viewerAccountId,
                    href: `${COURSE_PATH}/${weekOf(date)}`,
                });
            }
        }
        return entries;
    }

    /** Every Sunday: the check that plans the week after it. */
    private async growthWeekCheckEntries(from: string, to: string): Promise<CourseScheduleEntry[]> {
        const sundays = datesBetween(from, to).filter(date => isoWeekdayOf(date) === 7);
        const weeks = sundays.map(weekCheckWeekFor);
        const done = await this.growthWeekChecks.completedWeeks(weeks);
        return sundays.map((sunday, index) => {
            const week = weeks[index]!;
            return {
                ...blankEntry(),
                key: `growth-week-check:${week}`,
                lane: CourseLane.CHECK,
                kind: CourseScheduleKind.GROWTH_WEEK_CHECK,
                area: CourseArea.GROWTH,
                date: sunday,
                endDate: sunday,
                isDone: done.has(week),
                period: week,
                href: `${COURSE_PATH}/week-check`,
            };
        });
    }

    /** Every Sunday: the money check of the week that ends that day. */
    private async moneyWeekCheckEntries(from: string, to: string): Promise<CourseScheduleEntry[]> {
        const sundays = datesBetween(from, to).filter(date => isoWeekdayOf(date) === 7);
        const weeks = sundays.map(weekOf);
        const done = await this.moneyWeekChecks.completedWeeks(weeks);
        return sundays.map((sunday, index) => {
            const week = weeks[index]!;
            return {
                ...blankEntry(),
                key: `money-week-check:${week}`,
                lane: CourseLane.CHECK,
                kind: CourseScheduleKind.MONEY_WEEK_CHECK,
                area: CourseArea.MONEY,
                date: sunday,
                endDate: sunday,
                isDone: done.has(week),
                period: week,
                href: '/product/money/week-check',
            };
        });
    }

    /**
     * Month close, stepped: due on the last day with a reminder `leadDays` before (or on
     * the day once snoozed). A past month still open shows up today, every day, until
     * it is closed — the oldest one first, because months close in order.
     */
    private async monthCloseEntries(
        from: string,
        to: string,
        today: string,
        householdCreatedAt: string,
        viewerAccountId: string | null
    ): Promise<CourseScheduleEntry[]> {
        const floor = householdCreatedAt.slice(0, 7);
        const thisMonth = today.slice(0, 7);
        const rangeMonths = monthsBetween(from.slice(0, 7), to.slice(0, 7)).filter(
            month => month >= floor
        );
        const lookback = monthsBetween(
            maxMonth(
                floor,
                shiftCoursePeriod(CourseHorizon.MONTH, thisMonth, -OVERDUE_LOOKBACK_MONTHS)
            ),
            shiftCoursePeriod(CourseHorizon.MONTH, thisMonth, -1)
        ).filter(month => month >= floor);
        const months = [...new Set([...rangeMonths, ...lookback])];

        const [closed, snoozed, leadDays] = await Promise.all([
            this.monthScores.closedPeriods(months),
            this.snoozedPeriods(CourseRitual.MONTH_CLOSE, months, viewerAccountId),
            this.leadDaysFor(viewerAccountId),
        ]);

        const entries: CourseScheduleEntry[] = [];
        for (const month of rangeMonths) {
            const stage = monthCloseStage({
                month,
                today,
                isClosed: closed.has(month),
                isSnoozed: snoozed.has(month),
                leadDays,
            });
            // A past open month moves to "today" below; keep its due row only when closed.
            if (stage.isOverdue) continue;
            if (stage.dueDate < from || stage.dueDate > to) continue;
            entries.push(
                monthCloseEntry(month, stage.dueDate, {
                    isDone: closed.has(month),
                    isOverdue: false,
                    reminderDate: stage.reminderDate,
                    isSnoozed: snoozed.has(month),
                })
            );
        }

        const oldestOpen = lookback.find(month => !closed.has(month));
        if (oldestOpen && today >= from && today <= to) {
            entries.push(
                monthCloseEntry(oldestOpen, today, {
                    isDone: false,
                    isOverdue: true,
                    reminderDate: today,
                    isSnoozed: snoozed.has(oldestOpen),
                })
            );
        }
        return entries;
    }

    /** Planned sleep from the Energy template against the 7–9 h advice, per day. */
    private async sleepEntries(from: string, to: string): Promise<CourseScheduleEntry[]> {
        const byWeekday = await this.timeTemplates.sleepMinutesByWeekday();
        if (byWeekday.size === 0) return [];
        const band = TIME_REFERENCE[TimeCategory.SLEEP].band;
        return datesBetween(from, to).flatMap(date => {
            const minutes = byWeekday.get(isoWeekdayOf(date));
            if (minutes === undefined) return [];
            return [
                {
                    ...blankEntry(),
                    key: `sleep:${date}`,
                    lane: CourseLane.ADVICE,
                    kind: CourseScheduleKind.SLEEP,
                    area: CourseArea.ENERGY,
                    date,
                    endDate: date,
                    minutes,
                    adviceLowMinutes: band?.targetLow ?? null,
                    adviceHighMinutes: band?.targetHigh ?? null,
                    isMine: true,
                    href: '/product/energy/sleep',
                },
            ];
        });
    }

    // ====================================================================
    // Private — helpers
    // ====================================================================

    private async snoozedPeriods(
        ritual: CourseRitual,
        periods: string[],
        accountId: string | null
    ): Promise<Set<string>> {
        if (!accountId || periods.length === 0) return new Set();
        const rows = await this.snoozes.find({
            account: accountId,
            ritual,
            period: { $in: periods },
        });
        return new Set(rows.map(row => row.period));
    }

    /** The viewer's month-close lead from their feed settings; 3 days by default. */
    private async leadDaysFor(accountId: string | null): Promise<number> {
        if (!accountId) return MONTH_CLOSE_DEFAULT_LEAD_DAYS;
        const feed = await this.feeds.findOne({ account: accountId });
        return feed?.monthCloseLeadDays ?? MONTH_CLOSE_DEFAULT_LEAD_DAYS;
    }
}

// ====================================================================
// Pure helpers
// ====================================================================

const LANE_ORDER: Record<CourseLane, number> = {
    [CourseLane.CHECK]: 0,
    [CourseLane.FOCUS]: 1,
    [CourseLane.RHYTHM]: 2,
    [CourseLane.ADVICE]: 3,
};

function byDateThenLane(left: CourseScheduleEntry, right: CourseScheduleEntry): number {
    if (left.date !== right.date) return left.date < right.date ? -1 : 1;
    return LANE_ORDER[left.lane] - LANE_ORDER[right.lane];
}

function isGranted(key: CapabilityKey, planKey: PlanKey): boolean {
    if (isLaunchProductsDeferred() && isCapabilityDeferredAtLaunch(key)) return false;
    return hasCapability(key, planKey);
}

function blankEntry(): Omit<
    CourseScheduleEntry,
    'key' | 'lane' | 'kind' | 'area' | 'date' | 'endDate' | 'href'
> {
    return {
        names: [],
        sourceIds: [],
        isDone: false,
        rhythmKind: null,
        doneCount: null,
        totalCount: null,
        period: null,
        isOverdue: false,
        reminderDate: null,
        ritual: null,
        isSnoozed: false,
        minutes: null,
        adviceLowMinutes: null,
        adviceHighMinutes: null,
        accountId: null,
        isMine: false,
    };
}

function focusEntry(input: {
    kind: CourseScheduleKind;
    key: string;
    date: string;
    endDate: string;
    period: string;
    items: CourseItemDto[];
    href: string;
    viewerAccountId: string | null;
}): CourseScheduleEntry {
    const counted = input.items.filter(item => countsInProgress(item.status));
    const done = counted.filter(item => item.status === CourseItemStatus.DONE).length;
    const accountId = input.items[0]?.accountId ?? null;
    return {
        ...blankEntry(),
        key: input.key,
        lane: CourseLane.FOCUS,
        kind: input.kind,
        area: CourseArea.GROWTH,
        date: input.date,
        endDate: input.endDate,
        names: input.items.map(item => item.name),
        sourceIds: input.items.map(item => item.id),
        isDone: counted.length > 0 && done === counted.length,
        doneCount: done,
        totalCount: counted.length,
        period: input.period,
        accountId,
        isMine: accountId === null || accountId === input.viewerAccountId,
        href: input.href,
    };
}

function monthCloseEntry(
    month: string,
    date: string,
    state: { isDone: boolean; isOverdue: boolean; reminderDate: string; isSnoozed: boolean }
): CourseScheduleEntry {
    return {
        ...blankEntry(),
        key: `month-close:${month}`,
        lane: CourseLane.CHECK,
        kind: CourseScheduleKind.MONTH_CLOSE,
        area: CourseArea.MONEY,
        date,
        endDate: date,
        isDone: state.isDone,
        isOverdue: state.isOverdue,
        reminderDate: state.reminderDate,
        ritual: CourseRitual.MONTH_CLOSE,
        isSnoozed: state.isSnoozed,
        period: month,
        isMine: true,
        // The month close lives on Home (Month score) and in The Coach.
        href: '/',
    };
}

/** Items grouped by maker; together rows (`accountId = null`) form their own group. */
function byMaker(items: CourseItemDto[]): Map<string, CourseItemDto[]> {
    const groups = new Map<string, CourseItemDto[]>();
    for (const item of items) {
        const maker = item.accountId ?? 'together';
        groups.set(maker, [...(groups.get(maker) ?? []), item]);
    }
    return groups;
}

function weekOf(date: string): string {
    return coursePeriodOf(CourseHorizon.WEEK, new Date(`${date}T00:00:00Z`));
}

function weeksBetween(from: string, to: string): string[] {
    const last = weekOf(to);
    const weeks: string[] = [];
    for (
        let week = weekOf(from);
        week <= last;
        week = shiftCoursePeriod(CourseHorizon.WEEK, week, 1)
    ) {
        weeks.push(week);
    }
    return weeks;
}

function monthsBetween(from: string, to: string): string[] {
    const months: string[] = [];
    for (let month = from; month <= to; month = shiftCoursePeriod(CourseHorizon.MONTH, month, 1)) {
        months.push(month);
    }
    return months;
}

function maxMonth(left: string, right: string): string {
    return left > right ? left : right;
}

function minDate(left: string, right: string): string {
    return left < right ? left : right;
}

function maxDate(left: string, right: string): string {
    return left > right ? left : right;
}

function todayUtc(): string {
    return new Date().toISOString().slice(0, 10);
}
