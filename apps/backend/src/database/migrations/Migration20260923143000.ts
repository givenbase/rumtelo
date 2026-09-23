import { Migration } from '@mikro-orm/migrations';

/**
 * Dedicated Bank catalog + real FKs from household accounts / settings.
 * Replaces bank_key snapshot; drops merchant_banking (IBAN codes live on Bank).
 */
export class Migration20260923143000 extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
create table "backoffice"."reference_money_bank" (
  "id" uuid not null,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now(),
  "key" varchar(64) not null,
  "name" varchar(120) not null,
  "sort_order" int not null default 0,
  "is_active" boolean not null default true,
  "description" text null,
  "countries" jsonb not null,
  "iban_bank_code" varchar(4) null,
  "logo_domain" varchar(120) null,
  "website" varchar(240) null,
  constraint "reference_money_bank_pkey" primary key ("id")
);
`);
        this.addSql(
            `alter table "backoffice"."reference_money_bank" add constraint "reference_money_bank_key_unique" unique ("key");`
        );

        this.addSql(
            `insert into "backoffice"."reference_money_bank" ("id", "created_at", "updated_at", "key", "name", "sort_order", "is_active", "description", "countries", "iban_bank_code", "logo_domain", "website") values (gen_random_uuid(), now(), now(), 'ING', 'ING', 0, true, null, '["NL"]'::jsonb, 'INGB', 'ing.nl', 'https://ing.nl');`
        );
        this.addSql(
            `insert into "backoffice"."reference_money_bank" ("id", "created_at", "updated_at", "key", "name", "sort_order", "is_active", "description", "countries", "iban_bank_code", "logo_domain", "website") values (gen_random_uuid(), now(), now(), 'ABN_AMRO', 'ABN AMRO', 1, true, null, '["NL"]'::jsonb, 'ABNA', 'abnamro.nl', 'https://abnamro.nl');`
        );
        this.addSql(
            `insert into "backoffice"."reference_money_bank" ("id", "created_at", "updated_at", "key", "name", "sort_order", "is_active", "description", "countries", "iban_bank_code", "logo_domain", "website") values (gen_random_uuid(), now(), now(), 'RABOBANK', 'Rabobank', 2, true, null, '["NL"]'::jsonb, 'RABO', 'rabobank.nl', 'https://rabobank.nl');`
        );
        this.addSql(
            `insert into "backoffice"."reference_money_bank" ("id", "created_at", "updated_at", "key", "name", "sort_order", "is_active", "description", "countries", "iban_bank_code", "logo_domain", "website") values (gen_random_uuid(), now(), now(), 'BUNQ', 'bunq', 3, true, null, '["NL"]'::jsonb, 'BUNQ', 'bunq.com', 'https://bunq.com');`
        );
        this.addSql(
            `insert into "backoffice"."reference_money_bank" ("id", "created_at", "updated_at", "key", "name", "sort_order", "is_active", "description", "countries", "iban_bank_code", "logo_domain", "website") values (gen_random_uuid(), now(), now(), 'REVOLUT', 'Revolut', 4, true, null, '["NL"]'::jsonb, null, 'revolut.com', 'https://revolut.com');`
        );
        this.addSql(
            `insert into "backoffice"."reference_money_bank" ("id", "created_at", "updated_at", "key", "name", "sort_order", "is_active", "description", "countries", "iban_bank_code", "logo_domain", "website") values (gen_random_uuid(), now(), now(), 'N26', 'N26', 5, true, null, '["NL"]'::jsonb, null, 'n26.com', 'https://n26.com');`
        );
        this.addSql(
            `insert into "backoffice"."reference_money_bank" ("id", "created_at", "updated_at", "key", "name", "sort_order", "is_active", "description", "countries", "iban_bank_code", "logo_domain", "website") values (gen_random_uuid(), now(), now(), 'TRIODOS', 'Triodos', 6, true, null, '["NL"]'::jsonb, 'TRIO', 'triodos.nl', 'https://triodos.nl');`
        );
        this.addSql(
            `insert into "backoffice"."reference_money_bank" ("id", "created_at", "updated_at", "key", "name", "sort_order", "is_active", "description", "countries", "iban_bank_code", "logo_domain", "website") values (gen_random_uuid(), now(), now(), 'ASN_BANK', 'ASN Bank', 7, true, null, '["NL"]'::jsonb, 'ASNB', 'asnbank.nl', 'https://asnbank.nl');`
        );
        this.addSql(
            `insert into "backoffice"."reference_money_bank" ("id", "created_at", "updated_at", "key", "name", "sort_order", "is_active", "description", "countries", "iban_bank_code", "logo_domain", "website") values (gen_random_uuid(), now(), now(), 'SNS', 'SNS', 8, true, null, '["NL"]'::jsonb, 'SNSB', 'snsbank.nl', 'https://snsbank.nl');`
        );
        this.addSql(
            `insert into "backoffice"."reference_money_bank" ("id", "created_at", "updated_at", "key", "name", "sort_order", "is_active", "description", "countries", "iban_bank_code", "logo_domain", "website") values (gen_random_uuid(), now(), now(), 'REGIOBANK', 'RegioBank', 9, true, null, '["NL"]'::jsonb, 'RBRB', 'regiobank.nl', 'https://regiobank.nl');`
        );
        this.addSql(
            `insert into "backoffice"."reference_money_bank" ("id", "created_at", "updated_at", "key", "name", "sort_order", "is_active", "description", "countries", "iban_bank_code", "logo_domain", "website") values (gen_random_uuid(), now(), now(), 'KNAB', 'Knab', 10, true, null, '["NL"]'::jsonb, 'KNAB', 'knab.nl', 'https://knab.nl');`
        );
        this.addSql(
            `insert into "backoffice"."reference_money_bank" ("id", "created_at", "updated_at", "key", "name", "sort_order", "is_active", "description", "countries", "iban_bank_code", "logo_domain", "website") values (gen_random_uuid(), now(), now(), 'OPENBANK', 'Openbank', 11, true, null, '["NL"]'::jsonb, null, 'openbank.nl', 'https://openbank.nl');`
        );
        this.addSql(
            `insert into "backoffice"."reference_money_bank" ("id", "created_at", "updated_at", "key", "name", "sort_order", "is_active", "description", "countries", "iban_bank_code", "logo_domain", "website") values (gen_random_uuid(), now(), now(), 'AMEX', 'American Express', 12, true, null, '["NL"]'::jsonb, null, 'americanexpress.com', 'https://www.americanexpress.com/nl/');`
        );
        this.addSql(
            `insert into "backoffice"."reference_money_bank" ("id", "created_at", "updated_at", "key", "name", "sort_order", "is_active", "description", "countries", "iban_bank_code", "logo_domain", "website") values (gen_random_uuid(), now(), now(), 'ICS', 'ICS', 13, true, null, '["NL"]'::jsonb, null, 'icscards.nl', 'https://www.icscards.nl');`
        );
        this.addSql(
            `insert into "backoffice"."reference_money_bank" ("id", "created_at", "updated_at", "key", "name", "sort_order", "is_active", "description", "countries", "iban_bank_code", "logo_domain", "website") values (gen_random_uuid(), now(), now(), 'DINERS', 'Diners Club', 14, true, null, '["NL"]'::jsonb, null, 'dinersclub.nl', 'https://www.dinersclub.nl');`
        );

        this.addSql(`alter table "money_bank_account" add column "bank_id" uuid null;`);
        this.addSql(`
update "money_bank_account" as a
set "bank_id" = b."id"
from "backoffice"."reference_money_bank" as b
where a."bank_key" is not null
  and a."bank_key" <> 'OTHER'
  and a."bank_key" = b."key";
`);
        // Every account must have a catalog bank (manual seats included).
        this.addSql(`
update "money_bank_account"
set "bank_id" = (select "id" from "backoffice"."reference_money_bank" where "key" = 'ING' limit 1)
where "bank_id" is null;
`);
        this.addSql(
            `drop index if exists "money_bank_account_household_id_bank_key_index";`
        );
        this.addSql(`alter table "money_bank_account" drop column if exists "bank_key";`);
        this.addSql(
            `alter table "money_bank_account" alter column "bank_id" set not null;`
        );
        this.addSql(`
alter table "money_bank_account"
  add constraint "money_bank_account_bank_id_foreign"
  foreign key ("bank_id") references "backoffice"."reference_money_bank" ("id")
  on update cascade on delete restrict;
`);
        this.addSql(
            `create index "money_bank_account_bank_id_index" on "money_bank_account" ("bank_id");`
        );

        this.addSql(`alter table "auth"."household_settings" add column "main_bank_id" uuid null;`);
        this.addSql(`
alter table "auth"."household_settings"
  add constraint "household_settings_main_bank_id_foreign"
  foreign key ("main_bank_id") references "backoffice"."reference_money_bank" ("id")
  on update cascade on delete set null;
`);
        this.addSql(
            `create index "household_settings_main_bank_id_index" on "auth"."household_settings" ("main_bank_id");`
        );

        this.addSql(
            `alter table "backoffice"."reference_money_merchant_banking" drop constraint if exists "reference_money_merchant_banking_preset_id_foreign";`
        );
        this.addSql(`drop table if exists "backoffice"."reference_money_merchant_banking";`);
    }

    override async down(): Promise<void> {
        this.addSql(
            `create table "backoffice"."reference_money_merchant_banking" ("id" uuid not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "iban_bank_code" varchar(4) not null, "preset_id" uuid not null, constraint "reference_money_merchant_banking_pkey" primary key ("id"));`
        );
        this.addSql(
            `alter table "backoffice"."reference_money_merchant_banking" add constraint "reference_money_merchant_banking_preset_id_unique" unique ("preset_id");`
        );
        this.addSql(
            `alter table "backoffice"."reference_money_merchant_banking" add constraint "reference_money_merchant_banking_preset_id_foreign" foreign key ("preset_id") references "backoffice"."reference_money_merchant_preset" ("id") on update cascade on delete cascade;`
        );

        this.addSql(
            `alter table "auth"."household_settings" drop constraint if exists "household_settings_main_bank_id_foreign";`
        );
        this.addSql(`drop index if exists "auth"."household_settings_main_bank_id_index";`);
        this.addSql(
            `alter table "auth"."household_settings" drop column if exists "main_bank_id";`
        );

        this.addSql(
            `alter table "money_bank_account" drop constraint if exists "money_bank_account_bank_id_foreign";`
        );
        this.addSql(`drop index if exists "money_bank_account_bank_id_index";`);
        this.addSql(`alter table "money_bank_account" add column "bank_key" varchar(64) null;`);
        this.addSql(`
update "money_bank_account" as a
set "bank_key" = b."key"
from "backoffice"."reference_money_bank" as b
where a."bank_id" = b."id";
`);
        this.addSql(`alter table "money_bank_account" drop column if exists "bank_id";`);
        this.addSql(
            `create index "money_bank_account_household_id_bank_key_index" on "money_bank_account" ("household_id", "bank_key");`
        );

        this.addSql(`drop table if exists "backoffice"."reference_money_bank";`);
    }
}
