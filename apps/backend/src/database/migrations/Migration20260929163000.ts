import { Migration } from '@mikro-orm/migrations';

export class Migration20260929163000 extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `alter table "money_income_source" add column "counterparty" varchar(160) null;`
        );
    }

    override async down(): Promise<void> {
        this.addSql(`alter table "money_income_source" drop column "counterparty";`);
    }
}
