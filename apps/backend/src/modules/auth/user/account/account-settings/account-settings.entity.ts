import { Entity, Enum, OneToOne, Property } from '@mikro-orm/core';
import {
    DEFAULT_ACCOUNT_TOUR_PROGRESS,
    Locale,
    SpendingStyle,
    Theme,
    type AccountTourProgress,
} from '@rumtelo/contracts';

import { BaseEntity } from '../../../../../common/database/base.entity';
import { entityConfig } from '../../../../../common/database/entity-config.util';
import { NativeEnum } from '../../../../../common/database/native-enum.util';
import { Account } from '../account.entity';

/**
 * Account Settings Entity
 *
 * Person-scoped UI prefs — language, appearance, spending style, and tour progress.
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
    /** Guided tour / Help walkthrough progress (offer + per-chapter status). */
    @Property({ type: 'json' })
    tour: AccountTourProgress = { ...DEFAULT_ACCOUNT_TOUR_PROGRESS, tours: {} };

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

    // ? RELATIONSHIPS
    /**
     * Owning account (1:1). Cascades when the account is deleted.
     */
    @OneToOne(() => Account, { owner: true, deleteRule: 'cascade', unique: true })
    account!: Account;
}
