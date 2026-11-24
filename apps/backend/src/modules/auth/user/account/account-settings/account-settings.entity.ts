import { Entity, Enum, OneToOne, Property } from '@mikro-orm/decorators/legacy';
import {
    DEFAULT_ACCOUNT_TOUR_PROGRESS,
    Locale,
    SpendingStyle,
    Theme,
    WorkSituation,
    YearIntention,
    type AccountTourProgress,
} from '@rumtelo/contracts';

import { BaseEntity } from '../../../../../common/database/base.entity';
import { entityConfig } from '../../../../../common/database/entity-config.util';
import { Jsonb } from '../../../../../common/database/jsonb.util';
import { NativeEnum } from '../../../../../common/database/native-enum.util';
import { Account } from '../account.entity';

/**
 * Account Settings Entity
 *
 * Person-scoped UI prefs — language, appearance, spending style, work situation, year intention,
 * the personal Mindset direction (north star), and tour progress.
 * One row per account.
 *
 * Currency and board debt strategy stay on auth.household_settings.
 * Theme, locale, spending style, and tour can differ per person in the same household.
 *
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(entityConfig({ schema: 'auth', domain: 'account', tableName: 'settings' }))
export class AccountSettings extends BaseEntity {
    // ? PROPERTIES
    /**
     * Where the person wants to be a year from now, in their own words (max 280, trimmed by the
     * contract). Personal Mindset text: never read for a housemate or a practice. Null = not written.
     */
    @Property({ type: 'text', nullable: true })
    direction: string | null = null;

    /** What the direction is for, in the person's own words (max 280). Same privacy. Null = not written. */
    @Property({ type: 'text', nullable: true })
    directionWhy: string | null = null;

    /** Guided tour / Help walkthrough progress (offer + per-chapter status). */
    @Property(Jsonb())
    tour: AccountTourProgress = { ...DEFAULT_ACCOUNT_TOUR_PROGRESS, tours: {} };

    /**
     * Skip the board ladder for this person (every household): the shell shows the full board.
     * A guidance preference like theme — never changes what the plan or role allow.
     */
    @Property({ type: 'boolean', default: false })
    isShowingAllSurfaces: boolean = false;

    /**
     * When personal onboarding finished. Null = still new at person level.
     * Separate from Better Auth `email_verified`.
     */
    @Property({ type: 'timestamptz', nullable: true })
    onboardedAt: Date | null = null;

    // ? ENUMS
    /** Preferred language (NL | EN). */
    @Enum(NativeEnum({ Locale, domain: 'auth', defaultValue: Locale.NL }))
    locale: Locale = Locale.NL;

    /** UI appearance preference (LIGHT | DARK | SYSTEM). Defaults to light. */
    @Enum(NativeEnum({ Theme, domain: 'auth', defaultValue: Theme.LIGHT }))
    theme: Theme = Theme.LIGHT;

    /** Soft spending style — personalises coach tips for who is looking. */
    @Enum(
        NativeEnum({
            SpendingStyle,
            domain: 'money',
            defaultValue: SpendingStyle.UNKNOWN,
        })
    )
    spendingStyle: SpendingStyle = SpendingStyle.UNKNOWN;

    /** How the person earns a living — orders goal presets in "Plan your year". Null = not told. */
    @Enum(NativeEnum({ WorkSituation, domain: 'auth', nullable: true }))
    workSituation: WorkSituation | null = null;

    /** What the person wants from the year — sets the tone of "Plan your year". Null = not told. */
    @Enum(NativeEnum({ YearIntention, domain: 'auth', nullable: true }))
    yearIntention: YearIntention | null = null;

    // ? RELATIONSHIPS
    /**
     * Owning account (1:1). Cascades when the account is deleted.
     * OneToOne (not ManyToOne+@Unique) so Account.settings can stay the inverse side.
     */
    @OneToOne(() => Account, { owner: true, deleteRule: 'cascade' })
    account!: Account;
}
