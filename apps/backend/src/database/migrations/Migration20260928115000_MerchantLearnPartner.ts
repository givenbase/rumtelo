import { Migration } from '@mikro-orm/migrations';

/**
 * Partner flag on merchants — reserved for real Rumtelo partners later.
 * Defaults false; nobody is a partner yet.
 */
export class Migration20260928115000_MerchantLearnPartner extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `alter table "backoffice"."reference_money_merchant_preset" add column if not exists "is_partner" boolean not null default false;`
        );
        // Older local DBs may still have learn_partner from an earlier draft.
        this.addSql(`
            do $$ begin
              if exists (
                select 1 from information_schema.columns
                where table_schema = 'backoffice'
                  and table_name = 'reference_money_merchant_preset'
                  and column_name = 'learn_partner'
              ) then
                alter table "backoffice"."reference_money_merchant_preset"
                drop column "learn_partner";
              end if;
            end $$;
        `);
        this.addSql(
            `update "backoffice"."reference_money_merchant_preset" set "is_partner" = false;`
        );
    }

    override async down(): Promise<void> {
        this.addSql(
            `alter table "backoffice"."reference_money_merchant_preset" drop column if exists "is_partner";`
        );
    }
}
