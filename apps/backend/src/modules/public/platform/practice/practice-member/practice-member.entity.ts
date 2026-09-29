import { Entity, Enum, ManyToOne, Property, Unique } from '@mikro-orm/decorators/legacy';
import { PracticeRole } from '@rumtelo/contracts';

import { BaseEntity } from '../../../../../common/database/base.entity';
import { entityConfig } from '../../../../../common/database/entity-config.util';
import { NativeEnum } from '../../../../../common/database/native-enum.util';
import { Account } from '../../../../auth/user/account/account.entity';
import { Practice } from '../practice/practice.entity';

/**
 * Practice Member Entity
 *
 * Staff seat on a Practice. Billable seats drive the staff meter.
 *
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(entityConfig({ schema: 'public', domain: 'platform', tableName: 'practice_member' }))
@Unique({ properties: ['practice', 'account'] })
export class PracticeMember extends BaseEntity {
    // ? PROPERTIES
    /** Counts toward Practice Stripe staff meter when true. */
    @Property({ type: 'boolean', default: true })
    isSeatBillable = true;

    /** When this member joined the practice. */
    @Property({ type: 'timestamptz', defaultRaw: 'now()' })
    joinedAt: Date = new Date();

    // ? ENUMS
    /** Staff role inside the practice. */
    @Enum(NativeEnum({ PracticeRole, domain: 'platform', defaultValue: PracticeRole.COACH }))
    role: PracticeRole = PracticeRole.COACH;

    // ? RELATIONSHIPS
    @ManyToOne(() => Practice, { mapToPk: true, deleteRule: 'cascade' })
    practice!: string;

    @ManyToOne(() => Account, { mapToPk: true, deleteRule: 'cascade' })
    account!: string;
}
