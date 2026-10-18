import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';
import {
    PLAN_SLOT_SIZE,
    PlanHorizon,
    PlanItemStatus,
    VisibilityArea,
    VisibilityChoice,
    ancestorPeriodOf,
    childVisibilityOptions,
    choiceOf,
    defaultVisibilityChoice,
    isVisibilityPickerShown,
    nextPlanPeriod,
    planPeriodOf,
    type PlanItem as PlanItemDto,
    type PlanItemCreateInput,
    type PlanItemStatusInput,
    type PlanItemUpdateInput,
    type PlanPeriodInput,
    type PlanPeriodView,
    type VisibilityRow,
} from '@rumtelo/contracts';

import { apiBadRequest, apiNotFound } from '../../../../../common/errors/api-user-error';
import { HouseholdScopedRepository } from '../../../../../common/household/household-scoped.repository';
import { PersonalScopedRepository } from '../../../../../common/household/personal-scoped.repository';
import { VisibilityService } from '../../../../../common/household/visibility.service';
import { Goal } from '../../money/targets/goal/goal.entity';
import { GrowthPlanItem } from './growth-plan-item.entity';

const AREA = VisibilityArea.GROWTH_PLAN;

/** Horizons that may link a Money goal. */
const GOAL_HORIZONS = new Set([PlanHorizon.YEAR, PlanHorizon.QUARTER]);

/** Ancestor levels above DAY: week, month, quarter, year. */
const MAX_ANCESTOR_DEPTH = 4;

/** Week and day are a "top 3" per period; year, quarter and month allow 3 per parent goal. */
const PERIOD_CAPPED = new Set([PlanHorizon.WEEK, PlanHorizon.DAY]);

/** Let go or pushed forward: neither counts in a parent's progress. */
const NOT_COUNTED = new Set([PlanItemStatus.DROPPED, PlanItemStatus.DEFERRED]);

/**
 * The Growth cascade: year → quarter → month → week → day.
 *
 * Rules: max {@link PLAN_SLOT_SIZE} items per slot (week / day: per maker and period;
 * larger layers: per maker, period and parent); a parent sits anywhere higher in the
 * tree, in the period containing the child's; linking is optional; a child is never more
 * open than its parent; progress rolls up from the children (DROPPED leaves the total,
 * private children count but stay nameless).
 */
@Injectable()
export class PlanService {
    private readonly items: PersonalScopedRepository<GrowthPlanItem>;
    private readonly goals: HouseholdScopedRepository<Goal>;

    constructor(
        @Inject(EntityManager) private readonly em: EntityManager,
        @Inject(VisibilityService) private readonly visibility: VisibilityService
    ) {
        this.items = new PersonalScopedRepository(em, GrowthPlanItem, AREA, visibility);
        this.goals = new HouseholdScopedRepository(em, Goal);
    }

    // ====================================================================
    // ? CREATE Operations
    // ====================================================================

    async create(input: Omit<PlanItemCreateInput, 'householdId'>): Promise<PlanItemDto> {
        const parent = await this.validParent(input.horizon, input.period, input.parentId ?? null);
        const choice = await this.allowedChoice(parent, input.visibility ?? null);
        await this.assertGoal(input.horizon, input.goalId ?? null);

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
                status: PlanItemStatus.OPEN,
                carriedFrom: null,
                carryCount: 0,
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

    async period(input: Omit<PlanPeriodInput, 'householdId'>): Promise<PlanPeriodView> {
        const horizon = input.horizon;
        const period = input.period ?? planPeriodOf(horizon, new Date());
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
        const pick = (rows: GrowthPlanItem[]) => rows.map(row => byId.get(row.id)!);

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
    async year(year: string): Promise<PlanItemDto[]> {
        const rows = await this.items.find(
            {
                horizon: { $in: [PlanHorizon.YEAR, PlanHorizon.QUARTER, PlanHorizon.MONTH] },
                period: { $like: `${year}%` },
            },
            { orderBy: { period: 'ASC', position: 'ASC' } }
        );
        return this.toDtos(rows);
    }

    // ====================================================================
    // ? UPDATE Operations
    // ====================================================================

    async update(input: Omit<PlanItemUpdateInput, 'householdId'>): Promise<PlanItemDto> {
        const item = await this.findOrFail(input.id);
        await this.items.assertCanEdit(item);
        const slotBefore = slotKeyOf(item);

        if (input.name !== undefined) item.name = input.name;
        if (input.doneWhen !== undefined) item.doneWhen = input.doneWhen;
        if (input.skill !== undefined) item.skill = input.skill;
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

    async updateStatus(input: Omit<PlanItemStatusInput, 'householdId'>): Promise<PlanItemDto> {
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
    async carry(id: string): Promise<PlanItemDto> {
        const item = await this.findOrFail(id);
        await this.items.assertCanEdit(item);
        if (item.status === PlanItemStatus.DONE) throw apiBadRequest('plan_carry_done');

        const existing = await this.items.findOne({ carriedFrom: item.id });
        if (existing) return (await this.toDtos([existing]))[0]!;

        const period = nextPlanPeriod(item.horizon, item.period);
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
                status: PlanItemStatus.OPEN,
                carriedFrom: item.id,
                carryCount: item.carryCount + 1,
                goal: item.goal,
            },
            choiceOf(rowOf(item))
        );
        if (item.status === PlanItemStatus.OPEN) item.status = PlanItemStatus.DEFERRED;
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

    private async findOrFail(id: string): Promise<GrowthPlanItem> {
        const item = await this.items.findOne({ id });
        if (!item) throw apiNotFound('plan_item_not_found');
        return item;
    }

    /** Parent must be visible, higher in the tree, and in the period containing `period`. */
    private async validParent(
        horizon: PlanHorizon,
        period: string,
        parentId: string | null
    ): Promise<GrowthPlanItem | null> {
        if (!parentId) return null;
        const parent = await this.items.findOne({ id: parentId });
        if (!parent || parent.period !== ancestorPeriodOf(horizon, period, parent.horizon)) {
            throw apiBadRequest('plan_parent_invalid');
        }
        return parent;
    }

    /** Requested choice (or the default) — allowed for the viewer and not above the parent. */
    private async allowedChoice(
        parent: GrowthPlanItem | null,
        requested: VisibilityChoice | null
    ): Promise<VisibilityChoice> {
        const options = childVisibilityOptions(
            await this.visibility.optionsFor(AREA),
            parent ? rowOf(parent) : null
        );
        const choice = requested ?? defaultVisibilityChoice(options, false);
        await this.visibility.assertChoiceAllowed(AREA, choice);
        if (!options.includes(choice)) throw apiBadRequest('plan_parent_invalid');
        return choice;
    }

    private async assertGoal(horizon: PlanHorizon, goalId: string | null): Promise<void> {
        if (!goalId) return;
        if (!GOAL_HORIZONS.has(horizon) || !(await this.goals.findOne({ id: goalId }))) {
            throw apiBadRequest('plan_goal_invalid');
        }
    }

    /** First free position in a slot; refuses a fourth item. */
    private async freePosition(slot: PlanSlot, ignoreId?: string): Promise<number> {
        const taken = new Set(
            (await this.slotRows(slot)).filter(row => row.id !== ignoreId).map(row => row.position)
        );
        for (let position = 1; position <= PLAN_SLOT_SIZE; position += 1) {
            if (!taken.has(position)) return position;
        }
        throw apiBadRequest('plan_period_full');
    }

    /** Swap with whoever holds `position` in the item's slot. */
    private async moveToPosition(item: GrowthPlanItem, position: number): Promise<void> {
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
    private slotRows(slot: PlanSlot) {
        return this.items.findForCounts(
            {
                account: slot.account,
                horizon: slot.horizon,
                period: slot.period,
                ...(PERIOD_CAPPED.has(slot.horizon) ? {} : { parent: slot.parent }),
            },
            ['id', 'position']
        );
    }

    /** Visible ancestors of `items`, every level up to the year. */
    private async ancestorsOf(items: GrowthPlanItem[]): Promise<GrowthPlanItem[]> {
        const found = new Map<string, GrowthPlanItem>();
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

    /** DTOs with roll-up progress and hidden-child counts. */
    private async toDtos(rows: GrowthPlanItem[]): Promise<PlanItemDto[]> {
        if (rows.length === 0) return [];
        const ids = rows.map(row => row.id);
        const [allChildren, visibleChildren, canEdit, snapshot] = await Promise.all([
            this.items.findForCounts({ parent: { $in: ids } }, ['id', 'parent', 'status']),
            this.items.find({ parent: { $in: ids } }),
            this.visibility.editCheckFor(AREA),
            this.visibility.snapshot(),
        ]);
        const visibleIds = new Set(visibleChildren.map(child => child.id));

        return rows.map(row => {
            const children = allChildren.filter(child => child.parent === row.id);
            const counted = children.filter(child => !NOT_COUNTED.has(child.status));
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
                progress: {
                    done: counted.filter(child => child.status === PlanItemStatus.DONE).length,
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

interface PlanSlot {
    account: string | null;
    horizon: PlanHorizon;
    period: string;
    parent: string | null;
}

function slotOf(item: GrowthPlanItem): PlanSlot {
    return {
        account: item.account,
        horizon: item.horizon,
        period: item.period,
        parent: item.parent,
    };
}

/** Identity of the slot an item competes in; the parent only counts above the week. */
function slotKeyOf(item: GrowthPlanItem): string {
    const slot = slotOf(item);
    const parent = PERIOD_CAPPED.has(slot.horizon) ? '' : (slot.parent ?? '');
    return [slot.account ?? '', slot.horizon, slot.period, parent].join('|');
}

function rowOf(item: GrowthPlanItem): VisibilityRow {
    return { accountId: item.account, visibility: item.visibility };
}

function isPresent<T>(value: T | null): value is T {
    return value !== null;
}
