import { Migration } from '@mikro-orm/migrations';

/**
 * Debt schedule (start / cadence / term or deadline) plus payment links:
 * transactions and fixed costs may point at a debt.
 */
export class Migration20260917190000_DebtScheduleAndPaymentLinks extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            do $$ begin
                create type "money_debt_schedule_kind" as enum ('OPEN', 'TERM', 'DEADLINE');
            exception when duplicate_object then null;
            end $$;
        `);

        this.addSql(`
            alter table "money_debt"
                add column if not exists "started_on" date null,
                add column if not exists "term_payments" int null,
                add column if not exists "maturity_on" date null,
                add column if not exists "schedule_kind" "public"."money_debt_schedule_kind" not null default 'OPEN',
                add column if not exists "payment_cadence" "public"."money_cadence" not null default 'MONTHLY';
        `);

        this.addSql(`
            alter table "money_transaction"
                add column if not exists "debt_id" uuid null;
        `);
        this.addSql(`
            alter table "money_transaction"
                add constraint "money_transaction_debt_id_foreign"
                foreign key ("debt_id") references "money_debt" ("id")
                on update cascade on delete set null;
        `);
        this.addSql(`
            create index if not exists "money_transaction_debt_id_index"
                on "money_transaction" ("debt_id");
        `);

        this.addSql(`
            alter table "money_fixed_cost"
                add column if not exists "debt_id" uuid null;
        `);
        this.addSql(`
            alter table "money_fixed_cost"
                add constraint "money_fixed_cost_debt_id_foreign"
                foreign key ("debt_id") references "money_debt" ("id")
                on update cascade on delete set null;
        `);
        this.addSql(`
            alter table "money_fixed_cost"
                add constraint "money_fixed_cost_debt_id_unique" unique ("debt_id");
        `);
    }

    override async down(): Promise<void> {
        this.addSql(`
            alter table "money_fixed_cost"
                drop constraint if exists "money_fixed_cost_debt_id_unique";
        `);
        this.addSql(`
            alter table "money_fixed_cost"
                drop constraint if exists "money_fixed_cost_debt_id_foreign";
        `);
        this.addSql(`
            alter table "money_fixed_cost"
                drop column if exists "debt_id";
        `);

        this.addSql(`
            drop index if exists "money_transaction_debt_id_index";
        `);
        this.addSql(`
            alter table "money_transaction"
                drop constraint if exists "money_transaction_debt_id_foreign";
        `);
        this.addSql(`
            alter table "money_transaction"
                drop column if exists "debt_id";
        `);

        this.addSql(`
            alter table "money_debt"
                drop column if exists "started_on",
                drop column if exists "term_payments",
                drop column if exists "maturity_on",
                drop column if exists "schedule_kind",
                drop column if exists "payment_cadence";
        `);

        this.addSql(`drop type if exists "money_debt_schedule_kind";`);
    }
}
