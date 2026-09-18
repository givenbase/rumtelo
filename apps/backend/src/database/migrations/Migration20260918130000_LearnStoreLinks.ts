import { Migration } from '@mikro-orm/migrations';

/** Learn presets point at a store: ISBN on books, a where-to-watch page on films and series. */
export class Migration20260918130000_LearnStoreLinks extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `alter table "backoffice"."reference_growth_book_preset" add column "isbn13" varchar(13) null;`
        );
        this.addSql(
            `alter table "backoffice"."reference_growth_watch_preset" add column "watch_url" varchar(280) null;`
        );
    }

    override async down(): Promise<void> {
        this.addSql(`alter table "backoffice"."reference_growth_book_preset" drop column "isbn13";`);
        this.addSql(
            `alter table "backoffice"."reference_growth_watch_preset" drop column "watch_url";`
        );
    }
}
