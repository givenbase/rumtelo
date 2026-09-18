import { Migration } from '@mikro-orm/migrations';

/**
 * Three more lanes on the shelf, and a table for books a household adds itself.
 * New enum values are not inserted here — Postgres cannot use a value added in
 * the same transaction.
 */
export class Migration20260918180000_LearnTopicAndTitle extends Migration {
    override async up(): Promise<void> {
        this.addSql(`alter type "growth_learn_topic" add value if not exists 'RELATIONSHIPS';`);
        this.addSql(`alter type "growth_learn_topic" add value if not exists 'HEALTH';`);
        this.addSql(`alter type "growth_learn_topic" add value if not exists 'LEADERSHIP';`);

        this.addSql(
            `create table "growth_learn_title" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_id" uuid not null, "name" varchar(160) not null, "author" varchar(120) not null, "description" text not null, "skill" varchar(64) not null, "cover_id" int null, "isbn13" varchar(13) null, "url" varchar(280) not null, "source_key" varchar(64) not null, "account_id" uuid not null, "topic" "growth_learn_topic" not null, constraint "growth_learn_title_pkey" primary key ("id"));`
        );
        this.addSql(
            `create index "growth_learn_title_household_id_index" on "growth_learn_title" ("household_id");`
        );
        this.addSql(
            `alter table "growth_learn_title" add constraint "growth_learn_title_household_id_source_key_unique" unique ("household_id", "source_key");`
        );
        this.addSql(
            `alter table "growth_learn_title" add constraint "growth_learn_title_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on update cascade on delete cascade;`
        );
        this.addSql(
            `alter table "growth_learn_title" add constraint "growth_learn_title_account_id_foreign" foreign key ("account_id") references "auth"."account" ("id") on update cascade on delete cascade;`
        );
    }

    override async down(): Promise<void> {
        this.addSql(`drop table if exists "growth_learn_title";`);
    }
}
