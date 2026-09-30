import { Migration } from '@mikro-orm/migrations';

/**
 * Optional deposit bank + account on income sources — where money is expected to land.
 * Account seat wins over bank when both are set (service syncs bank_id from the account).
 */
export class Migration20260930194500_IncomeDepositLinks extends Migration {
    override name = 'Migration20260930194500_IncomeDepositLinks';

    override up(): void | Promise<void> {
        this.addSql(`alter table "money_income_source" add "bank_id" uuid null;`);
        this.addSql(`alter table "money_income_source" add "account_id" uuid null;`);
        this.addSql(
            `alter table "money_income_source" add constraint "money_income_source_bank_id_foreign" foreign key ("bank_id") references "backoffice"."reference_money_bank" ("id") on delete set null;`
        );
        this.addSql(
            `alter table "money_income_source" add constraint "money_income_source_account_id_foreign" foreign key ("account_id") references "money_bank_account" ("id") on delete set null;`
        );
        this.addSql(
            `create index "money_income_source_bank_id_index" on "money_income_source" ("bank_id");`
        );
        this.addSql(
            `create index "money_income_source_account_id_index" on "money_income_source" ("account_id");`
        );
    }

    override down(): void | Promise<void> {
        this.addSql(
            `alter table "money_income_source" drop constraint "money_income_source_account_id_foreign";`
        );
        this.addSql(
            `alter table "money_income_source" drop constraint "money_income_source_bank_id_foreign";`
        );
        this.addSql(`drop index "money_income_source_account_id_index";`);
        this.addSql(`drop index "money_income_source_bank_id_index";`);
        this.addSql(`alter table "money_income_source" drop column "account_id";`);
        this.addSql(`alter table "money_income_source" drop column "bank_id";`);
    }
}
