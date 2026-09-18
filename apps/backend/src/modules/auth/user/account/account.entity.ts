import { Entity, OneToOne, Property } from '@mikro-orm/core';

import type { AccountSettings } from './account-settings/account-settings.entity';

import { BaseEntity } from '../../../../common/database/base.entity';
import { entityConfig } from '../../../../common/database/entity-config.util';
import { AuthUser } from '../managed/user/auth-user.entity';

/**
 * Account Entity
 *
 * Application-owned person profile — NOT Better Auth.
 *
 * Better Auth owns login identity only (`auth.user`: email, password/OAuth,
 * display `name`, image, verification, 2FA). Everything personal for the product
 * lives here: legal names, phone, date of birth, and (later) address facts.
 *
 *   user/managed/*            auth machinery (library-owned tables)
 *   auth.account              personal information for the application
 *   auth.account_settings     UI prefs (locale, theme, spending style)
 *   household/household-settings   shared money board
 *
 * Display name stays on Better Auth `user.name` and is synced when the profile
 * updates it — sessions and member lists keep one greeting field.
 *
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(entityConfig({ schema: 'auth', tableName: 'account' }))
export class Account extends BaseEntity {
    // ? PROPERTIES
    /** Legal first name (not the greeting — that is `AuthUser.name`). */
    @Property({ type: 'varchar', length: 80, nullable: true })
    firstName: string | null = null;

    /** Legal last name. */
    @Property({ type: 'varchar', length: 80, nullable: true })
    lastName: string | null = null;

    /** Optional middle name(s). */
    @Property({ type: 'varchar', length: 80, nullable: true })
    middleName: string | null = null;

    /** Optional contact phone — not used for Better Auth login. */
    @Property({ type: 'varchar', length: 32, nullable: true })
    phone: string | null = null;

    /** Calendar date only (no time zone), ISO `YYYY-MM-DD`. */
    @Property({ type: 'date', nullable: true })
    dateOfBirth: string | null = null;

    // ? RELATIONSHIPS
    /** Better Auth login identity (1:1, owner side). Cascades when the user is deleted. */
    @OneToOne(() => AuthUser, { deleteRule: 'cascade', unique: true })
    user!: AuthUser;

    /** Person-scoped UI prefs (1:1, inverse side). */
    @OneToOne('AccountSettings', { mappedBy: 'account' })
    settings?: AccountSettings;
}
