import { Entity, Enum, ManyToOne, Unique } from '@mikro-orm/decorators/legacy';
import { PracticeClientControlFlag } from '@rumtelo/contracts';

import { BaseEntity } from '../../../../../common/database/base.entity';
import { entityConfig } from '../../../../../common/database/entity-config.util';
import { NativeEnum } from '../../../../../common/database/native-enum.util';
import { PracticeClientLink } from '../practice-client-link/practice-client-link.entity';

/**
 * Practice Client Link Flag Entity
 *
 * Extensible control flags on a client link (sponsor plan, can unlink, …).
 * Junction — not jsonb.
 *
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(
    entityConfig({ schema: 'public', domain: 'platform', tableName: 'practice_client_link_flag' })
)
@Unique({ properties: ['link', 'flag'] })
export class PracticeClientLinkFlag extends BaseEntity {
    // ? ENUMS
    @Enum(NativeEnum({ PracticeClientControlFlag, domain: 'platform' }))
    flag!: PracticeClientControlFlag;

    // ? RELATIONSHIPS
    @ManyToOne(() => PracticeClientLink, { mapToPk: true, deleteRule: 'cascade' })
    link!: string;
}
