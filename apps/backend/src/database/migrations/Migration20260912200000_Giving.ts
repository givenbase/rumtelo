import { Migration } from '@mikro-orm/migrations';

/**
 * Giving:
 * - backoffice.reference_money_giving_organisation — editorial catalog of vetted
 *   organisations for the Give jar (independent signals, reporting).
 * - money_fixed_cost.counterparty — who a recurring amount goes to.
 * - money_goal_kind += GIVE — a yearly pledge filled by money leaving the Give jar.
 */
export class Migration20260912200000_Giving extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            create table if not exists "backoffice"."reference_money_giving_organisation" (
                "id" uuid not null,
                "created_at" timestamptz not null default now(),
                "updated_at" timestamptz not null default now(),
                "key" varchar(64) not null,
                "name" varchar(120) not null,
                "summary" text not null,
                "country" varchar(2) null,
                "causes" jsonb not null default '[]',
                "scope" varchar(64) null,
                "website" text not null,
                "signals" jsonb not null default '[]',
                "reporting" text null,
                "sort_order" int not null default 0,
                "is_active" boolean not null default true,
                constraint "reference_money_giving_organisation_pkey" primary key ("id")
            );
        `);
        this.addSql(`
            do $$ begin
                alter table "backoffice"."reference_money_giving_organisation"
                    add constraint "reference_money_giving_organisation_key_unique" unique ("key");
            exception when duplicate_table then null;
                      when duplicate_object then null;
            end $$;
        `);

        this.addSql(`
            alter table "money_fixed_cost"
                add column if not exists "counterparty" varchar(160) null;
        `);

        // Enum values cannot be added inside a transaction block on older Postgres;
        // MikroORM runs each addSql statement in the migration transaction, which
        // Postgres ≥ 12 allows for ADD VALUE as long as the new value is not used
        // in the same transaction.
        this.addSql(`alter type "money_goal_kind" add value if not exists 'GIVE';`);
    }

    override async down(): Promise<void> {
        this.addSql(`drop table if exists "backoffice"."reference_money_giving_organisation" cascade;`);
        this.addSql(`alter table "money_fixed_cost" drop column if exists "counterparty";`);
        // Postgres cannot drop a single enum value; GIVE rows would need re-kinding first.
    }
}
