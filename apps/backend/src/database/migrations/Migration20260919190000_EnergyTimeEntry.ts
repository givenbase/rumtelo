import { Migration } from '@mikro-orm/migrations';

/** Daily minutes per HETUS-derived activity category, one row per person/day/category. */
export class Migration20260919190000_EnergyTimeEntry extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `create type "energy_time_category" as enum ('SLEEP', 'PERSONAL_CARE', 'PAID_WORK', 'STUDY', 'HOUSEHOLD_CARE', 'FAMILY_CARE', 'VOLUNTEERING', 'SOCIAL', 'EXERCISE', 'HOBBIES', 'SCREEN', 'STILLNESS', 'TRAVEL');`
        );
        this.addSql(
            `create table "energy_time_entry" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_id" uuid not null, "note" varchar(280) null, "minutes" smallint not null, "logged_on" date not null, "category" "public"."energy_time_category" not null, "account_id" uuid not null, constraint "energy_time_entry_pkey" primary key ("id"));`
        );
        this.addSql(
            `create index "energy_time_entry_household_id_index" on "energy_time_entry" ("household_id");`
        );
        this.addSql(
            `create index "energy_time_entry_household_id_logged_on_index" on "energy_time_entry" ("household_id", "logged_on");`
        );
        this.addSql(
            `alter table "energy_time_entry" add constraint "energy_time_entry_account_id_logged_on_category_unique" unique ("account_id", "logged_on", "category");`
        );
        this.addSql(
            `alter table "energy_time_entry" add constraint "energy_time_entry_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on update cascade on delete cascade;`
        );
        this.addSql(
            `alter table "energy_time_entry" add constraint "energy_time_entry_account_id_foreign" foreign key ("account_id") references "auth"."account" ("id") on update cascade on delete cascade;`
        );
    }

    override async down(): Promise<void> {
        this.addSql(`drop table if exists "energy_time_entry" cascade;`);
        this.addSql(`drop type if exists "energy_time_category";`);
    }
}
