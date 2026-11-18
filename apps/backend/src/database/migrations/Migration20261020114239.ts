import { Migration } from '@mikro-orm/migrations';

/**
 * Koers (Course): rename `growth_plan_item` → `growth_course_item` in place, add the
 * month/quarter counter, and create Rhythm, ticks, ritual snoozes and the calendar feed.
 * Hand-edited: MikroORM proposes drop + create for a rename, which would lose rows.
 */
export class Migration20261020114239 extends Migration {

  override name = 'Migration20261020114239';

  override up(): void | Promise<void> {
    // Koers: `plan` → `course`. Rename in place so existing rows survive.
    this.addSql(`alter type "growth_plan_horizon" rename to "growth_course_horizon";`);
    this.addSql(`alter type "growth_plan_item_status" rename to "growth_course_item_status";`);
    this.addSql(`alter table "growth_plan_item" rename to "growth_course_item";`);
    this.addSql(`alter table "growth_course_item" rename constraint "growth_plan_item_pkey" to "growth_course_item_pkey";`);
    for (const suffix of ['household_id_foreign', 'account_id_foreign', 'parent_id_foreign', 'carried_from_id_foreign', 'goal_id_foreign', 'position_range', 'together_is_household']) {
      this.addSql(`alter table "growth_course_item" rename constraint "growth_plan_item_${suffix}" to "growth_course_item_${suffix}";`);
    }
    for (const suffix of ['household_id_index', 'household_id_account_id_index', 'parent_id_index', 'household_id_horizon_period_index', 'period_slot_unique', 'goal_slot_unique']) {
      this.addSql(`alter index "growth_plan_item_${suffix}" rename to "growth_course_item_${suffix}";`);
    }
    this.addSql(`alter table "growth_course_item" add column "target_count" smallint null;`);

    // Settings keys follow the rename: feature flags and the visibility area.
    this.addSql(`update "auth"."household_settings" set "features" = ("features" - 'isPlanQuartersEnabled' - 'isPlanDaysEnabled') || jsonb_build_object('isCourseQuartersEnabled', coalesce("features"->'isPlanQuartersEnabled', 'false'::jsonb), 'isCourseDaysEnabled', coalesce("features"->'isPlanDaysEnabled', 'false'::jsonb)) where "features" ? 'isPlanQuartersEnabled' or "features" ? 'isPlanDaysEnabled';`);
    // Parentheses: `->` binds looser than `-`, so bare `->'areas' - 'key'` is unknown-unknown.
    this.addSql(`update "auth"."household_settings" set "visibility" = jsonb_set("visibility", '{areas}', (("visibility"->'areas') - 'growth.plan'::text) || jsonb_build_object('growth.course', "visibility"->'areas'->'growth.plan')) where "visibility"->'areas' ? 'growth.plan';`);

    this.addSql(`create type "growth_course_ritual" as enum ('MONTH_CLOSE');`);
    this.addSql(`create type "growth_course_rhythm_kind" as enum ('HABIT', 'DISCIPLINE');`);
    this.addSql(`create type "growth_course_rhythm_cadence" as enum ('DAILY', 'WEEKLY', 'MONTHLY');`);
    this.addSql(`create type "growth_course_area" as enum ('MONEY', 'GROWTH', 'ENERGY', 'SOUL');`);

    this.addSql(`create table "growth_course_feed" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_id" uuid not null, "version" smallint not null default 1, "token_hash" varchar(64) not null, "month_close_lead_days" smallint not null default 3, "is_enabled" boolean not null default true, "is_focus_week_shown" boolean not null default true, "is_focus_day_shown" boolean not null default true, "is_rhythm_shown" boolean not null default false, "is_rituals_shown" boolean not null default true, "is_sleep_shown" boolean not null default false, "is_partner_shown" boolean not null default false, "last_fetched_at" timestamptz null, "account_id" uuid not null, primary key ("id"));`);
    this.addSql(`create index "growth_course_feed_household_id_index" on "growth_course_feed" ("household_id");`);
    this.addSql(`alter table "growth_course_feed" add constraint "growth_course_feed_token_hash_unique" unique ("token_hash");`);
    this.addSql(`alter table "growth_course_feed" add constraint "growth_course_feed_household_id_account_id_unique" unique ("household_id", "account_id");`);

    this.addSql(`create table "growth_course_ritual_snooze" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_id" uuid not null, "period" varchar(10) not null, "ritual" "public"."growth_course_ritual" not null, "account_id" uuid not null, primary key ("id"));`);
    this.addSql(`create index "growth_course_ritual_snooze_household_id_index" on "growth_course_ritual_snooze" ("household_id");`);
    this.addSql(`alter table "growth_course_ritual_snooze" add constraint "growth_course_ritual_snooze_household_id_account__98948_unique" unique ("household_id", "account_id", "ritual", "period");`);


    this.addSql(`create table "growth_course_rhythm" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_id" uuid not null, "visibility" "public"."platform_visibility" not null default 'PRIVATE', "account_id" uuid null, "name" varchar(140) not null, "target" smallint not null, "weekdays" jsonb null, "confirmed_week" varchar(8) null, "paused_at" timestamptz null, "ended_at" timestamptz null, "kind" "public"."growth_course_rhythm_kind" not null, "cadence" "public"."growth_course_rhythm_cadence" not null, "area" "public"."growth_course_area" null, "parent_id" uuid null, primary key ("id"));`);
    this.addSql(`create index "growth_course_rhythm_household_id_index" on "growth_course_rhythm" ("household_id");`);
    this.addSql(`create index "growth_course_rhythm_household_id_account_id_index" on "growth_course_rhythm" ("household_id", "account_id");`);
    this.addSql(`create index "growth_course_rhythm_parent_id_index" on "growth_course_rhythm" ("parent_id");`);

    this.addSql(`create table "growth_course_rhythm_tick" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_id" uuid not null, "ticked_on" date not null, "rhythm_id" uuid not null, primary key ("id"));`);
    this.addSql(`create index "growth_course_rhythm_tick_household_id_index" on "growth_course_rhythm_tick" ("household_id");`);
    this.addSql(`create index "growth_course_rhythm_tick_household_id_ticked_on_index" on "growth_course_rhythm_tick" ("household_id", "ticked_on");`);
    this.addSql(`alter table "growth_course_rhythm_tick" add constraint "growth_course_rhythm_tick_rhythm_id_ticked_on_unique" unique ("rhythm_id", "ticked_on");`);


    this.addSql(`alter table "growth_course_feed" add constraint "growth_course_feed_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on delete cascade;`);
    this.addSql(`alter table "growth_course_feed" add constraint "growth_course_feed_account_id_foreign" foreign key ("account_id") references "auth"."account" ("id") on delete cascade;`);
    this.addSql(`alter table "growth_course_feed" add constraint "growth_course_feed_lead_days" check ((month_close_lead_days IN (0, 3, 7)));`);

    this.addSql(`alter table "growth_course_ritual_snooze" add constraint "growth_course_ritual_snooze_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on delete cascade;`);
    this.addSql(`alter table "growth_course_ritual_snooze" add constraint "growth_course_ritual_snooze_account_id_foreign" foreign key ("account_id") references "auth"."account" ("id") on delete cascade;`);

    this.addSql(`alter table "growth_course_item" add constraint "growth_course_item_target_count_range" check ((target_count IS NULL) OR (target_count BETWEEN 1 AND 99));`);

    this.addSql(`alter table "growth_course_rhythm" add constraint "growth_course_rhythm_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on delete cascade;`);
    this.addSql(`alter table "growth_course_rhythm" add constraint "growth_course_rhythm_account_id_foreign" foreign key ("account_id") references "auth"."account" ("id") on delete cascade;`);
    this.addSql(`alter table "growth_course_rhythm" add constraint "growth_course_rhythm_parent_id_foreign" foreign key ("parent_id") references "growth_course_item" ("id") on delete set null;`);
    this.addSql(`alter table "growth_course_rhythm" add constraint "growth_course_rhythm_target_range" check ((target BETWEEN 1 AND 31));`);
    this.addSql(`alter table "growth_course_rhythm" add constraint "growth_course_rhythm_together_is_household" check ((account_id IS NOT NULL) OR (visibility = 'HOUSEHOLD'));`);

    this.addSql(`alter table "growth_course_rhythm_tick" add constraint "growth_course_rhythm_tick_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on delete cascade;`);
    this.addSql(`alter table "growth_course_rhythm_tick" add constraint "growth_course_rhythm_tick_rhythm_id_foreign" foreign key ("rhythm_id") references "growth_course_rhythm" ("id") on delete cascade;`);

  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "growth_course_rhythm" drop constraint "growth_course_rhythm_parent_id_foreign";`);
    this.addSql(`alter table "growth_course_rhythm_tick" drop constraint "growth_course_rhythm_tick_rhythm_id_foreign";`);

    this.addSql(`drop table if exists "growth_course_feed" cascade;`);
    this.addSql(`drop table if exists "growth_course_ritual_snooze" cascade;`);
    this.addSql(`drop table if exists "growth_course_rhythm_tick" cascade;`);
    this.addSql(`drop table if exists "growth_course_rhythm" cascade;`);

    this.addSql(`alter table "growth_course_item" drop constraint "growth_course_item_target_count_range";`);
    this.addSql(`alter table "growth_course_item" drop column "target_count";`);
    for (const suffix of ['household_id_index', 'household_id_account_id_index', 'parent_id_index', 'household_id_horizon_period_index', 'period_slot_unique', 'goal_slot_unique']) {
      this.addSql(`alter index "growth_course_item_${suffix}" rename to "growth_plan_item_${suffix}";`);
    }
    for (const suffix of ['household_id_foreign', 'account_id_foreign', 'parent_id_foreign', 'carried_from_id_foreign', 'goal_id_foreign', 'position_range', 'together_is_household']) {
      this.addSql(`alter table "growth_course_item" rename constraint "growth_course_item_${suffix}" to "growth_plan_item_${suffix}";`);
    }
    this.addSql(`alter table "growth_course_item" rename constraint "growth_course_item_pkey" to "growth_plan_item_pkey";`);
    this.addSql(`alter table "growth_course_item" rename to "growth_plan_item";`);
    this.addSql(`alter type "growth_course_item_status" rename to "growth_plan_item_status";`);
    this.addSql(`alter type "growth_course_horizon" rename to "growth_plan_horizon";`);

    this.addSql(`update "auth"."household_settings" set "features" = ("features" - 'isCourseQuartersEnabled' - 'isCourseDaysEnabled') || jsonb_build_object('isPlanQuartersEnabled', coalesce("features"->'isCourseQuartersEnabled', 'false'::jsonb), 'isPlanDaysEnabled', coalesce("features"->'isCourseDaysEnabled', 'false'::jsonb)) where "features" ? 'isCourseQuartersEnabled' or "features" ? 'isCourseDaysEnabled';`);
    this.addSql(`update "auth"."household_settings" set "visibility" = jsonb_set("visibility", '{areas}', (("visibility"->'areas') - 'growth.course'::text) || jsonb_build_object('growth.plan', "visibility"->'areas'->'growth.course')) where "visibility"->'areas' ? 'growth.course';`);

    this.addSql(`drop type "growth_course_ritual";`);
    this.addSql(`drop type "growth_course_rhythm_kind";`);
    this.addSql(`drop type "growth_course_rhythm_cadence";`);
    this.addSql(`drop type "growth_course_area";`);
  }

}
