import { Migration } from '@mikro-orm/migrations';

export class Migration20260922112448_InitialSchema extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create schema if not exists "backoffice";`);
    this.addSql(`create schema if not exists "auth";`);
    this.addSql(`create type "auth_locale" as enum ('EN', 'NL', 'ES', 'FR');`);
    this.addSql(`create type "auth_theme" as enum ('LIGHT', 'DARK', 'SYSTEM');`);
    this.addSql(`create type "money_spending_style" as enum ('SPENDER', 'SAVER', 'BALANCED', 'UNKNOWN');`);
    this.addSql(`create type "money_account_kind" as enum ('CHECKING', 'SAVINGS', 'CREDIT', 'CASH', 'INVESTMENT');`);
    this.addSql(`create type "backoffice_plan_key" as enum ('BASIC', 'PLUS', 'MAX');`);
    this.addSql(`create type "platform_coach_kind" as enum ('NUDGE', 'WIN', 'WARNING', 'INSIGHT', 'WEEK_CHECK');`);
    this.addSql(`create type "money_debt_kind" as enum ('CREDIT_CARD', 'LOAN', 'STUDENT', 'MORTGAGE', 'FAMILY', 'OTHER');`);
    this.addSql(`create type "money_debt_schedule_kind" as enum ('OPEN', 'TERM', 'DEADLINE');`);
    this.addSql(`create type "money_cadence" as enum ('WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'ONCE');`);
    this.addSql(`create type "energy_metric" as enum ('SLEEP', 'TRAIN', 'FOOD', 'MIND');`);
    this.addSql(`create type "platform_household_kind" as enum ('FAMILY', 'PARTNERS', 'FRIENDS', 'SOLO');`);
    this.addSql(`create type "platform_currency" as enum ('EUR', 'USD', 'GBP');`);
    this.addSql(`create type "money_income_kind" as enum ('SALARY', 'FREELANCE', 'BENEFIT', 'RENTAL', 'DIVIDEND', 'OTHER');`);
    this.addSql(`create type "money_jar_key" as enum ('NECESSITIES', 'FINANCIAL_FREEDOM', 'EDUCATION', 'LONG_TERM_SAVINGS', 'PLAY', 'GIVE');`);
    this.addSql(`create type "money_goal_kind" as enum ('SAVE', 'EARN', 'GIVE');`);
    this.addSql(`create type "money_goal_status" as enum ('ACTIVE', 'REACHED', 'PAUSED', 'ARCHIVED');`);
    this.addSql(`create type "money_giving_cause" as enum ('GLOBAL_HEALTH', 'POVERTY', 'EDUCATION', 'CLIMATE', 'ANIMALS', 'COMMUNITY', 'EMERGENCY', 'WATER');`);
    this.addSql(`create type "money_flow_direction" as enum ('IN', 'OUT');`);
    this.addSql(`create type "growth_learn_progress_status" as enum ('QUEUE', 'NOW', 'DONE');`);
    this.addSql(`create type "money_merchant_highlight" as enum ('FEATURED', 'NEW', 'POPULAR');`);
    this.addSql(`create type "money_week_check_stage" as enum ('LOOK', 'REDIRECT', 'INTEND', 'DONE');`);
    this.addSql(`create type "money_month_score_event_kind" as enum ('JAR_HELD', 'JAR_OVERSPENT', 'INBOX_CLEARED', 'WEEK_CHECK_DONE', 'GOAL_REACHED', 'DEBT_CLEARED', 'INCOME_LOGGED', 'STREAK_KEPT');`);
    this.addSql(`create type "backoffice_capability_kind" as enum ('screen', 'action');`);
    this.addSql(`create type "money_rule_field" as enum ('DESCRIPTION', 'COUNTERPARTY', 'AMOUNT');`);
    this.addSql(`create type "money_rule_matcher" as enum ('CONTAINS', 'EQUALS', 'STARTS_WITH', 'REGEX');`);
    this.addSql(`create type "energy_time_category" as enum ('SLEEP', 'PERSONAL_CARE', 'PAID_WORK', 'STUDY', 'HOUSEHOLD_CARE', 'FAMILY_CARE', 'VOLUNTEERING', 'SOCIAL', 'EXERCISE', 'HOBBIES', 'SCREEN', 'STILLNESS', 'TRAVEL', 'FREE_OTHER');`);
    this.addSql(`create type "energy_time_day_kind" as enum ('WORKDAY', 'DAY_OFF');`);
    this.addSql(`create type "money_transaction_status" as enum ('INBOX', 'SORTED', 'IGNORED');`);
    this.addSql(`create type "money_transaction_source" as enum ('MANUAL', 'CSV', 'BANK', 'RECURRING');`);
    this.addSql(`create type "money_fixed_cost_settlement_status" as enum ('PAID', 'SKIPPED');`);
    this.addSql(`create type "money_fixed_cost_settlement_source" as enum ('MATCHED', 'MARK_PAID', 'SKIP', 'LINKED');`);
    this.addSql(`create type "growth_learn_watch_kind" as enum ('FILM', 'VIDEO', 'SERIES');`);
    this.addSql(`create table "backoffice"."reference_growth_asset_kind" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "key" varchar(64) not null, "name" varchar(120) not null, "sort_order" int not null default 0, "is_active" boolean not null default true, "description" text null, "can_pay" boolean not null default false, "icon" varchar(8) null, constraint "reference_growth_asset_kind_pkey" primary key ("id"));`);
    this.addSql(`alter table "backoffice"."reference_growth_asset_kind" add constraint "reference_growth_asset_kind_key_unique" unique ("key");`);

    this.addSql(`create table "backoffice"."reference_growth_asset_preset" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "key" varchar(64) not null, "name" varchar(120) not null, "sort_order" int not null default 0, "is_active" boolean not null default true, "description" text null, "kind_id" uuid not null, constraint "reference_growth_asset_preset_pkey" primary key ("id"));`);
    this.addSql(`create index "reference_growth_asset_preset_kind_id_index" on "backoffice"."reference_growth_asset_preset" ("kind_id");`);
    this.addSql(`alter table "backoffice"."reference_growth_asset_preset" add constraint "reference_growth_asset_preset_key_unique" unique ("key");`);

    this.addSql(`create table "backoffice"."reference_money_audience" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "key" varchar(64) not null, "name" varchar(120) not null, "sort_order" int not null default 0, "is_active" boolean not null default true, "description" text null, "is_baseline" boolean not null default false, "accent_color" varchar(64) null, "soft_color" varchar(64) null, "icon" varchar(8) null, constraint "reference_money_audience_pkey" primary key ("id"));`);
    this.addSql(`alter table "backoffice"."reference_money_audience" add constraint "reference_money_audience_key_unique" unique ("key");`);

    this.addSql(`create table "auth"."household" ("id" uuid not null, "name" text not null, "slug" text not null, "logo" text null, "created_at" timestamptz not null, "metadata" text null, constraint "household_pkey" primary key ("id"));`);
    this.addSql(`alter table "auth"."household" add constraint "household_slug_unique" unique ("slug");`);

    this.addSql(`create table "growth_asset" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_id" uuid not null, "name" varchar(120) not null, "kind_key" varchar(64) not null, "preset_key" varchar(64) null, "value" bigint not null, "flow" bigint not null default 0, constraint "growth_asset_pkey" primary key ("id"));`);
    this.addSql(`create index "growth_asset_household_id_index" on "growth_asset" ("household_id");`);

    this.addSql(`create table "auth"."user" ("id" uuid not null, "name" text not null, "email" text not null, "email_verified" boolean not null, "image" text null, "created_at" timestamptz not null default CURRENT_TIMESTAMP, "updated_at" timestamptz not null default CURRENT_TIMESTAMP, "two_factor_enabled" boolean null, constraint "user_pkey" primary key ("id"));`);
    this.addSql(`alter table "auth"."user" add constraint "user_email_unique" unique ("email");`);

    this.addSql(`create table "auth"."two_factor" ("id" uuid not null, "secret" text not null, "backup_codes" text not null, "user_id" uuid not null, "verified" boolean null, "failed_verification_count" int null, "locked_until" timestamptz null, constraint "two_factor_pkey" primary key ("id"));`);

    this.addSql(`create table "auth"."session" ("id" uuid not null, "expires_at" timestamptz not null, "token" text not null, "created_at" timestamptz not null default CURRENT_TIMESTAMP, "updated_at" timestamptz not null, "ip_address" text null, "user_agent" text null, "user_id" uuid not null, "active_household_id" uuid null, constraint "session_pkey" primary key ("id"));`);
    this.addSql(`alter table "auth"."session" add constraint "session_token_unique" unique ("token");`);

    this.addSql(`create table "auth"."provider" ("id" uuid not null, "issuer" text not null, "account_id" text not null, "provider_id" text not null, "user_id" uuid not null, "access_token" text null, "refresh_token" text null, "id_token" text null, "access_token_expires_at" timestamptz null, "refresh_token_expires_at" timestamptz null, "scope" text null, "password" text null, "created_at" timestamptz not null default CURRENT_TIMESTAMP, "updated_at" timestamptz not null, constraint "provider_pkey" primary key ("id"));`);

    this.addSql(`create table "auth"."member" ("id" uuid not null, "household_id" uuid not null, "user_id" uuid not null, "role" text not null, "created_at" timestamptz not null, constraint "member_pkey" primary key ("id"));`);

    this.addSql(`create table "auth"."invitation" ("id" uuid not null, "household_id" uuid not null, "email" text not null, "role" text null, "status" text not null, "expires_at" timestamptz not null, "created_at" timestamptz not null default CURRENT_TIMESTAMP, "inviter_id" uuid not null, constraint "invitation_pkey" primary key ("id"));`);

    this.addSql(`create table "auth"."account" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "first_name" varchar(80) null, "last_name" varchar(80) null, "middle_name" varchar(80) null, "phone" varchar(32) null, "date_of_birth" date null, "user_id" uuid not null, constraint "account_pkey" primary key ("id"));`);
    this.addSql(`alter table "auth"."account" add constraint "account_user_id_unique" unique ("user_id");`);

    this.addSql(`create table "auth"."account_settings" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "tour" jsonb not null, "onboarded_at" timestamptz null, "locale" "public"."auth_locale" not null default 'NL', "theme" "public"."auth_theme" not null default 'LIGHT', "spending_style" "public"."money_spending_style" not null default 'UNKNOWN', "account_id" uuid not null, constraint "account_settings_pkey" primary key ("id"));`);
    this.addSql(`alter table "auth"."account_settings" add constraint "account_settings_account_id_unique" unique ("account_id");`);

    this.addSql(`create table "auth"."verification" ("id" uuid not null, "identifier" text not null, "value" text not null, "expires_at" timestamptz not null, "created_at" timestamptz not null default CURRENT_TIMESTAMP, "updated_at" timestamptz not null default CURRENT_TIMESTAMP, constraint "verification_pkey" primary key ("id"));`);

    this.addSql(`create table "money_bank_account" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_id" uuid not null, "name" varchar(120) not null, "iban" varchar(34) null, "balance" bigint not null default 0, "connection_id" uuid null, "last_synced_at" timestamptz null, "kind" "public"."money_account_kind" not null default 'CHECKING', constraint "money_bank_account_pkey" primary key ("id"));`);
    this.addSql(`create index "money_bank_account_household_id_index" on "money_bank_account" ("household_id");`);
    this.addSql(`alter table "money_bank_account" add constraint "money_bank_account_household_id_iban_unique" unique ("household_id", "iban");`);

    this.addSql(`create table "backoffice"."reference_growth_book_preset" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "key" varchar(64) not null, "name" varchar(120) not null, "sort_order" int not null default 0, "is_active" boolean not null default true, "description" text not null, "author" varchar(120) not null, "skill" varchar(64) not null default 'MONEY', "topic" varchar(64) not null, "cover_id" int null, "isbn13" varchar(13) null, "spending_styles" jsonb not null default '[]', "url" varchar(280) not null, "min_plan" "public"."backoffice_plan_key" not null, constraint "reference_growth_book_preset_pkey" primary key ("id"));`);
    this.addSql(`alter table "backoffice"."reference_growth_book_preset" add constraint "reference_growth_book_preset_key_unique" unique ("key");`);

    this.addSql(`create table "platform_coach_message" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_id" uuid not null, "key" varchar(80) null, "period" varchar(7) not null, "text" text not null, "cta_label" varchar(60) null, "cta_href" varchar(200) null, "dismissed_at" timestamptz null, "kind" "public"."platform_coach_kind" not null default 'NUDGE', "account_id" uuid null, constraint "platform_coach_message_pkey" primary key ("id"));`);
    this.addSql(`create index "platform_coach_message_household_id_index" on "platform_coach_message" ("household_id");`);
    this.addSql(`create index "platform_coach_message_household_id_account_id_key_index" on "platform_coach_message" ("household_id", "account_id", "key");`);
    this.addSql(`create index "platform_coach_message_household_id_period_index" on "platform_coach_message" ("household_id", "period");`);

    this.addSql(`create table "money_debt" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_id" uuid not null, "name" varchar(120) not null, "balance" bigint not null, "original_balance" bigint not null, "interest_rate" numeric(5,2) not null default 0.00, "minimum_payment" bigint not null default 0, "extra_payment" bigint not null default 0, "term_payments" smallint null, "due_day" smallint null, "started_on" date null, "maturity_on" date null, "closed_on" date null, "kind" "public"."money_debt_kind" not null default 'LOAN', "schedule_kind" "public"."money_debt_schedule_kind" not null default 'OPEN', "payment_cadence" "public"."money_cadence" not null default 'MONTHLY', constraint "money_debt_pkey" primary key ("id"));`);
    this.addSql(`create index "money_debt_household_id_index" on "money_debt" ("household_id");`);

    this.addSql(`create table "backoffice"."reference_money_debt_preset" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "key" varchar(64) not null, "name" varchar(120) not null, "sort_order" int not null default 0, "is_active" boolean not null default true, "icon" varchar(8) null, "kind" "public"."money_debt_kind" not null, constraint "reference_money_debt_preset_pkey" primary key ("id"));`);
    this.addSql(`alter table "backoffice"."reference_money_debt_preset" add constraint "reference_money_debt_preset_key_unique" unique ("key");`);

    this.addSql(`create table "energy_log" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_id" uuid not null, "note" varchar(280) null, "value" numeric(5,2) not null, "logged_on" date not null, "metric" "public"."energy_metric" not null, "account_id" uuid not null, constraint "energy_log_pkey" primary key ("id"));`);
    this.addSql(`create index "energy_log_household_id_index" on "energy_log" ("household_id");`);
    this.addSql(`create index "energy_log_household_id_logged_on_index" on "energy_log" ("household_id", "logged_on");`);
    this.addSql(`alter table "energy_log" add constraint "energy_log_account_id_logged_on_metric_unique" unique ("account_id", "logged_on", "metric");`);

    this.addSql(`create table "energy_week_check" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_id" uuid not null, "week" varchar(8) not null, "completed_at" timestamptz null, constraint "energy_week_check_pkey" primary key ("id"));`);
    this.addSql(`create index "energy_week_check_household_id_index" on "energy_week_check" ("household_id");`);
    this.addSql(`alter table "energy_week_check" add constraint "energy_week_check_household_id_week_unique" unique ("household_id", "week");`);

    this.addSql(`create table "backoffice"."reference_money_giving_organisation" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "key" varchar(64) not null, "name" varchar(120) not null, "sort_order" int not null default 0, "is_active" boolean not null default true, "description" text not null, "country" varchar(2) null, "scope" varchar(64) null, "reporting" text null, "causes" jsonb not null default '[]', "signals" jsonb not null default '[]', "website" text not null, constraint "reference_money_giving_organisation_pkey" primary key ("id"));`);
    this.addSql(`alter table "backoffice"."reference_money_giving_organisation" add constraint "reference_money_giving_organisation_key_unique" unique ("key");`);

    this.addSql(`create table "soul_gratitude" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_id" uuid not null, "week" varchar(8) not null, "text" varchar(280) not null, "account_id" uuid not null, constraint "soul_gratitude_pkey" primary key ("id"));`);
    this.addSql(`create index "soul_gratitude_household_id_index" on "soul_gratitude" ("household_id");`);
    this.addSql(`create index "soul_gratitude_household_id_week_index" on "soul_gratitude" ("household_id", "week");`);

    this.addSql(`create table "growth_week_check" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_id" uuid not null, "week" varchar(8) not null, "completed_at" timestamptz null, constraint "growth_week_check_pkey" primary key ("id"));`);
    this.addSql(`create index "growth_week_check_household_id_index" on "growth_week_check" ("household_id");`);
    this.addSql(`alter table "growth_week_check" add constraint "growth_week_check_household_id_week_unique" unique ("household_id", "week");`);

    this.addSql(`create table "auth"."household_billing" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_id" uuid not null, "stripe_customer_id" varchar(255) null, "stripe_subscription_id" varchar(255) null, "will_cancel_at_period_end" boolean not null default false, "period_started_at" timestamptz null, "period_ends_at" timestamptz null, "trial_ends_at" timestamptz null, "scheduled_plan_key" "public"."backoffice_plan_key" null, "plan_key" "public"."backoffice_plan_key" not null default 'BASIC', constraint "household_billing_pkey" primary key ("id"));`);
    this.addSql(`create index "household_billing_household_id_index" on "auth"."household_billing" ("household_id");`);
    this.addSql(`create index "household_billing_stripe_customer_id_index" on "auth"."household_billing" ("stripe_customer_id");`);
    this.addSql(`alter table "auth"."household_billing" add constraint "household_billing_stripe_subscription_id_unique" unique ("stripe_subscription_id");`);
    this.addSql(`alter table "auth"."household_billing" add constraint "household_billing_household_id_unique" unique ("household_id");`);

    this.addSql(`create table "auth"."household_settings" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_id" uuid not null, "why" text null, "money" jsonb not null, "week_check" jsonb not null, "features" jsonb not null, "answers" jsonb not null, "onboarded_at" timestamptz null, "kind" "public"."platform_household_kind" not null default 'SOLO', "currency" "public"."platform_currency" not null default 'EUR', constraint "household_settings_pkey" primary key ("id"));`);
    this.addSql(`create index "household_settings_household_id_index" on "auth"."household_settings" ("household_id");`);
    this.addSql(`alter table "auth"."household_settings" add constraint "household_settings_household_id_unique" unique ("household_id");`);

    this.addSql(`create table "growth_income_lever" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_id" uuid not null, "name" varchar(160) not null, "note" text null, "potential_monthly" bigint not null default 0, "is_done" boolean not null default false, constraint "growth_income_lever_pkey" primary key ("id"));`);
    this.addSql(`create index "growth_income_lever_household_id_index" on "growth_income_lever" ("household_id");`);

    this.addSql(`create table "growth_income_milestone" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_id" uuid not null, "name" varchar(160) not null, "target_monthly" bigint not null, "reached_on" date null, constraint "growth_income_milestone_pkey" primary key ("id"));`);
    this.addSql(`create index "growth_income_milestone_household_id_index" on "growth_income_milestone" ("household_id");`);

    this.addSql(`create table "backoffice"."reference_growth_income_posture" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "key" varchar(64) not null, "name" varchar(120) not null, "sort_order" int not null default 0, "is_active" boolean not null default true, "description" text null, constraint "reference_growth_income_posture_pkey" primary key ("id"));`);
    this.addSql(`alter table "backoffice"."reference_growth_income_posture" add constraint "reference_growth_income_posture_key_unique" unique ("key");`);

    this.addSql(`create table "money_income_source" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_id" uuid not null, "name" varchar(120) not null, "amount" bigint not null, "is_active" boolean not null default true, "expected_day" smallint null, "started_on" date null, "kind" "public"."money_income_kind" not null default 'SALARY', "cadence" "public"."money_cadence" not null default 'MONTHLY', constraint "money_income_source_pkey" primary key ("id"));`);
    this.addSql(`create index "money_income_source_household_id_index" on "money_income_source" ("household_id");`);

    this.addSql(`create table "money_income_amount_period" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_id" uuid not null, "amount" bigint not null, "effective_on" date not null, "income_source_id" uuid not null, constraint "money_income_amount_period_pkey" primary key ("id"));`);
    this.addSql(`create index "money_income_amount_period_household_id_index" on "money_income_amount_period" ("household_id");`);
    this.addSql(`alter table "money_income_amount_period" add constraint "money_income_amount_period_income_source_id_effective_on_unique" unique ("income_source_id", "effective_on");`);

    this.addSql(`create table "backoffice"."reference_money_income_source_preset" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "key" varchar(64) not null, "name" varchar(120) not null, "sort_order" int not null default 0, "is_active" boolean not null default true, "icon" varchar(8) null, "kind" "public"."money_income_kind" not null, "cadence" "public"."money_cadence" not null default 'MONTHLY', constraint "reference_money_income_source_preset_pkey" primary key ("id"));`);
    this.addSql(`alter table "backoffice"."reference_money_income_source_preset" add constraint "reference_money_income_source_preset_key_unique" unique ("key");`);

    this.addSql(`create table "money_jar" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_id" uuid not null, "name" varchar(80) not null, "subtitle" varchar(160) null, "icon" varchar(8) null, "percentage" numeric(5,2) not null, "sort_order" int not null default 0, "capabilities" jsonb not null, "key" "public"."money_jar_key" not null, constraint "money_jar_pkey" primary key ("id"));`);
    this.addSql(`create index "money_jar_household_id_index" on "money_jar" ("household_id");`);
    this.addSql(`alter table "money_jar" add constraint "money_jar_household_id_key_unique" unique ("household_id", "key");`);

    this.addSql(`create table "money_goal" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_id" uuid not null, "name" varchar(120) not null, "why" text null, "icon" varchar(8) null, "target" bigint not null, "saved" bigint not null default 0, "monthly_contribution" bigint not null default 0, "sort_order" int not null default 0, "giving_organisation_key" varchar(64) null, "fulfilled_on" date null, "target_on" date null, "kind" "public"."money_goal_kind" not null default 'SAVE', "status" "public"."money_goal_status" not null default 'ACTIVE', "cause" "public"."money_giving_cause" null, "jar_id" uuid null, constraint "money_goal_pkey" primary key ("id"));`);
    this.addSql(`create index "money_goal_household_id_index" on "money_goal" ("household_id");`);
    this.addSql(`create index "money_goal_jar_id_index" on "money_goal" ("jar_id");`);

    this.addSql(`create table "money_category" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_id" uuid not null, "name" varchar(80) not null, "budgeted" bigint not null default 0, "sort_order" int not null default 0, "is_archived" boolean not null default false, "jar_id" uuid not null, constraint "money_category_pkey" primary key ("id"));`);
    this.addSql(`create index "money_category_household_id_index" on "money_category" ("household_id");`);
    this.addSql(`create index "money_category_jar_id_index" on "money_category" ("jar_id");`);
    this.addSql(`alter table "money_category" add constraint "money_category_household_id_jar_id_name_unique" unique ("household_id", "jar_id", "name");`);

    this.addSql(`create table "money_fixed_cost" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_id" uuid not null, "name" varchar(120) not null, "note" text null, "counterparty" varchar(160) null, "amount" bigint not null, "is_active" boolean not null default true, "due_day" smallint null, "ends_on" date null, "cadence" "public"."money_cadence" not null default 'MONTHLY', "direction" "public"."money_flow_direction" not null default 'OUT', "jar_id" uuid not null, "category_id" uuid null, "debt_id" uuid null, constraint "money_fixed_cost_pkey" primary key ("id"));`);
    this.addSql(`create index "money_fixed_cost_household_id_index" on "money_fixed_cost" ("household_id");`);
    this.addSql(`create index "money_fixed_cost_category_id_index" on "money_fixed_cost" ("category_id");`);
    this.addSql(`create index "money_fixed_cost_jar_id_index" on "money_fixed_cost" ("jar_id");`);
    this.addSql(`alter table "money_fixed_cost" add constraint "money_fixed_cost_debt_id_unique" unique ("debt_id");`);

    this.addSql(`create table "backoffice"."reference_money_jar_template" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "name" varchar(80) not null, "subtitle" varchar(160) null, "icon" varchar(8) null, "percentage" numeric(5,2) not null, "sort_order" int not null default 0, "guide" jsonb null, "capabilities" jsonb not null, "is_active" boolean not null default true, "key" "public"."money_jar_key" not null, constraint "reference_money_jar_template_pkey" primary key ("id"));`);
    this.addSql(`alter table "backoffice"."reference_money_jar_template" add constraint "reference_money_jar_template_key_unique" unique ("key");`);

    this.addSql(`create table "backoffice"."reference_money_category_template" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "key" varchar(64) not null, "name" varchar(120) not null, "sort_order" int not null default 0, "is_active" boolean not null default true, "icon" varchar(8) null, "jar_template_id" uuid not null, constraint "reference_money_category_template_pkey" primary key ("id"));`);
    this.addSql(`create index "reference_money_category_template_jar_template_id_index" on "backoffice"."reference_money_category_template" ("jar_template_id");`);
    this.addSql(`alter table "backoffice"."reference_money_category_template" add constraint "reference_money_category_template_key_unique" unique ("key");`);

    this.addSql(`create table "backoffice"."reference_money_goal_preset" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "key" varchar(64) not null, "name" varchar(120) not null, "sort_order" int not null default 0, "is_active" boolean not null default true, "icon" varchar(8) null, "jar_template_id" uuid not null, "category_template_id" uuid null, constraint "reference_money_goal_preset_pkey" primary key ("id"));`);
    this.addSql(`create index "reference_money_goal_preset_category_template_id_index" on "backoffice"."reference_money_goal_preset" ("category_template_id");`);
    this.addSql(`create index "reference_money_goal_preset_jar_template_id_index" on "backoffice"."reference_money_goal_preset" ("jar_template_id");`);
    this.addSql(`alter table "backoffice"."reference_money_goal_preset" add constraint "reference_money_goal_preset_key_unique" unique ("key");`);

    this.addSql(`create table "backoffice"."reference_money_fixed_cost_preset" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "key" varchar(64) not null, "name" varchar(120) not null, "sort_order" int not null default 0, "is_active" boolean not null default true, "due_day" smallint null, "cadence" "public"."money_cadence" not null default 'MONTHLY', "direction" "public"."money_flow_direction" not null default 'OUT', "jar_template_id" uuid not null, "category_template_id" uuid not null, constraint "reference_money_fixed_cost_preset_pkey" primary key ("id"));`);
    this.addSql(`create index "reference_money_fixed_cost_preset_category_template_id_index" on "backoffice"."reference_money_fixed_cost_preset" ("category_template_id");`);
    this.addSql(`create index "reference_money_fixed_cost_preset_jar_template_id_index" on "backoffice"."reference_money_fixed_cost_preset" ("jar_template_id");`);
    this.addSql(`alter table "backoffice"."reference_money_fixed_cost_preset" add constraint "reference_money_fixed_cost_preset_key_unique" unique ("key");`);

    this.addSql(`create table "growth_learn_book" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_id" uuid not null, "name" varchar(160) not null, "description" text not null, "author" varchar(120) not null, "skill" varchar(64) not null, "topic" varchar(64) not null, "cover_id" int null, "isbn13" varchar(13) null, "source_key" varchar(64) not null, "url" varchar(280) not null, "account_id" uuid not null, constraint "growth_learn_book_pkey" primary key ("id"));`);
    this.addSql(`create index "growth_learn_book_household_id_index" on "growth_learn_book" ("household_id");`);
    this.addSql(`alter table "growth_learn_book" add constraint "growth_learn_book_household_id_source_key_unique" unique ("household_id", "source_key");`);

    this.addSql(`create table "growth_learn_progress" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_id" uuid not null, "piece_key" varchar(64) not null, "skill" varchar(64) not null, "rank" int not null default 1, "due_on" date null, "status" "public"."growth_learn_progress_status" not null, "account_id" uuid not null, constraint "growth_learn_progress_pkey" primary key ("id"));`);
    this.addSql(`create index "growth_learn_progress_household_id_index" on "growth_learn_progress" ("household_id");`);
    this.addSql(`alter table "growth_learn_progress" add constraint "growth_learn_progress_household_id_account_id_piece_key_unique" unique ("household_id", "account_id", "piece_key");`);

    this.addSql(`create table "growth_learn_focus" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_id" uuid not null, "skill" varchar(64) not null, "account_id" uuid not null, constraint "growth_learn_focus_pkey" primary key ("id"));`);
    this.addSql(`create index "growth_learn_focus_household_id_index" on "growth_learn_focus" ("household_id");`);
    this.addSql(`alter table "growth_learn_focus" add constraint "growth_learn_focus_household_id_account_id_skill_unique" unique ("household_id", "account_id", "skill");`);

    this.addSql(`create table "backoffice"."reference_money_market" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "key" varchar(64) not null, "name" varchar(120) not null, "sort_order" int not null default 0, "is_active" boolean not null default true, constraint "reference_money_market_pkey" primary key ("id"));`);
    this.addSql(`alter table "backoffice"."reference_money_market" add constraint "reference_money_market_key_unique" unique ("key");`);

    this.addSql(`create table "backoffice"."reference_money_merchant_preset" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "key" varchar(64) not null, "name" varchar(120) not null, "sort_order" int not null default 0, "is_active" boolean not null default true, "highlight" "public"."money_merchant_highlight" null, "jar_template_id" uuid not null, "category_template_id" uuid not null, "giving_organisation_id" uuid null, constraint "reference_money_merchant_preset_pkey" primary key ("id"));`);
    this.addSql(`create index "reference_money_merchant_preset_giving_organisation_id_index" on "backoffice"."reference_money_merchant_preset" ("giving_organisation_id");`);
    this.addSql(`create index "reference_money_merchant_preset_category_template_id_index" on "backoffice"."reference_money_merchant_preset" ("category_template_id");`);
    this.addSql(`create index "reference_money_merchant_preset_jar_template_id_index" on "backoffice"."reference_money_merchant_preset" ("jar_template_id");`);
    this.addSql(`alter table "backoffice"."reference_money_merchant_preset" add constraint "reference_money_merchant_preset_key_unique" unique ("key");`);

    this.addSql(`create table "backoffice"."reference_money_merchant_matching" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "match_value" varchar(120) not null, "mcc" varchar(4) null, "match_priority" int not null default 0, "aliases" jsonb not null default '[]', "provider_ids" jsonb not null, "preset_id" uuid not null, constraint "reference_money_merchant_matching_pkey" primary key ("id"));`);
    this.addSql(`alter table "backoffice"."reference_money_merchant_matching" add constraint "reference_money_merchant_matching_preset_id_unique" unique ("preset_id");`);

    this.addSql(`create table "backoffice"."reference_money_merchant_branding" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "logo_domain" varchar(120) null, "website" varchar(240) null, "preset_id" uuid not null, constraint "reference_money_merchant_branding_pkey" primary key ("id"));`);
    this.addSql(`alter table "backoffice"."reference_money_merchant_branding" add constraint "reference_money_merchant_branding_preset_id_unique" unique ("preset_id");`);

    this.addSql(`create table "backoffice"."reference_money_merchant_banking" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "iban_bank_code" varchar(4) not null, "preset_id" uuid not null, constraint "reference_money_merchant_banking_pkey" primary key ("id"));`);
    this.addSql(`alter table "backoffice"."reference_money_merchant_banking" add constraint "reference_money_merchant_banking_preset_id_unique" unique ("preset_id");`);

    this.addSql(`create table "backoffice"."reference_money_fixed_cost_preset_merchant" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "sort_order" int not null default 0, "preset_id" uuid not null, "merchant_id" uuid not null, constraint "reference_money_fixed_cost_preset_merchant_pkey" primary key ("id"));`);
    this.addSql(`create index "reference_money_fixed_cost_preset_merchant_merchant_id_index" on "backoffice"."reference_money_fixed_cost_preset_merchant" ("merchant_id");`);
    this.addSql(`alter table "backoffice"."reference_money_fixed_cost_preset_merchant" add constraint "reference_money_fixed_cost_preset_merchant_preset_93892_unique" unique ("preset_id", "merchant_id");`);

    this.addSql(`create table "backoffice"."reference_money_debt_preset_merchant" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "sort_order" int not null default 0, "preset_id" uuid not null, "merchant_id" uuid not null, constraint "reference_money_debt_preset_merchant_pkey" primary key ("id"));`);
    this.addSql(`create index "reference_money_debt_preset_merchant_merchant_id_index" on "backoffice"."reference_money_debt_preset_merchant" ("merchant_id");`);
    this.addSql(`alter table "backoffice"."reference_money_debt_preset_merchant" add constraint "reference_money_debt_preset_merchant_preset_id_me_cfa0f_unique" unique ("preset_id", "merchant_id");`);

    this.addSql(`create table "money_week_check" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_id" uuid not null, "week" varchar(8) not null, "completed_at" timestamptz null, "surplus" bigint not null default 0, "intention" varchar(280) null, "stage" "public"."money_week_check_stage" not null default 'LOOK', constraint "money_week_check_pkey" primary key ("id"));`);
    this.addSql(`create index "money_week_check_household_id_index" on "money_week_check" ("household_id");`);
    this.addSql(`alter table "money_week_check" add constraint "money_week_check_household_id_week_unique" unique ("household_id", "week");`);

    this.addSql(`create table "money_month_score" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_id" uuid not null, "period" varchar(7) not null, "score" int not null default 0, "max_score" int not null default 0, "level" int not null default 1, "is_closed" boolean not null default false, "closed_at" timestamptz null, constraint "money_month_score_pkey" primary key ("id"));`);
    this.addSql(`create index "money_month_score_household_id_index" on "money_month_score" ("household_id");`);
    this.addSql(`alter table "money_month_score" add constraint "money_month_score_household_id_period_unique" unique ("household_id", "period");`);

    this.addSql(`create table "money_month_score_event" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_id" uuid not null, "text" varchar(240) not null, "points" int not null default 0, "occurred_on" date not null, "kind" "public"."money_month_score_event_kind" not null, "month_score_id" uuid not null, constraint "money_month_score_event_pkey" primary key ("id"));`);
    this.addSql(`create index "money_month_score_event_household_id_index" on "money_month_score_event" ("household_id");`);
    this.addSql(`create index "money_month_score_event_month_score_id_occurred_on_index" on "money_month_score_event" ("month_score_id", "occurred_on");`);

    this.addSql(`create table "backoffice"."plan" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "name" varchar(40) not null, "price_monthly" bigint not null default 0, "sort_order" int not null default 0, "is_active" boolean not null default true, "key" "public"."backoffice_plan_key" not null, constraint "plan_pkey" primary key ("id"));`);
    this.addSql(`alter table "backoffice"."plan" add constraint "plan_key_unique" unique ("key");`);

    this.addSql(`create table "backoffice"."plan_product" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "key" varchar(64) not null, "name" varchar(120) not null, "sort_order" int not null default 0, "is_active" boolean not null default true, constraint "plan_product_pkey" primary key ("id"));`);
    this.addSql(`alter table "backoffice"."plan_product" add constraint "plan_product_key_unique" unique ("key");`);

    this.addSql(`create table "backoffice"."plan_feature" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "key" varchar(64) not null, "name" varchar(120) not null, "sort_order" int not null default 0, "is_active" boolean not null default true, "description" text not null, "product_id" uuid not null, constraint "plan_feature_pkey" primary key ("id"));`);
    this.addSql(`create index "plan_feature_product_id_index" on "backoffice"."plan_feature" ("product_id");`);
    this.addSql(`alter table "backoffice"."plan_feature" add constraint "plan_feature_product_id_key_unique" unique ("product_id", "key");`);

    this.addSql(`create table "backoffice"."plan_capability" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "key" varchar(64) not null, "name" varchar(120) not null, "sort_order" int not null default 0, "is_active" boolean not null default true, "description" text not null, "kind" "public"."backoffice_capability_kind" not null, "feature_id" uuid not null, constraint "plan_capability_pkey" primary key ("id"));`);
    this.addSql(`create index "plan_capability_feature_id_index" on "backoffice"."plan_capability" ("feature_id");`);
    this.addSql(`alter table "backoffice"."plan_capability" add constraint "plan_capability_key_unique" unique ("key");`);

    this.addSql(`create table "backoffice"."plan_capability_grant" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "plan_id" uuid not null, "capability_id" uuid not null, constraint "plan_capability_grant_pkey" primary key ("id"));`);
    this.addSql(`create index "plan_capability_grant_capability_id_index" on "backoffice"."plan_capability_grant" ("capability_id");`);
    this.addSql(`alter table "backoffice"."plan_capability_grant" add constraint "plan_capability_grant_plan_id_capability_id_unique" unique ("plan_id", "capability_id");`);

    this.addSql(`create table "backoffice"."reference_money_fixed_cost_preset_audience" ("fixed_cost_preset_id" uuid not null, "audience_id" uuid not null, constraint "reference_money_fixed_cost_preset_audience_pkey" primary key ("fixed_cost_preset_id", "audience_id"));`);

    this.addSql(`create table "backoffice"."reference_money_merchant_preset_market" ("merchant_preset_id" uuid not null, "market_id" uuid not null, constraint "reference_money_merchant_preset_market_pkey" primary key ("merchant_preset_id", "market_id"));`);

    this.addSql(`create table "money_sort_rule" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_id" uuid not null, "match_value" varchar(200) not null, "priority" int not null default 100, "hit_count" int not null default 0, "is_active" boolean not null default true, "field" "public"."money_rule_field" not null default 'DESCRIPTION', "matcher" "public"."money_rule_matcher" not null default 'CONTAINS', "jar_id" uuid not null, "category_id" uuid null, constraint "money_sort_rule_pkey" primary key ("id"));`);
    this.addSql(`create index "money_sort_rule_household_id_index" on "money_sort_rule" ("household_id");`);
    this.addSql(`create index "money_sort_rule_category_id_index" on "money_sort_rule" ("category_id");`);
    this.addSql(`create index "money_sort_rule_jar_id_index" on "money_sort_rule" ("jar_id");`);

    this.addSql(`create table "soul_week_check" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_id" uuid not null, "week" varchar(8) not null, "completed_at" timestamptz null, constraint "soul_week_check_pkey" primary key ("id"));`);
    this.addSql(`create index "soul_week_check_household_id_index" on "soul_week_check" ("household_id");`);
    this.addSql(`alter table "soul_week_check" add constraint "soul_week_check_household_id_week_unique" unique ("household_id", "week");`);

    this.addSql(`create table "energy_time_entry" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_id" uuid not null, "note" varchar(280) null, "minutes" smallint not null, "logged_on" date not null, "category" "public"."energy_time_category" not null, "account_id" uuid not null, constraint "energy_time_entry_pkey" primary key ("id"));`);
    this.addSql(`create index "energy_time_entry_household_id_index" on "energy_time_entry" ("household_id");`);
    this.addSql(`create index "energy_time_entry_household_id_logged_on_index" on "energy_time_entry" ("household_id", "logged_on");`);
    this.addSql(`alter table "energy_time_entry" add constraint "energy_time_entry_account_id_logged_on_category_unique" unique ("account_id", "logged_on", "category");`);

    this.addSql(`create table "energy_time_template" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_id" uuid not null, "weekdays" jsonb not null, "minutes" jsonb not null, "kind" "public"."energy_time_day_kind" not null, "account_id" uuid not null, constraint "energy_time_template_pkey" primary key ("id"));`);
    this.addSql(`create index "energy_time_template_household_id_index" on "energy_time_template" ("household_id");`);
    this.addSql(`alter table "energy_time_template" add constraint "energy_time_template_account_id_kind_unique" unique ("account_id", "kind");`);

    this.addSql(`create table "money_transaction" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_id" uuid not null, "description" varchar(280) not null, "note" text null, "counterparty" varchar(160) null, "amount" bigint not null, "inflow_key" varchar(64) null, "applied_merchant_key" varchar(64) null, "dedupe_key" varchar(64) null, "booked_on" date not null, "status" "public"."money_transaction_status" not null default 'INBOX', "source" "public"."money_transaction_source" not null default 'MANUAL', "account_id" uuid null, "jar_id" uuid null, "category_id" uuid null, "debt_id" uuid null, "fixed_cost_id" uuid null, "applied_rule_id" uuid null, constraint "money_transaction_pkey" primary key ("id"));`);
    this.addSql(`create index "money_transaction_household_id_index" on "money_transaction" ("household_id");`);
    this.addSql(`create index "money_transaction_applied_rule_id_index" on "money_transaction" ("applied_rule_id");`);
    this.addSql(`create index "money_transaction_fixed_cost_id_index" on "money_transaction" ("fixed_cost_id");`);
    this.addSql(`create index "money_transaction_debt_id_index" on "money_transaction" ("debt_id");`);
    this.addSql(`create index "money_transaction_category_id_index" on "money_transaction" ("category_id");`);
    this.addSql(`create index "money_transaction_jar_id_index" on "money_transaction" ("jar_id");`);
    this.addSql(`create index "money_transaction_account_id_index" on "money_transaction" ("account_id");`);
    this.addSql(`create index "money_transaction_household_id_status_index" on "money_transaction" ("household_id", "status");`);
    this.addSql(`create index "money_transaction_household_id_booked_on_index" on "money_transaction" ("household_id", "booked_on");`);
    this.addSql(`alter table "money_transaction" add constraint "money_transaction_household_id_dedupe_key_unique" unique ("household_id", "dedupe_key");`);

    this.addSql(`create table "money_fixed_cost_settlement" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_id" uuid not null, "period" varchar(7) not null, "note" text null, "amount" bigint null, "paid_at" timestamptz null, "status" "public"."money_fixed_cost_settlement_status" not null default 'PAID', "source" "public"."money_fixed_cost_settlement_source" not null default 'MARK_PAID', "fixed_cost_id" uuid not null, "transaction_id" uuid null, constraint "money_fixed_cost_settlement_pkey" primary key ("id"));`);
    this.addSql(`create index "money_fixed_cost_settlement_household_id_index" on "money_fixed_cost_settlement" ("household_id");`);
    this.addSql(`create index "money_fixed_cost_settlement_transaction_id_index" on "money_fixed_cost_settlement" ("transaction_id");`);
    this.addSql(`create index "money_fixed_cost_settlement_period_index" on "money_fixed_cost_settlement" ("period");`);
    this.addSql(`alter table "money_fixed_cost_settlement" add constraint "money_fixed_cost_settlement_fixed_cost_id_period_unique" unique ("fixed_cost_id", "period");`);

    this.addSql(`create table "backoffice"."reference_money_transaction_in_preset" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "key" varchar(64) not null, "name" varchar(120) not null, "sort_order" int not null default 0, "is_active" boolean not null default true, "group_name" varchar(64) not null, "icon" varchar(8) null, "jar_key" "public"."money_jar_key" null, constraint "reference_money_transaction_in_preset_pkey" primary key ("id"));`);
    this.addSql(`alter table "backoffice"."reference_money_transaction_in_preset" add constraint "reference_money_transaction_in_preset_key_unique" unique ("key");`);

    this.addSql(`create table "backoffice"."reference_translation" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "entity_type" varchar(50) not null, "field_name" varchar(50) not null, "entity_key" varchar(80) not null, "locale" varchar(8) not null, "text" text not null, constraint "reference_translation_pkey" primary key ("id"));`);
    this.addSql(`create index "reference_translation_entity_key_index" on "backoffice"."reference_translation" ("entity_key");`);
    this.addSql(`create index "reference_translation_entity_type_locale_index" on "backoffice"."reference_translation" ("entity_type", "locale");`);
    this.addSql(`alter table "backoffice"."reference_translation" add constraint "reference_translation_entity_type_entity_key_fiel_d7253_unique" unique ("entity_type", "entity_key", "field_name", "locale");`);

    this.addSql(`create table "backoffice"."reference_growth_watch_preset" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "key" varchar(64) not null, "name" varchar(120) not null, "sort_order" int not null default 0, "is_active" boolean not null default true, "description" text not null, "creator" varchar(120) not null, "skill" varchar(64) not null default 'MONEY', "topic" varchar(64) not null, "youtube_id" varchar(16) null, "spending_styles" jsonb not null default '[]', "url" varchar(280) not null, "watch_url" varchar(280) null, "format" "public"."growth_learn_watch_kind" not null, "min_plan" "public"."backoffice_plan_key" not null, constraint "reference_growth_watch_preset_pkey" primary key ("id"));`);
    this.addSql(`alter table "backoffice"."reference_growth_watch_preset" add constraint "reference_growth_watch_preset_key_unique" unique ("key");`);

    this.addSql(`create table "backoffice"."reference_growth_wealth_stage" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "key" varchar(64) not null, "name" varchar(120) not null, "sort_order" int not null default 0, "is_active" boolean not null default true, "description" text null, "min_net_worth" bigint null, "badge_label" varchar(64) null, constraint "reference_growth_wealth_stage_pkey" primary key ("id"));`);
    this.addSql(`alter table "backoffice"."reference_growth_wealth_stage" add constraint "reference_growth_wealth_stage_key_unique" unique ("key");`);

    this.addSql(`create table "backoffice"."reference_growth_lever_preset" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "key" varchar(64) not null, "name" varchar(120) not null, "sort_order" int not null default 0, "is_active" boolean not null default true, "description" text not null, "spending_styles" jsonb not null default '[]', "accent_color" varchar(64) not null, "min_wealth_stage_id" uuid not null, constraint "reference_growth_lever_preset_pkey" primary key ("id"));`);
    this.addSql(`create index "reference_growth_lever_preset_min_wealth_stage_id_index" on "backoffice"."reference_growth_lever_preset" ("min_wealth_stage_id");`);
    this.addSql(`alter table "backoffice"."reference_growth_lever_preset" add constraint "reference_growth_lever_preset_key_unique" unique ("key");`);

    this.addSql(`create table "backoffice"."reference_growth_lever_preset_income_posture" ("lever_preset_id" uuid not null, "income_posture_id" uuid not null, constraint "reference_growth_lever_preset_income_posture_pkey" primary key ("lever_preset_id", "income_posture_id"));`);

    this.addSql(`create table "money_week_check_allocation" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_id" uuid not null, "amount" bigint not null, "week_check_id" uuid not null, "jar_id" uuid not null, constraint "money_week_check_allocation_pkey" primary key ("id"));`);
    this.addSql(`create index "money_week_check_allocation_household_id_index" on "money_week_check_allocation" ("household_id");`);
    this.addSql(`create index "money_week_check_allocation_jar_id_index" on "money_week_check_allocation" ("jar_id");`);
    this.addSql(`alter table "money_week_check_allocation" add constraint "money_week_check_allocation_week_check_id_jar_id_unique" unique ("week_check_id", "jar_id");`);

    this.addSql(`alter table "backoffice"."reference_growth_asset_preset" add constraint "reference_growth_asset_preset_kind_id_foreign" foreign key ("kind_id") references "backoffice"."reference_growth_asset_kind" ("id") on update cascade on delete restrict;`);

    this.addSql(`alter table "growth_asset" add constraint "growth_asset_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "auth"."two_factor" add constraint "two_factor_user_id_foreign" foreign key ("user_id") references "auth"."user" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "auth"."session" add constraint "session_user_id_foreign" foreign key ("user_id") references "auth"."user" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "auth"."provider" add constraint "provider_user_id_foreign" foreign key ("user_id") references "auth"."user" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "auth"."member" add constraint "member_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "auth"."member" add constraint "member_user_id_foreign" foreign key ("user_id") references "auth"."user" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "auth"."invitation" add constraint "invitation_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "auth"."invitation" add constraint "invitation_inviter_id_foreign" foreign key ("inviter_id") references "auth"."user" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "auth"."account" add constraint "account_user_id_foreign" foreign key ("user_id") references "auth"."user" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "auth"."account_settings" add constraint "account_settings_account_id_foreign" foreign key ("account_id") references "auth"."account" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "money_bank_account" add constraint "money_bank_account_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "platform_coach_message" add constraint "platform_coach_message_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "platform_coach_message" add constraint "platform_coach_message_account_id_foreign" foreign key ("account_id") references "auth"."account" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "money_debt" add constraint "money_debt_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "energy_log" add constraint "energy_log_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "energy_log" add constraint "energy_log_account_id_foreign" foreign key ("account_id") references "auth"."account" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "energy_week_check" add constraint "energy_week_check_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "soul_gratitude" add constraint "soul_gratitude_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "soul_gratitude" add constraint "soul_gratitude_account_id_foreign" foreign key ("account_id") references "auth"."account" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "growth_week_check" add constraint "growth_week_check_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "auth"."household_billing" add constraint "household_billing_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "auth"."household_settings" add constraint "household_settings_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "growth_income_lever" add constraint "growth_income_lever_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "growth_income_milestone" add constraint "growth_income_milestone_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "money_income_source" add constraint "money_income_source_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "money_income_amount_period" add constraint "money_income_amount_period_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "money_income_amount_period" add constraint "money_income_amount_period_income_source_id_foreign" foreign key ("income_source_id") references "money_income_source" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "money_jar" add constraint "money_jar_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "money_goal" add constraint "money_goal_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "money_goal" add constraint "money_goal_jar_id_foreign" foreign key ("jar_id") references "money_jar" ("id") on update cascade on delete set null;`);

    this.addSql(`alter table "money_category" add constraint "money_category_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "money_category" add constraint "money_category_jar_id_foreign" foreign key ("jar_id") references "money_jar" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "money_fixed_cost" add constraint "money_fixed_cost_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "money_fixed_cost" add constraint "money_fixed_cost_jar_id_foreign" foreign key ("jar_id") references "money_jar" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "money_fixed_cost" add constraint "money_fixed_cost_category_id_foreign" foreign key ("category_id") references "money_category" ("id") on update cascade on delete set null;`);
    this.addSql(`alter table "money_fixed_cost" add constraint "money_fixed_cost_debt_id_foreign" foreign key ("debt_id") references "money_debt" ("id") on update cascade on delete set null;`);

    this.addSql(`alter table "backoffice"."reference_money_category_template" add constraint "reference_money_category_template_jar_template_id_foreign" foreign key ("jar_template_id") references "backoffice"."reference_money_jar_template" ("id") on update cascade on delete restrict;`);

    this.addSql(`alter table "backoffice"."reference_money_goal_preset" add constraint "reference_money_goal_preset_jar_template_id_foreign" foreign key ("jar_template_id") references "backoffice"."reference_money_jar_template" ("id") on update cascade on delete restrict;`);
    this.addSql(`alter table "backoffice"."reference_money_goal_preset" add constraint "reference_money_goal_preset_category_template_id_foreign" foreign key ("category_template_id") references "backoffice"."reference_money_category_template" ("id") on update cascade on delete set null;`);

    this.addSql(`alter table "backoffice"."reference_money_fixed_cost_preset" add constraint "reference_money_fixed_cost_preset_jar_template_id_foreign" foreign key ("jar_template_id") references "backoffice"."reference_money_jar_template" ("id") on update cascade on delete restrict;`);
    this.addSql(`alter table "backoffice"."reference_money_fixed_cost_preset" add constraint "reference_money_fixed_cost_preset_category_template_id_foreign" foreign key ("category_template_id") references "backoffice"."reference_money_category_template" ("id") on update cascade on delete restrict;`);

    this.addSql(`alter table "growth_learn_book" add constraint "growth_learn_book_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "growth_learn_book" add constraint "growth_learn_book_account_id_foreign" foreign key ("account_id") references "auth"."account" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "growth_learn_progress" add constraint "growth_learn_progress_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "growth_learn_progress" add constraint "growth_learn_progress_account_id_foreign" foreign key ("account_id") references "auth"."account" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "growth_learn_focus" add constraint "growth_learn_focus_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "growth_learn_focus" add constraint "growth_learn_focus_account_id_foreign" foreign key ("account_id") references "auth"."account" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "backoffice"."reference_money_merchant_preset" add constraint "reference_money_merchant_preset_jar_template_id_foreign" foreign key ("jar_template_id") references "backoffice"."reference_money_jar_template" ("id") on update cascade on delete restrict;`);
    this.addSql(`alter table "backoffice"."reference_money_merchant_preset" add constraint "reference_money_merchant_preset_category_template_id_foreign" foreign key ("category_template_id") references "backoffice"."reference_money_category_template" ("id") on update cascade on delete restrict;`);
    this.addSql(`alter table "backoffice"."reference_money_merchant_preset" add constraint "reference_money_merchant_preset_giving_organisation_id_foreign" foreign key ("giving_organisation_id") references "backoffice"."reference_money_giving_organisation" ("id") on update cascade on delete set null;`);

    this.addSql(`alter table "backoffice"."reference_money_merchant_matching" add constraint "reference_money_merchant_matching_preset_id_foreign" foreign key ("preset_id") references "backoffice"."reference_money_merchant_preset" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "backoffice"."reference_money_merchant_branding" add constraint "reference_money_merchant_branding_preset_id_foreign" foreign key ("preset_id") references "backoffice"."reference_money_merchant_preset" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "backoffice"."reference_money_merchant_banking" add constraint "reference_money_merchant_banking_preset_id_foreign" foreign key ("preset_id") references "backoffice"."reference_money_merchant_preset" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "backoffice"."reference_money_fixed_cost_preset_merchant" add constraint "reference_money_fixed_cost_preset_merchant_preset_id_foreign" foreign key ("preset_id") references "backoffice"."reference_money_fixed_cost_preset" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "backoffice"."reference_money_fixed_cost_preset_merchant" add constraint "reference_money_fixed_cost_preset_merchant_merchant_id_foreign" foreign key ("merchant_id") references "backoffice"."reference_money_merchant_preset" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "backoffice"."reference_money_debt_preset_merchant" add constraint "reference_money_debt_preset_merchant_preset_id_foreign" foreign key ("preset_id") references "backoffice"."reference_money_debt_preset" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "backoffice"."reference_money_debt_preset_merchant" add constraint "reference_money_debt_preset_merchant_merchant_id_foreign" foreign key ("merchant_id") references "backoffice"."reference_money_merchant_preset" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "money_week_check" add constraint "money_week_check_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "money_month_score" add constraint "money_month_score_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "money_month_score_event" add constraint "money_month_score_event_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "money_month_score_event" add constraint "money_month_score_event_month_score_id_foreign" foreign key ("month_score_id") references "money_month_score" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "backoffice"."plan_feature" add constraint "plan_feature_product_id_foreign" foreign key ("product_id") references "backoffice"."plan_product" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "backoffice"."plan_capability" add constraint "plan_capability_feature_id_foreign" foreign key ("feature_id") references "backoffice"."plan_feature" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "backoffice"."plan_capability_grant" add constraint "plan_capability_grant_plan_id_foreign" foreign key ("plan_id") references "backoffice"."plan" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "backoffice"."plan_capability_grant" add constraint "plan_capability_grant_capability_id_foreign" foreign key ("capability_id") references "backoffice"."plan_capability" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "backoffice"."reference_money_fixed_cost_preset_audience" add constraint "reference_money_fixed_cost_preset_audience_fixed_f3d56_foreign" foreign key ("fixed_cost_preset_id") references "backoffice"."reference_money_fixed_cost_preset" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "backoffice"."reference_money_fixed_cost_preset_audience" add constraint "reference_money_fixed_cost_preset_audience_audience_id_foreign" foreign key ("audience_id") references "backoffice"."reference_money_audience" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "backoffice"."reference_money_merchant_preset_market" add constraint "reference_money_merchant_preset_market_merchant__b3c86_foreign" foreign key ("merchant_preset_id") references "backoffice"."reference_money_merchant_preset" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "backoffice"."reference_money_merchant_preset_market" add constraint "reference_money_merchant_preset_market_market_id_foreign" foreign key ("market_id") references "backoffice"."reference_money_market" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "money_sort_rule" add constraint "money_sort_rule_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "money_sort_rule" add constraint "money_sort_rule_jar_id_foreign" foreign key ("jar_id") references "money_jar" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "money_sort_rule" add constraint "money_sort_rule_category_id_foreign" foreign key ("category_id") references "money_category" ("id") on update cascade on delete set null;`);

    this.addSql(`alter table "soul_week_check" add constraint "soul_week_check_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "energy_time_entry" add constraint "energy_time_entry_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "energy_time_entry" add constraint "energy_time_entry_account_id_foreign" foreign key ("account_id") references "auth"."account" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "energy_time_template" add constraint "energy_time_template_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "energy_time_template" add constraint "energy_time_template_account_id_foreign" foreign key ("account_id") references "auth"."account" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "money_transaction" add constraint "money_transaction_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "money_transaction" add constraint "money_transaction_account_id_foreign" foreign key ("account_id") references "money_bank_account" ("id") on update cascade on delete set null;`);
    this.addSql(`alter table "money_transaction" add constraint "money_transaction_jar_id_foreign" foreign key ("jar_id") references "money_jar" ("id") on update cascade on delete set null;`);
    this.addSql(`alter table "money_transaction" add constraint "money_transaction_category_id_foreign" foreign key ("category_id") references "money_category" ("id") on update cascade on delete set null;`);
    this.addSql(`alter table "money_transaction" add constraint "money_transaction_debt_id_foreign" foreign key ("debt_id") references "money_debt" ("id") on update cascade on delete set null;`);
    this.addSql(`alter table "money_transaction" add constraint "money_transaction_fixed_cost_id_foreign" foreign key ("fixed_cost_id") references "money_fixed_cost" ("id") on update cascade on delete set null;`);
    this.addSql(`alter table "money_transaction" add constraint "money_transaction_applied_rule_id_foreign" foreign key ("applied_rule_id") references "money_sort_rule" ("id") on update cascade on delete set null;`);

    this.addSql(`alter table "money_fixed_cost_settlement" add constraint "money_fixed_cost_settlement_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "money_fixed_cost_settlement" add constraint "money_fixed_cost_settlement_fixed_cost_id_foreign" foreign key ("fixed_cost_id") references "money_fixed_cost" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "money_fixed_cost_settlement" add constraint "money_fixed_cost_settlement_transaction_id_foreign" foreign key ("transaction_id") references "money_transaction" ("id") on update cascade on delete set null;`);

    this.addSql(`alter table "backoffice"."reference_growth_lever_preset" add constraint "reference_growth_lever_preset_min_wealth_stage_id_foreign" foreign key ("min_wealth_stage_id") references "backoffice"."reference_growth_wealth_stage" ("id") on update cascade on delete restrict;`);

    this.addSql(`alter table "backoffice"."reference_growth_lever_preset_income_posture" add constraint "reference_growth_lever_preset_income_posture_lev_48e6f_foreign" foreign key ("lever_preset_id") references "backoffice"."reference_growth_lever_preset" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "backoffice"."reference_growth_lever_preset_income_posture" add constraint "reference_growth_lever_preset_income_posture_inc_9effd_foreign" foreign key ("income_posture_id") references "backoffice"."reference_growth_income_posture" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "money_week_check_allocation" add constraint "money_week_check_allocation_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "money_week_check_allocation" add constraint "money_week_check_allocation_week_check_id_foreign" foreign key ("week_check_id") references "money_week_check" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "money_week_check_allocation" add constraint "money_week_check_allocation_jar_id_foreign" foreign key ("jar_id") references "money_jar" ("id") on update cascade on delete cascade;`);
  }

}
