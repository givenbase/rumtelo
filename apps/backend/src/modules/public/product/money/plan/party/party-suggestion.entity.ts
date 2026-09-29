import { Entity, Index, ManyToOne, Unique } from '@mikro-orm/decorators/legacy';

import { HouseholdEntity } from '../../../../../../common/database/household.entity';
import { entityConfig } from '../../../../../../common/database/entity-config.util';
import { MerchantSuggestion } from '../../../../../backoffice/product/money/preset/merchant-suggestion/merchant-suggestion.entity';
import { Party } from './party.entity';

/**
 * Party Suggestion Entity
 *
 * Links a household Party to a catalog MerchantSuggestion so the household
 * sees status (open / accepted / rejected) and we count each party at most once.
 *
 * @see MerchantSuggestion
 * @see Party
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(entityConfig({ schema: 'public', domain: 'money', tableName: 'party_suggestion' }))
@Unique({ properties: ['party'] })
@Index({ properties: ['suggestion'] })
export class PartySuggestion extends HouseholdEntity {
    // ? RELATIONSHIPS
    /** The party that was suggested — cascade when the party is deleted. */
    @ManyToOne(() => Party, { deleteRule: 'cascade' })
    party!: Party;

    /** Aggregated catalog nomination. Restrict so we keep the vote tally honest. */
    @ManyToOne(() => MerchantSuggestion, { deleteRule: 'restrict' })
    suggestion!: MerchantSuggestion;
}
