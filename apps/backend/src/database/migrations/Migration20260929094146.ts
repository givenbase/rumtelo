import { Migration } from '@mikro-orm/migrations';

/**
 * Add `due_month` for yearly-cadence debt / fixed-cost schedules.
 *
 * MikroORM `db:gen` also emits no-op `alter … type jsonb` / enum re-casts when
 * the snapshot drifts from live Postgres — those were stripped. Re-run `db:gen`
 * only after entities change; if the diff is only jsonb/enum noise, discard it
 * and refresh `.snapshot-railway.json` via a no-op migrate cycle instead.
 */
export class Migration20260929094146 extends Migration {
    override async up(): Promise<void> {
        this.addSql(`alter table "money_debt" add column "due_month" smallint null;`);
        this.addSql(`alter table "money_fixed_cost" add column "due_month" smallint null;`);
    }

    override async down(): Promise<void> {
        this.addSql(`alter table "money_debt" drop column "due_month";`);
        this.addSql(`alter table "money_fixed_cost" drop column "due_month";`);
    }
}
