import { Migration } from '@mikro-orm/migrations';

/**
 * Split merchant_preset flat columns into 1:1 children:
 * matching (needles), branding (logo/website), banking (optional iban code).
 *
 * Also absorbs iban_bank_code if Migration20260916140000 already added it on the parent;
 * otherwise banking rows are created empty until seed fills them.
 */
export class Migration20260916210000_MerchantPresetNormalize extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            create table "backoffice"."reference_money_merchant_matching" (
                "id" uuid not null,
                "created_at" timestamptz not null default now(),
                "updated_at" timestamptz not null default now(),
                "match_value" varchar(120) not null,
                "aliases" jsonb not null default '[]',
                "mcc" varchar(4) null,
                "match_priority" int not null default 0,
                "provider_ids" jsonb not null default '{}',
                "preset_id" uuid not null,
                constraint "reference_money_merchant_matching_pkey" primary key ("id")
            );
        `);
        this.addSql(`
            alter table "backoffice"."reference_money_merchant_matching"
                add constraint "reference_money_merchant_matching_preset_id_unique" unique ("preset_id");
        `);
        this.addSql(`
            alter table "backoffice"."reference_money_merchant_matching"
                add constraint "reference_money_merchant_matching_preset_id_foreign"
                foreign key ("preset_id") references "backoffice"."reference_money_merchant_preset" ("id")
                on update cascade on delete cascade;
        `);

        this.addSql(`
            create table "backoffice"."reference_money_merchant_branding" (
                "id" uuid not null,
                "created_at" timestamptz not null default now(),
                "updated_at" timestamptz not null default now(),
                "logo_domain" varchar(120) null,
                "website" varchar(240) null,
                "preset_id" uuid not null,
                constraint "reference_money_merchant_branding_pkey" primary key ("id")
            );
        `);
        this.addSql(`
            alter table "backoffice"."reference_money_merchant_branding"
                add constraint "reference_money_merchant_branding_preset_id_unique" unique ("preset_id");
        `);
        this.addSql(`
            alter table "backoffice"."reference_money_merchant_branding"
                add constraint "reference_money_merchant_branding_preset_id_foreign"
                foreign key ("preset_id") references "backoffice"."reference_money_merchant_preset" ("id")
                on update cascade on delete cascade;
        `);

        this.addSql(`
            create table "backoffice"."reference_money_merchant_banking" (
                "id" uuid not null,
                "created_at" timestamptz not null default now(),
                "updated_at" timestamptz not null default now(),
                "iban_bank_code" varchar(4) not null,
                "preset_id" uuid not null,
                constraint "reference_money_merchant_banking_pkey" primary key ("id")
            );
        `);
        this.addSql(`
            alter table "backoffice"."reference_money_merchant_banking"
                add constraint "reference_money_merchant_banking_preset_id_unique" unique ("preset_id");
        `);
        this.addSql(`
            alter table "backoffice"."reference_money_merchant_banking"
                add constraint "reference_money_merchant_banking_preset_id_foreign"
                foreign key ("preset_id") references "backoffice"."reference_money_merchant_preset" ("id")
                on update cascade on delete cascade;
        `);

        // Ensure catalog columns exist before copy (older DBs / partial migrations).
        this.addSql(`
            alter table "backoffice"."reference_money_merchant_preset"
                add column if not exists "logo_domain" varchar(120) null,
                add column if not exists "website" varchar(240) null,
                add column if not exists "highlight" varchar(16) null,
                add column if not exists "markets" jsonb not null default '["NL"]',
                add column if not exists "match_priority" int not null default 0,
                add column if not exists "provider_ids" jsonb not null default '{}',
                add column if not exists "iban_bank_code" varchar(4) null;
        `);

        this.addSql(`
            insert into "backoffice"."reference_money_merchant_matching" (
                "id", "created_at", "updated_at",
                "match_value", "aliases", "mcc", "match_priority", "provider_ids", "preset_id"
            )
            select
                gen_random_uuid(),
                now(),
                now(),
                p."match_value",
                coalesce(p."aliases", '[]'::jsonb),
                p."mcc",
                coalesce(p."match_priority", 0),
                coalesce(p."provider_ids", '{}'::jsonb),
                p."id"
            from "backoffice"."reference_money_merchant_preset" p;
        `);

        this.addSql(`
            insert into "backoffice"."reference_money_merchant_branding" (
                "id", "created_at", "updated_at",
                "logo_domain", "website", "preset_id"
            )
            select
                gen_random_uuid(),
                now(),
                now(),
                p."logo_domain",
                p."website",
                p."id"
            from "backoffice"."reference_money_merchant_preset" p;
        `);

        this.addSql(`
            insert into "backoffice"."reference_money_merchant_banking" (
                "id", "created_at", "updated_at",
                "iban_bank_code", "preset_id"
            )
            select
                gen_random_uuid(),
                now(),
                now(),
                p."iban_bank_code",
                p."id"
            from "backoffice"."reference_money_merchant_preset" p
            where p."iban_bank_code" is not null and length(trim(p."iban_bank_code")) = 4;
        `);

        this.addSql(`
            alter table "backoffice"."reference_money_merchant_preset"
                drop column if exists "match_value",
                drop column if exists "aliases",
                drop column if exists "mcc",
                drop column if exists "match_priority",
                drop column if exists "provider_ids",
                drop column if exists "logo_domain",
                drop column if exists "website",
                drop column if exists "iban_bank_code";
        `);
    }

    override async down(): Promise<void> {
        this.addSql(`
            alter table "backoffice"."reference_money_merchant_preset"
                add column if not exists "match_value" varchar(120) null,
                add column if not exists "aliases" jsonb not null default '[]',
                add column if not exists "mcc" varchar(4) null,
                add column if not exists "match_priority" int not null default 0,
                add column if not exists "provider_ids" jsonb not null default '{}',
                add column if not exists "logo_domain" varchar(120) null,
                add column if not exists "website" varchar(240) null,
                add column if not exists "iban_bank_code" varchar(4) null;
        `);

        this.addSql(`
            update "backoffice"."reference_money_merchant_preset" p
            set
                "match_value" = m."match_value",
                "aliases" = m."aliases",
                "mcc" = m."mcc",
                "match_priority" = m."match_priority",
                "provider_ids" = m."provider_ids"
            from "backoffice"."reference_money_merchant_matching" m
            where m."preset_id" = p."id";
        `);

        this.addSql(`
            update "backoffice"."reference_money_merchant_preset" p
            set
                "logo_domain" = b."logo_domain",
                "website" = b."website"
            from "backoffice"."reference_money_merchant_branding" b
            where b."preset_id" = p."id";
        `);

        this.addSql(`
            update "backoffice"."reference_money_merchant_preset" p
            set "iban_bank_code" = k."iban_bank_code"
            from "backoffice"."reference_money_merchant_banking" k
            where k."preset_id" = p."id";
        `);

        this.addSql(`
            alter table "backoffice"."reference_money_merchant_preset"
                alter column "match_value" set not null;
        `);

        this.addSql(`drop table if exists "backoffice"."reference_money_merchant_banking";`);
        this.addSql(`drop table if exists "backoffice"."reference_money_merchant_branding";`);
        this.addSql(`drop table if exists "backoffice"."reference_money_merchant_matching";`);
    }
}
