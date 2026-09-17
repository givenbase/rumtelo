import { Migration } from '@mikro-orm/migrations';

/**
 * Lifestyle audiences for the bill picker (icon, colors, description).
 * Grow by seeding rows — not by adding a contracts enum.
 * Also renames fixed_cost_preset.audience_tags → audience_keys.
 */
export class Migration20260917190000_AudienceCatalog extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            create table if not exists "backoffice"."reference_money_audience" (
                "id" uuid not null,
                "created_at" timestamptz not null default now(),
                "updated_at" timestamptz not null default now(),
                "key" varchar(64) not null,
                "name" varchar(120) not null,
                "description" text null,
                "is_baseline" boolean not null default false,
                "sort_order" int not null default 0,
                "is_active" boolean not null default true,
                "icon" varchar(8) null,
                "accent_color" varchar(64) null,
                "soft_color" varchar(64) null,
                constraint "reference_money_audience_pkey" primary key ("id")
            );
        `);
        this.addSql(`
            alter table "backoffice"."reference_money_audience"
            add constraint "reference_money_audience_key_unique" unique ("key");
        `);
        // Drop unfinished AudienceTag table if a prior attempt created it.
        this.addSql(`drop table if exists "backoffice"."reference_money_audience_tag" cascade;`);
        this.addSql(`
            alter table "backoffice"."reference_money_fixed_cost_preset"
            rename column "audience_tags" to "audience_keys";
        `);
    }

    override async down(): Promise<void> {
        this.addSql(`
            alter table "backoffice"."reference_money_fixed_cost_preset"
            rename column "audience_keys" to "audience_tags";
        `);
        this.addSql(`drop table if exists "backoffice"."reference_money_audience" cascade;`);
    }
}
