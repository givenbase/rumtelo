import { Migration } from '@mikro-orm/migrations';

/**
 * Fixed-cost period settlements + optional transaction → fixed cost link.
 */
export class Migration20260921200000_FixedCostSettlement extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `create type "money_fixed_cost_settlement_status" as enum ('PAID', 'SKIPPED');`
        );
        this.addSql(
            `create type "money_fixed_cost_settlement_source" as enum ('MATCHED', 'MARK_PAID', 'SKIP', 'LINKED');`
        );

        this.addSql(
            `create table "money_fixed_cost_settlement" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "household_id" uuid not null, "period" varchar(7) not null, "paid_at" timestamptz null, "amount" bigint null, "note" text null, "status" "public"."money_fixed_cost_settlement_status" not null default 'PAID', "source" "public"."money_fixed_cost_settlement_source" not null default 'MARK_PAID', "fixed_cost_id" uuid not null, "transaction_id" uuid null, constraint "money_fixed_cost_settlement_pkey" primary key ("id"));`
        );
        this.addSql(
            `create index "money_fixed_cost_settlement_household_id_index" on "money_fixed_cost_settlement" ("household_id");`
        );
        this.addSql(
            `create index "money_fixed_cost_settlement_period_index" on "money_fixed_cost_settlement" ("period");`
        );
        this.addSql(
            `create index "money_fixed_cost_settlement_transaction_id_index" on "money_fixed_cost_settlement" ("transaction_id");`
        );
        this.addSql(
            `alter table "money_fixed_cost_settlement" add constraint "money_fixed_cost_settlement_fixed_cost_id_period_unique" unique ("fixed_cost_id", "period");`
        );

        this.addSql(
            `alter table "money_fixed_cost_settlement" add constraint "money_fixed_cost_settlement_household_id_foreign" foreign key ("household_id") references "auth"."household" ("id") on update cascade on delete cascade;`
        );
        this.addSql(
            `alter table "money_fixed_cost_settlement" add constraint "money_fixed_cost_settlement_fixed_cost_id_foreign" foreign key ("fixed_cost_id") references "money_fixed_cost" ("id") on update cascade on delete cascade;`
        );
        this.addSql(
            `alter table "money_fixed_cost_settlement" add constraint "money_fixed_cost_settlement_transaction_id_foreign" foreign key ("transaction_id") references "money_transaction" ("id") on update cascade on delete set null;`
        );

        this.addSql(`alter table "money_transaction" add column "fixed_cost_id" uuid null;`);
        this.addSql(
            `create index "money_transaction_fixed_cost_id_index" on "money_transaction" ("fixed_cost_id");`
        );
        this.addSql(
            `alter table "money_transaction" add constraint "money_transaction_fixed_cost_id_foreign" foreign key ("fixed_cost_id") references "money_fixed_cost" ("id") on update cascade on delete set null;`
        );
    }

    override async down(): Promise<void> {
        this.addSql(
            `alter table "money_transaction" drop constraint "money_transaction_fixed_cost_id_foreign";`
        );
        this.addSql(`drop index "money_transaction_fixed_cost_id_index";`);
        this.addSql(`alter table "money_transaction" drop column "fixed_cost_id";`);

        this.addSql(
            `alter table "money_fixed_cost_settlement" drop constraint "money_fixed_cost_settlement_transaction_id_foreign";`
        );
        this.addSql(
            `alter table "money_fixed_cost_settlement" drop constraint "money_fixed_cost_settlement_fixed_cost_id_foreign";`
        );
        this.addSql(
            `alter table "money_fixed_cost_settlement" drop constraint "money_fixed_cost_settlement_household_id_foreign";`
        );
        this.addSql(`drop table if exists "money_fixed_cost_settlement" cascade;`);

        this.addSql(`drop type "money_fixed_cost_settlement_source";`);
        this.addSql(`drop type "money_fixed_cost_settlement_status";`);
    }
}
