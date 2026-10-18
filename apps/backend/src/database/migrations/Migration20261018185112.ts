import { Migration } from '@mikro-orm/migrations';

export class Migration20261018185112 extends Migration {

  override name = 'Migration20261018185112';

  override up(): void | Promise<void> {
    this.addSql(`create type "platform_visibility" as enum ('PRIVATE', 'OWNER', 'HOUSEHOLD');`);
    this.addSql(`create type "growth_plan_horizon" as enum ('YEAR', 'QUARTER', 'MONTH', 'WEEK', 'DAY');`);
    this.addSql(`create type "growth_plan_item_status" as enum ('OPEN', 'DONE', 'PARTIAL', 'MISSED', 'DROPPED', 'DEFERRED');`);
    this.addSql(`create table "growth_plan_item" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_id" uuid not null, "visibility" "public"."platform_visibility" not null default 'PRIVATE', "account_id" uuid null, "period" varchar(10) not null, "name" varchar(140) not null, "position" smallint not null, "done_when" varchar(280) null, "review_note" varchar(280) null, "skill" varchar(64) null, "carry_count" smallint not null default 0, "horizon" "public"."growth_plan_horizon" not null, "status" "public"."growth_plan_item_status" not null default 'OPEN', "parent_id" uuid null, "carried_from_id" uuid null, "goal_id" uuid null, primary key ("id"));`);
    this.addSql(`create index "growth_plan_item_household_id_index" on "growth_plan_item" ("household_id");`);
    this.addSql(`create index "growth_plan_item_household_id_account_id_index" on "growth_plan_item" ("household_id", "account_id");`);
    this.addSql(`create index "growth_plan_item_parent_id_index" on "growth_plan_item" ("parent_id");`);
    this.addSql(`create index "growth_plan_item_household_id_horizon_period_index" on "growth_plan_item" ("household_id", "horizon", "period");`);
    this.addSql(`create unique index "growth_plan_item_period_slot_unique" on "public"."growth_plan_item" ("household_id", "account_id", "horizon", "period", "position") nulls not distinct where "horizon" in ('WEEK', 'DAY');`);
    this.addSql(`create unique index "growth_plan_item_goal_slot_unique" on "public"."growth_plan_item" ("household_id", "account_id", "horizon", "period", "parent_id", "position") nulls not distinct where "horizon" in ('YEAR', 'QUARTER', 'MONTH');`);

    // Existing households get the default rule (OWNER_SEES); the entity owns the default afterwards.
    this.addSql(`alter table "auth"."household_settings" add "visibility" jsonb not null default '{"mode":"OWNER_SEES","areas":{}}';`);
    this.addSql(`alter table "auth"."household_settings" alter column "visibility" drop default;`);

    this.addSql(`alter table "growth_plan_item" add constraint "growth_plan_item_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on delete cascade;`);
    this.addSql(`alter table "growth_plan_item" add constraint "growth_plan_item_account_id_foreign" foreign key ("account_id") references "auth"."account" ("id") on delete cascade;`);
    this.addSql(`alter table "growth_plan_item" add constraint "growth_plan_item_parent_id_foreign" foreign key ("parent_id") references "growth_plan_item" ("id") on delete set null;`);
    this.addSql(`alter table "growth_plan_item" add constraint "growth_plan_item_carried_from_id_foreign" foreign key ("carried_from_id") references "growth_plan_item" ("id") on delete set null;`);
    this.addSql(`alter table "growth_plan_item" add constraint "growth_plan_item_goal_id_foreign" foreign key ("goal_id") references "money_goal" ("id") on delete set null;`);
    this.addSql(`alter table "growth_plan_item" add constraint "growth_plan_item_position_range" check ((position BETWEEN 0 AND 3));`);
    this.addSql(`alter table "growth_plan_item" add constraint "growth_plan_item_together_is_household" check ((account_id IS NOT NULL) OR (visibility = 'HOUSEHOLD'));`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "growth_plan_item" drop constraint "growth_plan_item_parent_id_foreign";`);
    this.addSql(`alter table "growth_plan_item" drop constraint "growth_plan_item_carried_from_id_foreign";`);

    this.addSql(`drop table if exists "growth_plan_item" cascade;`);

    this.addSql(`alter table "auth"."household_settings" drop column "visibility";`);

    this.addSql(`drop type "platform_visibility";`);
    this.addSql(`drop type "growth_plan_horizon";`);
    this.addSql(`drop type "growth_plan_item_status";`);
  }

}
