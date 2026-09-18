import { Migration } from '@mikro-orm/migrations';

/** Asset classes and suggested names. A catalog, not a closed list of kinds. */
export class Migration20260918230000_AssetCatalog extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `create table "backoffice"."reference_growth_asset_kind" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "key" varchar(64) not null, "name" varchar(120) not null, "sort_order" int not null default 0, "is_active" boolean not null default true, "description" text null, "can_pay" boolean not null default false, "icon" varchar(8) null, constraint "reference_growth_asset_kind_pkey" primary key ("id"));`
        );
        this.addSql(
            `alter table "backoffice"."reference_growth_asset_kind" add constraint "reference_growth_asset_kind_key_unique" unique ("key");`
        );

        this.addSql(
            `create table "backoffice"."reference_growth_asset_preset" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "key" varchar(64) not null, "name" varchar(120) not null, "sort_order" int not null default 0, "is_active" boolean not null default true, "description" text null, "kind_id" uuid not null, constraint "reference_growth_asset_preset_pkey" primary key ("id"));`
        );
        this.addSql(
            `create index "reference_growth_asset_preset_kind_id_index" on "backoffice"."reference_growth_asset_preset" ("kind_id");`
        );
        this.addSql(
            `alter table "backoffice"."reference_growth_asset_preset" add constraint "reference_growth_asset_preset_key_unique" unique ("key");`
        );
        this.addSql(
            `alter table "backoffice"."reference_growth_asset_preset" add constraint "reference_growth_asset_preset_kind_id_foreign" foreign key ("kind_id") references "backoffice"."reference_growth_asset_kind" ("id") on update cascade on delete restrict;`
        );
    }

    override async down(): Promise<void> {
        this.addSql(`drop table if exists "backoffice"."reference_growth_asset_preset" cascade;`);
        this.addSql(`drop table if exists "backoffice"."reference_growth_asset_kind" cascade;`);
    }
}
