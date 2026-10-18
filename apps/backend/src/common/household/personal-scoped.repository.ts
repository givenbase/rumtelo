import type { EntityManager, FilterQuery, FindOptions } from '@mikro-orm/postgresql';
import { fromChoice, type VisibilityArea, type VisibilityChoice } from '@rumtelo/contracts';

import type { PersonalHouseholdEntity } from '../database/personal.entity';

import { HouseholdScopedRepository } from './household-scoped.repository';
import type { VisibilityService } from './visibility.service';

/**
 * HouseholdScopedRepository + the visibility filter for one {@link VisibilityArea}.
 *
 * Every read only returns rows the viewer may see; the client never receives the
 * rest. Writes check the viewer's choice and edit rights. Services use this instead
 * of filtering on `account = me` themselves.
 */
export class PersonalScopedRepository<
    T extends PersonalHouseholdEntity,
> extends HouseholdScopedRepository<T> {
    constructor(
        em: EntityManager,
        entity: new () => T,
        private readonly area: VisibilityArea,
        private readonly visibility: VisibilityService
    ) {
        super(em, entity);
    }

    // ====================================================================
    // ? CREATE Operations
    // ====================================================================

    /** New row made by the viewer with their visibility choice. Caller persists. */
    async createPersonal(
        data: Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'household' | 'account' | 'visibility'>,
        choice: VisibilityChoice
    ): Promise<T> {
        await this.visibility.assertChoiceAllowed(this.area, choice);
        const makerAccountId = await this.visibility.requireViewerAccountId();
        return super.create({ ...data, ...fromChoice(choice, makerAccountId) } as never);
    }

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    override async find(where?: FilterQuery<T>, options?: FindOptions<T>) {
        return super.find(await this.visible(where), options);
    }

    override async findOne(where: FilterQuery<T>) {
        return super.findOne(await this.visible(where));
    }

    override async count(where?: FilterQuery<T>) {
        return super.count(await this.visible(where));
    }

    /**
     * Unfiltered rows for server-side counts only (roll-up progress over private
     * children). Never return these rows or their fields to the client.
     */
    findForCounts(where: FilterQuery<T>, fields: readonly string[]) {
        return super.find(where, { fields } as unknown as FindOptions<T>);
    }

    /** Rows matching `where` that exist but are hidden from the viewer ("+1 private"). */
    async countHidden(where?: FilterQuery<T>): Promise<number> {
        const [all, visible] = await Promise.all([super.count(where), this.count(where)]);
        return all - visible;
    }

    // ====================================================================
    // ? UPDATE Operations
    // ====================================================================

    async assertCanEdit(entity: T): Promise<void> {
        await this.visibility.assertCanEdit(this.area, rowOf(entity));
    }

    /** Change who sees a row. Personal rows: maker only; together rows: like delete. */
    async applyChoice(entity: T, choice: VisibilityChoice): Promise<void> {
        await this.visibility.assertCanDelete(this.area, rowOf(entity));
        await this.visibility.assertChoiceAllowed(this.area, choice);
        const makerAccountId = entity.account ?? (await this.visibility.requireViewerAccountId());
        Object.assign(entity, fromChoice(choice, makerAccountId));
    }

    // ====================================================================
    // ? DELETE Operations
    // ====================================================================

    async removePersonal(entity: T) {
        await this.visibility.assertCanDelete(this.area, rowOf(entity));
        return super.remove(entity);
    }

    // ====================================================================
    // Private
    // ====================================================================

    private async visible(where: FilterQuery<T> = {}): Promise<FilterQuery<T>> {
        const filter = (await this.visibility.filterFor(this.area)) as FilterQuery<T>;
        return { $and: [where, filter] } as FilterQuery<T>;
    }
}

function rowOf(entity: PersonalHouseholdEntity) {
    return { accountId: entity.account, visibility: entity.visibility };
}
