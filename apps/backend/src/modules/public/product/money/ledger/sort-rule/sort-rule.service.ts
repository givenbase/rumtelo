import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';

import { HouseholdScopedRepository } from '../../../../../../common/household/household-scoped.repository';
import { currentHouseholdId } from '../../../../../../common/household/household.context';
import { Category } from '../../plan/jar/category.entity';
import { Jar } from '../../plan/jar/jar.entity';
import { RuleField, RuleMatcher, TransactionStatus } from '@rumtelo/contracts';

import { Transaction } from '../transaction/transaction.entity';
import { Rule } from './rule.entity';

@Injectable()
export class RuleService {
    private readonly repo: HouseholdScopedRepository<Rule>;
    constructor(@Inject(EntityManager) private readonly em: EntityManager) {
        this.repo = new HouseholdScopedRepository(em, Rule);
    }

    // ====================================================================
    // ? CREATE Operations
    // ====================================================================

    async create(input: {
        field: string;
        matcher: string;
        value: string;
        jarId: string;
        categoryId?: string | null;
        priority?: number;
        isActive?: boolean;
    }) {
        const entity = this.em.create(Rule, {
            household: currentHouseholdId(),
            field: input.field as RuleField,
            matcher: input.matcher as RuleMatcher,
            value: input.value.trim(),
            jar: this.em.getReference(Jar, input.jarId),
            category: input.categoryId ? this.em.getReference(Category, input.categoryId) : null,
            priority: input.priority ?? 100,
            isActive: input.isActive ?? true,
            hitCount: 0,
        } as never);
        await this.em.persist(entity).flush();
        return toDto(entity);
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
            value: string;
            jarId: string;
            categoryId: string | null;
            priority: number;
            isActive: boolean;
        }>
    ) {
        const entity = await this.repo.findOneOrFail({ id });
        if (patch.field !== undefined) entity.field = patch.field as RuleField;
        if (patch.matcher !== undefined) entity.matcher = patch.matcher as RuleMatcher;
        if (patch.value !== undefined) entity.value = patch.value.trim();
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
     * Re-runs isActive rules over inbox history — first match wins, priority ASC.
     * Stamps appliedRuleId so the decision stays auditable.
     */
    async replay() {
        const rules = await this.repo.find({ isActive: true }, { orderBy: { priority: 'ASC' } });
        await this.em.populate(rules, ['jar', 'category']);

        const inbox = await this.em.find(
            Transaction,
            { household: currentHouseholdId(), status: TransactionStatus.INBOX },
            { orderBy: { bookedOn: 'DESC' }, limit: 500 }
        );

        let sorted = 0;
        for (const transaction of inbox) {
            for (const rule of rules) {
                const haystack = fieldValue(transaction, rule.field);
                if (!this.matches(rule, haystack)) continue;
                transaction.jar = rule.jar;
                transaction.category = rule.category;
                transaction.status = TransactionStatus.SORTED;
                transaction.appliedRuleId = rule.id;
                rule.hitCount += 1;
                sorted += 1;
                break;
            }
        }

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

    /**
     * First match wins, in priority order — so the engine is predictable and a user
     * can reason about why a transaction landed where it did.
     */
    matches(rule: Rule, value: string): boolean {
        const haystack = value.toLowerCase();
        const needle = rule.value.toLowerCase();
        switch (rule.matcher) {
            case RuleMatcher.EQUALS:
                return haystack === needle;
            case RuleMatcher.STARTS_WITH:
                return haystack.startsWith(needle);
            case RuleMatcher.CONTAINS:
                return haystack.includes(needle);
            case RuleMatcher.REGEX:
                try {
                    return new RegExp(rule.value, 'i').test(value);
                } catch {
                    return false; // A user-authored bad pattern must not break sorting.
                }
            default:
                return false;
        }
    }
}

function fieldValue(transaction: Transaction, field: RuleField): string {
    switch (field) {
        case RuleField.COUNTERPARTY:
            return transaction.counterparty ?? '';
        case RuleField.AMOUNT:
            return String(transaction.amount);
        case RuleField.DESCRIPTION:
        default:
            return transaction.description;
    }
}

export function toDto(rule: Rule) {
    return {
        id: rule.id,
        householdId: rule.household,
        field: rule.field,
        matcher: rule.matcher,
        value: rule.value,
        jarId: rule.jar.id,
        categoryId: rule.category?.id ?? null,
        priority: rule.priority,
        isActive: rule.isActive,
        hitCount: rule.hitCount,
    };
}
