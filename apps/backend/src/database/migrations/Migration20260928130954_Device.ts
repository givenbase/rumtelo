import { Migration } from '@mikro-orm/migrations';

export class Migration20260928130954_Device extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `create type "platform_device_connection" as enum ('BLUETOOTH', 'WIFI', 'CLOUD');`
        );
        this.addSql(
            `create table "platform_device" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_id" uuid not null, "name" varchar(60) not null, "kind_key" varchar(64) not null, "vendor" varchar(60) null, "model" varchar(60) null, "external_id" varchar(120) null, "capabilities" jsonb not null, "paired_at" timestamptz not null, "last_seen_at" timestamptz null, "connection" "public"."platform_device_connection" not null, "account_id" uuid null, constraint "platform_device_pkey" primary key ("id"));`
        );
        this.addSql(
            `create index "platform_device_household_id_index" on "platform_device" ("household_id");`
        );
        this.addSql(
            `create index "platform_device_household_id_account_id_index" on "platform_device" ("household_id", "account_id");`
        );
        this.addSql(
            `alter table "platform_device" add constraint "platform_device_household_id_external_id_unique" unique ("household_id", "external_id");`
        );

        this.addSql(
            `create table "backoffice"."reference_platform_device_kind" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "key" varchar(64) not null, "name" varchar(120) not null, "sort_order" int not null default 0, "is_active" boolean not null default true, "icon" varchar(40) not null, "default_capabilities" jsonb not null, "default_connection" "public"."platform_device_connection" not null, constraint "reference_platform_device_kind_pkey" primary key ("id"));`
        );
        this.addSql(
            `alter table "backoffice"."reference_platform_device_kind" add constraint "reference_platform_device_kind_key_unique" unique ("key");`
        );

        this.addSql(
            `alter table "platform_device" add constraint "platform_device_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on update cascade on delete cascade;`
        );
        this.addSql(
            `alter table "platform_device" add constraint "platform_device_account_id_foreign" foreign key ("account_id") references "auth"."account" ("id") on update cascade on delete set null;`
        );
    }

    override async down(): Promise<void> {
        this.addSql(`drop table if exists "platform_device" cascade;`);
        this.addSql(`drop table if exists "backoffice"."reference_platform_device_kind" cascade;`);
        this.addSql(`drop type if exists "platform_device_connection";`);
    }
}
