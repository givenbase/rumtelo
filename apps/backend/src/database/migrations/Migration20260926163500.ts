import { Migration } from '@mikro-orm/migrations';

/**
 * Practice billing: meter active client links alongside staff seats.
 */
export class Migration20260926163500 extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `alter table "public"."platform_practice_billing" add column "billable_client_count" int not null default 0;`
        );
    }

    override async down(): Promise<void> {
        this.addSql(
            `alter table "public"."platform_practice_billing" drop column "billable_client_count";`
        );
    }
}
