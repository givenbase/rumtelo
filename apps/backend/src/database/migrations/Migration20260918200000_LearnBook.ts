import { Migration } from '@mikro-orm/migrations';

/**
 * The household row is a book pointer, not a title string.
 * Rename the table so the name matches the entity.
 */
export class Migration20260918200000_LearnBook extends Migration {
    override async up(): Promise<void> {
        this.addSql(`alter table "growth_learn_title" rename to "growth_learn_book";`);
        this.addSql(
            `alter table "growth_learn_book" rename constraint "growth_learn_title_pkey" to "growth_learn_book_pkey";`
        );
        this.addSql(
            `alter table "growth_learn_book" rename constraint "growth_learn_title_household_id_source_key_unique" to "growth_learn_book_household_id_source_key_unique";`
        );
        this.addSql(
            `alter table "growth_learn_book" rename constraint "growth_learn_title_household_id_foreign" to "growth_learn_book_household_id_foreign";`
        );
        this.addSql(
            `alter table "growth_learn_book" rename constraint "growth_learn_title_account_id_foreign" to "growth_learn_book_account_id_foreign";`
        );
        this.addSql(
            `alter index "growth_learn_title_household_id_index" rename to "growth_learn_book_household_id_index";`
        );
    }

    override async down(): Promise<void> {
        this.addSql(
            `alter index "growth_learn_book_household_id_index" rename to "growth_learn_title_household_id_index";`
        );
        this.addSql(
            `alter table "growth_learn_book" rename constraint "growth_learn_book_account_id_foreign" to "growth_learn_title_account_id_foreign";`
        );
        this.addSql(
            `alter table "growth_learn_book" rename constraint "growth_learn_book_household_id_foreign" to "growth_learn_title_household_id_foreign";`
        );
        this.addSql(
            `alter table "growth_learn_book" rename constraint "growth_learn_book_household_id_source_key_unique" to "growth_learn_title_household_id_source_key_unique";`
        );
        this.addSql(
            `alter table "growth_learn_book" rename constraint "growth_learn_book_pkey" to "growth_learn_title_pkey";`
        );
        this.addSql(`alter table "growth_learn_book" rename to "growth_learn_title";`);
    }
}
