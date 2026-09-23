import { Migration } from '@mikro-orm/migrations';

/**
 * Issuer↔retail bank partners (ICS → ING/ABN/…) + optional settlement account on seats.
 */
export class Migration20260923153000 extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
create table "backoffice"."reference_money_bank_partner" (
  "bank_id" uuid not null,
  "partner_bank_id" uuid not null,
  constraint "reference_money_bank_partner_pkey" primary key ("bank_id", "partner_bank_id")
);
`);
        this.addSql(`
alter table "backoffice"."reference_money_bank_partner"
  add constraint "reference_money_bank_partner_bank_id_foreign"
  foreign key ("bank_id") references "backoffice"."reference_money_bank" ("id")
  on update cascade on delete cascade;
`);
        this.addSql(`
alter table "backoffice"."reference_money_bank_partner"
  add constraint "reference_money_bank_partner_partner_bank_id_foreign"
  foreign key ("partner_bank_id") references "backoffice"."reference_money_bank" ("id")
  on update cascade on delete cascade;
`);

        this.addSql(
            `alter table "money_bank_account" add column "settlement_account_id" uuid null;`
        );
        this.addSql(`
alter table "money_bank_account"
  add constraint "money_bank_account_settlement_account_id_foreign"
  foreign key ("settlement_account_id") references "money_bank_account" ("id")
  on update cascade on delete set null;
`);
        this.addSql(
            `create index "money_bank_account_settlement_account_id_index" on "money_bank_account" ("settlement_account_id");`
        );
    }

    override async down(): Promise<void> {
        this.addSql(
            `alter table "money_bank_account" drop constraint if exists "money_bank_account_settlement_account_id_foreign";`
        );
        this.addSql(`drop index if exists "money_bank_account_settlement_account_id_index";`);
        this.addSql(
            `alter table "money_bank_account" drop column if exists "settlement_account_id";`
        );
        this.addSql(`drop table if exists "backoffice"."reference_money_bank_partner";`);
    }
}
