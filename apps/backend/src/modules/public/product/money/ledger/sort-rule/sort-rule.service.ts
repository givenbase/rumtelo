import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';

import { HouseholdScopedRepository } from '../../../../../../common/household/household-scoped.repository';
import { currentHouseholdId } from '../../../../../../common/household/household.context';
import { MerchantPresetService } from '../../../../../backoffice/product/money/preset/merchant/merchant.service';
import { Category } from '../../plan/jar/category.entity';
import { Jar } from '../../plan/jar/jar.entity';
import { type RuleField, type RuleMatcher, TransactionStatus } from '@rumtelo/contracts';

import {
    autoSortRows,
    categoryIndex,
    PAYEE_MEMORY_RULE_PRIORITY,
    type AutoSortContext,
    type AutoSortRow,
} from '../auto-sort.util';
import { Transaction } from '../transaction/transaction.entity';
import { SortRule } from './sort-rule.entity';

/** Explicit “Altijd dit” / managed rules — ahead of soft payee memory. */
const EXPLICIT_RULE_PRIORITY = 100;

@Injectable()
export class SortRuleService {
    private readonly repo: HouseholdScopedRepository<SortRule>;
    constructor(
        @Inject(EntityManager) private readonly em: EntityManager,
        @Inject(MerchantPresetService) private readonly merchants: MerchantPresetService
    ) {
        this.repo = new HouseholdScopedRepository(em, SortRule);
    }

    // ====================================================================
    // ? CREATE Operations
    // ====================================================================

    async create(input: {
        field: string;
        matcher: string;
        matchValue: string;
        jarId: string;
        categoryId?: string | null;
        priority?: number;
        isActive?: boolean;
    }) {
        const entity = this.em.create(SortRule, {
            household: currentHouseholdId(),
            field: input.field as RuleField,
            matcher: input.matcher as RuleMatcher,
            matchValue: input.matchValue.trim(),
            jar: this.em.getReference(Jar, input.jarId),
            category: input.categoryId ? this.em.getReference(Category, input.categoryId) : null,
            priority: input.priority ?? EXPLICIT_RULE_PRIORITY,
            isActive: input.isActive ?? true,
            hitCount: 0,
        } as never);
        await this.em.persist(entity).flush();
        return toDto(entity);
    }

    /**
     * Upsert a CONTAINS rule for a payee needle.
     * - `explicit` (Altijd dit): priority 100
     * - soft memory (Juist): priority 900, never demotes an existing explicit rule
     */
    async upsertPayeeHint(input: {
        field: 'COUNTERPARTY' | 'DESCRIPTION';
        matchValue: string;
        jarId: string;
        categoryId?: string | null;
        explicit: boolean;
    }) {
        const matchValue = input.matchValue.trim();
        if (matchValue.length < 2) return null;

        const siblings = await this.repo.find({
            field: input.field as RuleField,
            matcher: 'CONTAINS' as RuleMatcher,
            isActive: true,
        });
        const existing = siblings.find(
            row => row.matchValue.trim().toLowerCase() === matchValue.toLowerCase()
        );

        if (existing) {
            await this.em.populate(existing, ['jar', 'category']);
            existing.jar = this.em.getReference(Jar, input.jarId);
            existing.category = input.categoryId
                ? this.em.getReference(Category, input.categoryId)
                : null;
            if (input.explicit && existing.priority > EXPLICIT_RULE_PRIORITY) {
                existing.priority = EXPLICIT_RULE_PRIORITY;
            }
            await this.em.flush();
            return toDto(existing);
        }

        return this.create({
            field: input.field,
            matcher: 'CONTAINS',
            matchValue,
            jarId: input.jarId,
            categoryId: input.categoryId ?? null,
            priority: input.explicit ? EXPLICIT_RULE_PRIORITY : PAYEE_MEMORY_RULE_PRIORITY,
            isActive: true,
        });
    }

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    async list() {
        const rows = await this.repo.find({}, { orderBy: { priority: 'ASC' } });
        return rows.map(toDto);
    }

    // ====================================================================
    // ? UPDATE Operations
    // ====================================================================

    async update(
        id: string,
        patch: Partial<{
            field: string;
            matcher: string;
            matchValue: string;
            jarId: string;
            categoryId: string | null;
            priority: number;
            isActive: boolean;
        }>
    ) {
        const entity = await this.repo.findOneOrFail({ id });
        if (patch.field !== undefined) entity.field = patch.field as RuleField;
        if (patch.matcher !== undefined) entity.matcher = patch.matcher as RuleMatcher;
        if (patch.matchValue !== undefined) entity.matchValue = patch.matchValue.trim();
        if (patch.jarId !== undefined) entity.jar = this.em.getReference(Jar, patch.jarId);
        if (patch.categoryId !== undefined) {
            entity.category = patch.categoryId
                ? this.em.getReference(Category, patch.categoryId)
                : null;
        }
        if (patch.priority !== undefined) entity.priority = patch.priority;
        if (patch.isActive !== undefined) entity.isActive = patch.isActive;
        await this.em.flush();
        return toDto(entity);
    }

    /**
     * Rules first, then the merchant catalog, over the rows given.
     * `countHits` is false for a dry-run preview so rules are not credited.
     */
    async autoSort(rows: AutoSortRow[], options?: { countHits?: boolean }): Promise<number> {
        if (rows.length === 0) return 0;
        return autoSortRows(rows, await this.loadContext(), options);
    }

    /**
     * Re-runs rules, then the merchant catalog, over the inbox.
     * Stamps appliedRule or appliedMerchantKey so the decision stays auditable.
     */
    async replay() {
        const inbox = await this.em.find(
            Transaction,
            { household: currentHouseholdId(), status: TransactionStatus.INBOX },
            { orderBy: { bookedOn: 'DESC' }, limit: 500 }
        );
        const sorted = await this.autoSort(inbox, { countHits: true });
        if (sorted > 0) await this.em.flush();
        return { sorted };
    }

    // ====================================================================
    // ? DELETE Operations
    // ====================================================================

    async remove(id: string) {
        const entity = await this.repo.findOneOrFail({ id });
        await this.em.remove(entity).flush();
        return { ok: true as const };
    }

    // Private

    private async loadContext(): Promise<AutoSortContext> {
        const household = currentHouseholdId();
        const [rules, merchants, jars, categories] = await Promise.all([
            this.repo.find({ isActive: true }, { orderBy: { priority: 'ASC' } }),
            this.merchants.listActive(),
            this.em.find(Jar, { household }),
            this.em.find(Category, { household }, { populate: ['jar'] }),
        ]);
        await this.em.populate(rules, ['jar', 'category']);
        return {
            rules,
            merchants,
            jarsByKey: new Map(jars.map(jar => [jar.key, jar])),
            categoryByJarAndName: categoryIndex(categories),
        };
    }
}

export function toDto(rule: SortRule) {
    return {
        id: rule.id,
        householdId: rule.household,
        field: rule.field,
        matcher: rule.matcher,
        matchValue: rule.matchValue,
        jarId: rule.jar.id,
        categoryId: rule.category?.id ?? null,
        priority: rule.priority,
        isActive: rule.isActive,
        hitCount: rule.hitCount,
    };
}
