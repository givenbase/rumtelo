import { Migration } from '@mikro-orm/migrations';

export class Migration20260926115630 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create type "auth_account_address_kind" as enum ('BILLING', 'HOME', 'MAILING');`);
    this.addSql(`create type "platform_practice_address_kind" as enum ('BILLING', 'REGISTERED');`);
    this.addSql(`create type "platform_practice_client_link_status" as enum ('INVITED', 'ACTIVE', 'REVOKED');`);
    this.addSql(`create type "platform_practice_client_access" as enum ('VIEW', 'MANAGE');`);
    this.addSql(`create type "platform_practice_client_control_flag" as enum ('SPONSOR_PLAN', 'CAN_UNLINK');`);
    this.addSql(`create type "platform_practice_role" as enum ('OWNER', 'ADMIN', 'COACH');`);
    this.addSql(`create table "platform_address" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "line1" varchar(200) not null, "line2" varchar(200) null, "postal_code" varchar(32) not null, "city" varchar(120) not null, "country" varchar(2) not null, constraint "platform_address_pkey" primary key ("id"));`);

    this.addSql(`create table "auth"."account_address" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "kind" "public"."auth_account_address_kind" not null default 'BILLING', "account_id" uuid not null, "address_id" uuid not null, constraint "account_address_pkey" primary key ("id"));`);
    this.addSql(`alter table "auth"."account_address" add constraint "account_address_account_id_kind_unique" unique ("account_id", "kind");`);

    this.addSql(`create table "platform_practice" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "legal_name" varchar(160) not null, "display_name" varchar(120) not null, "slug" varchar(80) not null, "country" varchar(2) not null, "billing_email" varchar(255) not null, "registration_number" varchar(64) null, "vat_number" varchar(64) null, "phone" varchar(40) null, "website" varchar(240) null, "accepted_terms_at" timestamptz not null, constraint "platform_practice_pkey" primary key ("id"));`);
    this.addSql(`alter table "platform_practice" add constraint "platform_practice_slug_unique" unique ("slug");`);

    this.addSql(`create table "platform_practice_address" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "kind" "public"."platform_practice_address_kind" not null default 'BILLING', "practice_id" uuid not null, "address_id" uuid not null, constraint "platform_practice_address_pkey" primary key ("id"));`);
    this.addSql(`alter table "platform_practice_address" add constraint "platform_practice_address_practice_id_kind_unique" unique ("practice_id", "kind");`);

    this.addSql(`create table "platform_practice_billing" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "stripe_customer_id" varchar(255) null, "stripe_subscription_id" varchar(255) null, "billable_seat_count" int not null default 0, "period_started_at" timestamptz null, "period_ends_at" timestamptz null, "practice_id" uuid not null, constraint "platform_practice_billing_pkey" primary key ("id"));`);
    this.addSql(`create index "platform_practice_billing_stripe_customer_id_index" on "platform_practice_billing" ("stripe_customer_id");`);
    this.addSql(`alter table "platform_practice_billing" add constraint "platform_practice_billing_stripe_subscription_id_unique" unique ("stripe_subscription_id");`);
    this.addSql(`alter table "platform_practice_billing" add constraint "platform_practice_billing_practice_id_unique" unique ("practice_id");`);

    this.addSql(`create table "platform_practice_client_link" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "activated_at" timestamptz null, "revoked_at" timestamptz null, "status" "public"."platform_practice_client_link_status" not null default 'INVITED', "access" "public"."platform_practice_client_access" not null default 'MANAGE', "practice_id" uuid not null, "household_id" uuid not null, "added_by_account_id" uuid null, constraint "platform_practice_client_link_pkey" primary key ("id"));`);
    this.addSql(`alter table "platform_practice_client_link" add constraint "platform_practice_client_link_practice_id_household_id_unique" unique ("practice_id", "household_id");`);

    this.addSql(`create table "platform_practice_client_link_flag" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "flag" "public"."platform_practice_client_control_flag" not null, "link_id" uuid not null, constraint "platform_practice_client_link_flag_pkey" primary key ("id"));`);
    this.addSql(`alter table "platform_practice_client_link_flag" add constraint "platform_practice_client_link_flag_link_id_flag_unique" unique ("link_id", "flag");`);

    this.addSql(`create table "platform_practice_member" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "seat_billable" boolean not null default true, "joined_at" timestamptz not null default now(), "role" "public"."platform_practice_role" not null default 'COACH', "practice_id" uuid not null, "account_id" uuid not null, constraint "platform_practice_member_pkey" primary key ("id"));`);
    this.addSql(`alter table "platform_practice_member" add constraint "platform_practice_member_practice_id_account_id_unique" unique ("practice_id", "account_id");`);

    this.addSql(`alter table "auth"."account_address" add constraint "account_address_account_id_foreign" foreign key ("account_id") references "auth"."account" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "auth"."account_address" add constraint "account_address_address_id_foreign" foreign key ("address_id") references "platform_address" ("id") on update cascade on delete restrict;`);

    this.addSql(`alter table "platform_practice_address" add constraint "platform_practice_address_practice_id_foreign" foreign key ("practice_id") references "platform_practice" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "platform_practice_address" add constraint "platform_practice_address_address_id_foreign" foreign key ("address_id") references "platform_address" ("id") on update cascade on delete restrict;`);

    this.addSql(`alter table "platform_practice_billing" add constraint "platform_practice_billing_practice_id_foreign" foreign key ("practice_id") references "platform_practice" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "platform_practice_client_link" add constraint "platform_practice_client_link_practice_id_foreign" foreign key ("practice_id") references "platform_practice" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "platform_practice_client_link" add constraint "platform_practice_client_link_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "platform_practice_client_link" add constraint "platform_practice_client_link_added_by_account_id_foreign" foreign key ("added_by_account_id") references "auth"."account" ("id") on update cascade on delete set null;`);

    this.addSql(`alter table "platform_practice_client_link_flag" add constraint "platform_practice_client_link_flag_link_id_foreign" foreign key ("link_id") references "platform_practice_client_link" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "platform_practice_member" add constraint "platform_practice_member_practice_id_foreign" foreign key ("practice_id") references "platform_practice" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "platform_practice_member" add constraint "platform_practice_member_account_id_foreign" foreign key ("account_id") references "auth"."account" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "backoffice"."reference_growth_book_preset" alter column "spending_styles" type jsonb using ("spending_styles"::jsonb);`);

    this.addSql(`alter table "backoffice"."reference_money_giving_organisation" alter column "causes" type jsonb using ("causes"::jsonb);`);

    this.addSql(`alter table "auth"."household_billing" add column "extra_contributor_seats" int not null default 0, add column "extra_viewer_seats" int not null default 0;`);

    this.addSql(`alter table "backoffice"."reference_growth_watch_preset" alter column "spending_styles" type jsonb using ("spending_styles"::jsonb);`);

    this.addSql(`alter table "backoffice"."reference_growth_lever_preset" alter column "spending_styles" type jsonb using ("spending_styles"::jsonb);`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "auth"."account_address" drop constraint "account_address_address_id_foreign";`);

    this.addSql(`alter table "platform_practice_address" drop constraint "platform_practice_address_address_id_foreign";`);

    this.addSql(`alter table "platform_practice_address" drop constraint "platform_practice_address_practice_id_foreign";`);

    this.addSql(`alter table "platform_practice_billing" drop constraint "platform_practice_billing_practice_id_foreign";`);

    this.addSql(`alter table "platform_practice_client_link" drop constraint "platform_practice_client_link_practice_id_foreign";`);

    this.addSql(`alter table "platform_practice_member" drop constraint "platform_practice_member_practice_id_foreign";`);

    this.addSql(`alter table "platform_practice_client_link_flag" drop constraint "platform_practice_client_link_flag_link_id_foreign";`);

    this.addSql(`drop table if exists "platform_address" cascade;`);

    this.addSql(`drop table if exists "auth"."account_address" cascade;`);

    this.addSql(`drop table if exists "platform_practice" cascade;`);

    this.addSql(`drop table if exists "platform_practice_address" cascade;`);

    this.addSql(`drop table if exists "platform_practice_billing" cascade;`);

    this.addSql(`drop table if exists "platform_practice_client_link" cascade;`);

    this.addSql(`drop table if exists "platform_practice_client_link_flag" cascade;`);

    this.addSql(`drop table if exists "platform_practice_member" cascade;`);

    this.addSql(`alter table "auth"."account_settings" alter column "locale" type "auth"."auth_locale" using ("locale"::"auth"."auth_locale");`);
    this.addSql(`alter table "auth"."account_settings" alter column "theme" type "auth"."auth_theme" using ("theme"::"auth"."auth_theme");`);
    this.addSql(`alter table "auth"."account_settings" alter column "spending_style" type "auth"."money_spending_style" using ("spending_style"::"auth"."money_spending_style");`);

    this.addSql(`alter table "energy_log" alter column "metric" type "energy_metric" using ("metric"::"energy_metric");`);

    this.addSql(`alter table "energy_time_entry" alter column "category" type "energy_time_category" using ("category"::"energy_time_category");`);

    this.addSql(`alter table "energy_time_template" alter column "kind" type "energy_time_day_kind" using ("kind"::"energy_time_day_kind");`);

    this.addSql(`alter table "growth_learn_progress" alter column "status" type "growth_learn_progress_status" using ("status"::"growth_learn_progress_status");`);

    this.addSql(`alter table "auth"."household_billing" drop column "extra_contributor_seats", drop column "extra_viewer_seats";`);

    this.addSql(`alter table "auth"."household_billing" alter column "scheduled_plan_key" type "auth"."backoffice_plan_key" using ("scheduled_plan_key"::"auth"."backoffice_plan_key");`);
    this.addSql(`alter table "auth"."household_billing" alter column "plan_key" type "auth"."backoffice_plan_key" using ("plan_key"::"auth"."backoffice_plan_key");`);

    this.addSql(`alter table "auth"."household_settings" alter column "kind" type "auth"."platform_household_kind" using ("kind"::"auth"."platform_household_kind");`);
    this.addSql(`alter table "auth"."household_settings" alter column "currency" type "auth"."platform_currency" using ("currency"::"auth"."platform_currency");`);

    this.addSql(`alter table "money_bank_account" alter column "kind" type "money_account_kind" using ("kind"::"money_account_kind");`);

    this.addSql(`alter table "money_debt" alter column "kind" type "money_debt_kind" using ("kind"::"money_debt_kind");`);
    this.addSql(`alter table "money_debt" alter column "schedule_kind" type "money_debt_schedule_kind" using ("schedule_kind"::"money_debt_schedule_kind");`);
    this.addSql(`alter table "money_debt" alter column "payment_cadence" type "money_cadence" using ("payment_cadence"::"money_cadence");`);

    this.addSql(`alter table "money_fixed_cost" alter column "cadence" type "money_cadence" using ("cadence"::"money_cadence");`);
    this.addSql(`alter table "money_fixed_cost" alter column "direction" type "money_flow_direction" using ("direction"::"money_flow_direction");`);

    this.addSql(`alter table "money_fixed_cost_settlement" alter column "status" type "money_fixed_cost_settlement_status" using ("status"::"money_fixed_cost_settlement_status");`);
    this.addSql(`alter table "money_fixed_cost_settlement" alter column "source" type "money_fixed_cost_settlement_source" using ("source"::"money_fixed_cost_settlement_source");`);

    this.addSql(`alter table "money_goal" alter column "kind" type "money_goal_kind" using ("kind"::"money_goal_kind");`);
    this.addSql(`alter table "money_goal" alter column "status" type "money_goal_status" using ("status"::"money_goal_status");`);
    this.addSql(`alter table "money_goal" alter column "cause" type "money_giving_cause" using ("cause"::"money_giving_cause");`);

    this.addSql(`alter table "money_income_source" alter column "kind" type "money_income_kind" using ("kind"::"money_income_kind");`);
    this.addSql(`alter table "money_income_source" alter column "cadence" type "money_cadence" using ("cadence"::"money_cadence");`);

    this.addSql(`alter table "money_jar" alter column "key" type "money_jar_key" using ("key"::"money_jar_key");`);

    this.addSql(`alter table "money_month_score_event" alter column "kind" type "money_month_score_event_kind" using ("kind"::"money_month_score_event_kind");`);

    this.addSql(`alter table "money_sort_rule" alter column "field" type "money_rule_field" using ("field"::"money_rule_field");`);
    this.addSql(`alter table "money_sort_rule" alter column "matcher" type "money_rule_matcher" using ("matcher"::"money_rule_matcher");`);

    this.addSql(`alter table "money_transaction" alter column "status" type "money_transaction_status" using ("status"::"money_transaction_status");`);
    this.addSql(`alter table "money_transaction" alter column "source" type "money_transaction_source" using ("source"::"money_transaction_source");`);

    this.addSql(`alter table "money_week_check" alter column "stage" type "money_week_check_stage" using ("stage"::"money_week_check_stage");`);

    this.addSql(`alter table "backoffice"."plan" alter column "key" type "backoffice"."backoffice_plan_key" using ("key"::"backoffice"."backoffice_plan_key");`);

    this.addSql(`alter table "backoffice"."plan_capability" alter column "kind" type "backoffice"."backoffice_capability_kind" using ("kind"::"backoffice"."backoffice_capability_kind");`);

    this.addSql(`alter table "platform_coach_message" alter column "kind" type "platform_coach_kind" using ("kind"::"platform_coach_kind");`);

    this.addSql(`alter table "backoffice"."reference_growth_book_preset" alter column "spending_styles" type jsonb using ("spending_styles"::jsonb);`);
    this.addSql(`alter table "backoffice"."reference_growth_book_preset" alter column "min_plan" type "backoffice"."backoffice_plan_key" using ("min_plan"::"backoffice"."backoffice_plan_key");`);

    this.addSql(`alter table "backoffice"."reference_growth_lever_preset" alter column "spending_styles" type jsonb using ("spending_styles"::jsonb);`);

    this.addSql(`alter table "backoffice"."reference_growth_watch_preset" alter column "spending_styles" type jsonb using ("spending_styles"::jsonb);`);
    this.addSql(`alter table "backoffice"."reference_growth_watch_preset" alter column "format" type "backoffice"."growth_learn_watch_kind" using ("format"::"backoffice"."growth_learn_watch_kind");`);
    this.addSql(`alter table "backoffice"."reference_growth_watch_preset" alter column "min_plan" type "backoffice"."backoffice_plan_key" using ("min_plan"::"backoffice"."backoffice_plan_key");`);

    this.addSql(`alter table "backoffice"."reference_money_debt_preset" alter column "kind" type "backoffice"."money_debt_kind" using ("kind"::"backoffice"."money_debt_kind");`);

    this.addSql(`alter table "backoffice"."reference_money_fixed_cost_preset" alter column "cadence" type "backoffice"."money_cadence" using ("cadence"::"backoffice"."money_cadence");`);
    this.addSql(`alter table "backoffice"."reference_money_fixed_cost_preset" alter column "direction" type "backoffice"."money_flow_direction" using ("direction"::"backoffice"."money_flow_direction");`);

    this.addSql(`alter table "backoffice"."reference_money_giving_organisation" alter column "causes" type jsonb using ("causes"::jsonb);`);

    this.addSql(`alter table "backoffice"."reference_money_income_source_preset" alter column "kind" type "backoffice"."money_income_kind" using ("kind"::"backoffice"."money_income_kind");`);
    this.addSql(`alter table "backoffice"."reference_money_income_source_preset" alter column "cadence" type "backoffice"."money_cadence" using ("cadence"::"backoffice"."money_cadence");`);

    this.addSql(`alter table "backoffice"."reference_money_jar_template" alter column "key" type "backoffice"."money_jar_key" using ("key"::"backoffice"."money_jar_key");`);

    this.addSql(`alter table "backoffice"."reference_money_merchant_preset" alter column "highlight" type "backoffice"."money_merchant_highlight" using ("highlight"::"backoffice"."money_merchant_highlight");`);

    this.addSql(`alter table "backoffice"."reference_money_transaction_in_preset" alter column "jar_key" type "backoffice"."money_jar_key" using ("jar_key"::"backoffice"."money_jar_key");`);

    this.addSql(`drop type "auth_account_address_kind";`);
    this.addSql(`drop type "platform_practice_address_kind";`);
    this.addSql(`drop type "platform_practice_client_link_status";`);
    this.addSql(`drop type "platform_practice_client_access";`);
    this.addSql(`drop type "platform_practice_client_control_flag";`);
    this.addSql(`drop type "platform_practice_role";`);
  }

}
