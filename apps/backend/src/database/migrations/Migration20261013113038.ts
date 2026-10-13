import { Migration } from '@mikro-orm/migrations';

export class Migration20261013113038 extends Migration {

  override name = 'Migration20261013113038';

  override up(): void | Promise<void> {
    this.addSql(`alter table "backoffice"."reference_money_category_template_jar_template" drop constraint "reference_money_category_template_jar_template_category_templat";`);
    this.addSql(`alter table "backoffice"."reference_money_category_template_jar_template" drop constraint "reference_money_category_template_jar_template_jar_template_id_";`);

    // auth.member / auth.invitation.relation — BA additionalFields via `pn auth:migrate`, not Mikro.

    this.addSql(`drop index "backoffice"."reference_money_category_template_jar_template_unique";`);
    this.addSql(`alter table "backoffice"."reference_money_category_template_jar_template" add constraint "reference_money_category_template_jar_template_c_f3b1f_foreign" foreign key ("category_template_id") references "backoffice"."reference_money_category_template" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "backoffice"."reference_money_category_template_jar_template" add constraint "reference_money_category_template_jar_template_j_5db5c_foreign" foreign key ("jar_template_id") references "backoffice"."reference_money_jar_template" ("id") on update cascade on delete cascade;`);

    this.addSql(`drop index "money_fixed_cost_settlement_cleared_by_period_index";`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "backoffice"."reference_money_category_template_jar_template" drop constraint "reference_money_category_template_jar_template_c_f3b1f_foreign";`);
    this.addSql(`alter table "backoffice"."reference_money_category_template_jar_template" drop constraint "reference_money_category_template_jar_template_j_5db5c_foreign";`);

    this.addSql(`alter table "auth"."account_address" alter column "kind" type "auth"."auth_account_address_kind" using ("kind"::"auth"."auth_account_address_kind");`);

    this.addSql(`alter table "auth"."account_settings" alter column "locale" type "auth"."auth_locale" using ("locale"::"auth"."auth_locale");`);
    this.addSql(`alter table "auth"."account_settings" alter column "theme" type "auth"."auth_theme" using ("theme"::"auth"."auth_theme");`);
    this.addSql(`alter table "auth"."account_settings" alter column "spending_style" type "auth"."money_spending_style" using ("spending_style"::"auth"."money_spending_style");`);

    this.addSql(`alter table "auth"."household_billing" alter column "scheduled_plan_key" type "auth"."backoffice_plan_key" using ("scheduled_plan_key"::"auth"."backoffice_plan_key");`);
    this.addSql(`alter table "auth"."household_billing" alter column "plan_key" type "auth"."backoffice_plan_key" using ("plan_key"::"auth"."backoffice_plan_key");`);

    this.addSql(`alter table "auth"."household_settings" alter column "currency" type "auth"."platform_currency" using ("currency"::"auth"."platform_currency");`);

    this.addSql(`alter table "backoffice"."plan" alter column "key" type "backoffice"."backoffice_plan_key" using ("key"::"backoffice"."backoffice_plan_key");`);

    this.addSql(`alter table "backoffice"."plan_capability" alter column "kind" type "backoffice"."backoffice_capability_kind" using ("kind"::"backoffice"."backoffice_capability_kind");`);

    this.addSql(`alter table "backoffice"."reference_growth_book_preset" alter column "min_plan" type "backoffice"."backoffice_plan_key" using ("min_plan"::"backoffice"."backoffice_plan_key");`);

    this.addSql(`alter table "backoffice"."reference_growth_watch_preset" alter column "format" type "backoffice"."growth_learn_watch_kind" using ("format"::"backoffice"."growth_learn_watch_kind");`);
    this.addSql(`alter table "backoffice"."reference_growth_watch_preset" alter column "min_plan" type "backoffice"."backoffice_plan_key" using ("min_plan"::"backoffice"."backoffice_plan_key");`);

    this.addSql(`alter table "backoffice"."reference_money_category_template_jar_template" add constraint "reference_money_category_template_jar_template_category_templat" foreign key ("category_template_id") references "backoffice"."reference_money_category_template" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "backoffice"."reference_money_category_template_jar_template" add constraint "reference_money_category_template_jar_template_jar_template_id_" foreign key ("jar_template_id") references "backoffice"."reference_money_jar_template" ("id") on update cascade on delete restrict;`);
    this.addSql(`create unique index "reference_money_category_template_jar_template_unique" on "backoffice"."reference_money_category_template_jar_template" ("category_template_id", "jar_template_id");`);

    this.addSql(`alter table "backoffice"."reference_money_debt_preset" alter column "kind" type "backoffice"."money_debt_kind" using ("kind"::"backoffice"."money_debt_kind");`);

    this.addSql(`alter table "backoffice"."reference_money_fixed_cost_preset" alter column "cadence" type "backoffice"."money_cadence" using ("cadence"::"backoffice"."money_cadence");`);
    this.addSql(`alter table "backoffice"."reference_money_fixed_cost_preset" alter column "direction" type "backoffice"."money_flow_direction" using ("direction"::"backoffice"."money_flow_direction");`);

    this.addSql(`alter table "backoffice"."reference_money_income_source_preset" alter column "kind" type "backoffice"."money_income_kind" using ("kind"::"backoffice"."money_income_kind");`);
    this.addSql(`alter table "backoffice"."reference_money_income_source_preset" alter column "cadence" type "backoffice"."money_cadence" using ("cadence"::"backoffice"."money_cadence");`);

    this.addSql(`alter table "backoffice"."reference_money_jar_template" alter column "key" type "backoffice"."money_jar_key" using ("key"::"backoffice"."money_jar_key");`);

    this.addSql(`alter table "backoffice"."reference_money_merchant_preset" alter column "highlight" type "backoffice"."money_merchant_highlight" using ("highlight"::"backoffice"."money_merchant_highlight");`);

    this.addSql(`alter table "backoffice"."reference_money_merchant_suggestion" alter column "status" type "backoffice"."money_merchant_suggestion_status" using ("status"::"backoffice"."money_merchant_suggestion_status");`);

    this.addSql(`alter table "backoffice"."reference_money_transaction_in_preset" alter column "jar_key" type "backoffice"."money_jar_key" using ("jar_key"::"backoffice"."money_jar_key");`);

    this.addSql(`alter table "backoffice"."reference_platform_device_kind" alter column "default_connection" type "backoffice"."platform_device_connection" using ("default_connection"::"backoffice"."platform_device_connection");`);

    this.addSql(`alter table "growth_learn_progress" alter column "status" type "growth_learn_progress_status" using ("status"::"growth_learn_progress_status");`);

    this.addSql(`alter table "money_bank_account" alter column "kind" type "money_account_kind" using ("kind"::"money_account_kind");`);

    this.addSql(`alter table "money_debt" alter column "kind" type "money_debt_kind" using ("kind"::"money_debt_kind");`);
    this.addSql(`alter table "money_debt" alter column "schedule_kind" type "money_debt_schedule_kind" using ("schedule_kind"::"money_debt_schedule_kind");`);
    this.addSql(`alter table "money_debt" alter column "payment_cadence" type "money_cadence" using ("payment_cadence"::"money_cadence");`);

    this.addSql(`alter table "money_fixed_cost" alter column "cadence" type "money_cadence" using ("cadence"::"money_cadence");`);
    this.addSql(`alter table "money_fixed_cost" alter column "direction" type "money_flow_direction" using ("direction"::"money_flow_direction");`);

    this.addSql(`alter table "money_fixed_cost_settlement" alter column "status" type "money_fixed_cost_settlement_status" using ("status"::"money_fixed_cost_settlement_status");`);
    this.addSql(`alter table "money_fixed_cost_settlement" alter column "source" type "money_fixed_cost_settlement_source" using ("source"::"money_fixed_cost_settlement_source");`);
    this.addSql(`create index "money_fixed_cost_settlement_cleared_by_period_index" on "money_fixed_cost_settlement" ("cleared_by_period");`);

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

    this.addSql(`alter table "platform_coach_message" alter column "kind" type "platform_coach_kind" using ("kind"::"platform_coach_kind");`);

    this.addSql(`alter table "platform_device" alter column "connection" type "platform_device_connection" using ("connection"::"platform_device_connection");`);

    this.addSql(`alter table "platform_practice_address" alter column "kind" type "platform_practice_address_kind" using ("kind"::"platform_practice_address_kind");`);

    this.addSql(`alter table "platform_practice_billing" alter column "status" type "platform_practice_subscription_status" using ("status"::"platform_practice_subscription_status");`);

    this.addSql(`alter table "platform_practice_client_invite" alter column "status" type "platform_practice_client_invite_status" using ("status"::"platform_practice_client_invite_status");`);
    this.addSql(`alter table "platform_practice_client_invite" alter column "access" type "platform_practice_client_access" using ("access"::"platform_practice_client_access");`);

    this.addSql(`alter table "platform_practice_client_link" alter column "status" type "platform_practice_client_link_status" using ("status"::"platform_practice_client_link_status");`);
    this.addSql(`alter table "platform_practice_client_link" alter column "access" type "platform_practice_client_access" using ("access"::"platform_practice_client_access");`);

    this.addSql(`alter table "platform_practice_client_link_flag" alter column "flag" type "platform_practice_client_control_flag" using ("flag"::"platform_practice_client_control_flag");`);

    this.addSql(`alter table "platform_practice_member" alter column "role" type "platform_practice_role" using ("role"::"platform_practice_role");`);
  }

}
