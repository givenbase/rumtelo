import { Entity, Enum, ManyToOne, Property } from '@mikro-orm/core';
import { RuleField, RuleMatcher } from '@rumtelo/contracts';

import { HouseholdEntity } from '../../../../../../common/database/household.entity';
import { NativeEnum } from '../../../../../../common/database/native-enum.util';
import { entityConfig } from '../../../../../../common/database/entity-config.util';
import { Category } from '../../plan/jar/category.entity';
import { Jar } from '../../plan/jar/jar.entity';

/**
 * Auto-sort engine. Rules run in priority order over incoming transactions;
 * first match wins and stamps appliedRuleId so the decision stays auditable.
 *
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(entityConfig({ schema: 'public', domain: 'money', tableName: 'rule' }))
export class Rule extends HouseholdEntity {
    // ? PROPERTIES
    @Property({ length: 200 })
    value!: string;

    @Property({ default: 100 })
    priority = 100;

    /** Surfaces dead rules the user can prune. */
    @Property({ default: 0 })
    hitCount = 0;

    @Property({ default: true })
    isActive = true;

    // ? ENUMS
    @Enum(NativeEnum({ RuleField, domain: 'money', defaultValue: RuleField.DESCRIPTION }))
    field: RuleField = RuleField.DESCRIPTION;

    @Enum(NativeEnum({ RuleMatcher, domain: 'money', defaultValue: RuleMatcher.CONTAINS }))
    matcher: RuleMatcher = RuleMatcher.CONTAINS;

    // ? RELATIONSHIPS
    @ManyToOne(() => Jar)
    jar!: Jar;

    @ManyToOne(() => Category, { nullable: true })
    category: Category | null = null;
}
