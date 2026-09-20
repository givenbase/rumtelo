import { Migration } from '@mikro-orm/migrations';

/**
 * A person's typical workday / day off, plus HETUS 998 "unspecified leisure" as a
 * time category so unsplit free time still counts as free time.
 */
export class Migration20260919210000_EnergyTimeTemplate extends Migration {
    override async up(): Promise<void> {
        this.addSql(`alter type "energy_time_category" add value if not exists 'FREE_OTHER';`);
        this.addSql(`create type "energy_time_day_kind" as enum ('WORKDAY', 'DAY_OFF');`);
        this.addSql(
            `create table "energy_time_template" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_id" uuid not null, "weekdays" jsonb not null, "minutes" jsonb not null, "kind" "public"."energy_time_day_kind" not null, "account_id" uuid not null, constraint "energy_time_template_pkey" primary key ("id"));`
        );
        this.addSql(
            `create index "energy_time_template_household_id_index" on "energy_time_template" ("household_id");`
        );
        this.addSql(
            `alter table "energy_time_template" add constraint "energy_time_template_account_id_kind_unique" unique ("account_id", "kind");`
        );
        this.addSql(
            `alter table "energy_time_template" add constraint "energy_time_template_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on update cascade on delete cascade;`
        );
        this.addSql(
            `alter table "energy_time_template" add constraint "energy_time_template_account_id_foreign" foreign key ("account_id") references "auth"."account" ("id") on update cascade on delete cascade;`
        );
    }

    override async down(): Promise<void> {
        this.addSql(`drop table if exists "energy_time_template" cascade;`);
        this.addSql(`drop type if exists "energy_time_day_kind";`);
        // Postgres cannot drop a single enum value; FREE_OTHER stays on rollback.
    }
}
