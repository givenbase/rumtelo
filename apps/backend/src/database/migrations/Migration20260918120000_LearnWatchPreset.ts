import { Migration } from '@mikro-orm/migrations';

export class Migration20260918120000_LearnWatchPreset extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `create type "growth_learn_watch_kind" as enum ('FILM', 'VIDEO', 'SERIES');`
        );
        this.addSql(
            `create table "backoffice"."reference_growth_watch_preset" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "key" varchar(64) not null, "name" varchar(120) not null, "sort_order" int not null default 0, "is_active" boolean not null default true, "description" text not null, "creator" varchar(120) not null, "youtube_id" varchar(16) null, "spending_styles" jsonb not null default '[]', "url" varchar(280) not null, "format" "growth_learn_watch_kind" not null, "topic" "growth_learn_topic" not null, "min_plan" "backoffice_plan_key" not null, constraint "reference_growth_watch_preset_pkey" primary key ("id"));`
        );
        this.addSql(
            `alter table "backoffice"."reference_growth_watch_preset" add constraint "reference_growth_watch_preset_key_unique" unique ("key");`
        );
    }

    override async down(): Promise<void> {
        this.addSql(`drop table if exists "backoffice"."reference_growth_watch_preset";`);
        this.addSql(`drop type if exists "growth_learn_watch_kind";`);
    }
}
