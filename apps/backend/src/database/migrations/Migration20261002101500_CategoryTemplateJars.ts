import { Migration } from '@mikro-orm/migrations';

/**
 * Category templates may belong to multiple jar templates (shared types).
 * Backfill pivot from jar_template_id, then drop the single FK.
 * Pivot uses fixedOrder (`id` serial) so seed order = primary-first.
 */
export class Migration20261002101500_CategoryTemplateJars extends Migration {
    override name = 'Migration20261002101500_CategoryTemplateJars';

    override up(): void | Promise<void> {
        this.addSql(`
            create table "backoffice"."reference_money_category_template_jar_template" (
                "id" serial primary key,
                "category_template_id" uuid not null,
                "jar_template_id" uuid not null
            );
        `);
        this.addSql(`
            alter table "backoffice"."reference_money_category_template_jar_template"
                add constraint "reference_money_category_template_jar_template_category_template_id_foreign"
                foreign key ("category_template_id")
                references "backoffice"."reference_money_category_template" ("id")
                on update cascade on delete cascade;
        `);
        this.addSql(`
            alter table "backoffice"."reference_money_category_template_jar_template"
                add constraint "reference_money_category_template_jar_template_jar_template_id_foreign"
                foreign key ("jar_template_id")
                references "backoffice"."reference_money_jar_template" ("id")
                on update cascade on delete restrict;
        `);
        this.addSql(`
            create unique index "reference_money_category_template_jar_template_unique"
                on "backoffice"."reference_money_category_template_jar_template"
                ("category_template_id", "jar_template_id");
        `);
        this.addSql(`
            insert into "backoffice"."reference_money_category_template_jar_template"
                ("category_template_id", "jar_template_id")
            select "id", "jar_template_id"
            from "backoffice"."reference_money_category_template"
            where "jar_template_id" is not null
            order by "sort_order" asc, "key" asc;
        `);
        this.addSql(`
            alter table "backoffice"."reference_money_category_template"
                drop constraint "reference_money_category_template_jar_template_id_foreign";
        `);
        this.addSql(`
            drop index if exists "backoffice"."reference_money_category_template_jar_template_id_index";
        `);
        this.addSql(`
            alter table "backoffice"."reference_money_category_template"
                drop column "jar_template_id";
        `);
    }

    override down(): void | Promise<void> {
        this.addSql(`
            alter table "backoffice"."reference_money_category_template"
                add "jar_template_id" uuid null;
        `);
        this.addSql(`
            update "backoffice"."reference_money_category_template" ct
            set "jar_template_id" = pivot."jar_template_id"
            from (
                select distinct on ("category_template_id")
                    "category_template_id",
                    "jar_template_id"
                from "backoffice"."reference_money_category_template_jar_template"
                order by "category_template_id", "id" asc
            ) as pivot
            where ct."id" = pivot."category_template_id";
        `);
        this.addSql(`
            alter table "backoffice"."reference_money_category_template"
                alter column "jar_template_id" set not null;
        `);
        this.addSql(`
            alter table "backoffice"."reference_money_category_template"
                add constraint "reference_money_category_template_jar_template_id_foreign"
                foreign key ("jar_template_id")
                references "backoffice"."reference_money_jar_template" ("id")
                on delete restrict;
        `);
        this.addSql(`
            create index "reference_money_category_template_jar_template_id_index"
                on "backoffice"."reference_money_category_template" ("jar_template_id");
        `);
        this.addSql(`
            drop table if exists "backoffice"."reference_money_category_template_jar_template" cascade;
        `);
    }
}
