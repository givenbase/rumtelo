import { Migration } from '@mikro-orm/migrations';

/**
 * Podcasts on the Learn watch shelf — show-level pointers, not hosted audio.
 */
export class Migration20260928081500_LearnWatchPodcast extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `alter type "public"."growth_learn_watch_kind" add value if not exists 'PODCAST';`
        );
    }

    override async down(): Promise<void> {
        // Postgres cannot drop a single enum value safely.
    }
}
