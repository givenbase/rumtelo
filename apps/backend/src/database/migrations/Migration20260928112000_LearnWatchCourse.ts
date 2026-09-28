import { Migration } from '@mikro-orm/migrations';

/**
 * Courses on the Learn watch shelf — Udemy / MasterClass pointers, not hosted video.
 * partner names the school; null for films, series, videos, podcasts.
 */
export class Migration20260928112000_LearnWatchCourse extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `alter type "public"."growth_learn_watch_kind" add value if not exists 'COURSE';`
        );
        this.addSql(
            `alter table "backoffice"."reference_growth_watch_preset" add column "partner" varchar(64) null;`
        );
    }

    override async down(): Promise<void> {
        this.addSql(
            `alter table "backoffice"."reference_growth_watch_preset" drop column if exists "partner";`
        );
        // Postgres cannot drop a single enum value safely.
    }
}
