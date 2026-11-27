import { Migration } from '@mikro-orm/migrations';

/**
 * Pot share history: `public.money_jar_share` remembers which share each pot had from which
 * budget month on, so saving a split or turning on an optional pot stops rewriting the
 * running balance of earlier months (it was months × today's share).
 *
 * 1. Create the table as the `JarShare` entity declares it (household FK and index like every
 *    household table, cascade from `money_jar`, unique (jar_id, period), checks on the `YYYY-MM`
 *    format and the 0–100 range).
 * 2. Backfill one row per existing pot with its current percentage at period `'1970-01'`
 *    (`JAR_SHARE_BASELINE_PERIOD` in `jar-share.entity.ts`), a month before any real one, so the
 *    past keeps exactly the split it showed before this table existed. `on conflict do nothing`
 *    makes a re-run harmless. Ids are `gen_random_uuid()` (v4) like the earlier hand-written
 *    inserts; the ORM mints v7 for rows it creates, and both are valid uuids.
 *
 * No existing money row is changed; no better-auth table is touched.
 * Hand-written (no database at hand to introspect); unverified until it runs on staging.
 */
export class Migration20261123120000_JarShare extends Migration {
    override name = 'Migration20261123120000_JarShare';

    override up(): void | Promise<void> {
        this.addSql(
            `create table "public"."money_jar_share" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_id" uuid not null, "period" varchar(7) not null, "percentage" numeric(5,2) not null, "jar_id" uuid not null, primary key ("id"));`
        );
        this.addSql(
            `create index "money_jar_share_household_id_index" on "public"."money_jar_share" ("household_id");`
        );
        this.addSql(
            `alter table "public"."money_jar_share" add constraint "money_jar_share_jar_id_period_unique" unique ("jar_id", "period");`
        );
        this.addSql(
            `alter table "public"."money_jar_share" add constraint "money_jar_share_percentage_range" check ((percentage BETWEEN 0 AND 100));`
        );
        this.addSql(
            `alter table "public"."money_jar_share" add constraint "money_jar_share_period_format" check ((period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'));`
        );
        this.addSql(
            `alter table "public"."money_jar_share" add constraint "money_jar_share_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on delete cascade;`
        );
        this.addSql(
            `alter table "public"."money_jar_share" add constraint "money_jar_share_jar_id_foreign" foreign key ("jar_id") references "public"."money_jar" ("id") on delete cascade;`
        );

        this.addSql(`
            insert into "public"."money_jar_share"
                ("id", "created_at", "updated_at", "household_id", "period", "percentage", "jar_id")
            select gen_random_uuid(), now(), now(), jar."household_id", '1970-01', jar."percentage", jar."id"
            from "public"."money_jar" as jar
            on conflict ("jar_id", "period") do nothing;
        `);
    }

    override down(): void | Promise<void> {
        // The share history only exists in this table; money_jar.percentage keeps the current split.
        this.addSql(`drop table if exists "public"."money_jar_share" cascade;`);
    }
}
