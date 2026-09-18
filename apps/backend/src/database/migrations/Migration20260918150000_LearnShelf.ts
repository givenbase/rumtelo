import { Migration } from '@mikro-orm/migrations';

/** A person's Learn shelf: picked titles, and which skills are in focus. */
export class Migration20260918150000_LearnShelf extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `create type "growth_learn_progress_status" as enum ('QUEUE', 'NOW', 'DONE');`
        );
        this.addSql(
            `create type "growth_learn_skill_key" as enum ('MONEY', 'COMMUNICATION', 'MARKETING');`
        );
        this.addSql(
            `create table "growth_learn_progress" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_id" uuid not null, "piece_key" varchar(64) not null, "due_on" date null, "account_id" uuid not null, "status" "growth_learn_progress_status" not null, "skill" "growth_learn_skill_key" not null, constraint "growth_learn_progress_pkey" primary key ("id"));`
        );
        this.addSql(
            `create index "growth_learn_progress_household_id_index" on "growth_learn_progress" ("household_id");`
        );
        this.addSql(
            `alter table "growth_learn_progress" add constraint "growth_learn_progress_household_id_account_id_piece_key_unique" unique ("household_id", "account_id", "piece_key");`
        );
        this.addSql(
            `alter table "growth_learn_progress" add constraint "growth_learn_progress_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on update cascade on delete cascade;`
        );
        this.addSql(
            `alter table "growth_learn_progress" add constraint "growth_learn_progress_account_id_foreign" foreign key ("account_id") references "auth"."account" ("id") on update cascade on delete cascade;`
        );

        this.addSql(
            `create table "growth_learn_focus" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_id" uuid not null, "account_id" uuid not null, "skill" "growth_learn_skill_key" not null, constraint "growth_learn_focus_pkey" primary key ("id"));`
        );
        this.addSql(
            `create index "growth_learn_focus_household_id_index" on "growth_learn_focus" ("household_id");`
        );
        this.addSql(
            `alter table "growth_learn_focus" add constraint "growth_learn_focus_household_id_account_id_skill_unique" unique ("household_id", "account_id", "skill");`
        );
        this.addSql(
            `alter table "growth_learn_focus" add constraint "growth_learn_focus_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on update cascade on delete cascade;`
        );
        this.addSql(
            `alter table "growth_learn_focus" add constraint "growth_learn_focus_account_id_foreign" foreign key ("account_id") references "auth"."account" ("id") on update cascade on delete cascade;`
        );
    }

    override async down(): Promise<void> {
        this.addSql(`drop table if exists "growth_learn_focus";`);
        this.addSql(`drop table if exists "growth_learn_progress";`);
        this.addSql(`drop type if exists "growth_learn_skill_key";`);
        this.addSql(`drop type if exists "growth_learn_progress_status";`);
    }
}
