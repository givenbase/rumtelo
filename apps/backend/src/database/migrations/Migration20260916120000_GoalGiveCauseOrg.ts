import { Migration } from '@mikro-orm/migrations';

/** GIVE goals: reserve a cause and optional organisation catalog key. */
export class Migration20260916120000_GoalGiveCauseOrg extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            alter table "money_goal"
            add column if not exists "cause" varchar(32) null,
            add column if not exists "org_key" varchar(64) null;
        `);
    }

    override async down(): Promise<void> {
        this.addSql(`
            alter table "money_goal"
            drop column if exists "cause",
            drop column if exists "org_key";
        `);
    }
}
