import { Migration } from '@mikro-orm/migrations';

/**
 * Income endsOn + fixed-cost startedOn for as-of period travel.
 */
export class Migration20260927120000 extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `alter table "public"."money_income_source" add column "ends_on" date null;`
        );
        this.addSql(
            `alter table "public"."money_fixed_cost" add column "started_on" date null;`
        );
    }

    override async down(): Promise<void> {
        this.addSql(`alter table "public"."money_income_source" drop column "ends_on";`);
        this.addSql(`alter table "public"."money_fixed_cost" drop column "started_on";`);
    }
}
