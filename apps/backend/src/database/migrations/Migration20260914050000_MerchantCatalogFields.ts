import { Migration } from '@mikro-orm/migrations';

/** Merchant catalog SSOT fields: logos, highlight, markets, match priority, provider ids. */
export class Migration20260914050000_MerchantCatalogFields extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            alter table "backoffice"."reference_money_merchant_preset"
                add column "logo_domain" varchar(120) null,
                add column "website" varchar(240) null,
                add column "highlight" varchar(16) null,
                add column "markets" jsonb not null default '["NL"]',
                add column "match_priority" int not null default 0,
                add column "provider_ids" jsonb not null default '{}';
        `);
    }

    override async down(): Promise<void> {
        this.addSql(`
            alter table "backoffice"."reference_money_merchant_preset"
                drop column "logo_domain",
                drop column "website",
                drop column "highlight",
                drop column "markets",
                drop column "match_priority",
                drop column "provider_ids";
        `);
    }
}
