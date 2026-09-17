import { Migration } from '@mikro-orm/migrations';

/**
 * Fixed-cost bill presets own their Paid-to merchant chips
 * (suggested_merchant_keys), same pattern as debt.suggested_lenders.
 */
export class Migration20260917120000_FixedCostSuggestedMerchants extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `alter table "backoffice"."reference_money_fixed_cost_preset" add column if not exists "suggested_merchant_keys" jsonb not null default '[]';`
        );
    }

    override async down(): Promise<void> {
        this.addSql(
            `alter table "backoffice"."reference_money_fixed_cost_preset" drop column if exists "suggested_merchant_keys";`
        );
    }
}
