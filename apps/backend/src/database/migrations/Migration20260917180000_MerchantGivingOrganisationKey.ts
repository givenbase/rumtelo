import { Migration } from '@mikro-orm/migrations';

/**
 * Link donation merchants to GivingOrganisation when they share identity.
 * Merchant rows stay for bank matching; org catalog owns Coach copy.
 */
export class Migration20260917180000_MerchantGivingOrganisationKey extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `alter table "backoffice"."reference_money_merchant_preset" add column if not exists "giving_organisation_key" varchar(64) null;`
        );
    }

    override async down(): Promise<void> {
        this.addSql(
            `alter table "backoffice"."reference_money_merchant_preset" drop column if exists "giving_organisation_key";`
        );
    }
}
