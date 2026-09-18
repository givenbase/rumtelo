import { Entity, Enum, Index, ManyToOne, Property } from '@mikro-orm/core';
import { RuleField, RuleMatcher } from '@rumtelo/contracts';

import { HouseholdEntity } from '../../../../../../common/database/household.entity';
import { NativeEnum } from '../../../../../../common/database/native-enum.util';
import { entityConfig } from '../../../../../../common/database/entity-config.util';
import { Category } from '../../plan/jar/category.entity';
import { Jar } from '../../plan/jar/jar.entity';

/**
 * Sort Rule Entity
 *
 * Auto-sort engine. Rules run in priority order over incoming transactions;
 * first match wins and the transaction records `appliedRule` so the decision
 * stays auditable and undoable.
 *
 * @see Transaction.appliedRule
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(entityConfig({ schema: 'public', domain: 'money', tableName: 'sort_rule' }))
@Index({ properties: ['jar'] })
@Index({ properties: ['category'] })
export class SortRule extends HouseholdEntity {
    // ? PROPERTIES
    /** Needle compared against the chosen transaction field (see `matcher`). */
    @Property({ length: 200 })
    matchValue!: string;

    /** Lower runs first; ties fall back to insertion order. */
    @Property({ default: 100 })
    priority = 100;

    /** Times this rule sorted a transaction — surfaces dead rules the user can prune. */
    @Property({ default: 0 })
    hitCount = 0;

    /** Inactive rules are kept for history but skipped by the engine. */
    @Property({ default: true })
    isActive = true;

    // ? ENUMS
    /** Which transaction field the needle is compared against. */
    @Enum(NativeEnum({ RuleField, domain: 'money', defaultValue: RuleField.DESCRIPTION }))
    field: RuleField = RuleField.DESCRIPTION;

    /** How the needle is compared (contains / equals / starts-with / regex). */
    @Enum(NativeEnum({ RuleMatcher, domain: 'money', defaultValue: RuleMatcher.CONTAINS }))
    matcher: RuleMatcher = RuleMatcher.CONTAINS;

    // ? RELATIONSHIPS
    /** Target jar (N:1, required). Deleting the jar deletes rules that pointed at it. */
    @ManyToOne(() => Jar, { deleteRule: 'cascade' })
    jar!: Jar;

    /** Optional target category under that jar. Deleting the category clears it. */
    @ManyToOne(() => Category, { nullable: true, deleteRule: 'set null' })
    category: Category | null = null;
}
