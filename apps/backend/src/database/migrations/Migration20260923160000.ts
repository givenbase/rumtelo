import { Migration } from '@mikro-orm/migrations';

/**
 * connection_id holds aggregator handles (`sessionId::accountUid`), not a UUID.
 */
export class Migration20260923160000 extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `alter table "money_bank_account" alter column "connection_id" type varchar(120) using ("connection_id"::text);`
        );
    }

    override async down(): Promise<void> {
        this.addSql(
            `alter table "money_bank_account" alter column "connection_id" type uuid using (null);`
        );
    }
}
