import { Migration } from '@mikro-orm/migrations';

/**
 * A learning section is a key, like a category key. The Postgres enum cannot grow
 * without a migration, so the column becomes text and the type goes away.
 */
export class Migration20260918190000_LearnSectionKey extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `alter table "backoffice"."reference_growth_book_preset" alter column "topic" type varchar(64) using "topic"::text;`
        );
        this.addSql(
            `alter table "backoffice"."reference_growth_watch_preset" alter column "topic" type varchar(64) using "topic"::text;`
        );
        this.addSql(
            `alter table "growth_learn_title" alter column "topic" type varchar(64) using "topic"::text;`
        );
        this.addSql(`drop type "growth_learn_topic";`);
    }

    override async down(): Promise<void> {
        this.addSql(
            `create type "growth_learn_topic" as enum ('SAVE', 'SPEND', 'EARN', 'MIND', 'RELATIONSHIPS', 'HEALTH', 'LEADERSHIP');`
        );
        this.addSql(
            `alter table "backoffice"."reference_growth_book_preset" alter column "topic" type "growth_learn_topic" using "topic"::"growth_learn_topic";`
        );
        this.addSql(
            `alter table "backoffice"."reference_growth_watch_preset" alter column "topic" type "growth_learn_topic" using "topic"::"growth_learn_topic";`
        );
        this.addSql(
            `alter table "growth_learn_title" alter column "topic" type "growth_learn_topic" using "topic"::"growth_learn_topic";`
        );
    }
}
