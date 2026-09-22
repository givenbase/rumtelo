import { Entity, Enum, Property, Unique } from '@mikro-orm/core';
import {
    Currency,
    HouseholdKind,
    IncomeStability,
    PayoffStrategy,
    type HouseholdAnswers,
    type HouseholdFeatureSettings,
    type HouseholdMoneySettings,
    type HouseholdWeekCheckSettings,
} from '@rumtelo/contracts';

import { entityConfig } from '../../../../common/database/entity-config.util';
import { HouseholdEntity } from '../../../../common/database/household.entity';
import { NativeEnum } from '../../../../common/database/native-enum.util';

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
    @Property({ type: 'json' })
    money: HouseholdMoneySettings = { ...DEFAULT_MONEY_SETTINGS };

    /** Week-check reminder slot (weekday + local HH:mm). Null day/at disables. */
    @Property({ type: 'json' })
    weekCheck: HouseholdWeekCheckSettings = { ...DEFAULT_WEEK_CHECK_SETTINGS };

    /** Feature toggles for the board (bank sync, coach, …). */
    @Property({ type: 'json' })
    features: HouseholdFeatureSettings = { ...DEFAULT_FEATURE_SETTINGS };

    /**
     * Extensible household Q&A (onboarding / coach prompts).
     * Keys are stable question ids — grow without new columns.
     */
    @Property({ type: 'json' })
    answers: HouseholdAnswers = {};

    /**
     * Lifestyle tags (student, renter, homeowner, …) — `Audience.key` catalog
     * rows, set once in Settings. Drives bill-picker recommendations across
     * the board instead of a per-form filter.
     */
    @Property({ type: 'json' })
    audienceKeys: string[] = [];

    /**
     * When board setup finished (`household.onboard`). Null = incomplete household.
     */
    @Property({ type: 'timestamptz', nullable: true })
    onboardedAt: Date | null = null;

    // ? ENUMS
    /** Solo / couple / family — drives copy and member expectations. */
    @Enum(NativeEnum({ HouseholdKind, domain: 'platform', defaultValue: HouseholdKind.SOLO }))
    kind: HouseholdKind = HouseholdKind.SOLO;

    /** One accounting currency for every member's money view. */
    @Enum(NativeEnum({ Currency, domain: 'platform', defaultValue: Currency.EUR }))
    currency: Currency = Currency.EUR;
}
