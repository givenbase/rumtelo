import { Collection } from '@mikro-orm/core';
import { Entity, Enum, ManyToMany, Property, Unique } from '@mikro-orm/decorators/legacy';
import {
    Currency,
    DEFAULT_VISIBILITY_SETTINGS,
    IncomeStability,
    PayoffStrategy,
    type HouseholdAnswers,
    type HouseholdFeatureSettings,
    type HouseholdMoneySettings,
    type HouseholdVisibilitySettings,
    type HouseholdWeekCheckSettings,
} from '@rumtelo/contracts';

import { entityConfig } from '../../../../common/database/entity-config.util';
import { HouseholdEntity } from '../../../../common/database/household.entity';
import { Jsonb } from '../../../../common/database/jsonb.util';
import { NativeEnum } from '../../../../common/database/native-enum.util';
import { Audience } from '../../../backoffice/product/money/catalog/audience/audience.entity';

export const DEFAULT_MONEY_SETTINGS: HouseholdMoneySettings = {
    periodStartDay: 1,
    incomeStability: IncomeStability.STABLE,
    payoffStrategy: PayoffStrategy.AVALANCHE,
};

export const DEFAULT_WEEK_CHECK_SETTINGS: HouseholdWeekCheckSettings = {
    reminderDay: 7,
    reminderAt: '19:00',
};

export const DEFAULT_FEATURE_SETTINGS: HouseholdFeatureSettings = {
    isBankSyncEnabled: false,
    isCoachEnabled: true,
    isCourseQuartersEnabled: false,
    isCourseDaysEnabled: false,
};

/**
 * Household Settings Entity
 *
 * Money-board prefs for a household (`auth.household_settings`).
 * Language, appearance, and spending style live on `auth.account_settings`
 * (person-scoped). Currency and board money style stay here — one accounting
 * currency and one debt order for every member.
 *
 * Commercial plan + Stripe ids live on `HouseholdBilling` (1:1), not here.
 *
 * Household-owned via {@link HouseholdEntity} (uuid `id` + `household` →
 * AuthHousehold). UNIQUE(`household`) enforces **1:1** — one settings row
 * per household (product rows like jars stay 1:N on the same base).
 *
 * Enum columns use `public.platform_*` Postgres types
 * (enums always live in `public`, even when the table is in `auth`).
 *
 * @see https://mikro-orm.io/docs/defining-entities
 */
@Entity(entityConfig({ schema: 'auth', domain: 'household', tableName: 'settings' }))
@Unique({ properties: ['household'] })
export class HouseholdSettings extends HouseholdEntity {
    // ? PROPERTIES
    /** The user's stated reason, surfaced on the dashboard as the "why" line. */
    @Property({ type: 'text', nullable: true })
    why: string | null = null;

    /**
     * Money board: period rollover, income stability, debt payoff order.
     * Queried via the settings row — not filtered as SQL columns.
     */
    @Property(Jsonb())
    money: HouseholdMoneySettings = { ...DEFAULT_MONEY_SETTINGS };

    /** Week-check reminder slot (weekday + local HH:mm). Null day/at disables. */
    @Property(Jsonb())
    weekCheck: HouseholdWeekCheckSettings = { ...DEFAULT_WEEK_CHECK_SETTINGS };

    /** Feature toggles for the board (bank sync, coach, …). */
    @Property(Jsonb())
    features: HouseholdFeatureSettings = { ...DEFAULT_FEATURE_SETTINGS };

    /**
     * Who may see person-attributed rows: household mode + per-area overrides.
     * OWNER writes; applied only on plans with `platform.sharing`.
     */
    @Property(Jsonb())
    visibility: HouseholdVisibilitySettings = { ...DEFAULT_VISIBILITY_SETTINGS, areas: {} };

    /**
     * Extensible household Q&A (onboarding / coach prompts).
     * Keys are stable question ids — grow without new columns.
     */
    @Property(Jsonb())
    answers: HouseholdAnswers = {};

    /**
     * When board setup finished (`household.onboard`). Null = incomplete household.
     */
    @Property({ type: 'timestamptz', nullable: true })
    onboardedAt: Date | null = null;

    // ? ENUMS
    /** One accounting currency for every member's money view. */
    @Enum(NativeEnum({ Currency, domain: 'platform', defaultValue: Currency.EUR }))
    currency: Currency = Currency.EUR;

    // ? RELATIONSHIPS
    /**
     * Lifestyle tags (student, renter, homeowner, …), set once in Settings —
     * drives bill-picker recommendations across the board instead of a
     * per-form filter. Cross-schema owning side (N:M into backoffice).
     */
    @ManyToMany(() => Audience, undefined, {
        pivotTable: 'backoffice.household_settings_audience',
    })
    audiences = new Collection<Audience>(this);
}
