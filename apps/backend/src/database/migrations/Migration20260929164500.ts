import { Migration } from '@mikro-orm/migrations';

export class Migration20260929164500 extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `alter table "money_income_source" add column "merchant_key" varchar(64) null;`
        );
    }

    override async down(): Promise<void> {
        this.addSql(`alter table "money_income_source" drop column "merchant_key";`);
    }
}
