import { Migration } from '@mikro-orm/migrations';

/** Card issuers that are not retail banks (Amex, ICS, Diners). Idempotent inserts. */
export class Migration20260923152000 extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
insert into "backoffice"."reference_money_bank"
  ("id", "created_at", "updated_at", "key", "name", "sort_order", "is_active", "description", "countries", "iban_bank_code", "logo_domain", "website")
select gen_random_uuid(), now(), now(), 'AMEX', 'American Express', 12, true, null, '["NL"]'::jsonb, null, 'americanexpress.com', 'https://www.americanexpress.com/nl/'
where not exists (select 1 from "backoffice"."reference_money_bank" where "key" = 'AMEX');
`);
        this.addSql(`
insert into "backoffice"."reference_money_bank"
  ("id", "created_at", "updated_at", "key", "name", "sort_order", "is_active", "description", "countries", "iban_bank_code", "logo_domain", "website")
select gen_random_uuid(), now(), now(), 'ICS', 'ICS', 13, true, null, '["NL"]'::jsonb, null, 'icscards.nl', 'https://www.icscards.nl'
where not exists (select 1 from "backoffice"."reference_money_bank" where "key" = 'ICS');
`);
        this.addSql(`
insert into "backoffice"."reference_money_bank"
  ("id", "created_at", "updated_at", "key", "name", "sort_order", "is_active", "description", "countries", "iban_bank_code", "logo_domain", "website")
select gen_random_uuid(), now(), now(), 'DINERS', 'Diners Club', 14, true, null, '["NL"]'::jsonb, null, 'dinersclub.nl', 'https://www.dinersclub.nl'
where not exists (select 1 from "backoffice"."reference_money_bank" where "key" = 'DINERS');
`);
    }

    override async down(): Promise<void> {
        this.addSql(
            `delete from "backoffice"."reference_money_bank" where "key" in ('AMEX', 'ICS', 'DINERS');`
        );
    }
}
