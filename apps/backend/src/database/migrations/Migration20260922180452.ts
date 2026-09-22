import { Migration } from '@mikro-orm/migrations';

export class Migration20260922180452 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "backoffice"."reference_growth_book_preset" alter column "spending_styles" type jsonb using ("spending_styles"::jsonb);`);

    this.addSql(`alter table "backoffice"."reference_money_giving_organisation" alter column "causes" type jsonb using ("causes"::jsonb);`);

    this.addSql(`alter table "auth"."household_settings" add column "audience_keys" jsonb not null default '[]';`);

    this.addSql(`alter table "backoffice"."reference_growth_watch_preset" alter column "spending_styles" type jsonb using ("spending_styles"::jsonb);`);

    this.addSql(`alter table "backoffice"."reference_growth_lever_preset" alter column "spending_styles" type jsonb using ("spending_styles"::jsonb);`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "auth"."account_settings" alter column "locale" type "auth"."auth_locale" using ("locale"::"auth"."auth_locale");`);
    this.addSql(`alter table "auth"."account_settings" alter column "theme" type "auth"."auth_theme" using ("theme"::"auth"."auth_theme");`);
    this.addSql(`alter table "auth"."account_settings" alter column "spending_style" type "auth"."money_spending_style" using ("spending_style"::"auth"."money_spending_style");`);

    this.addSql(`alter table "energy_log" alter column "metric" type "energy_metric" using ("metric"::"energy_metric");`);

    this.addSql(`alter table "energy_time_entry" alter column "category" type "energy_time_category" using ("category"::"energy_time_category");`);

    this.addSql(`alter table "energy_time_template" alter column "kind" type "energy_time_day_kind" using ("kind"::"energy_time_day_kind");`);

    this.addSql(`alter table "growth_learn_progress" alter column "status" type "growth_learn_progress_status" using ("status"::"growth_learn_progress_status");`);

    this.addSql(`alter table "auth"."household_billing" alter column "scheduled_plan_key" type "auth"."backoffice_plan_key" using ("scheduled_plan_key"::"auth"."backoffice_plan_key");`);
    this.addSql(`alter table "auth"."household_billing" alter column "plan_key" type "auth"."backoffice_plan_key" using ("plan_key"::"auth"."backoffice_plan_key");`);

    this.addSql(`alter table "auth"."household_settings" drop column "audience_keys";`);

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
  }

}
