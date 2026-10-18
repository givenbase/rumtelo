import { Enum, Index, ManyToOne } from '@mikro-orm/decorators/legacy';
import { Visibility } from '@rumtelo/contracts';

import { Account } from '../../modules/auth/user/account/account.entity';

import { HouseholdEntity } from './household.entity';
import { NativeEnum } from './native-enum.util';

/**
 * HouseholdEntity + who made the row and who may see it.
 *
 * ```
 * HouseholdEntity              id, createdAt, updatedAt, household
 *   └─ PersonalHouseholdEntity   + account (maker, null = together), visibility
 *         ├─ GrowthPlanItem
 *         └─ … Learn, Energy, Soul, personal money (see visibility plan)
 * ```
 *
 * Read and write through `PersonalScopedRepository`, never `HouseholdScopedRepository`:
 * the visibility filter lives there. Each subclass adds
 * `@Check(personalRowCheck('<table>'))` so a together row is always HOUSEHOLD.
 *
 * @see docs/engineering/household-visibility-plan.md
 */
@Index({ properties: ['household', 'account'] })
export abstract class PersonalHouseholdEntity extends HouseholdEntity {
    // ? ENUMS
    /** Who sees the row besides its maker. Together rows are always HOUSEHOLD. */
    @Enum(NativeEnum({ Visibility, domain: 'platform', defaultValue: Visibility.PRIVATE }))
    visibility: Visibility = Visibility.PRIVATE;

    // ? RELATIONSHIPS
    /**
     * Maker (`auth.account`). Null = together: owned by the household, editable by
     * participants. Cascades when the account is deleted.
     */
    @ManyToOne(() => Account, { mapToPk: true, nullable: true, deleteRule: 'cascade' })
    account: string | null = null;
}

/** Check constraint every personal table carries: no maker ⇒ HOUSEHOLD. */
export function personalRowCheck(table: string) {
    return {
        name: `${table}_together_is_household`,
        expression: `(account_id IS NOT NULL) OR (visibility = 'HOUSEHOLD')`,
    };
}
