import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';
import {
    CourseHorizon,
    VisibilityArea,
    type VisibilityChoice,
    addDays,
    ancestorPeriodOf,
    canLinkMoneyGoal,
    canParentRhythm,
    childPeriodsOf,
    childVisibilityOptions,
    choiceOf,
    coursePeriodOf,
    defaultVisibilityChoice,
    isCountingRhythm,
    isRhythmTargetValid,
    rhythmShapeFor,
    isVisibilityPickerShown,
    mondayOf,
    periodRange,
    rhythmPeriodOf,
    rhythmPeriodTarget,
    shiftCoursePeriod,
    type CourseItem as CourseItemDto,
    type CourseRhythm as CourseRhythmDto,
    type CourseRhythmCreateInput,
    type CourseRhythmSuggestion,
    type CourseRhythmUpdateInput,
    type CourseRhythmWeekView,
    type VisibilityRow,
} from '@rumtelo/contracts';

import { apiBadRequest, apiNotFound } from '../../../../../common/errors/api-user-error';
import { HouseholdScopedRepository } from '../../../../../common/household/household-scoped.repository';
import { currentHouseholdId } from '../../../../../common/household/household.context';
import { PersonalScopedRepository } from '../../../../../common/household/personal-scoped.repository';
import { VisibilityService } from '../../../../../common/household/visibility.service';
import { currentWeek } from '../../../../../common/utils/period.util';
import { CourseService } from './course.service';
import { GrowthCourseItem } from './growth-course-item.entity';
import { GrowthCourseRhythm } from './growth-course-rhythm.entity';
import { GrowthCourseRhythmTick } from './growth-course-rhythm-tick.entity';

const AREA = VisibilityArea.GROWTH_COURSE;

/** How far back `lastTickOn` looks. */
const LAST_TICK_WINDOW_DAYS = 366;

/** A routine row plus the ticks the caller asked for. */
export interface RhythmWithTicks {
    rhythm: GrowthCourseRhythm;
    ticks: string[];
}

/**
 * Course › Rhythm: routines you keep next to the three Focus choices.
 *
 * Rules: a routine hangs under a year, quarter or month item (or nothing), is never
 * more open than that parent, and never takes a Focus slot. A tick is a day, today
 * or earlier, once. A new week or month only *proposes* to keep going; renewing a
 * past milestone needs an explicit yes (`renew`).
 */
@Injectable()
export class RhythmService {
    private readonly rhythms: PersonalScopedRepository<GrowthCourseRhythm>;
    private readonly items: PersonalScopedRepository<GrowthCourseItem>;
    private readonly ticks: HouseholdScopedRepository<GrowthCourseRhythmTick>;

    constructor(
        @Inject(EntityManager) private readonly em: EntityManager,
        @Inject(VisibilityService) private readonly visibility: VisibilityService,
        @Inject(CourseService) private readonly course: CourseService
    ) {
        this.rhythms = new PersonalScopedRepository(em, GrowthCourseRhythm, AREA, visibility);
        this.items = new PersonalScopedRepository(em, GrowthCourseItem, AREA, visibility);
        this.ticks = new HouseholdScopedRepository(em, GrowthCourseRhythmTick);
    }

    // ====================================================================
    // ? CREATE Operations
    // ====================================================================

    async create(input: Omit<CourseRhythmCreateInput, 'householdId'>): Promise<CourseRhythmDto> {
        const shape = rhythmShapeFor(input.kind, input.cadence, input.target);
        if (!isRhythmTargetValid(shape.cadence, shape.target)) {
            throw apiBadRequest('course_rhythm_target_invalid');
        }
        const parent = await this.validParent(input.parentId ?? null);
        const choice = await this.allowedChoice(parent, input.visibility ?? null);

        const rhythm = await this.rhythms.createPersonal(
            {
                name: input.name,
                kind: input.kind,
                cadence: shape.cadence,
                target: shape.target,
                weekdays: normalizeWeekdays(input.weekdays ?? null),
                parent: parent?.id ?? null,
                area: input.area ?? null,
                // Made this week: nothing to propose until next week.
                confirmedWeek: currentWeek(),
                pausedAt: null,
                endedAt: null,
            },
            choice
        );
        await this.em.persist(rhythm).flush();
        return this.one(rhythm, currentWeek());
    }

    /** Tick a day. Today or earlier (one day of slack for time zones ahead of UTC). */
    async tick(id: string, date: string): Promise<CourseRhythmDto> {
        const rhythm = await this.findOrFail(id);
        await this.rhythms.assertCanEdit(rhythm);
        if (date > addDays(todayUtc(), 1)) throw apiBadRequest('course_rhythm_tick_future');

        const existing = await this.ticks.findOne({ rhythm: rhythm.id, tickedOn: date });
        if (!existing) {
            this.em.persist(this.ticks.create({ rhythm: rhythm.id, tickedOn: date }));
            await this.em.flush();
        }
        return this.one(rhythm, weekOf(date));
    }

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    async list(input: {
        week?: string | null;
        accountId?: string | null;
    }): Promise<CourseRhythmWeekView> {
        const week = input.week ?? currentWeek();
        const makerFilter = input.accountId ? { account: input.accountId } : {};
        const [rows, hiddenCount, snapshot, options] = await Promise.all([
            this.rhythms.find({ endedAt: null, ...makerFilter }, { orderBy: { createdAt: 'ASC' } }),
            this.rhythms.countHidden({ endedAt: null }),
            this.visibility.snapshot(),
            this.visibility.optionsFor(AREA),
        ]);
        return {
            week,
            days: childPeriodsOf(CourseHorizon.WEEK, week),
            rhythms: await this.toDtos(rows, week),
            hiddenCount,
            visibilityOptions: options,
            defaultVisibility: defaultVisibilityChoice(options, false),
            isVisibilityPickerShown: isVisibilityPickerShown(snapshot.participantCount),
        };
    }

    /**
     * Proposals for the week being planned: the viewer's running routines that were
     * not answered yet this week, with last period's score — and a renewal when the
     * milestone they feed belongs to a period that has ended.
     */
    async suggestions(weekInput?: string | null): Promise<CourseRhythmSuggestion[]> {
        const week = weekInput ?? currentWeek();
        const viewerAccountId = await this.visibility.requireViewerAccountId();
        const weekStart = new Date(`${mondayOf(week)}T00:00:00Z`);
        const rows = (
            await this.rhythms.find(
                { account: viewerAccountId, endedAt: null, pausedAt: null },
                { orderBy: { createdAt: 'ASC' } }
            )
        ).filter(row => row.createdAt < weekStart);
        if (rows.length === 0) return [];

        const parents = await this.parentsOf(rows);
        const previousWeek = shiftCoursePeriod(CourseHorizon.WEEK, week, -1);
        const previousRanges = rows.map(row => {
            const { horizon, period } = rhythmPeriodOf(row.cadence, previousWeek);
            return { row, period, ...periodRange(horizon, period) };
        });
        const ticks = await this.ticksBetween(
            rows.map(row => row.id),
            minOf(previousRanges.map(range => range.from)),
            maxOf(previousRanges.map(range => range.to))
        );

        const dtos = new Map((await this.toDtos(rows, week)).map(dto => [dto.id, dto]));
        const proposals: CourseRhythmSuggestion[] = [];
        for (const range of previousRanges) {
            const { row } = range;
            const renewal = renewalFor(parents.get(row.parent ?? ''), week);
            const isNewCountPeriod =
                rhythmPeriodOf(row.cadence, week).period !==
                rhythmPeriodOf(row.cadence, previousWeek).period;
            const isAnswered = row.confirmedWeek === week;
            // A habit has no score to look back on: it only asks again to renew its goal.
            const isKeepGoing = isNewCountPeriod && isCountingRhythm(row.kind);
            if (isAnswered || (!isKeepGoing && !renewal)) continue;
            proposals.push({
                rhythm: dtos.get(row.id)!,
                previousPeriod: range.period,
                previousCount: (ticks.get(row.id) ?? []).filter(
                    date => date >= range.from && date <= range.to
                ).length,
                previousTarget: rhythmPeriodTarget(row.cadence, row.target, row.weekdays),
                renewal,
            });
        }
        return proposals;
    }

    /**
     * Running routines visible to the viewer, with their ticks in [from, to]. For
     * Course › Schedule and the calendar feed — read-only.
     */
    async activeBetween(from: string, to: string): Promise<RhythmWithTicks[]> {
        const rows = await this.rhythms.find(
            { endedAt: null, pausedAt: null },
            { orderBy: { createdAt: 'ASC' } }
        );
        const ticks = await this.ticksBetween(
            rows.map(row => row.id),
            from,
            to
        );
        return rows.map(rhythm => ({ rhythm, ticks: ticks.get(rhythm.id) ?? [] }));
    }

    /** True when the routine exists and was made before `date` (Coach: new is not quiet). */
    async createdBefore(id: string, date: Date): Promise<boolean> {
        const rhythm = await this.rhythms.findOne({ id });
        return rhythm !== null && rhythm.createdAt < date;
    }

    // ====================================================================
    // ? UPDATE Operations
    // ====================================================================

    async update(input: Omit<CourseRhythmUpdateInput, 'householdId'>): Promise<CourseRhythmDto> {
        const rhythm = await this.findOrFail(input.id);
        await this.rhythms.assertCanEdit(rhythm);

        const kind = input.kind ?? rhythm.kind;
        const { cadence, target } = rhythmShapeFor(
            kind,
            input.cadence ?? rhythm.cadence,
            input.target ?? rhythm.target
        );
        if (!isRhythmTargetValid(cadence, target)) {
            throw apiBadRequest('course_rhythm_target_invalid');
        }
        if (input.name !== undefined) rhythm.name = input.name;
        rhythm.kind = kind;
        rhythm.cadence = cadence;
        rhythm.target = target;
        if (input.weekdays !== undefined) rhythm.weekdays = normalizeWeekdays(input.weekdays);
        if (input.area !== undefined) rhythm.area = input.area;

        const parent =
            input.parentId !== undefined
                ? await this.validParent(input.parentId)
                : rhythm.parent
                  ? await this.items.findOne({ id: rhythm.parent })
                  : null;
        if (input.parentId !== undefined) rhythm.parent = parent?.id ?? null;
        if (input.visibility !== undefined && input.visibility !== choiceOf(rowOf(rhythm))) {
            const choice = await this.allowedChoice(parent, input.visibility);
            await this.rhythms.applyChoice(rhythm, choice);
        }

        await this.em.flush();
        return this.one(rhythm, currentWeek());
    }

    async pause(id: string): Promise<CourseRhythmDto> {
        const rhythm = await this.findOrFail(id);
        await this.rhythms.assertCanEdit(rhythm);
        rhythm.pausedAt ??= new Date();
        await this.em.flush();
        return this.one(rhythm, currentWeek());
    }

    async resume(id: string): Promise<CourseRhythmDto> {
        const rhythm = await this.findOrFail(id);
        await this.rhythms.assertCanEdit(rhythm);
        rhythm.pausedAt = null;
        rhythm.confirmedWeek = currentWeek();
        await this.em.flush();
        return this.one(rhythm, currentWeek());
    }

    /** "Keep going": answered for `week`, the proposal goes quiet. */
    async confirm(id: string, week: string): Promise<CourseRhythmDto> {
        const rhythm = await this.findOrFail(id);
        await this.rhythms.assertCanEdit(rhythm);
        rhythm.confirmedWeek = week;
        await this.em.flush();
        return this.one(rhythm, week);
    }

    /**
     * Renew the milestone a routine feeds for the current period — same name, "done
     * when", counter, goal and visibility — and hang the routine under the copy.
     * Reuses a copy made earlier this period, so a double tap creates nothing new.
     */
    async renew(id: string): Promise<{ rhythm: CourseRhythmDto; milestone: CourseItemDto }> {
        const rhythm = await this.findOrFail(id);
        await this.rhythms.assertCanEdit(rhythm);
        const parent = rhythm.parent ? await this.items.findOne({ id: rhythm.parent }) : null;
        const toPeriod = parent ? coursePeriodOf(parent.horizon, new Date()) : null;
        if (!parent || !toPeriod || parent.period >= toPeriod) {
            throw apiBadRequest('course_rhythm_renew_invalid');
        }

        const existing = await this.items.findOne({
            horizon: parent.horizon,
            period: toPeriod,
            name: parent.name,
            account: parent.account,
        });
        let milestone: CourseItemDto;
        if (existing) {
            milestone = await this.course.one(existing.id);
        } else {
            const grandparent = parent.parent
                ? await this.items.findOne({ id: parent.parent })
                : null;
            const keepsGrandparent =
                grandparent !== null &&
                ancestorPeriodOf(parent.horizon, toPeriod, grandparent.horizon) ===
                    grandparent.period;
            milestone = await this.course.create({
                horizon: parent.horizon,
                period: toPeriod,
                parentId: keepsGrandparent ? grandparent.id : null,
                name: parent.name,
                doneWhen: parent.doneWhen,
                visibility: choiceOf(rowOf(parent)),
                goalId: canLinkMoneyGoal(parent.horizon) ? parent.goal : null,
                skill: parent.skill,
                targetCount: parent.targetCount,
            });
        }

        rhythm.parent = milestone.id;
        rhythm.confirmedWeek = currentWeek();
        await this.em.flush();
        return { rhythm: await this.one(rhythm, currentWeek()), milestone };
    }

    // ====================================================================
    // ? DELETE Operations
    // ====================================================================

    async untick(id: string, date: string): Promise<CourseRhythmDto> {
        const rhythm = await this.findOrFail(id);
        await this.rhythms.assertCanEdit(rhythm);
        await this.em.nativeDelete(GrowthCourseRhythmTick, {
            household: currentHouseholdId(),
            rhythm: rhythm.id,
            tickedOn: date,
        });
        return this.one(rhythm, weekOf(date));
    }

    /** Stop: hidden from lists, ticks kept so past counters keep their score. */
    async remove(id: string): Promise<{ ok: true }> {
        const rhythm = await this.findOrFail(id);
        await this.rhythms.assertCanEdit(rhythm);
        rhythm.endedAt = new Date();
        await this.em.flush();
        return { ok: true };
    }

    // ====================================================================
    // Private
    // ====================================================================

    private async findOrFail(id: string): Promise<GrowthCourseRhythm> {
        const rhythm = await this.rhythms.findOne({ id, endedAt: null });
        if (!rhythm) throw apiNotFound('course_rhythm_not_found');
        return rhythm;
    }

    /** Parent must be visible and a year, quarter or month item. */
    private async validParent(parentId: string | null): Promise<GrowthCourseItem | null> {
        if (!parentId) return null;
        const parent = await this.items.findOne({ id: parentId });
        if (!parent || !canParentRhythm(parent.horizon)) {
            throw apiBadRequest('course_rhythm_parent_invalid');
        }
        return parent;
    }

    /** Requested choice (or the default): allowed for the viewer, not above the parent. */
    private async allowedChoice(
        parent: GrowthCourseItem | null,
        requested: VisibilityChoice | null
    ): Promise<VisibilityChoice> {
        const options = childVisibilityOptions(
            await this.visibility.optionsFor(AREA),
            parent ? rowOf(parent) : null
        );
        const choice = requested ?? defaultVisibilityChoice(options, false);
        await this.visibility.assertChoiceAllowed(AREA, choice);
        if (!options.includes(choice)) throw apiBadRequest('course_rhythm_parent_invalid');
        return choice;
    }

    private async parentsOf(rows: GrowthCourseRhythm[]): Promise<Map<string, GrowthCourseItem>> {
        const ids = [...new Set(rows.map(row => row.parent).filter(isPresent))];
        if (ids.length === 0) return new Map();
        const parents = await this.items.find({ id: { $in: ids } });
        return new Map(parents.map(parent => [parent.id, parent]));
    }

    /** Tick dates per rhythm id between `from` and `to` (inclusive). */
    private async ticksBetween(
        rhythmIds: string[],
        from: string,
        to: string
    ): Promise<Map<string, string[]>> {
        const byRhythm = new Map<string, string[]>();
        if (rhythmIds.length === 0) return byRhythm;
        const rows = await this.ticks.find(
            { rhythm: { $in: rhythmIds }, tickedOn: { $gte: from, $lte: to } },
            { orderBy: { tickedOn: 'ASC' } }
        );
        for (const row of rows) {
            byRhythm.set(row.rhythm, [...(byRhythm.get(row.rhythm) ?? []), row.tickedOn]);
        }
        return byRhythm;
    }

    /** Last tick per rhythm within the past year (older counts as "never" for nudges). */
    private async lastTicks(rhythmIds: string[]): Promise<Map<string, string>> {
        const last = new Map<string, string>();
        if (rhythmIds.length === 0) return last;
        const since = addDays(todayUtc(), -LAST_TICK_WINDOW_DAYS);
        const rows = await this.ticks.find(
            { rhythm: { $in: rhythmIds }, tickedOn: { $gte: since } },
            { orderBy: { tickedOn: 'DESC' } }
        );
        for (const row of rows) if (!last.has(row.rhythm)) last.set(row.rhythm, row.tickedOn);
        return last;
    }

    private async one(rhythm: GrowthCourseRhythm, week: string): Promise<CourseRhythmDto> {
        return (await this.toDtos([rhythm], week))[0]!;
    }

    private async toDtos(rows: GrowthCourseRhythm[], week: string): Promise<CourseRhythmDto[]> {
        if (rows.length === 0) return [];
        const weekRange = periodRange(CourseHorizon.WEEK, week);
        const countRanges = rows.map(row => {
            const { horizon, period } = rhythmPeriodOf(row.cadence, week);
            return { horizon, period, ...periodRange(horizon, period) };
        });
        const ids = rows.map(row => row.id);
        const [parents, ticks, lastTicks, canEdit, snapshot] = await Promise.all([
            this.parentsOf(rows),
            this.ticksBetween(
                ids,
                minOf([weekRange.from, ...countRanges.map(range => range.from)]),
                maxOf([weekRange.to, ...countRanges.map(range => range.to)])
            ),
            this.lastTicks(ids),
            this.visibility.editCheckFor(AREA),
            this.visibility.snapshot(),
        ]);

        return rows.map((row, index) => {
            const range = countRanges[index]!;
            const dates = ticks.get(row.id) ?? [];
            const parent = row.parent ? parents.get(row.parent) : undefined;
            return {
                id: row.id,
                householdId: row.household,
                name: row.name,
                kind: row.kind,
                cadence: row.cadence,
                target: row.target,
                weekdays: row.weekdays,
                parentId: row.parent,
                parentName: parent?.name ?? null,
                isParentHidden: row.parent !== null && !parent,
                parentHorizon: parent?.horizon ?? null,
                parentPeriod: parent?.period ?? null,
                area: row.area,
                isPaused: row.pausedAt !== null,
                ticks: dates.filter(date => date >= weekRange.from && date <= weekRange.to),
                periodHorizon: range.horizon,
                period: range.period,
                periodCount: dates.filter(date => date >= range.from && date <= range.to).length,
                periodTarget: rhythmPeriodTarget(row.cadence, row.target, row.weekdays),
                lastTickOn: lastTicks.get(row.id) ?? null,
                accountId: row.account,
                visibility: row.visibility,
                isMine: row.account !== null && row.account === snapshot.viewer.accountId,
                canEdit: canEdit(rowOf(row)),
            };
        });
    }
}

/** Proposal to renew a milestone whose period has ended, for the period of `week`. */
function renewalFor(
    parent: GrowthCourseItem | undefined,
    week: string
): CourseRhythmSuggestion['renewal'] {
    if (!parent) return null;
    const toPeriod = ancestorPeriodOf(CourseHorizon.WEEK, week, parent.horizon);
    if (!toPeriod || parent.period >= toPeriod) return null;
    return {
        parentId: parent.id,
        name: parent.name,
        targetCount: parent.targetCount,
        fromPeriod: parent.period,
        toPeriod,
    };
}

function normalizeWeekdays(weekdays: readonly number[] | null): number[] | null {
    if (!weekdays || weekdays.length === 0) return null;
    return [...new Set(weekdays)].sort((left, right) => left - right);
}

function rowOf(row: {
    account: string | null;
    visibility: VisibilityRow['visibility'];
}): VisibilityRow {
    return { accountId: row.account, visibility: row.visibility };
}

function weekOf(date: string): string {
    return coursePeriodOf(CourseHorizon.WEEK, new Date(`${date}T00:00:00Z`));
}

function todayUtc(): string {
    return new Date().toISOString().slice(0, 10);
}

function minOf(values: string[]): string {
    return values.reduce((min, value) => (value < min ? value : min));
}

function maxOf(values: string[]): string {
    return values.reduce((max, value) => (value > max ? value : max));
}

function isPresent<T>(value: T | null): value is T {
    return value !== null;
}
