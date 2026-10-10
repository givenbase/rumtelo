import { Migration } from '@mikro-orm/migrations';

/**
 * Carry unpaid fixed costs across month close (ROLLED) and clear them when a
 * later period is paid. cleared_by_period tracks which payment settled arrears.
 */
export class Migration20261010160000_FixedCostRollArrears extends Migration {
    override name = 'Migration20261010160000_FixedCostRollArrears';

    override up(): void | Promise<void> {
        this.addSql(
            `alter type "money_fixed_cost_settlement_status" add value if not exists 'ROLLED';`
        );
        this.addSql(
            `alter type "money_fixed_cost_settlement_source" add value if not exists 'ROLL';`
        );
        this.addSql(
            `alter table "money_fixed_cost_settlement" add column "cleared_by_period" varchar(7) null;`
        );
        this.addSql(
            `create index "money_fixed_cost_settlement_cleared_by_period_index" on "money_fixed_cost_settlement" ("cleared_by_period");`
        );
    }

    override down(): void | Promise<void> {
        this.addSql(`drop index "money_fixed_cost_settlement_cleared_by_period_index";`);
        this.addSql(`alter table "money_fixed_cost_settlement" drop column "cleared_by_period";`);
        // Postgres cannot remove enum values safely — leave ROLLED / ROLL in place.
    }
}
