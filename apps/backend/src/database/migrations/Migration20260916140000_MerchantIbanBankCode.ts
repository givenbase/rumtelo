import { Migration } from '@mikro-orm/migrations';

/** NL IBAN bank code on merchant presets (catalog SSOT for manual account add). */
export class Migration20260916140000_MerchantIbanBankCode extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            alter table "backoffice"."reference_money_merchant_preset"
                add column "iban_bank_code" varchar(4) null;
        `);
    }

    override async down(): Promise<void> {
        this.addSql(`
            alter table "backoffice"."reference_money_merchant_preset"
                drop column "iban_bank_code";
        `);
    }
}
