import { Migration } from '@mikro-orm/migrations';

/** What a household owns. The class is a key, not a foreign key. */
export class Migration20260918235900_GrowthAsset extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `create table "growth_asset" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_id" uuid not null, "name" varchar(120) not null, "kind_key" varchar(64) not null, "preset_key" varchar(64) null, "value" bigint not null, "flow" bigint not null default 0, constraint "growth_asset_pkey" primary key ("id"));`
        );
        this.addSql(
            `create index "growth_asset_household_id_index" on "growth_asset" ("household_id");`
        );
        this.addSql(
            `alter table "growth_asset" add constraint "growth_asset_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on update cascade on delete cascade;`
        );
    }

    override async down(): Promise<void> {
        this.addSql(`drop table if exists "growth_asset" cascade;`);
    }
}
