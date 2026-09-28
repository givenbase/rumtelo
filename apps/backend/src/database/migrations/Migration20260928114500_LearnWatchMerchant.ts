import { Migration } from '@mikro-orm/migrations';

/**
 * Learn watch → MerchantPreset: real FK instead of a free-text partner/school column.
 * Courses, podcasts (Spotify), and later Netflix/YouTube titles can point at the company row.
 */
export class Migration20260928114500_LearnWatchMerchant extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `alter table "backoffice"."reference_growth_watch_preset" add column "merchant_id" uuid null;`
        );
        this.addSql(`
            update "backoffice"."reference_growth_watch_preset" as w
            set "merchant_id" = m."id"
            from "backoffice"."reference_money_merchant_preset" as m
            where w."partner" is not null and m."key" = w."partner";
        `);
        this.addSql(
            `alter table "backoffice"."reference_growth_watch_preset" drop column if exists "partner";`
        );
        this.addSql(
            `alter table "backoffice"."reference_growth_watch_preset" drop column if exists "merchant_key";`
        );
        this.addSql(`
            alter table "backoffice"."reference_growth_watch_preset"
            add constraint "reference_growth_watch_preset_merchant_id_foreign"
            foreign key ("merchant_id") references "backoffice"."reference_money_merchant_preset" ("id")
            on update cascade on delete set null;
        `);
        this.addSql(
            `create index "reference_growth_watch_preset_merchant_id_index" on "backoffice"."reference_growth_watch_preset" ("merchant_id");`
        );
    }

    override async down(): Promise<void> {
        this.addSql(
            `alter table "backoffice"."reference_growth_watch_preset" drop constraint if exists "reference_growth_watch_preset_merchant_id_foreign";`
        );
        this.addSql(
            `drop index if exists "backoffice"."reference_growth_watch_preset_merchant_id_index";`
        );
        this.addSql(
            `alter table "backoffice"."reference_growth_watch_preset" add column "partner" varchar(64) null;`
        );
        this.addSql(`
            update "backoffice"."reference_growth_watch_preset" as w
            set "partner" = m."key"
            from "backoffice"."reference_money_merchant_preset" as m
            where w."merchant_id" = m."id";
        `);
        this.addSql(
            `alter table "backoffice"."reference_growth_watch_preset" drop column if exists "merchant_id";`
        );
    }
}
