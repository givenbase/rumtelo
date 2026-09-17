import { Migration } from '@mikro-orm/migrations';

/**
 * Debt lender chips become MerchantPreset keys (suggested_merchant_keys),
 * matching FixedCostPreset.suggested_merchant_keys.
 */
export class Migration20260917140000_DebtSuggestedMerchantKeys extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `alter table "backoffice"."reference_money_debt_preset" add column if not exists "suggested_merchant_keys" jsonb not null default '[]';`
        );
        this.addSql(
            `alter table "backoffice"."reference_money_debt_preset" drop column if exists "suggested_lenders";`
        );
    }

    override async down(): Promise<void> {
        this.addSql(
            `alter table "backoffice"."reference_money_debt_preset" add column if not exists "suggested_lenders" jsonb not null default '[]';`
        );
        this.addSql(
            `alter table "backoffice"."reference_money_debt_preset" drop column if exists "suggested_merchant_keys";`
        );
    }
}
