import { Migration } from '@mikro-orm/migrations';

/**
 * Catalog for one-off Transaction In suggestions (gift, refund, tax return…).
 * Keys land on money.transaction.inflow_key when picked.
 */
export class Migration20260917160000_TransactionInPreset extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            create table if not exists "backoffice"."reference_money_transaction_in_preset" (
                "id" uuid not null,
                "created_at" timestamptz not null default now(),
                "updated_at" timestamptz not null default now(),
                "key" varchar(64) not null,
                "name" varchar(120) not null,
                "group_label" varchar(64) not null,
                "icon" varchar(8) null,
                "sort_order" int not null default 0,
                "is_active" boolean not null default true,
                "jar_key" "public"."money_jar_key" null,
                constraint "reference_money_transaction_in_preset_pkey" primary key ("id")
            );
        `);
        this.addSql(`
            alter table "backoffice"."reference_money_transaction_in_preset"
            add constraint "reference_money_transaction_in_preset_key_unique" unique ("key");
        `);
    }

    override async down(): Promise<void> {
        this.addSql(
            `drop table if exists "backoffice"."reference_money_transaction_in_preset" cascade;`
        );
    }
}
