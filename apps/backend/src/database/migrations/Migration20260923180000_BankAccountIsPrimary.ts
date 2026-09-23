import { Migration } from '@mikro-orm/migrations';

/**
 * One primary bank-account seat per household (default for CSV / labels).
 */
export class Migration20260923180000_BankAccountIsPrimary extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `alter table "money_bank_account" add column "is_primary" boolean not null default false;`
        );
        // Prefer checking seats when backfilling an existing household’s primary.
        this.addSql(`
            update "money_bank_account" as a
            set "is_primary" = true
            where a.id = (
                select b.id
                from "money_bank_account" as b
                where b.household_id = a.household_id
                order by
                    case when b.kind = 'CHECKING' then 0 else 1 end,
                    b.created_at asc
                limit 1
            );
        `);
        this.addSql(`
            create unique index "money_bank_account_household_primary_unique"
            on "money_bank_account" ("household_id")
            where "is_primary" = true;
        `);
    }

    override async down(): Promise<void> {
        this.addSql(
            `drop index if exists "money_bank_account_household_primary_unique";`
        );
        this.addSql(`alter table "money_bank_account" drop column "is_primary";`);
    }
}
