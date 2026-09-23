import { Migration } from '@mikro-orm/migrations';

/**
 * Persist catalog bank on each household account (`bank_key` snapshot).
 * One catalog bank → many accounts; foundation for later sync/connection secrets.
 */
export class Migration20260923141100 extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `alter table "money_bank_account" add column "bank_key" varchar(64) null;`
        );
        this.addSql(
            `create index "money_bank_account_household_id_bank_key_index" on "money_bank_account" ("household_id", "bank_key");`
        );
    }

    override async down(): Promise<void> {
        this.addSql(
            `drop index if exists "money_bank_account_household_id_bank_key_index";`
        );
        this.addSql(`alter table "money_bank_account" drop column "bank_key";`);
    }
}
