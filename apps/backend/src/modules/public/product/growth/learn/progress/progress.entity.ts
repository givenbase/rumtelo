import { Entity, Enum, ManyToOne, Property, Unique } from '@mikro-orm/core';
import { LearnProgressStatus } from '@rumtelo/contracts';

import { HouseholdEntity } from '../../../../../../common/database/household.entity';
import { entityConfig } from '../../../../../../common/database/entity-config.util';
import { NativeEnum } from '../../../../../../common/database/native-enum.util';
import { Account } from '../../../../../auth/user/account/account.entity';

/**
 * Learn Progress Entity
 *
 * One piece a person has picked. The catalog stays shared. This row is theirs:
 * where it sits, and the day they want it finished.
 *
 * @see LearnSkillFocus — which skills are in focus, even before a piece is picked
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(entityConfig({ schema: 'public', domain: 'growth', tableName: 'learn_progress' }))
@Unique({ properties: ['household', 'account', 'pieceKey'] })
export class LearnProgress extends HouseholdEntity {
    // ? PROPERTIES
    /** Catalog key, or the id of a household book, course, seminar, or event. */
    @Property({ length: 64 })
    pieceKey!: string;

    /**
     * Which skill this piece belongs to.
     * A key, not an enum, so the skill list can grow without a migration.
     */
    @Property({ length: 64 })
    skill!: string;

    /** The day they want to be finished. Null until they pick one. */
    @Property({ type: 'date', nullable: true })
    dueOn: string | null = null;

    // ? ENUMS
    /** Need it, on it, or finished. Unpicked pieces have no row. */
    @Enum(NativeEnum({ LearnProgressStatus, domain: 'growth' }))
    status!: LearnProgressStatus;

    // ? RELATIONSHIPS
    /** The person whose shelf this is. mapToPk keeps `account: string` in app code. */
    @ManyToOne(() => Account, { mapToPk: true, deleteRule: 'cascade' })
    account!: string;
}
