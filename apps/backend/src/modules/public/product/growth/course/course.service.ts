import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';
import {
    COURSE_SLOT_SIZE,
    CourseHorizon,
    CourseItemStatus,
    CourseRhythmKind,
    VisibilityArea,
    VisibilityChoice,
    ancestorPeriodOf,
    canLinkMoneyGoal,
    countsInProgress,
    isCountableLayer,
    isPeriodCapped,
    periodRange,
    childVisibilityOptions,
    choiceOf,
    defaultVisibilityChoice,
    isVisibilityPickerShown,
    nextCoursePeriod,
    coursePeriodOf,
    type CourseItem as CourseItemDto,
    type CourseItemCreateInput,
    type CourseItemStatusInput,
    type CourseItemUpdateInput,
    type CoursePeriodInput,
    type CoursePeriodView,
    type VisibilityRow,
} from '@rumtelo/contracts';

import { apiBadRequest, apiNotFound } from '../../../../../common/errors/api-user-error';
import { HouseholdScopedRepository } from '../../../../../common/household/household-scoped.repository';
import { PersonalScopedRepository } from '../../../../../common/household/personal-scoped.repository';
import { VisibilityService } from '../../../../../common/household/visibility.service';
import { Goal } from '../../money/targets/goal/goal.entity';
import { GrowthCourseItem } from './growth-course-item.entity';
import { GrowthCourseRhythm } from './growth-course-rhythm.entity';
import { GrowthCourseRhythmTick } from './growth-course-rhythm-tick.entity';

const AREA = VisibilityArea.GROWTH_COURSE;

/** Ancestor levels above DAY: week, month, quarter, year. */
const MAX_ANCESTOR_DEPTH = 4;

/**
 * The Growth cascade: year → quarter → month → week → day.
 *
 * Rules: max {@link COURSE_SLOT_SIZE} items per slot (week / day: per maker and period;
 * larger layers: per maker, period and parent); a parent sits anywhere higher in the
 * tree, in the period containing the child's; linking is optional; a child is never more
 * open than its parent; progress rolls up from the children (DROPPED leaves the total,
 * private children count but stay nameless). A month or quarter with a counter
 * (`targetCount`) counts the ticks of the rhythms under it instead.
 */
@Injectable()
export class CourseService {
    private readonly items: PersonalScopedRepository<GrowthCourseItem>;
    private readonly goals: HouseholdScopedRepository<Goal>;
    /** Counts only: rhythm ids under counted items, whatever their visibility. */
    private readonly rhythmCounts: HouseholdScopedRepository<GrowthCourseRhythm>;
    private readonly ticks: HouseholdScopedRepository<GrowthCourseRhythmTick>;

    constructor(
        @Inject(EntityManager) private readonly em: EntityManager,
        @Inject(VisibilityService) private readonly visibility: VisibilityService
    ) {
        this.items = new PersonalScopedRepository(em, GrowthCourseItem, AREA, visibility);
        this.goals = new HouseholdScopedRepository(em, Goal);
        this.rhythmCounts = new HouseholdScopedRepository(em, GrowthCourseRhythm);
        this.ticks = new HouseholdScopedRepository(em, GrowthCourseRhythmTick);
    }

    // ====================================================================
    // ? CREATE Operations
    // ====================================================================

    async create(input: Omit<CourseItemCreateInput, 'householdId'>): Promise<CourseItemDto> {
        const parent = await this.validParent(input.horizon, input.period, input.parentId ?? null);
        const choice = await this.allowedChoice(parent, input.visibility ?? null);
        await this.assertGoal(input.horizon, input.goalId ?? null);
        assertTarget(input.horizon, input.targetCount ?? null);

        const makerAccountId =
            choice === VisibilityChoice.SHARED
                ? null
                : await this.visibility.requireViewerAccountId();
        const position = await this.freePosition({
            account: makerAccountId,
            horizon: input.horizon,
            period: input.period,
            parent: parent?.id ?? null,
        });

        const item = await this.items.createPersonal(
            {
                horizon: input.horizon,
                period: input.period,
                parent: parent?.id ?? null,
                position,
                name: input.name,
                doneWhen: input.doneWhen ?? null,
                reviewNote: null,
                skill: input.skill ?? null,
                status: CourseItemStatus.OPEN,
                carriedFrom: null,
                carryCount: 0,
                targetCount: input.targetCount ?? null,
                goal: input.goalId ?? null,
            },
            choice
        );
        await this.em.persist(item).flush();
        return (await this.toDtos([item]))[0]!;
    }

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    async period(input: Omit<CoursePeriodInput, 'householdId'>): Promise<CoursePeriodView> {
        const horizon = input.horizon;
        const period = input.period ?? coursePeriodOf(horizon, new Date());
        const makerFilter = input.accountId ? { account: input.accountId } : {};

        const items = await this.items.find(
            { horizon, period, ...makerFilter },
            { orderBy: { position: 'ASC', createdAt: 'ASC' } }
        );
        const [children, ancestors, hiddenCount, snapshot, options] = await Promise.all([
            items.length > 0
                ? this.items.find(
                      { parent: { $in: items.map(item => item.id) } },
                      { orderBy: { horizon: 'ASC', period: 'ASC', position: 'ASC' } }
                  )
                : Promise.resolve([]),
            this.ancestorsOf(items),
            this.items.countHidden({ horizon, period }),
            this.visibility.snapshot(),
            this.visibility.optionsFor(AREA),
        ]);

        const dtos = await this.toDtos([...items, ...children, ...ancestors]);
        const byId = new Map(dtos.map(dto => [dto.id, dto]));
        const pick = (rows: GrowthCourseItem[]) => rows.map(row => byId.get(row.id)!);

        return {
            horizon,
            period,
            items: pick(items),
            ancestors: pick(ancestors),
            children: pick(children),
            hiddenCount,
            visibilityOptions: options,
            defaultVisibility: defaultVisibilityChoice(options, false),
            isVisibilityPickerShown: isVisibilityPickerShown(snapshot.participantCount),
        };
    }

    /** Year, quarter and month items of one year. */
    async year(year: string): Promise<CourseItemDto[]> {
        const rows = await this.items.find(
            {
                horizon: { $in: [CourseHorizon.YEAR, CourseHorizon.QUARTER, CourseHorizon.MONTH] },
                period: { $like: `${year}%` },
            },
            { orderBy: { period: 'ASC', position: 'ASC' } }
        );
        return this.toDtos(rows);
    }

    /** Visible items of one horizon across several periods (Schedule, calendar feed). */
    async inPeriods(horizon: CourseHorizon, periods: readonly string[]): Promise<CourseItemDto[]> {
        if (periods.length === 0) return [];
        const rows = await this.items.find(
            { horizon, period: { $in: [...periods] } },
            { orderBy: { period: 'ASC', position: 'ASC', createdAt: 'ASC' } }
        );
        return this.toDtos(rows);
    }

    /** One visible item as DTO; throws when missing or hidden. */
    async one(id: string): Promise<CourseItemDto> {
        return (await this.toDtos([await this.findOrFail(id)]))[0]!;
    }

    // ====================================================================
    // ? UPDATE Operations
    // ====================================================================

    async update(input: Omit<CourseItemUpdateInput, 'householdId'>): Promise<CourseItemDto> {
        const item = await this.findOrFail(input.id);
        await this.items.assertCanEdit(item);
        const slotBefore = slotKeyOf(item);

        if (input.name !== undefined) item.name = input.name;
        if (input.doneWhen !== undefined) item.doneWhen = input.doneWhen;
        if (input.skill !== undefined) item.skill = input.skill;
        if (input.targetCount !== undefined) {
            assertTarget(item.horizon, input.targetCount);
            item.targetCount = input.targetCount;
        }
        if (input.goalId !== undefined) {
            await this.assertGoal(item.horizon, input.goalId);
            item.goal = input.goalId;
        }

        const parent =
            input.parentId !== undefined
                ? await this.validParent(item.horizon, item.period, input.parentId)
                : item.parent
                  ? await this.items.findOne({ id: item.parent })
                  : null;
        if (input.parentId !== undefined) item.parent = parent?.id ?? null;

        if (input.visibility !== undefined && input.visibility !== choiceOf(rowOf(item))) {
            const choice = await this.allowedChoice(parent, input.visibility);
            await this.items.applyChoice(item, choice);
        }

        if (input.position !== undefined) {
            await this.moveToPosition(item, input.position);
        } else if (slotKeyOf(item) !== slotBefore) {
            item.position = await this.freePosition(slotOf(item), item.id);
        }

        await this.em.flush();
        return (await this.toDtos([item]))[0]!;
    }

    async updateStatus(input: Omit<CourseItemStatusInput, 'householdId'>): Promise<CourseItemDto> {
        const item = await this.findOrFail(input.id);
        await this.items.assertCanEdit(item);
        item.status = input.status;
        if (input.reviewNote !== undefined) item.reviewNote = input.reviewNote ?? null;
        await this.em.flush();
        return (await this.toDtos([item]))[0]!;
    }

    /**
     * Snooze: the same item in the next period, one carry deeper. An unreviewed
     * (OPEN) source becomes DEFERRED; a reviewed one keeps its status. Idempotent
     * per source item.
     */
    async carry(id: string): Promise<CourseItemDto> {
        const item = await this.findOrFail(id);
        await this.items.assertCanEdit(item);
        if (item.status === CourseItemStatus.DONE) throw apiBadRequest('course_carry_done');

        const existing = await this.items.findOne({ carriedFrom: item.id });
        if (existing) return (await this.toDtos([existing]))[0]!;

        const period = nextCoursePeriod(item.horizon, item.period);
        const parentRow = item.parent ? await this.items.findOne({ id: item.parent }) : null;
        const parent =
            parentRow &&
            parentRow.period === ancestorPeriodOf(item.horizon, period, parentRow.horizon)
                ? parentRow
                : null;
        const position = await this.freePosition({
            account: item.account,
            horizon: item.horizon,
            period,
            parent: parent?.id ?? null,
        });

        const carried = await this.items.createPersonal(
            {
                horizon: item.horizon,
                period,
                parent: parent?.id ?? null,
                position,
                name: item.name,
                doneWhen: item.doneWhen,
                reviewNote: null,
                skill: item.skill,
                status: CourseItemStatus.OPEN,
                carriedFrom: item.id,
                carryCount: item.carryCount + 1,
                targetCount: item.targetCount,
                goal: item.goal,
            },
            choiceOf(rowOf(item))
        );
        if (item.status === CourseItemStatus.OPEN) item.status = CourseItemStatus.DEFERRED;
        await this.em.persist(carried).flush();
        return (await this.toDtos([carried]))[0]!;
    }

    // ====================================================================
    // ? DELETE Operations
    // ====================================================================

    /** Children become loose (`parent` set null by the FK). */
    async remove(id: string): Promise<{ ok: true }> {
        const item = await this.findOrFail(id);
        await this.items.removePersonal(item);
        await this.em.flush();
        return { ok: true };
    }

    // ====================================================================
    // Private
    // ====================================================================

    private async findOrFail(id: string): Promise<GrowthCourseItem> {
        const item = await this.items.findOne({ id });
        if (!item) throw apiNotFound('course_item_not_found');
        return item;
    }

    /** Parent must be visible, higher in the tree, and in the period containing `period`. */
    private async validParent(
        horizon: CourseHorizon,
        period: string,
        parentId: string | null
    ): Promise<GrowthCourseItem | null> {
        if (!parentId) return null;
        const parent = await this.items.findOne({ id: parentId });
        if (!parent || parent.period !== ancestorPeriodOf(horizon, period, parent.horizon)) {
            throw apiBadRequest('course_parent_invalid');
        }
        return parent;
    }

    /** Requested choice (or the default) — allowed for the viewer and not above the parent. */
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
        if (!options.includes(choice)) throw apiBadRequest('course_parent_invalid');
        return choice;
    }

    private async assertGoal(horizon: CourseHorizon, goalId: string | null): Promise<void> {
        if (!goalId) return;
        if (!canLinkMoneyGoal(horizon) || !(await this.goals.findOne({ id: goalId }))) {
            throw apiBadRequest('course_goal_invalid');
        }
    }

    /** First free position in a slot; refuses a fourth item. */
    private async freePosition(slot: CourseSlot, ignoreId?: string): Promise<number> {
        const taken = new Set(
            (await this.slotRows(slot)).filter(row => row.id !== ignoreId).map(row => row.position)
        );
        for (let position = 1; position <= COURSE_SLOT_SIZE; position += 1) {
            if (!taken.has(position)) return position;
        }
        throw apiBadRequest('course_period_full');
    }

    /** Swap with whoever holds `position` in the item's slot. */
    private async moveToPosition(item: GrowthCourseItem, position: number): Promise<void> {
        const holder = (await this.slotRows(slotOf(item))).find(
            row => row.position === position && row.id !== item.id
        );
        if (holder) {
            // Park the item first so the unique slot index never sees two rows on one position.
            const previous = item.position;
            item.position = 0;
            await this.em.flush();
            holder.position = previous;
            await this.em.flush();
        }
        item.position = position;
    }

    /** Slot rows regardless of visibility — a slot belongs to one maker, who sees them all. */
    private slotRows(slot: CourseSlot) {
        return this.items.findForCounts(
            {
                account: slot.account,
                horizon: slot.horizon,
                period: slot.period,
                ...(isPeriodCapped(slot.horizon) ? {} : { parent: slot.parent }),
            },
            ['id', 'position']
        );
    }

    /** Visible ancestors of `items`, every level up to the year. */
    private async ancestorsOf(items: GrowthCourseItem[]): Promise<GrowthCourseItem[]> {
        const found = new Map<string, GrowthCourseItem>();
        let parentIds = items.map(item => item.parent).filter(isPresent);
        for (let depth = 0; depth < MAX_ANCESTOR_DEPTH && parentIds.length > 0; depth += 1) {
            const fresh = parentIds.filter(id => !found.has(id));
            if (fresh.length === 0) break;
            // oxlint-disable-next-line no-await-in-loop -- each level needs the previous level's parents
            const rows = await this.items.find({ id: { $in: fresh } });
            for (const row of rows) found.set(row.id, row);
            parentIds = rows.map(row => row.parent).filter(isPresent);
        }
        return [...found.values()];
    }

    /**
     * Ticks per counted item: every tick of the disciplines hanging under it, inside
     * the item's own period. Habits never count. Private routines count too; only the
     * number leaves the server.
     */
    private async tickCountsFor(rows: GrowthCourseItem[]): Promise<Map<string, number>> {
        const counts = new Map<string, number>();
        if (rows.length === 0) return counts;
        const rhythms = await this.rhythmCounts.find(
            { parent: { $in: rows.map(row => row.id) }, kind: CourseRhythmKind.DISCIPLINE },
            {
                fields: ['id', 'parent'],
            } as never
        );
        if (rhythms.length === 0) return counts;
        const ranges = rows.map(row => ({ id: row.id, ...periodRange(row.horizon, row.period) }));
        const from = ranges.reduce(
            (min, range) => (range.from < min ? range.from : min),
            ranges[0]!.from
        );
        const to = ranges.reduce((max, range) => (range.to > max ? range.to : max), ranges[0]!.to);
        const ticks = await this.ticks.find(
            {
                rhythm: { $in: rhythms.map(rhythm => rhythm.id) },
                tickedOn: { $gte: from, $lte: to },
            },
            { fields: ['rhythm', 'tickedOn'] } as never
        );
        const parentOf = new Map(rhythms.map(rhythm => [rhythm.id, rhythm.parent]));
        for (const range of ranges) {
            const count = ticks.filter(
                tick =>
                    parentOf.get(tick.rhythm) === range.id &&
                    tick.tickedOn >= range.from &&
                    tick.tickedOn <= range.to
            ).length;
            counts.set(range.id, count);
        }
        return counts;
    }

    /** DTOs with roll-up progress and hidden-child counts. */
    private async toDtos(rows: GrowthCourseItem[]): Promise<CourseItemDto[]> {
        if (rows.length === 0) return [];
        const ids = rows.map(row => row.id);
        const [allChildren, visibleChildren, canEdit, snapshot, tickCounts] = await Promise.all([
            this.items.findForCounts({ parent: { $in: ids } }, ['id', 'parent', 'status']),
            this.items.find({ parent: { $in: ids } }),
            this.visibility.editCheckFor(AREA),
            this.visibility.snapshot(),
            this.tickCountsFor(rows.filter(row => row.targetCount !== null)),
        ]);
        const visibleIds = new Set(visibleChildren.map(child => child.id));

        return rows.map(row => {
            const children = allChildren.filter(child => child.parent === row.id);
            const counted = children.filter(child => countsInProgress(child.status));
            return {
                id: row.id,
                householdId: row.household,
                horizon: row.horizon,
                period: row.period,
                parentId: row.parent,
                position: row.position,
                name: row.name,
                doneWhen: row.doneWhen,
                status: row.status,
                reviewNote: row.reviewNote,
                carriedFromId: row.carriedFrom,
                carryCount: row.carryCount,
                goalId: row.goal,
                skill: row.skill,
                targetCount: row.targetCount,
                progress:
                    row.targetCount !== null
                        ? {
                              done: Math.min(tickCounts.get(row.id) ?? 0, row.targetCount),
                              total: row.targetCount,
                          }
                        : {
                              done: counted.filter(child => child.status === CourseItemStatus.DONE)
                                  .length,
                              total: counted.length,
                          },
                hiddenChildCount: children.filter(child => !visibleIds.has(child.id)).length,
                accountId: row.account,
                visibility: row.visibility,
                isMine: row.account !== null && row.account === snapshot.viewer.accountId,
                canEdit: canEdit(rowOf(row)),
            };
        });
    }
}

/** A counter only fits a month or a quarter. */
function assertTarget(horizon: CourseHorizon, targetCount: number | null): void {
    if (targetCount !== null && !isCountableLayer(horizon)) {
        throw apiBadRequest('course_target_invalid');
    }
}

interface CourseSlot {
    account: string | null;
    horizon: CourseHorizon;
    period: string;
    parent: string | null;
}

function slotOf(item: GrowthCourseItem): CourseSlot {
    return {
        account: item.account,
        horizon: item.horizon,
        period: item.period,
        parent: item.parent,
    };
}

/** Identity of the slot an item competes in; the parent only counts above the week. */
function slotKeyOf(item: GrowthCourseItem): string {
    const slot = slotOf(item);
    const parent = isPeriodCapped(slot.horizon) ? '' : (slot.parent ?? '');
    return [slot.account ?? '', slot.horizon, slot.period, parent].join('|');
}

function rowOf(item: GrowthCourseItem): VisibilityRow {
    return { accountId: item.account, visibility: item.visibility };
}

function isPresent<T>(value: T | null): value is T {
    return value !== null;
}
