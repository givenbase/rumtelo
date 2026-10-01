import { Migration } from '@mikro-orm/migrations';

/**
 * Optional default bank account per jar (Necessities → checking, etc.).
 * Income deposit bank/account columns already live in Migration20260930194500.
 */
export class Migration20261001095331 extends Migration {
    override name = 'Migration20261001095331';

    override up(): void | Promise<void> {
        this.addSql(`alter table "money_jar" add "default_account_id" uuid null;`);
        this.addSql(
            `alter table "money_jar" add constraint "money_jar_default_account_id_foreign" foreign key ("default_account_id") references "money_bank_account" ("id") on delete set null;`
        );
    }

    override down(): void | Promise<void> {
        this.addSql(
            `alter table "money_jar" drop constraint "money_jar_default_account_id_foreign";`
        );
        this.addSql(`alter table "money_jar" drop column "default_account_id";`);
    }
}
