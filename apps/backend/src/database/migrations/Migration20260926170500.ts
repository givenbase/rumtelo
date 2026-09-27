import { Migration } from '@mikro-orm/migrations';

/**
 * Align practice_member boolean column with isSeatBillable entity field.
 */
export class Migration20260926170500 extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `alter table "public"."platform_practice_member" rename column "seat_billable" to "is_seat_billable";`
        );
    }

    override async down(): Promise<void> {
        this.addSql(
            `alter table "public"."platform_practice_member" rename column "is_seat_billable" to "seat_billable";`
        );
    }
}
