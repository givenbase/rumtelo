import { Migration } from '@mikro-orm/migrations';

/** The order a person wants to take the titles they already picked. 1 is next. */
export class Migration20260918220000_LearnProgressRank extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `alter table "growth_learn_progress" add column "rank" int not null default 1;`
        );
    }

    override async down(): Promise<void> {
        this.addSql(`alter table "growth_learn_progress" drop column "rank";`);
    }
}
