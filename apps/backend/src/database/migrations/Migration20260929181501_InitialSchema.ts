import { Migration } from '@mikro-orm/migrations';

export class Migration20260929181501_InitialSchema extends Migration {

  override name = 'Migration20260929181501_InitialSchema';

  override up(): void | Promise<void> {
    this.addSql(`create schema if not exists "backoffice";`);
    this.addSql(`create schema if not exists "auth";`);
    this.addSql(`create type "auth_locale" as enum ('EN', 'NL', 'ES', 'FR');`);
    this.addSql(`create type "auth_theme" as enum ('LIGHT', 'DARK', 'SYSTEM');`);
    this.addSql(`create type "money_spending_style" as enum ('SPENDER', 'SAVER', 'BALANCED', 'UNKNOWN');`);
    this.addSql(`create type "auth_account_address_kind" as enum ('BILLING', 'HOME', 'MAILING');`);
    this.addSql(`create type "money_account_kind" as enum ('CHECKING', 'SAVINGS', 'CREDIT', 'CASH', 'INVESTMENT');`);
    this.addSql(`create type "backoffice_plan_key" as enum ('BASIC', 'PLUS', 'MAX');`);
    this.addSql(`create type "platform_coach_kind" as enum ('NUDGE', 'WIN', 'WARNING', 'INSIGHT', 'WEEK_CHECK');`);
    this.addSql(`create type "money_debt_kind" as enum ('CREDIT_CARD', 'LOAN', 'STUDENT', 'MORTGAGE', 'FAMILY', 'OTHER');`);
    this.addSql(`create type "platform_device_connection" as enum ('BLUETOOTH', 'WIFI', 'CLOUD');`);
    this.addSql(`create type "platform_household_kind" as enum ('FAMILY', 'PARTNERS', 'FRIENDS', 'SOLO');`);
    this.addSql(`create type "platform_currency" as enum ('EUR', 'USD', 'GBP');`);
    this.addSql(`create type "money_income_kind" as enum ('SALARY', 'FREELANCE', 'BENEFIT', 'RENTAL', 'DIVIDEND', 'OTHER');`);
    this.addSql(`create type "money_cadence" as enum ('WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'ONCE');`);
    this.addSql(`create type "money_jar_key" as enum ('NECESSITIES', 'FINANCIAL_FREEDOM', 'EDUCATION', 'LONG_TERM_SAVINGS', 'PLAY', 'GIVE');`);
    this.addSql(`create type "money_goal_kind" as enum ('SAVE', 'EARN', 'GIVE');`);
    this.addSql(`create type "money_goal_status" as enum ('ACTIVE', 'REACHED', 'PAUSED', 'ARCHIVED');`);
    this.addSql(`create type "money_giving_cause" as enum ('GLOBAL_HEALTH', 'POVERTY', 'EDUCATION', 'CLIMATE', 'ANIMALS', 'COMMUNITY', 'EMERGENCY', 'WATER');`);
    this.addSql(`create type "money_flow_direction" as enum ('IN', 'OUT');`);
    this.addSql(`create type "growth_learn_progress_status" as enum ('QUEUE', 'NOW', 'DONE');`);
    this.addSql(`create type "money_merchant_highlight" as enum ('FEATURED', 'NEW', 'POPULAR');`);
    this.addSql(`create type "money_merchant_suggestion_status" as enum ('OPEN', 'ACCEPTED', 'REJECTED');`);
    this.addSql(`create type "money_week_check_stage" as enum ('LOOK', 'REDIRECT', 'INTEND', 'DONE');`);
    this.addSql(`create type "money_month_score_event_kind" as enum ('JAR_HELD', 'JAR_OVERSPENT', 'INBOX_CLEARED', 'WEEK_CHECK_DONE', 'GOAL_REACHED', 'DEBT_CLEARED', 'INCOME_LOGGED', 'STREAK_KEPT');`);
    this.addSql(`create type "money_debt_schedule_kind" as enum ('OPEN', 'TERM', 'DEADLINE');`);
    this.addSql(`create type "backoffice_capability_kind" as enum ('screen', 'action');`);
    this.addSql(`create type "platform_practice_address_kind" as enum ('BILLING', 'REGISTERED');`);
    this.addSql(`create type "platform_practice_subscription_status" as enum ('NONE', 'TRIALING', 'ACTIVE', 'PAST_DUE', 'UNPAID', 'CANCELED', 'INCOMPLETE');`);
    this.addSql(`create type "platform_practice_client_invite_status" as enum ('PENDING', 'ACCEPTED', 'REVOKED');`);
    this.addSql(`create type "platform_practice_client_access" as enum ('VIEW', 'MANAGE');`);
    this.addSql(`create type "platform_practice_client_link_status" as enum ('INVITED', 'ACTIVE', 'REVOKED');`);
    this.addSql(`create type "platform_practice_client_control_flag" as enum ('SPONSOR_PLAN', 'CAN_UNLINK');`);
    this.addSql(`create type "platform_practice_role" as enum ('OWNER', 'ADMIN', 'COACH');`);
    this.addSql(`create type "money_rule_field" as enum ('DESCRIPTION', 'COUNTERPARTY', 'AMOUNT');`);
    this.addSql(`create type "money_rule_matcher" as enum ('CONTAINS', 'EQUALS', 'STARTS_WITH', 'REGEX');`);
    this.addSql(`create type "money_transaction_status" as enum ('INBOX', 'SORTED', 'IGNORED');`);
    this.addSql(`create type "money_transaction_source" as enum ('MANUAL', 'CSV', 'BANK', 'RECURRING');`);
    this.addSql(`create type "money_fixed_cost_settlement_status" as enum ('PAID', 'SKIPPED');`);
    this.addSql(`create type "money_fixed_cost_settlement_source" as enum ('MATCHED', 'MARK_PAID', 'SKIP', 'LINKED');`);
    this.addSql(`create type "growth_learn_watch_kind" as enum ('FILM', 'VIDEO', 'SERIES', 'PODCAST', 'COURSE');`);
    this.addSql(`create table "platform_address" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "line1" varchar(200) not null, "line2" varchar(200) null, "postal_code" varchar(32) not null, "city" varchar(120) not null, "country" varchar(2) not null, primary key ("id"));`);

    this.addSql(`create table "backoffice"."reference_growth_asset_kind" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "key" varchar(64) not null, "name" varchar(120) not null, "sort_order" int not null default 0, "is_active" boolean not null default true, "description" text null, "can_pay" boolean not null default false, "icon" varchar(8) null, primary key ("id"));`);
    this.addSql(`alter table "backoffice"."reference_growth_asset_kind" add constraint "reference_growth_asset_kind_key_unique" unique ("key");`);

    this.addSql(`create table "backoffice"."reference_growth_asset_preset" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "key" varchar(64) not null, "name" varchar(120) not null, "sort_order" int not null default 0, "is_active" boolean not null default true, "description" text null, "kind_id" uuid not null, primary key ("id"));`);
    this.addSql(`create index "reference_growth_asset_preset_kind_id_index" on "backoffice"."reference_growth_asset_preset" ("kind_id");`);
    this.addSql(`alter table "backoffice"."reference_growth_asset_preset" add constraint "reference_growth_asset_preset_key_unique" unique ("key");`);

    this.addSql(`create table "backoffice"."reference_money_audience" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "key" varchar(64) not null, "name" varchar(120) not null, "sort_order" int not null default 0, "is_active" boolean not null default true, "description" text null, "is_baseline" boolean not null default false, "accent_color" varchar(64) null, "soft_color" varchar(64) null, "icon" varchar(8) null, primary key ("id"));`);
    this.addSql(`alter table "backoffice"."reference_money_audience" add constraint "reference_money_audience_key_unique" unique ("key");`);

    this.addSql(`create table "auth"."household" ("id" uuid not null, "name" text not null, "slug" text not null, "logo" text null, "created_at" timestamptz not null, "metadata" text null, primary key ("id"));`);
    this.addSql(`alter table "auth"."household" add constraint "household_slug_unique" unique ("slug");`);

    this.addSql(`create table "growth_asset" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_id" uuid not null, "name" varchar(120) not null, "value" bigint not null, "flow" bigint not null default '0', "kind_key" varchar(64) not null, "preset_key" varchar(64) null, primary key ("id"));`);
    this.addSql(`create index "growth_asset_household_id_index" on "growth_asset" ("household_id");`);

    this.addSql(`create table "auth"."user" ("id" uuid not null, "name" text not null, "email" text not null, "email_verified" boolean not null, "image" text null, "created_at" timestamptz not null default CURRENT_TIMESTAMP, "updated_at" timestamptz not null default CURRENT_TIMESTAMP, "two_factor_enabled" boolean null, primary key ("id"));`);
    this.addSql(`alter table "auth"."user" add constraint "user_email_unique" unique ("email");`);

    this.addSql(`create table "auth"."two_factor" ("id" uuid not null, "secret" text not null, "backup_codes" text not null, "user_id" uuid not null, "verified" boolean null, "failed_verification_count" int null, "locked_until" timestamptz null, primary key ("id"));`);

    this.addSql(`create table "auth"."session" ("id" uuid not null, "expires_at" timestamptz not null, "token" text not null, "created_at" timestamptz not null default CURRENT_TIMESTAMP, "updated_at" timestamptz not null, "ip_address" text null, "user_agent" text null, "user_id" uuid not null, "active_household_id" uuid null, primary key ("id"));`);
    this.addSql(`alter table "auth"."session" add constraint "session_token_unique" unique ("token");`);

    this.addSql(`create table "auth"."provider" ("id" uuid not null, "issuer" text not null, "account_id" text not null, "provider_id" text not null, "user_id" uuid not null, "access_token" text null, "refresh_token" text null, "id_token" text null, "access_token_expires_at" timestamptz null, "refresh_token_expires_at" timestamptz null, "scope" text null, "password" text null, "created_at" timestamptz not null default CURRENT_TIMESTAMP, "updated_at" timestamptz not null, primary key ("id"));`);

    this.addSql(`create table "auth"."member" ("id" uuid not null, "household_id" uuid not null, "user_id" uuid not null, "role" text not null, "created_at" timestamptz not null, primary key ("id"));`);

    this.addSql(`create table "auth"."invitation" ("id" uuid not null, "household_id" uuid not null, "email" text not null, "role" text null, "status" text not null, "expires_at" timestamptz not null, "created_at" timestamptz not null default CURRENT_TIMESTAMP, "inviter_id" uuid not null, primary key ("id"));`);

    this.addSql(`create table "auth"."account" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "first_name" varchar(80) null, "last_name" varchar(80) null, "middle_name" varchar(80) null, "phone" varchar(32) null, "date_of_birth" date null, "user_id" uuid not null, primary key ("id"));`);
    this.addSql(`alter table "auth"."account" add constraint "account_user_id_unique" unique ("user_id");`);

    this.addSql(`create table "auth"."account_settings" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "tour" jsonb not null, "onboarded_at" timestamptz null, "locale" "public"."auth_locale" not null default 'NL', "theme" "public"."auth_theme" not null default 'LIGHT', "spending_style" "public"."money_spending_style" not null default 'UNKNOWN', "account_id" uuid not null, primary key ("id"));`);
    this.addSql(`alter table "auth"."account_settings" add constraint "account_settings_account_id_unique" unique ("account_id");`);

    this.addSql(`create table "auth"."account_address" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "kind" "public"."auth_account_address_kind" not null default 'BILLING', "account_id" uuid not null, "address_id" uuid not null, primary key ("id"));`);
    this.addSql(`alter table "auth"."account_address" add constraint "account_address_account_id_kind_unique" unique ("account_id", "kind");`);

    this.addSql(`create table "auth"."verification" ("id" uuid not null, "identifier" text not null, "value" text not null, "expires_at" timestamptz not null, "created_at" timestamptz not null default CURRENT_TIMESTAMP, "updated_at" timestamptz not null default CURRENT_TIMESTAMP, primary key ("id"));`);

    this.addSql(`create table "backoffice"."reference_money_bank" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "key" varchar(64) not null, "name" varchar(120) not null, "sort_order" int not null default 0, "is_active" boolean not null default true, "description" text null, "countries" jsonb not null, "iban_bank_code" varchar(4) null, "logo_domain" varchar(120) null, "website" varchar(240) null, primary key ("id"));`);
    this.addSql(`alter table "backoffice"."reference_money_bank" add constraint "reference_money_bank_key_unique" unique ("key");`);

    this.addSql(`create table "money_bank_account" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_id" uuid not null, "name" varchar(120) not null, "iban" varchar(34) null, "balance" bigint not null default '0', "connection_id" varchar(120) null, "last_synced_at" timestamptz null, "kind" "public"."money_account_kind" not null default 'CHECKING', "bank_id" uuid not null, "settlement_account_id" uuid null, "is_primary" boolean not null default false, primary key ("id"));`);
    this.addSql(`create index "money_bank_account_household_id_index" on "money_bank_account" ("household_id");`);
    this.addSql(`alter table "money_bank_account" add constraint "money_bank_account_household_id_iban_unique" unique ("household_id", "iban");`);

    this.addSql(`create table "backoffice"."reference_growth_book_preset" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "key" varchar(64) not null, "name" varchar(120) not null, "sort_order" int not null default 0, "is_active" boolean not null default true, "description" text not null, "author" varchar(120) not null, "skill" varchar(64) not null default 'MONEY', "topic" varchar(64) not null, "cover_id" int null, "isbn13" varchar(13) null, "spending_styles" jsonb not null default '[]', "url" varchar(280) not null, "min_plan" "public"."backoffice_plan_key" not null, primary key ("id"));`);
    this.addSql(`alter table "backoffice"."reference_growth_book_preset" add constraint "reference_growth_book_preset_key_unique" unique ("key");`);

    this.addSql(`create table "platform_coach_message" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_id" uuid not null, "key" varchar(80) null, "period" varchar(7) not null, "text" text not null, "cta_label" varchar(60) null, "cta_href" varchar(200) null, "dismissed_at" timestamptz null, "kind" "public"."platform_coach_kind" not null default 'NUDGE', "account_id" uuid null, primary key ("id"));`);
    this.addSql(`create index "platform_coach_message_household_id_index" on "platform_coach_message" ("household_id");`);
    this.addSql(`create index "platform_coach_message_household_id_account_id_key_index" on "platform_coach_message" ("household_id", "account_id", "key");`);
    this.addSql(`create index "platform_coach_message_household_id_period_index" on "platform_coach_message" ("household_id", "period");`);

    this.addSql(`create table "backoffice"."reference_money_debt_preset" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "key" varchar(64) not null, "name" varchar(120) not null, "sort_order" int not null default 0, "is_active" boolean not null default true, "icon" varchar(8) null, "kind" "public"."money_debt_kind" not null, primary key ("id"));`);
    this.addSql(`alter table "backoffice"."reference_money_debt_preset" add constraint "reference_money_debt_preset_key_unique" unique ("key");`);

    this.addSql(`create table "backoffice"."reference_platform_device_kind" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "key" varchar(64) not null, "name" varchar(120) not null, "sort_order" int not null default 0, "is_active" boolean not null default true, "icon" varchar(40) not null, "default_capabilities" jsonb not null, "default_connection" "public"."platform_device_connection" not null, primary key ("id"));`);
    this.addSql(`alter table "backoffice"."reference_platform_device_kind" add constraint "reference_platform_device_kind_key_unique" unique ("key");`);

    this.addSql(`create table "platform_device" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_id" uuid not null, "name" varchar(60) not null, "vendor" varchar(60) null, "model" varchar(60) null, "external_id" varchar(120) null, "capabilities" jsonb not null, "paired_at" timestamptz not null, "last_seen_at" timestamptz null, "connection" "public"."platform_device_connection" not null, "account_id" uuid null, "kind_key" varchar(64) not null, primary key ("id"));`);
    this.addSql(`create index "platform_device_household_id_index" on "platform_device" ("household_id");`);
    this.addSql(`create index "platform_device_household_id_account_id_index" on "platform_device" ("household_id", "account_id");`);
    this.addSql(`alter table "platform_device" add constraint "platform_device_household_id_external_id_unique" unique ("household_id", "external_id");`);

    this.addSql(`create table "backoffice"."reference_money_giving_organization" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "key" varchar(64) not null, "name" varchar(120) not null, "sort_order" int not null default 0, "is_active" boolean not null default true, "description" text not null, "country" varchar(2) null, "scope" varchar(64) null, "reporting" text null, "causes" jsonb not null default '[]', "signals" jsonb not null default '[]', "website" text not null, primary key ("id"));`);
    this.addSql(`alter table "backoffice"."reference_money_giving_organization" add constraint "reference_money_giving_organization_key_unique" unique ("key");`);

    this.addSql(`create table "growth_week_check" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_id" uuid not null, "week" varchar(8) not null, "completed_at" timestamptz null, primary key ("id"));`);
    this.addSql(`create index "growth_week_check_household_id_index" on "growth_week_check" ("household_id");`);
    this.addSql(`alter table "growth_week_check" add constraint "growth_week_check_household_id_week_unique" unique ("household_id", "week");`);

    this.addSql(`create table "auth"."household_billing" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_id" uuid not null, "stripe_customer_id" varchar(255) null, "stripe_subscription_id" varchar(255) null, "extra_contributor_seats" int not null default 0, "extra_viewer_seats" int not null default 0, "will_cancel_at_period_end" boolean not null default false, "period_started_at" timestamptz null, "period_ends_at" timestamptz null, "trial_ends_at" timestamptz null, "scheduled_plan_key" "public"."backoffice_plan_key" null, "plan_key" "public"."backoffice_plan_key" not null default 'BASIC', primary key ("id"));`);
    this.addSql(`create index "household_billing_household_id_index" on "auth"."household_billing" ("household_id");`);
    this.addSql(`create index "household_billing_stripe_customer_id_index" on "auth"."household_billing" ("stripe_customer_id");`);
    this.addSql(`alter table "auth"."household_billing" add constraint "household_billing_stripe_subscription_id_unique" unique ("stripe_subscription_id");`);
    this.addSql(`alter table "auth"."household_billing" add constraint "household_billing_household_id_unique" unique ("household_id");`);

    this.addSql(`create table "auth"."household_settings" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_id" uuid not null, "why" text null, "money" jsonb not null, "week_check" jsonb not null, "features" jsonb not null, "answers" jsonb not null, "onboarded_at" timestamptz null, "kind" "public"."platform_household_kind" not null default 'SOLO', "currency" "public"."platform_currency" not null default 'EUR', primary key ("id"));`);
    this.addSql(`create index "household_settings_household_id_index" on "auth"."household_settings" ("household_id");`);
    this.addSql(`alter table "auth"."household_settings" add constraint "household_settings_household_id_unique" unique ("household_id");`);

    this.addSql(`create table "backoffice"."household_settings_audience" ("household_settings_id" uuid not null, "audience_id" uuid not null, primary key ("household_settings_id", "audience_id"));`);

    this.addSql(`create table "growth_income_lever" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_id" uuid not null, "name" varchar(160) not null, "note" text null, "potential_monthly" bigint not null default '0', "is_done" boolean not null default false, primary key ("id"));`);
    this.addSql(`create index "growth_income_lever_household_id_index" on "growth_income_lever" ("household_id");`);

    this.addSql(`create table "growth_income_milestone" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_id" uuid not null, "name" varchar(160) not null, "target_monthly" bigint not null, "reached_on" date null, primary key ("id"));`);
    this.addSql(`create index "growth_income_milestone_household_id_index" on "growth_income_milestone" ("household_id");`);

    this.addSql(`create table "backoffice"."reference_growth_income_posture" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "key" varchar(64) not null, "name" varchar(120) not null, "sort_order" int not null default 0, "is_active" boolean not null default true, "description" text null, primary key ("id"));`);
    this.addSql(`alter table "backoffice"."reference_growth_income_posture" add constraint "reference_growth_income_posture_key_unique" unique ("key");`);

    this.addSql(`create table "backoffice"."reference_money_income_source_preset" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "key" varchar(64) not null, "name" varchar(120) not null, "sort_order" int not null default 0, "is_active" boolean not null default true, "icon" varchar(8) null, "kind" "public"."money_income_kind" not null, "cadence" "public"."money_cadence" not null default 'MONTHLY', primary key ("id"));`);
    this.addSql(`alter table "backoffice"."reference_money_income_source_preset" add constraint "reference_money_income_source_preset_key_unique" unique ("key");`);

    this.addSql(`create table "money_jar" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_id" uuid not null, "name" varchar(80) not null, "subtitle" varchar(160) null, "icon" varchar(8) null, "percentage" numeric(5,2) not null, "sort_order" int not null default 0, "capabilities" jsonb not null, "key" "public"."money_jar_key" not null, primary key ("id"));`);
    this.addSql(`create index "money_jar_household_id_index" on "money_jar" ("household_id");`);
    this.addSql(`alter table "money_jar" add constraint "money_jar_household_id_key_unique" unique ("household_id", "key");`);

    this.addSql(`create table "money_goal" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_id" uuid not null, "name" varchar(120) not null, "why" text null, "icon" varchar(8) null, "target" bigint not null, "saved" bigint not null default '0', "monthly_contribution" bigint not null default '0', "sort_order" int not null default 0, "fulfilled_on" date null, "target_on" date null, "kind" "public"."money_goal_kind" not null default 'SAVE', "status" "public"."money_goal_status" not null default 'ACTIVE', "cause" "public"."money_giving_cause" null, "jar_id" uuid null, "giving_organization_key" varchar(64) null, primary key ("id"));`);
    this.addSql(`create index "money_goal_household_id_index" on "money_goal" ("household_id");`);
    this.addSql(`create index "money_goal_jar_id_index" on "money_goal" ("jar_id");`);

    this.addSql(`create table "money_category" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_id" uuid not null, "name" varchar(80) not null, "budgeted" bigint not null default '0', "sort_order" int not null default 0, "is_archived" boolean not null default false, "jar_id" uuid not null, primary key ("id"));`);
    this.addSql(`create index "money_category_household_id_index" on "money_category" ("household_id");`);
    this.addSql(`create index "money_category_jar_id_index" on "money_category" ("jar_id");`);
    this.addSql(`alter table "money_category" add constraint "money_category_household_id_jar_id_name_unique" unique ("household_id", "jar_id", "name");`);

    this.addSql(`create table "backoffice"."reference_money_jar_template" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "name" varchar(80) not null, "subtitle" varchar(160) null, "icon" varchar(8) null, "percentage" numeric(5,2) not null, "sort_order" int not null default 0, "guide" jsonb null, "capabilities" jsonb not null, "is_active" boolean not null default true, "key" "public"."money_jar_key" not null, primary key ("id"));`);
    this.addSql(`alter table "backoffice"."reference_money_jar_template" add constraint "reference_money_jar_template_key_unique" unique ("key");`);

    this.addSql(`create table "backoffice"."reference_money_category_template" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "key" varchar(64) not null, "name" varchar(120) not null, "sort_order" int not null default 0, "is_active" boolean not null default true, "icon" varchar(8) null, "jar_template_id" uuid not null, primary key ("id"));`);
    this.addSql(`create index "reference_money_category_template_jar_template_id_index" on "backoffice"."reference_money_category_template" ("jar_template_id");`);
    this.addSql(`alter table "backoffice"."reference_money_category_template" add constraint "reference_money_category_template_key_unique" unique ("key");`);

    this.addSql(`create table "backoffice"."reference_money_goal_preset" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "key" varchar(64) not null, "name" varchar(120) not null, "sort_order" int not null default 0, "is_active" boolean not null default true, "icon" varchar(8) null, "jar_template_id" uuid not null, "category_template_id" uuid null, primary key ("id"));`);
    this.addSql(`create index "reference_money_goal_preset_category_template_id_index" on "backoffice"."reference_money_goal_preset" ("category_template_id");`);
    this.addSql(`create index "reference_money_goal_preset_jar_template_id_index" on "backoffice"."reference_money_goal_preset" ("jar_template_id");`);
    this.addSql(`alter table "backoffice"."reference_money_goal_preset" add constraint "reference_money_goal_preset_key_unique" unique ("key");`);

    this.addSql(`create table "backoffice"."reference_money_fixed_cost_preset" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "key" varchar(64) not null, "name" varchar(120) not null, "sort_order" int not null default 0, "is_active" boolean not null default true, "due_day" smallint null, "cadence" "public"."money_cadence" not null default 'MONTHLY', "direction" "public"."money_flow_direction" not null default 'OUT', "jar_template_id" uuid not null, "category_template_id" uuid not null, primary key ("id"));`);
    this.addSql(`create index "reference_money_fixed_cost_preset_category_template_id_index" on "backoffice"."reference_money_fixed_cost_preset" ("category_template_id");`);
    this.addSql(`create index "reference_money_fixed_cost_preset_jar_template_id_index" on "backoffice"."reference_money_fixed_cost_preset" ("jar_template_id");`);
    this.addSql(`alter table "backoffice"."reference_money_fixed_cost_preset" add constraint "reference_money_fixed_cost_preset_key_unique" unique ("key");`);

    this.addSql(`create table "growth_learn_book" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_id" uuid not null, "name" varchar(160) not null, "description" text not null, "author" varchar(120) not null, "skill" varchar(64) not null, "topic" varchar(64) not null, "cover_id" int null, "isbn13" varchar(13) null, "source_key" varchar(64) not null, "url" varchar(280) not null, "account_id" uuid not null, primary key ("id"));`);
    this.addSql(`create index "growth_learn_book_household_id_index" on "growth_learn_book" ("household_id");`);
    this.addSql(`alter table "growth_learn_book" add constraint "growth_learn_book_household_id_source_key_unique" unique ("household_id", "source_key");`);

    this.addSql(`create table "growth_learn_progress" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_id" uuid not null, "piece_key" varchar(64) not null, "skill" varchar(64) not null, "rank" int not null default 1, "due_on" date null, "status" "public"."growth_learn_progress_status" not null, "account_id" uuid not null, primary key ("id"));`);
    this.addSql(`create index "growth_learn_progress_household_id_index" on "growth_learn_progress" ("household_id");`);
    this.addSql(`alter table "growth_learn_progress" add constraint "growth_learn_progress_household_id_account_id_piece_key_unique" unique ("household_id", "account_id", "piece_key");`);

    this.addSql(`create table "growth_learn_focus" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_id" uuid not null, "skill" varchar(64) not null, "account_id" uuid not null, primary key ("id"));`);
    this.addSql(`create index "growth_learn_focus_household_id_index" on "growth_learn_focus" ("household_id");`);
    this.addSql(`alter table "growth_learn_focus" add constraint "growth_learn_focus_household_id_account_id_skill_unique" unique ("household_id", "account_id", "skill");`);

    this.addSql(`create table "backoffice"."reference_money_market" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "key" varchar(64) not null, "name" varchar(120) not null, "sort_order" int not null default 0, "is_active" boolean not null default true, primary key ("id"));`);
    this.addSql(`alter table "backoffice"."reference_money_market" add constraint "reference_money_market_key_unique" unique ("key");`);

    this.addSql(`create table "backoffice"."reference_money_merchant_preset" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "key" varchar(64) not null, "name" varchar(120) not null, "sort_order" int not null default 0, "is_active" boolean not null default true, "is_partner" boolean not null default false, "highlight" "public"."money_merchant_highlight" null, "jar_template_id" uuid not null, "category_template_id" uuid not null, "giving_organization_id" uuid null, primary key ("id"));`);
    this.addSql(`create index "reference_money_merchant_preset_giving_organization_id_index" on "backoffice"."reference_money_merchant_preset" ("giving_organization_id");`);
    this.addSql(`create index "reference_money_merchant_preset_category_template_id_index" on "backoffice"."reference_money_merchant_preset" ("category_template_id");`);
    this.addSql(`create index "reference_money_merchant_preset_jar_template_id_index" on "backoffice"."reference_money_merchant_preset" ("jar_template_id");`);
    this.addSql(`alter table "backoffice"."reference_money_merchant_preset" add constraint "reference_money_merchant_preset_key_unique" unique ("key");`);

    this.addSql(`create table "backoffice"."reference_money_merchant_matching" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "match_value" varchar(120) not null, "mcc" varchar(4) null, "match_priority" int not null default 0, "aliases" jsonb not null default '[]', "provider_ids" jsonb not null, "preset_id" uuid not null, primary key ("id"));`);
    this.addSql(`alter table "backoffice"."reference_money_merchant_matching" add constraint "reference_money_merchant_matching_preset_id_unique" unique ("preset_id");`);

    this.addSql(`create table "backoffice"."reference_money_merchant_branding" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "logo_domain" varchar(120) null, "website" varchar(240) null, "preset_id" uuid not null, primary key ("id"));`);
    this.addSql(`alter table "backoffice"."reference_money_merchant_branding" add constraint "reference_money_merchant_branding_preset_id_unique" unique ("preset_id");`);

    this.addSql(`create table "backoffice"."reference_money_fixed_cost_preset_merchant" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "sort_order" int not null default 0, "preset_id" uuid not null, "merchant_id" uuid not null, primary key ("id"));`);
    this.addSql(`create index "reference_money_fixed_cost_preset_merchant_merchant_id_index" on "backoffice"."reference_money_fixed_cost_preset_merchant" ("merchant_id");`);
    this.addSql(`alter table "backoffice"."reference_money_fixed_cost_preset_merchant" add constraint "reference_money_fixed_cost_preset_merchant_preset_f4a8c_unique" unique ("preset_id", "merchant_id");`);

    this.addSql(`create table "backoffice"."reference_money_debt_preset_merchant" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "sort_order" int not null default 0, "preset_id" uuid not null, "merchant_id" uuid not null, primary key ("id"));`);
    this.addSql(`create index "reference_money_debt_preset_merchant_merchant_id_index" on "backoffice"."reference_money_debt_preset_merchant" ("merchant_id");`);
    this.addSql(`alter table "backoffice"."reference_money_debt_preset_merchant" add constraint "reference_money_debt_preset_merchant_preset_id_me_00cff_unique" unique ("preset_id", "merchant_id");`);

    this.addSql(`create table "backoffice"."reference_money_merchant_suggestion" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "name" varchar(160) not null, "normalized_name" varchar(160) not null, "household_count" int not null default 0, "accepted_merchant_key" varchar(64) null, "logo_domain" varchar(120) null, "website" varchar(240) null, "status" "public"."money_merchant_suggestion_status" not null default 'OPEN', primary key ("id"));`);
    this.addSql(`alter table "backoffice"."reference_money_merchant_suggestion" add constraint "reference_money_merchant_suggestion_normalized_name_unique" unique ("normalized_name");`);

    this.addSql(`create table "money_week_check" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_id" uuid not null, "week" varchar(8) not null, "completed_at" timestamptz null, "surplus" bigint not null default '0', "intention" varchar(280) null, "stage" "public"."money_week_check_stage" not null default 'LOOK', primary key ("id"));`);
    this.addSql(`create index "money_week_check_household_id_index" on "money_week_check" ("household_id");`);
    this.addSql(`alter table "money_week_check" add constraint "money_week_check_household_id_week_unique" unique ("household_id", "week");`);

    this.addSql(`create table "money_month_score" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_id" uuid not null, "period" varchar(7) not null, "score" int not null default 0, "max_score" int not null default 0, "level" int not null default 1, "is_closed" boolean not null default false, "closed_at" timestamptz null, primary key ("id"));`);
    this.addSql(`create index "money_month_score_household_id_index" on "money_month_score" ("household_id");`);
    this.addSql(`alter table "money_month_score" add constraint "money_month_score_household_id_period_unique" unique ("household_id", "period");`);

    this.addSql(`create table "money_month_score_event" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_id" uuid not null, "text" varchar(240) not null, "points" int not null default 0, "occurred_on" date not null, "kind" "public"."money_month_score_event_kind" not null, "month_score_id" uuid not null, primary key ("id"));`);
    this.addSql(`create index "money_month_score_event_household_id_index" on "money_month_score_event" ("household_id");`);
    this.addSql(`create index "money_month_score_event_month_score_id_occurred_on_index" on "money_month_score_event" ("month_score_id", "occurred_on");`);

    this.addSql(`create table "money_party" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_id" uuid not null, "name" varchar(160) not null, "note" varchar(280) null, "aliases" jsonb not null default '[]', "color" varchar(64) null, "icon" varchar(8) null, "logo_domain" varchar(120) null, "website" varchar(240) null, "merchant_key" varchar(64) null, primary key ("id"));`);
    this.addSql(`create index "money_party_household_id_index" on "money_party" ("household_id");`);
    this.addSql(`create index "money_party_household_id_merchant_key_index" on "money_party" ("household_id", "merchant_key");`);
    this.addSql(`alter table "money_party" add constraint "money_party_household_id_name_unique" unique ("household_id", "name");`);

    this.addSql(`create table "money_income_source" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_id" uuid not null, "name" varchar(120) not null, "counterparty" varchar(160) null, "amount" bigint not null, "is_active" boolean not null default true, "expected_day" smallint null, "started_on" date null, "ends_on" date null, "kind" "public"."money_income_kind" not null default 'SALARY', "cadence" "public"."money_cadence" not null default 'MONTHLY', "party_id" uuid null, "preset_key" varchar(64) null, "merchant_key" varchar(64) null, primary key ("id"));`);
    this.addSql(`create index "money_income_source_household_id_index" on "money_income_source" ("household_id");`);
    this.addSql(`create index "money_income_source_party_id_index" on "money_income_source" ("party_id");`);
    this.addSql(`alter table "money_income_source" add constraint "money_income_source_counterparty_when_linked" check (((merchant_key IS NULL) AND (party_id IS NULL)) OR (counterparty IS NOT NULL));`);
    this.addSql(`alter table "money_income_source" add constraint "money_income_source_merchant_xor_party" check ((merchant_key IS NULL) OR (party_id IS NULL));`);

    this.addSql(`create table "money_income_amount_period" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_id" uuid not null, "amount" bigint not null, "effective_on" date not null, "income_source_id" uuid not null, primary key ("id"));`);
    this.addSql(`create index "money_income_amount_period_household_id_index" on "money_income_amount_period" ("household_id");`);
    this.addSql(`alter table "money_income_amount_period" add constraint "money_income_amount_period_income_source_id_effective_on_unique" unique ("income_source_id", "effective_on");`);

    this.addSql(`create table "money_debt" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_id" uuid not null, "name" varchar(120) not null, "counterparty" varchar(160) null, "balance" bigint not null, "original_balance" bigint not null, "interest_rate" numeric(5,2) not null default 0.00, "minimum_payment" bigint not null default '0', "extra_payment" bigint not null default '0', "term_payments" smallint null, "due_month" smallint null, "due_day" smallint null, "started_on" date null, "maturity_on" date null, "closed_on" date null, "kind" "public"."money_debt_kind" not null default 'LOAN', "schedule_kind" "public"."money_debt_schedule_kind" not null default 'OPEN', "payment_cadence" "public"."money_cadence" not null default 'MONTHLY', "party_id" uuid null, "preset_key" varchar(64) null, "merchant_key" varchar(64) null, primary key ("id"));`);
    this.addSql(`create index "money_debt_household_id_index" on "money_debt" ("household_id");`);
    this.addSql(`create index "money_debt_party_id_index" on "money_debt" ("party_id");`);
    this.addSql(`alter table "money_debt" add constraint "money_debt_counterparty_when_linked" check (((merchant_key IS NULL) AND (party_id IS NULL)) OR (counterparty IS NOT NULL));`);
    this.addSql(`alter table "money_debt" add constraint "money_debt_merchant_xor_party" check ((merchant_key IS NULL) OR (party_id IS NULL));`);

    this.addSql(`create table "money_fixed_cost" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_id" uuid not null, "name" varchar(120) not null, "note" text null, "counterparty" varchar(160) null, "amount" bigint not null, "is_active" boolean not null default true, "due_month" smallint null, "due_day" smallint null, "started_on" date null, "ends_on" date null, "cadence" "public"."money_cadence" not null default 'MONTHLY', "direction" "public"."money_flow_direction" not null default 'OUT', "jar_id" uuid not null, "category_id" uuid null, "debt_id" uuid null, "party_id" uuid null, "preset_key" varchar(64) null, "merchant_key" varchar(64) null, primary key ("id"));`);
    this.addSql(`create index "money_fixed_cost_household_id_index" on "money_fixed_cost" ("household_id");`);
    this.addSql(`create index "money_fixed_cost_party_id_index" on "money_fixed_cost" ("party_id");`);
    this.addSql(`create index "money_fixed_cost_category_id_index" on "money_fixed_cost" ("category_id");`);
    this.addSql(`create index "money_fixed_cost_jar_id_index" on "money_fixed_cost" ("jar_id");`);
    this.addSql(`alter table "money_fixed_cost" add constraint "money_fixed_cost_debt_id_unique" unique ("debt_id");`);
    this.addSql(`alter table "money_fixed_cost" add constraint "money_fixed_cost_counterparty_when_linked" check (((merchant_key IS NULL) AND (party_id IS NULL)) OR (counterparty IS NOT NULL));`);
    this.addSql(`alter table "money_fixed_cost" add constraint "money_fixed_cost_merchant_xor_party" check ((merchant_key IS NULL) OR (party_id IS NULL));`);

    this.addSql(`create table "money_party_suggestion" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_id" uuid not null, "party_id" uuid not null, "suggestion_id" uuid not null, primary key ("id"));`);
    this.addSql(`create index "money_party_suggestion_household_id_index" on "money_party_suggestion" ("household_id");`);
    this.addSql(`create index "money_party_suggestion_suggestion_id_index" on "money_party_suggestion" ("suggestion_id");`);
    this.addSql(`alter table "money_party_suggestion" add constraint "money_party_suggestion_party_id_unique" unique ("party_id");`);

    this.addSql(`create table "backoffice"."plan" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "name" varchar(40) not null, "price_monthly" bigint not null default '0', "sort_order" int not null default 0, "is_active" boolean not null default true, "key" "public"."backoffice_plan_key" not null, primary key ("id"));`);
    this.addSql(`alter table "backoffice"."plan" add constraint "plan_key_unique" unique ("key");`);

    this.addSql(`create table "backoffice"."plan_product" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "key" varchar(64) not null, "name" varchar(120) not null, "sort_order" int not null default 0, "is_active" boolean not null default true, primary key ("id"));`);
    this.addSql(`alter table "backoffice"."plan_product" add constraint "plan_product_key_unique" unique ("key");`);

    this.addSql(`create table "backoffice"."plan_feature" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "key" varchar(64) not null, "name" varchar(120) not null, "sort_order" int not null default 0, "is_active" boolean not null default true, "description" text not null, "product_id" uuid not null, primary key ("id"));`);
    this.addSql(`create index "plan_feature_product_id_index" on "backoffice"."plan_feature" ("product_id");`);
    this.addSql(`alter table "backoffice"."plan_feature" add constraint "plan_feature_product_id_key_unique" unique ("product_id", "key");`);

    this.addSql(`create table "backoffice"."plan_capability" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "key" varchar(64) not null, "name" varchar(120) not null, "sort_order" int not null default 0, "is_active" boolean not null default true, "description" text not null, "kind" "public"."backoffice_capability_kind" not null, "feature_id" uuid not null, primary key ("id"));`);
    this.addSql(`create index "plan_capability_feature_id_index" on "backoffice"."plan_capability" ("feature_id");`);
    this.addSql(`alter table "backoffice"."plan_capability" add constraint "plan_capability_key_unique" unique ("key");`);

    this.addSql(`create table "backoffice"."plan_capability_grant" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "plan_id" uuid not null, "capability_id" uuid not null, primary key ("id"));`);
    this.addSql(`create index "plan_capability_grant_capability_id_index" on "backoffice"."plan_capability_grant" ("capability_id");`);
    this.addSql(`alter table "backoffice"."plan_capability_grant" add constraint "plan_capability_grant_plan_id_capability_id_unique" unique ("plan_id", "capability_id");`);

    this.addSql(`create table "platform_practice" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "legal_name" varchar(160) not null, "display_name" varchar(120) not null, "slug" varchar(80) not null, "billing_email" varchar(255) not null, "phone" varchar(40) null, "registration_number" varchar(64) null, "vat_number" varchar(64) null, "website" varchar(240) null, "accepted_terms_at" timestamptz not null, primary key ("id"));`);
    this.addSql(`alter table "platform_practice" add constraint "platform_practice_slug_unique" unique ("slug");`);

    this.addSql(`create table "platform_practice_address" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "kind" "public"."platform_practice_address_kind" not null default 'BILLING', "practice_id" uuid not null, "address_id" uuid not null, primary key ("id"));`);
    this.addSql(`alter table "platform_practice_address" add constraint "platform_practice_address_practice_id_kind_unique" unique ("practice_id", "kind");`);

    this.addSql(`create table "platform_practice_billing" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "stripe_customer_id" varchar(255) null, "stripe_subscription_id" varchar(255) null, "billable_seat_count" int not null default 0, "billable_client_count" int not null default 0, "period_started_at" timestamptz null, "period_ends_at" timestamptz null, "status" "public"."platform_practice_subscription_status" not null default 'NONE', "practice_id" uuid not null, primary key ("id"));`);
    this.addSql(`create index "platform_practice_billing_stripe_customer_id_index" on "platform_practice_billing" ("stripe_customer_id");`);
    this.addSql(`alter table "platform_practice_billing" add constraint "platform_practice_billing_stripe_subscription_id_unique" unique ("stripe_subscription_id");`);
    this.addSql(`alter table "platform_practice_billing" add constraint "platform_practice_billing_practice_id_unique" unique ("practice_id");`);

    this.addSql(`create table "platform_practice_client_invite" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "email" text not null, "token" text not null, "accepted_link_id" uuid null, "expires_at" timestamptz not null, "status" "public"."platform_practice_client_invite_status" not null default 'PENDING', "access" "public"."platform_practice_client_access" not null default 'VIEW', "practice_id" uuid not null, "added_by_account_id" uuid null, primary key ("id"));`);
    this.addSql(`create index "platform_practice_client_invite_practice_id_email_index" on "platform_practice_client_invite" ("practice_id", "email");`);
    this.addSql(`alter table "platform_practice_client_invite" add constraint "platform_practice_client_invite_token_unique" unique ("token");`);

    this.addSql(`create table "platform_practice_client_link" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_accepted_at" timestamptz null, "activated_at" timestamptz null, "revoked_at" timestamptz null, "status" "public"."platform_practice_client_link_status" not null default 'INVITED', "access" "public"."platform_practice_client_access" not null default 'MANAGE', "practice_id" uuid not null, "household_id" uuid not null, "added_by_account_id" uuid null, primary key ("id"));`);
    this.addSql(`alter table "platform_practice_client_link" add constraint "platform_practice_client_link_practice_id_household_id_unique" unique ("practice_id", "household_id");`);

    this.addSql(`create table "platform_practice_client_link_flag" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "flag" "public"."platform_practice_client_control_flag" not null, "link_id" uuid not null, primary key ("id"));`);
    this.addSql(`alter table "platform_practice_client_link_flag" add constraint "platform_practice_client_link_flag_link_id_flag_unique" unique ("link_id", "flag");`);

    this.addSql(`create table "platform_practice_member" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "is_seat_billable" boolean not null default true, "joined_at" timestamptz not null default now(), "role" "public"."platform_practice_role" not null default 'COACH', "practice_id" uuid not null, "account_id" uuid not null, primary key ("id"));`);
    this.addSql(`alter table "platform_practice_member" add constraint "platform_practice_member_practice_id_account_id_unique" unique ("practice_id", "account_id");`);

    this.addSql(`create table "backoffice"."reference_money_bank_partner" ("bank_1_id" uuid not null, "bank_2_id" uuid not null, primary key ("bank_1_id", "bank_2_id"));`);

    this.addSql(`create table "backoffice"."reference_money_fixed_cost_preset_audience" ("fixed_cost_preset_id" uuid not null, "audience_id" uuid not null, primary key ("fixed_cost_preset_id", "audience_id"));`);

    this.addSql(`create table "backoffice"."reference_money_merchant_preset_market" ("merchant_preset_id" uuid not null, "market_id" uuid not null, primary key ("merchant_preset_id", "market_id"));`);

    this.addSql(`create table "money_sort_rule" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_id" uuid not null, "match_value" varchar(200) not null, "priority" int not null default 100, "hit_count" int not null default 0, "is_active" boolean not null default true, "field" "public"."money_rule_field" not null default 'DESCRIPTION', "matcher" "public"."money_rule_matcher" not null default 'CONTAINS', "jar_id" uuid not null, "category_id" uuid null, primary key ("id"));`);
    this.addSql(`create index "money_sort_rule_household_id_index" on "money_sort_rule" ("household_id");`);
    this.addSql(`create index "money_sort_rule_category_id_index" on "money_sort_rule" ("category_id");`);
    this.addSql(`create index "money_sort_rule_jar_id_index" on "money_sort_rule" ("jar_id");`);

    this.addSql(`create table "backoffice"."reference_money_transaction_in_preset" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "key" varchar(64) not null, "name" varchar(120) not null, "sort_order" int not null default 0, "is_active" boolean not null default true, "group_name" varchar(64) not null, "icon" varchar(8) null, "jar_key" "public"."money_jar_key" null, primary key ("id"));`);
    this.addSql(`alter table "backoffice"."reference_money_transaction_in_preset" add constraint "reference_money_transaction_in_preset_key_unique" unique ("key");`);

    this.addSql(`create table "money_transaction" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_id" uuid not null, "description" varchar(280) not null, "note" text null, "counterparty" varchar(160) null, "amount" bigint not null, "dedupe_key" varchar(64) null, "booked_on" date not null, "status" "public"."money_transaction_status" not null default 'INBOX', "source" "public"."money_transaction_source" not null default 'MANUAL', "account_id" uuid null, "jar_id" uuid null, "category_id" uuid null, "debt_id" uuid null, "fixed_cost_id" uuid null, "applied_rule_id" uuid null, "party_id" uuid null, "merchant_key" varchar(64) null, "inflow_key" varchar(64) null, "applied_merchant_key" varchar(64) null, primary key ("id"));`);
    this.addSql(`create index "money_transaction_household_id_index" on "money_transaction" ("household_id");`);
    this.addSql(`create index "money_transaction_party_id_index" on "money_transaction" ("party_id");`);
    this.addSql(`create index "money_transaction_applied_rule_id_index" on "money_transaction" ("applied_rule_id");`);
    this.addSql(`create index "money_transaction_fixed_cost_id_index" on "money_transaction" ("fixed_cost_id");`);
    this.addSql(`create index "money_transaction_debt_id_index" on "money_transaction" ("debt_id");`);
    this.addSql(`create index "money_transaction_category_id_index" on "money_transaction" ("category_id");`);
    this.addSql(`create index "money_transaction_jar_id_index" on "money_transaction" ("jar_id");`);
    this.addSql(`create index "money_transaction_account_id_index" on "money_transaction" ("account_id");`);
    this.addSql(`create index "money_transaction_household_id_status_index" on "money_transaction" ("household_id", "status");`);
    this.addSql(`create index "money_transaction_household_id_booked_on_index" on "money_transaction" ("household_id", "booked_on");`);
    this.addSql(`alter table "money_transaction" add constraint "money_transaction_household_id_dedupe_key_unique" unique ("household_id", "dedupe_key");`);
    this.addSql(`alter table "money_transaction" add constraint "money_transaction_counterparty_when_linked" check (((merchant_key IS NULL) AND (party_id IS NULL)) OR (counterparty IS NOT NULL));`);
    this.addSql(`alter table "money_transaction" add constraint "money_transaction_merchant_xor_party" check ((merchant_key IS NULL) OR (party_id IS NULL));`);

    this.addSql(`create table "money_fixed_cost_settlement" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_id" uuid not null, "period" varchar(7) not null, "note" text null, "amount" bigint null, "paid_at" timestamptz null, "status" "public"."money_fixed_cost_settlement_status" not null default 'PAID', "source" "public"."money_fixed_cost_settlement_source" not null default 'MARK_PAID', "fixed_cost_id" uuid not null, "transaction_id" uuid null, primary key ("id"));`);
    this.addSql(`create index "money_fixed_cost_settlement_household_id_index" on "money_fixed_cost_settlement" ("household_id");`);
    this.addSql(`create index "money_fixed_cost_settlement_transaction_id_index" on "money_fixed_cost_settlement" ("transaction_id");`);
    this.addSql(`create index "money_fixed_cost_settlement_period_index" on "money_fixed_cost_settlement" ("period");`);
    this.addSql(`alter table "money_fixed_cost_settlement" add constraint "money_fixed_cost_settlement_fixed_cost_id_period_unique" unique ("fixed_cost_id", "period");`);

    this.addSql(`create table "backoffice"."reference_translation" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "entity_type" varchar(50) not null, "field_name" varchar(50) not null, "entity_key" varchar(80) not null, "locale" varchar(8) not null, "text" text not null, primary key ("id"));`);
    this.addSql(`create index "reference_translation_entity_key_index" on "backoffice"."reference_translation" ("entity_key");`);
    this.addSql(`create index "reference_translation_entity_type_locale_index" on "backoffice"."reference_translation" ("entity_type", "locale");`);
    this.addSql(`alter table "backoffice"."reference_translation" add constraint "reference_translation_entity_type_entity_key_fiel_fed7d_unique" unique ("entity_type", "entity_key", "field_name", "locale");`);

    this.addSql(`create table "backoffice"."reference_growth_watch_preset" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "key" varchar(64) not null, "name" varchar(120) not null, "sort_order" int not null default 0, "is_active" boolean not null default true, "description" text not null, "creator" varchar(120) not null, "skill" varchar(64) not null default 'MONEY', "topic" varchar(64) not null, "youtube_id" varchar(16) null, "spending_styles" jsonb not null default '[]', "url" varchar(280) not null, "watch_url" varchar(280) null, "format" "public"."growth_learn_watch_kind" not null, "min_plan" "public"."backoffice_plan_key" not null, "merchant_id" uuid null, primary key ("id"));`);
    this.addSql(`alter table "backoffice"."reference_growth_watch_preset" add constraint "reference_growth_watch_preset_key_unique" unique ("key");`);

    this.addSql(`create table "backoffice"."reference_growth_wealth_stage" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "key" varchar(64) not null, "name" varchar(120) not null, "sort_order" int not null default 0, "is_active" boolean not null default true, "description" text null, "min_net_worth" bigint null, "badge_label" varchar(64) null, primary key ("id"));`);
    this.addSql(`alter table "backoffice"."reference_growth_wealth_stage" add constraint "reference_growth_wealth_stage_key_unique" unique ("key");`);

    this.addSql(`create table "backoffice"."reference_growth_lever_preset" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "key" varchar(64) not null, "name" varchar(120) not null, "sort_order" int not null default 0, "is_active" boolean not null default true, "description" text not null, "spending_styles" jsonb not null default '[]', "accent_color" varchar(64) not null, "min_wealth_stage_id" uuid not null, primary key ("id"));`);
    this.addSql(`create index "reference_growth_lever_preset_min_wealth_stage_id_index" on "backoffice"."reference_growth_lever_preset" ("min_wealth_stage_id");`);
    this.addSql(`alter table "backoffice"."reference_growth_lever_preset" add constraint "reference_growth_lever_preset_key_unique" unique ("key");`);

    this.addSql(`create table "backoffice"."reference_growth_lever_preset_income_posture" ("lever_preset_id" uuid not null, "income_posture_id" uuid not null, primary key ("lever_preset_id", "income_posture_id"));`);

    this.addSql(`create table "money_week_check_allocation" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_id" uuid not null, "amount" bigint not null, "week_check_id" uuid not null, "jar_id" uuid not null, primary key ("id"));`);
    this.addSql(`create index "money_week_check_allocation_household_id_index" on "money_week_check_allocation" ("household_id");`);
    this.addSql(`create index "money_week_check_allocation_jar_id_index" on "money_week_check_allocation" ("jar_id");`);
    this.addSql(`alter table "money_week_check_allocation" add constraint "money_week_check_allocation_week_check_id_jar_id_unique" unique ("week_check_id", "jar_id");`);

    this.addSql(`alter table "backoffice"."reference_growth_asset_preset" add constraint "reference_growth_asset_preset_kind_id_foreign" foreign key ("kind_id") references "backoffice"."reference_growth_asset_kind" ("id") on delete restrict;`);

    this.addSql(`alter table "growth_asset" add constraint "growth_asset_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on delete cascade;`);
    this.addSql(`alter table "growth_asset" add constraint "growth_asset_kind_key_foreign" foreign key ("kind_key") references "backoffice"."reference_growth_asset_kind" ("key") on update cascade on delete restrict;`);
    this.addSql(`alter table "growth_asset" add constraint "growth_asset_preset_key_foreign" foreign key ("preset_key") references "backoffice"."reference_growth_asset_preset" ("key") on update cascade on delete set null;`);

    this.addSql(`alter table "auth"."two_factor" add constraint "two_factor_user_id_foreign" foreign key ("user_id") references "auth"."user" ("id") on delete cascade;`);

    this.addSql(`alter table "auth"."session" add constraint "session_user_id_foreign" foreign key ("user_id") references "auth"."user" ("id") on delete cascade;`);

    this.addSql(`alter table "auth"."provider" add constraint "provider_user_id_foreign" foreign key ("user_id") references "auth"."user" ("id") on delete cascade;`);

    this.addSql(`alter table "auth"."member" add constraint "member_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on delete cascade;`);
    this.addSql(`alter table "auth"."member" add constraint "member_user_id_foreign" foreign key ("user_id") references "auth"."user" ("id") on delete cascade;`);

    this.addSql(`alter table "auth"."invitation" add constraint "invitation_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on delete cascade;`);
    this.addSql(`alter table "auth"."invitation" add constraint "invitation_inviter_id_foreign" foreign key ("inviter_id") references "auth"."user" ("id") on delete cascade;`);

    this.addSql(`alter table "auth"."account" add constraint "account_user_id_foreign" foreign key ("user_id") references "auth"."user" ("id") on delete cascade;`);

    this.addSql(`alter table "auth"."account_settings" add constraint "account_settings_account_id_foreign" foreign key ("account_id") references "auth"."account" ("id") on delete cascade;`);

    this.addSql(`alter table "auth"."account_address" add constraint "account_address_account_id_foreign" foreign key ("account_id") references "auth"."account" ("id") on delete cascade;`);
    this.addSql(`alter table "auth"."account_address" add constraint "account_address_address_id_foreign" foreign key ("address_id") references "platform_address" ("id") on delete restrict;`);

    this.addSql(`alter table "money_bank_account" add constraint "money_bank_account_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on delete cascade;`);
    this.addSql(`alter table "money_bank_account" add constraint "money_bank_account_bank_id_foreign" foreign key ("bank_id") references "backoffice"."reference_money_bank" ("id") on delete restrict;`);
    this.addSql(`alter table "money_bank_account" add constraint "money_bank_account_settlement_account_id_foreign" foreign key ("settlement_account_id") references "money_bank_account" ("id") on delete set null;`);

    this.addSql(`alter table "platform_coach_message" add constraint "platform_coach_message_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on delete cascade;`);
    this.addSql(`alter table "platform_coach_message" add constraint "platform_coach_message_account_id_foreign" foreign key ("account_id") references "auth"."account" ("id") on delete cascade;`);

    this.addSql(`alter table "platform_device" add constraint "platform_device_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on delete cascade;`);
    this.addSql(`alter table "platform_device" add constraint "platform_device_account_id_foreign" foreign key ("account_id") references "auth"."account" ("id") on delete set null;`);
    this.addSql(`alter table "platform_device" add constraint "platform_device_kind_key_foreign" foreign key ("kind_key") references "backoffice"."reference_platform_device_kind" ("key") on update cascade on delete restrict;`);

    this.addSql(`alter table "growth_week_check" add constraint "growth_week_check_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on delete cascade;`);

    this.addSql(`alter table "auth"."household_billing" add constraint "household_billing_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on delete cascade;`);

    this.addSql(`alter table "auth"."household_settings" add constraint "household_settings_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on delete cascade;`);

    this.addSql(`alter table "backoffice"."household_settings_audience" add constraint "household_settings_audience_household_settings_id_foreign" foreign key ("household_settings_id") references "auth"."household_settings" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "backoffice"."household_settings_audience" add constraint "household_settings_audience_audience_id_foreign" foreign key ("audience_id") references "backoffice"."reference_money_audience" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "growth_income_lever" add constraint "growth_income_lever_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on delete cascade;`);

    this.addSql(`alter table "growth_income_milestone" add constraint "growth_income_milestone_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on delete cascade;`);

    this.addSql(`alter table "money_jar" add constraint "money_jar_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on delete cascade;`);

    this.addSql(`alter table "money_goal" add constraint "money_goal_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on delete cascade;`);
    this.addSql(`alter table "money_goal" add constraint "money_goal_jar_id_foreign" foreign key ("jar_id") references "money_jar" ("id") on delete set null;`);
    this.addSql(`alter table "money_goal" add constraint "money_goal_giving_organization_key_foreign" foreign key ("giving_organization_key") references "backoffice"."reference_money_giving_organization" ("key") on update cascade on delete set null;`);

    this.addSql(`alter table "money_category" add constraint "money_category_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on delete cascade;`);
    this.addSql(`alter table "money_category" add constraint "money_category_jar_id_foreign" foreign key ("jar_id") references "money_jar" ("id") on delete cascade;`);

    this.addSql(`alter table "backoffice"."reference_money_category_template" add constraint "reference_money_category_template_jar_template_id_foreign" foreign key ("jar_template_id") references "backoffice"."reference_money_jar_template" ("id") on delete restrict;`);

    this.addSql(`alter table "backoffice"."reference_money_goal_preset" add constraint "reference_money_goal_preset_jar_template_id_foreign" foreign key ("jar_template_id") references "backoffice"."reference_money_jar_template" ("id") on delete restrict;`);
    this.addSql(`alter table "backoffice"."reference_money_goal_preset" add constraint "reference_money_goal_preset_category_template_id_foreign" foreign key ("category_template_id") references "backoffice"."reference_money_category_template" ("id") on delete set null;`);

    this.addSql(`alter table "backoffice"."reference_money_fixed_cost_preset" add constraint "reference_money_fixed_cost_preset_jar_template_id_foreign" foreign key ("jar_template_id") references "backoffice"."reference_money_jar_template" ("id") on delete restrict;`);
    this.addSql(`alter table "backoffice"."reference_money_fixed_cost_preset" add constraint "reference_money_fixed_cost_preset_category_template_id_foreign" foreign key ("category_template_id") references "backoffice"."reference_money_category_template" ("id") on delete restrict;`);

    this.addSql(`alter table "growth_learn_book" add constraint "growth_learn_book_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on delete cascade;`);
    this.addSql(`alter table "growth_learn_book" add constraint "growth_learn_book_account_id_foreign" foreign key ("account_id") references "auth"."account" ("id") on delete cascade;`);

    this.addSql(`alter table "growth_learn_progress" add constraint "growth_learn_progress_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on delete cascade;`);
    this.addSql(`alter table "growth_learn_progress" add constraint "growth_learn_progress_account_id_foreign" foreign key ("account_id") references "auth"."account" ("id") on delete cascade;`);

    this.addSql(`alter table "growth_learn_focus" add constraint "growth_learn_focus_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on delete cascade;`);
    this.addSql(`alter table "growth_learn_focus" add constraint "growth_learn_focus_account_id_foreign" foreign key ("account_id") references "auth"."account" ("id") on delete cascade;`);

    this.addSql(`alter table "backoffice"."reference_money_merchant_preset" add constraint "reference_money_merchant_preset_jar_template_id_foreign" foreign key ("jar_template_id") references "backoffice"."reference_money_jar_template" ("id") on delete restrict;`);
    this.addSql(`alter table "backoffice"."reference_money_merchant_preset" add constraint "reference_money_merchant_preset_category_template_id_foreign" foreign key ("category_template_id") references "backoffice"."reference_money_category_template" ("id") on delete restrict;`);
    this.addSql(`alter table "backoffice"."reference_money_merchant_preset" add constraint "reference_money_merchant_preset_giving_organization_id_foreign" foreign key ("giving_organization_id") references "backoffice"."reference_money_giving_organization" ("id") on delete set null;`);

    this.addSql(`alter table "backoffice"."reference_money_merchant_matching" add constraint "reference_money_merchant_matching_preset_id_foreign" foreign key ("preset_id") references "backoffice"."reference_money_merchant_preset" ("id") on delete cascade;`);

    this.addSql(`alter table "backoffice"."reference_money_merchant_branding" add constraint "reference_money_merchant_branding_preset_id_foreign" foreign key ("preset_id") references "backoffice"."reference_money_merchant_preset" ("id") on delete cascade;`);

    this.addSql(`alter table "backoffice"."reference_money_fixed_cost_preset_merchant" add constraint "reference_money_fixed_cost_preset_merchant_preset_id_foreign" foreign key ("preset_id") references "backoffice"."reference_money_fixed_cost_preset" ("id") on delete cascade;`);
    this.addSql(`alter table "backoffice"."reference_money_fixed_cost_preset_merchant" add constraint "reference_money_fixed_cost_preset_merchant_merchant_id_foreign" foreign key ("merchant_id") references "backoffice"."reference_money_merchant_preset" ("id") on delete cascade;`);

    this.addSql(`alter table "backoffice"."reference_money_debt_preset_merchant" add constraint "reference_money_debt_preset_merchant_preset_id_foreign" foreign key ("preset_id") references "backoffice"."reference_money_debt_preset" ("id") on delete cascade;`);
    this.addSql(`alter table "backoffice"."reference_money_debt_preset_merchant" add constraint "reference_money_debt_preset_merchant_merchant_id_foreign" foreign key ("merchant_id") references "backoffice"."reference_money_merchant_preset" ("id") on delete cascade;`);

    this.addSql(`alter table "money_week_check" add constraint "money_week_check_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on delete cascade;`);

    this.addSql(`alter table "money_month_score" add constraint "money_month_score_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on delete cascade;`);

    this.addSql(`alter table "money_month_score_event" add constraint "money_month_score_event_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on delete cascade;`);
    this.addSql(`alter table "money_month_score_event" add constraint "money_month_score_event_month_score_id_foreign" foreign key ("month_score_id") references "money_month_score" ("id") on delete cascade;`);

    this.addSql(`alter table "money_party" add constraint "money_party_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on delete cascade;`);
    this.addSql(`alter table "money_party" add constraint "money_party_merchant_key_foreign" foreign key ("merchant_key") references "backoffice"."reference_money_merchant_preset" ("key") on update cascade on delete set null;`);

    this.addSql(`alter table "money_income_source" add constraint "money_income_source_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on delete cascade;`);
    this.addSql(`alter table "money_income_source" add constraint "money_income_source_party_id_foreign" foreign key ("party_id") references "money_party" ("id") on delete set null;`);
    this.addSql(`alter table "money_income_source" add constraint "money_income_source_preset_key_foreign" foreign key ("preset_key") references "backoffice"."reference_money_income_source_preset" ("key") on update cascade on delete set null;`);
    this.addSql(`alter table "money_income_source" add constraint "money_income_source_merchant_key_foreign" foreign key ("merchant_key") references "backoffice"."reference_money_merchant_preset" ("key") on update cascade on delete set null;`);

    this.addSql(`alter table "money_income_amount_period" add constraint "money_income_amount_period_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on delete cascade;`);
    this.addSql(`alter table "money_income_amount_period" add constraint "money_income_amount_period_income_source_id_foreign" foreign key ("income_source_id") references "money_income_source" ("id") on delete cascade;`);

    this.addSql(`alter table "money_debt" add constraint "money_debt_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on delete cascade;`);
    this.addSql(`alter table "money_debt" add constraint "money_debt_party_id_foreign" foreign key ("party_id") references "money_party" ("id") on delete set null;`);
    this.addSql(`alter table "money_debt" add constraint "money_debt_preset_key_foreign" foreign key ("preset_key") references "backoffice"."reference_money_debt_preset" ("key") on update cascade on delete set null;`);
    this.addSql(`alter table "money_debt" add constraint "money_debt_merchant_key_foreign" foreign key ("merchant_key") references "backoffice"."reference_money_merchant_preset" ("key") on update cascade on delete set null;`);

    this.addSql(`alter table "money_fixed_cost" add constraint "money_fixed_cost_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on delete cascade;`);
    this.addSql(`alter table "money_fixed_cost" add constraint "money_fixed_cost_jar_id_foreign" foreign key ("jar_id") references "money_jar" ("id") on delete cascade;`);
    this.addSql(`alter table "money_fixed_cost" add constraint "money_fixed_cost_category_id_foreign" foreign key ("category_id") references "money_category" ("id") on delete set null;`);
    this.addSql(`alter table "money_fixed_cost" add constraint "money_fixed_cost_debt_id_foreign" foreign key ("debt_id") references "money_debt" ("id") on delete set null;`);
    this.addSql(`alter table "money_fixed_cost" add constraint "money_fixed_cost_party_id_foreign" foreign key ("party_id") references "money_party" ("id") on delete set null;`);
    this.addSql(`alter table "money_fixed_cost" add constraint "money_fixed_cost_preset_key_foreign" foreign key ("preset_key") references "backoffice"."reference_money_fixed_cost_preset" ("key") on update cascade on delete set null;`);
    this.addSql(`alter table "money_fixed_cost" add constraint "money_fixed_cost_merchant_key_foreign" foreign key ("merchant_key") references "backoffice"."reference_money_merchant_preset" ("key") on update cascade on delete set null;`);

    this.addSql(`alter table "money_party_suggestion" add constraint "money_party_suggestion_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on delete cascade;`);
    this.addSql(`alter table "money_party_suggestion" add constraint "money_party_suggestion_party_id_foreign" foreign key ("party_id") references "money_party" ("id") on delete cascade;`);
    this.addSql(`alter table "money_party_suggestion" add constraint "money_party_suggestion_suggestion_id_foreign" foreign key ("suggestion_id") references "backoffice"."reference_money_merchant_suggestion" ("id") on delete restrict;`);

    this.addSql(`alter table "backoffice"."plan_feature" add constraint "plan_feature_product_id_foreign" foreign key ("product_id") references "backoffice"."plan_product" ("id") on delete cascade;`);

    this.addSql(`alter table "backoffice"."plan_capability" add constraint "plan_capability_feature_id_foreign" foreign key ("feature_id") references "backoffice"."plan_feature" ("id") on delete cascade;`);

    this.addSql(`alter table "backoffice"."plan_capability_grant" add constraint "plan_capability_grant_plan_id_foreign" foreign key ("plan_id") references "backoffice"."plan" ("id") on delete cascade;`);
    this.addSql(`alter table "backoffice"."plan_capability_grant" add constraint "plan_capability_grant_capability_id_foreign" foreign key ("capability_id") references "backoffice"."plan_capability" ("id") on delete cascade;`);

    this.addSql(`alter table "platform_practice_address" add constraint "platform_practice_address_practice_id_foreign" foreign key ("practice_id") references "platform_practice" ("id") on delete cascade;`);
    this.addSql(`alter table "platform_practice_address" add constraint "platform_practice_address_address_id_foreign" foreign key ("address_id") references "platform_address" ("id") on delete restrict;`);

    this.addSql(`alter table "platform_practice_billing" add constraint "platform_practice_billing_practice_id_foreign" foreign key ("practice_id") references "platform_practice" ("id") on delete cascade;`);

    this.addSql(`alter table "platform_practice_client_invite" add constraint "platform_practice_client_invite_practice_id_foreign" foreign key ("practice_id") references "platform_practice" ("id") on delete cascade;`);
    this.addSql(`alter table "platform_practice_client_invite" add constraint "platform_practice_client_invite_added_by_account_id_foreign" foreign key ("added_by_account_id") references "auth"."account" ("id") on delete set null;`);

    this.addSql(`alter table "platform_practice_client_link" add constraint "platform_practice_client_link_practice_id_foreign" foreign key ("practice_id") references "platform_practice" ("id") on delete cascade;`);
    this.addSql(`alter table "platform_practice_client_link" add constraint "platform_practice_client_link_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on delete cascade;`);
    this.addSql(`alter table "platform_practice_client_link" add constraint "platform_practice_client_link_added_by_account_id_foreign" foreign key ("added_by_account_id") references "auth"."account" ("id") on delete set null;`);

    this.addSql(`alter table "platform_practice_client_link_flag" add constraint "platform_practice_client_link_flag_link_id_foreign" foreign key ("link_id") references "platform_practice_client_link" ("id") on delete cascade;`);

    this.addSql(`alter table "platform_practice_member" add constraint "platform_practice_member_practice_id_foreign" foreign key ("practice_id") references "platform_practice" ("id") on delete cascade;`);
    this.addSql(`alter table "platform_practice_member" add constraint "platform_practice_member_account_id_foreign" foreign key ("account_id") references "auth"."account" ("id") on delete cascade;`);

    this.addSql(`alter table "backoffice"."reference_money_bank_partner" add constraint "reference_money_bank_partner_bank_1_id_foreign" foreign key ("bank_1_id") references "backoffice"."reference_money_bank" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "backoffice"."reference_money_bank_partner" add constraint "reference_money_bank_partner_bank_2_id_foreign" foreign key ("bank_2_id") references "backoffice"."reference_money_bank" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "backoffice"."reference_money_fixed_cost_preset_audience" add constraint "reference_money_fixed_cost_preset_audience_fixed_a941d_foreign" foreign key ("fixed_cost_preset_id") references "backoffice"."reference_money_fixed_cost_preset" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "backoffice"."reference_money_fixed_cost_preset_audience" add constraint "reference_money_fixed_cost_preset_audience_audience_id_foreign" foreign key ("audience_id") references "backoffice"."reference_money_audience" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "backoffice"."reference_money_merchant_preset_market" add constraint "reference_money_merchant_preset_market_merchant__5b39e_foreign" foreign key ("merchant_preset_id") references "backoffice"."reference_money_merchant_preset" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "backoffice"."reference_money_merchant_preset_market" add constraint "reference_money_merchant_preset_market_market_id_foreign" foreign key ("market_id") references "backoffice"."reference_money_market" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "money_sort_rule" add constraint "money_sort_rule_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on delete cascade;`);
    this.addSql(`alter table "money_sort_rule" add constraint "money_sort_rule_jar_id_foreign" foreign key ("jar_id") references "money_jar" ("id") on delete cascade;`);
    this.addSql(`alter table "money_sort_rule" add constraint "money_sort_rule_category_id_foreign" foreign key ("category_id") references "money_category" ("id") on delete set null;`);

    this.addSql(`alter table "money_transaction" add constraint "money_transaction_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on delete cascade;`);
    this.addSql(`alter table "money_transaction" add constraint "money_transaction_account_id_foreign" foreign key ("account_id") references "money_bank_account" ("id") on delete set null;`);
    this.addSql(`alter table "money_transaction" add constraint "money_transaction_jar_id_foreign" foreign key ("jar_id") references "money_jar" ("id") on delete set null;`);
    this.addSql(`alter table "money_transaction" add constraint "money_transaction_category_id_foreign" foreign key ("category_id") references "money_category" ("id") on delete set null;`);
    this.addSql(`alter table "money_transaction" add constraint "money_transaction_debt_id_foreign" foreign key ("debt_id") references "money_debt" ("id") on delete set null;`);
    this.addSql(`alter table "money_transaction" add constraint "money_transaction_fixed_cost_id_foreign" foreign key ("fixed_cost_id") references "money_fixed_cost" ("id") on delete set null;`);
    this.addSql(`alter table "money_transaction" add constraint "money_transaction_applied_rule_id_foreign" foreign key ("applied_rule_id") references "money_sort_rule" ("id") on delete set null;`);
    this.addSql(`alter table "money_transaction" add constraint "money_transaction_party_id_foreign" foreign key ("party_id") references "money_party" ("id") on delete set null;`);
    this.addSql(`alter table "money_transaction" add constraint "money_transaction_merchant_key_foreign" foreign key ("merchant_key") references "backoffice"."reference_money_merchant_preset" ("key") on update cascade on delete set null;`);
    this.addSql(`alter table "money_transaction" add constraint "money_transaction_inflow_key_foreign" foreign key ("inflow_key") references "backoffice"."reference_money_transaction_in_preset" ("key") on update cascade on delete set null;`);
    this.addSql(`alter table "money_transaction" add constraint "money_transaction_applied_merchant_key_foreign" foreign key ("applied_merchant_key") references "backoffice"."reference_money_merchant_preset" ("key") on update cascade on delete set null;`);

    this.addSql(`alter table "money_fixed_cost_settlement" add constraint "money_fixed_cost_settlement_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on delete cascade;`);
    this.addSql(`alter table "money_fixed_cost_settlement" add constraint "money_fixed_cost_settlement_fixed_cost_id_foreign" foreign key ("fixed_cost_id") references "money_fixed_cost" ("id") on delete cascade;`);
    this.addSql(`alter table "money_fixed_cost_settlement" add constraint "money_fixed_cost_settlement_transaction_id_foreign" foreign key ("transaction_id") references "money_transaction" ("id") on delete set null;`);

    this.addSql(`alter table "backoffice"."reference_growth_watch_preset" add constraint "reference_growth_watch_preset_merchant_id_foreign" foreign key ("merchant_id") references "backoffice"."reference_money_merchant_preset" ("id") on delete set null;`);

    this.addSql(`alter table "backoffice"."reference_growth_lever_preset" add constraint "reference_growth_lever_preset_min_wealth_stage_id_foreign" foreign key ("min_wealth_stage_id") references "backoffice"."reference_growth_wealth_stage" ("id") on delete restrict;`);

    this.addSql(`alter table "backoffice"."reference_growth_lever_preset_income_posture" add constraint "reference_growth_lever_preset_income_posture_lev_b8b05_foreign" foreign key ("lever_preset_id") references "backoffice"."reference_growth_lever_preset" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "backoffice"."reference_growth_lever_preset_income_posture" add constraint "reference_growth_lever_preset_income_posture_inc_7be45_foreign" foreign key ("income_posture_id") references "backoffice"."reference_growth_income_posture" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "money_week_check_allocation" add constraint "money_week_check_allocation_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on delete cascade;`);
    this.addSql(`alter table "money_week_check_allocation" add constraint "money_week_check_allocation_week_check_id_foreign" foreign key ("week_check_id") references "money_week_check" ("id") on delete cascade;`);
    this.addSql(`alter table "money_week_check_allocation" add constraint "money_week_check_allocation_jar_id_foreign" foreign key ("jar_id") references "money_jar" ("id") on delete cascade;`);
  }

}
