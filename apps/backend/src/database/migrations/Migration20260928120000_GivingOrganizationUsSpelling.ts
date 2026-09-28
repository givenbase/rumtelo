import { Migration } from '@mikro-orm/migrations';

/**
 * US spelling: organisation → organization on giving catalog + FKs / goal snapshot.
 */
export class Migration20260928120000_GivingOrganizationUsSpelling extends Migration {
    override async up(): Promise<void> {
        // Catalog table
        this.addSql(
            `alter table "backoffice"."reference_money_giving_organisation" rename to "reference_money_giving_organization";`
        );
        this.addSql(
            `alter table "backoffice"."reference_money_giving_organization" rename constraint "reference_money_giving_organisation_pkey" to "reference_money_giving_organization_pkey";`
        );
        this.addSql(
            `alter table "backoffice"."reference_money_giving_organization" rename constraint "reference_money_giving_organisation_key_unique" to "reference_money_giving_organization_key_unique";`
        );

        // Merchant FK
        this.addSql(
            `alter table "backoffice"."reference_money_merchant_preset" drop constraint if exists "reference_money_merchant_preset_giving_organisation_id_foreign";`
        );
        this.addSql(
            `drop index if exists "backoffice"."reference_money_merchant_preset_giving_organisation_id_index";`
        );
        this.addSql(
            `alter table "backoffice"."reference_money_merchant_preset" rename column "giving_organisation_id" to "giving_organization_id";`
        );
        this.addSql(`
            alter table "backoffice"."reference_money_merchant_preset"
            add constraint "reference_money_merchant_preset_giving_organization_id_foreign"
            foreign key ("giving_organization_id") references "backoffice"."reference_money_giving_organization" ("id")
            on update cascade on delete set null;
        `);
        this.addSql(
            `create index "reference_money_merchant_preset_giving_organization_id_index" on "backoffice"."reference_money_merchant_preset" ("giving_organization_id");`
        );

        // Goal snapshot key
        this.addSql(
            `alter table "public"."money_goal" rename column "giving_organisation_key" to "giving_organization_key";`
        );
    }

    override async down(): Promise<void> {
        this.addSql(
            `alter table "public"."money_goal" rename column "giving_organization_key" to "giving_organisation_key";`
        );

        this.addSql(
            `alter table "backoffice"."reference_money_merchant_preset" drop constraint if exists "reference_money_merchant_preset_giving_organization_id_foreign";`
        );
        this.addSql(
            `drop index if exists "backoffice"."reference_money_merchant_preset_giving_organization_id_index";`
        );
        this.addSql(
            `alter table "backoffice"."reference_money_merchant_preset" rename column "giving_organization_id" to "giving_organisation_id";`
        );
        this.addSql(`
            alter table "backoffice"."reference_money_merchant_preset"
            add constraint "reference_money_merchant_preset_giving_organisation_id_foreign"
            foreign key ("giving_organisation_id") references "backoffice"."reference_money_giving_organisation" ("id")
            on update cascade on delete set null;
        `);
        this.addSql(
            `create index "reference_money_merchant_preset_giving_organisation_id_index" on "backoffice"."reference_money_merchant_preset" ("giving_organisation_id");`
        );

        this.addSql(
            `alter table "backoffice"."reference_money_giving_organization" rename constraint "reference_money_giving_organization_key_unique" to "reference_money_giving_organisation_key_unique";`
        );
        this.addSql(
            `alter table "backoffice"."reference_money_giving_organization" rename constraint "reference_money_giving_organization_pkey" to "reference_money_giving_organisation_pkey";`
        );
        this.addSql(
            `alter table "backoffice"."reference_money_giving_organization" rename to "reference_money_giving_organisation";`
        );
    }
}
