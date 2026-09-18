import { Migration } from '@mikro-orm/migrations';

/** SAVE goals: priority within a jar — lower sortOrder = higher focus. */
export class Migration20260917223000_GoalSortOrder extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            alter table "money_goal"
            add column if not exists "sort_order" int not null default 0;
        `);
    }

    override async down(): Promise<void> {
        this.addSql(`
            alter table "money_goal"
            drop column if exists "sort_order";
        `);
    }
}
