import { Migration } from '@mikro-orm/migrations';

/** Drop catalog mainBank — primary seat is BankAccount.isPrimary. */
export class Migration20260923181000_DropHouseholdMainBank extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `alter table "auth"."household_settings" drop constraint if exists "household_settings_main_bank_id_foreign";`
        );
        this.addSql(
            `alter table "auth"."household_settings" drop column if exists "main_bank_id";`
        );
    }

    override async down(): Promise<void> {
        this.addSql(
            `alter table "auth"."household_settings" add column "main_bank_id" uuid null;`
        );
        this.addSql(`
            alter table "auth"."household_settings"
            add constraint "household_settings_main_bank_id_foreign"
            foreign key ("main_bank_id") references "backoffice"."reference_money_bank" ("id")
            on update cascade on delete set null;
        `);
    }
}
