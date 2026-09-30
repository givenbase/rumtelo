import { Migration } from '@mikro-orm/migrations';

/**
 * Asset in / out — optional `asset_id` on income sources, fixed costs and transactions.
 * Attribution only (money → growth holding); jars are untouched. Deleting a holding
 * unlinks its rows (`on delete set null`) instead of deleting them.
 */
export class Migration20260930144255_AssetLinks extends Migration {
    override name = 'Migration20260930144255_AssetLinks';

    override up(): void | Promise<void> {
        this.addSql(`alter table "money_income_source" add "asset_id" uuid null;`);
        this.addSql(
            `alter table "money_income_source" add constraint "money_income_source_asset_id_foreign" foreign key ("asset_id") references "growth_asset" ("id") on delete set null;`
        );
        this.addSql(
            `create index "money_income_source_asset_id_index" on "money_income_source" ("asset_id");`
        );

        this.addSql(`alter table "money_fixed_cost" add "asset_id" uuid null;`);
        this.addSql(
            `alter table "money_fixed_cost" add constraint "money_fixed_cost_asset_id_foreign" foreign key ("asset_id") references "growth_asset" ("id") on delete set null;`
        );
        this.addSql(
            `create index "money_fixed_cost_asset_id_index" on "money_fixed_cost" ("asset_id");`
        );

        this.addSql(`alter table "money_transaction" add "asset_id" uuid null;`);
        this.addSql(
            `alter table "money_transaction" add constraint "money_transaction_asset_id_foreign" foreign key ("asset_id") references "growth_asset" ("id") on delete set null;`
        );
        this.addSql(
            `create index "money_transaction_asset_id_index" on "money_transaction" ("asset_id");`
        );
    }

    override down(): void | Promise<void> {
        this.addSql(`alter table "money_transaction" drop constraint "money_transaction_asset_id_foreign";`);
        this.addSql(`drop index "money_transaction_asset_id_index";`);
        this.addSql(`alter table "money_transaction" drop column "asset_id";`);

        this.addSql(`alter table "money_fixed_cost" drop constraint "money_fixed_cost_asset_id_foreign";`);
        this.addSql(`drop index "money_fixed_cost_asset_id_index";`);
        this.addSql(`alter table "money_fixed_cost" drop column "asset_id";`);

        this.addSql(
            `alter table "money_income_source" drop constraint "money_income_source_asset_id_foreign";`
        );
        this.addSql(`drop index "money_income_source_asset_id_index";`);
        this.addSql(`alter table "money_income_source" drop column "asset_id";`);
    }
}
